import {expect, test} from '@playwright/test';

const baseUrl = process.env.AUTHORITY_KEY_TEST_BASE_URL ?? 'http://127.0.0.1:4177';

test('legacy assessments upgrade, encrypt, authenticate, remain immutable, and reset safely', async ({page}) => {
  await page.goto(baseUrl);

  const result = await page.evaluate(async () => {
    const dbName = `chopdot-legacy-assessment-test-${crypto.randomUUID()}`;
    const assessmentStore = 'legacy-assessments';
    const assessmentKey = (recordId: string) => `legacy-assessment:${recordId}`;
    const connections = new Set<IDBDatabase>();

    const open = (version?: number, upgrade?: (database: IDBDatabase) => void) => new Promise<IDBDatabase>((resolve, reject) => {
      const request = version === undefined ? indexedDB.open(dbName) : indexedDB.open(dbName, version);
      request.onupgradeneeded = () => upgrade?.(request.result);
      request.onsuccess = () => {
        connections.add(request.result);
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
      request.onblocked = () => reject(new Error('IndexedDB open was blocked.'));
    });
    const transact = <T>(database: IDBDatabase, storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
      transaction.oncomplete = () => resolve(request.result);
    });
    const deleteDatabase = () => new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed.'));
      request.onblocked = () => undefined;
    });
    const rejectionMessage = async (operation: () => Promise<unknown>) => {
      try {
        await operation();
        return '';
      } catch (reason) {
        return reason instanceof Error ? reason.message : String(reason);
      }
    };

    try {
      const v2 = await open(2, database => {
        database.createObjectStore('journals');
        database.createObjectStore('keys');
        database.createObjectStore('authority-deliveries');
      });
      await transact(v2, 'journals', 'readwrite', store => store.put({frontierHash: 'v2-sentinel'}, 'v2-group'));
      await transact(v2, 'authority-deliveries', 'readwrite', store => store.put({sentinel: true}, 'v2-delivery'));
      v2.close();

      const browserAuthorityModule = '/src/core/authority/browserAuthority.ts';
      const {IndexedDbAuthorityJournalStore} = await import(/* @vite-ignore */ browserAuthorityModule);
      const vault = new IndexedDbAuthorityJournalStore(dbName);
      const recordA = `0x${'11'.repeat(32)}:0x${'22'.repeat(32)}`;
      const recordB = `0x${'33'.repeat(32)}:0x${'44'.repeat(32)}`;
      const secretMarker = `legacy-private-${crypto.randomUUID()}`;
      const valueA = {v: 1, marker: secretMarker, verdict: 'ready_for_review'};
      const valueB = {v: 1, marker: 'second-private-value', verdict: 'quarantined'};

      const firstAdd = await vault.putLegacyAssessmentIfAbsent(recordA, valueA);
      const upgraded = await open();
      const stores = [...upgraded.objectStoreNames].sort();
      const version = upgraded.version;
      const preservedJournal = await transact(upgraded, 'journals', 'readonly', store => store.get('v2-group'));
      const preservedDelivery = await transact(upgraded, 'authority-deliveries', 'readonly', store => store.get('v2-delivery'));
      const rawA = await transact<Record<string, unknown>>(upgraded, assessmentStore, 'readonly', store => store.get(assessmentKey(recordA)));
      const encryptionKey = await transact<CryptoKey>(upgraded, 'keys', 'readonly', store => store.get('journal-encryption-key'));
      upgraded.close();

      const rawJson = JSON.stringify(rawA);
      const roundTripA = await vault.readLegacyAssessment(recordA);
      const rawBeforeDuplicate = structuredClone(rawA);
      const duplicateAdd = await vault.putLegacyAssessmentIfAbsent(recordA, {v: 1, marker: 'must-not-replace'});
      const duplicateDatabase = await open();
      const rawAfterDuplicate = await transact(duplicateDatabase, assessmentStore, 'readonly', store => store.get(assessmentKey(recordA)));
      duplicateDatabase.close();

      await vault.putLegacyAssessmentIfAbsent(recordB, valueB);
      const swapDatabase = await open();
      const rawB = await transact<Record<string, unknown>>(swapDatabase, assessmentStore, 'readonly', store => store.get(assessmentKey(recordB)));
      await transact(swapDatabase, assessmentStore, 'readwrite', store => store.put(rawA, assessmentKey(recordB)));
      swapDatabase.close();
      const aadSwapError = await rejectionMessage(() => vault.readLegacyAssessment(recordB));

      const tamperDatabase = await open();
      const ciphertext = String(rawB.ciphertextHex);
      const final = ciphertext.at(-1) === '0' ? '1' : '0';
      const tampered = {...rawB, ciphertextHex: `${ciphertext.slice(0, -1)}${final}`};
      await transact(tamperDatabase, assessmentStore, 'readwrite', store => store.put(tampered, assessmentKey(recordB)));
      tamperDatabase.close();
      const tamperError = await rejectionMessage(() => vault.readLegacyAssessment(recordB));

      const retainedOldCiphertext = structuredClone(rawA);
      await vault.clear();
      const clearedDatabase = await open();
      const counts = Object.fromEntries(await Promise.all(
        ['journals', 'authority-deliveries', assessmentStore, 'keys'].map(async storeName => [
          storeName,
          await transact<number>(clearedDatabase, storeName, 'readonly', store => store.count()),
        ]),
      ));
      clearedDatabase.close();

      const reenrolledValue = {v: 1, marker: 'new-key-value'};
      const reenrolledAdd = await vault.putLegacyAssessmentIfAbsent(recordB, reenrolledValue);
      const reenrolledRead = await vault.readLegacyAssessment(recordB);
      const oldCipherDatabase = await open();
      await transact(oldCipherDatabase, assessmentStore, 'readwrite', store => store.put(retainedOldCiphertext, assessmentKey(recordA)));
      oldCipherDatabase.close();
      const oldCiphertextError = await rejectionMessage(() => vault.readLegacyAssessment(recordA));

      return {
        version,
        stores,
        preservedJournal,
        preservedDelivery,
        firstAdd,
        rawKeys: Object.keys(rawA).sort(),
        rawContainsSecret: rawJson.includes(secretMarker) || rawJson.includes(recordA),
        key: {
          isCryptoKey: encryptionKey instanceof CryptoKey,
          type: encryptionKey.type,
          extractable: encryptionKey.extractable,
          algorithm: encryptionKey.algorithm.name,
          usages: [...encryptionKey.usages].sort(),
        },
        roundTripA,
        duplicateAdd,
        duplicateCiphertextUnchanged: JSON.stringify(rawBeforeDuplicate) === JSON.stringify(rawAfterDuplicate),
        duplicateRead: await vault.readLegacyAssessment(recordA).catch(() => null),
        aadSwapError,
        tamperError,
        counts,
        reenrolledAdd,
        reenrolledRead,
        oldCiphertextError,
      };
    } finally {
      for (const database of connections) database.close();
      await deleteDatabase();
    }
  });

  expect(result.version).toBe(3);
  expect(result.stores).toEqual(['authority-deliveries', 'journals', 'keys', 'legacy-assessments']);
  expect(result.preservedJournal).toEqual({frontierHash: 'v2-sentinel'});
  expect(result.preservedDelivery).toEqual({sentinel: true});
  expect(result.firstAdd).toBe('stored');
  expect(result.rawKeys).toEqual(['ciphertextHex', 'frontierHash', 'ivHex', 'v']);
  expect(result.rawContainsSecret).toBe(false);
  expect(result.key).toEqual({isCryptoKey: true, type: 'secret', extractable: false, algorithm: 'AES-GCM', usages: ['decrypt', 'encrypt']});
  expect(result.roundTripA).toEqual({v: 1, marker: expect.stringMatching(/^legacy-private-/u), verdict: 'ready_for_review'});
  expect(result.duplicateAdd).toBe('exists');
  expect(result.duplicateCiphertextUnchanged).toBe(true);
  expect(result.aadSwapError).toBe('Legacy assessment storage is corrupt.');
  expect(result.tamperError).toBe('Legacy assessment storage is corrupt.');
  expect(result.counts).toEqual({'journals': 0, 'authority-deliveries': 0, 'legacy-assessments': 0, 'keys': 0});
  expect(result.reenrolledAdd).toBe('stored');
  expect(result.reenrolledRead).toEqual({v: 1, marker: 'new-key-value'});
  expect(result.oldCiphertextError).toBe('Legacy assessment storage is corrupt.');
});

test('the production entrypoint persists a redacted source assessment before authority readiness', async ({page}) => {
  await page.addInitScript(state => {
    localStorage.setItem('chopdot-portable-shell-state-v1', JSON.stringify(state));
  }, {
    mode: 'clean',
    theme: 'light',
    currency: 'USD',
    preferredPaymentMethod: null,
    currentUserId: 'mina',
    users: {mina: {id: 'mina', name: 'Mina', walletAddress: 'excluded-wallet'}},
    groups: {dinner: {id: 'dinner', name: 'Dinner', memberIds: ['mina'], liveSession: {roomId: 'excluded-room', secret: 'excluded-secret'}}},
    expenses: {meal: {id: 'meal', groupId: 'dinner', description: 'Pasta', amount: 12.5, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-27T12:00:00.000Z'}},
    splits: {mina: {id: 'mina', expenseId: 'meal', userId: 'mina', amount: 12.5, status: 'open', requestEntryCapability: 'excluded-capability'}},
    paymentMethods: {},
    activityEvents: {},
    savedRecords: {},
  });
  await page.goto(baseUrl);

  await expect.poll(() => page.evaluate(async () => {
    const database = (await indexedDB.databases()).find(item => item.name === 'chopdot-authority-v1');
    return database?.version ?? 0;
  })).toBe(3);

  await expect.poll(() => page.evaluate(async () => {
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('chopdot-authority-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = open.transaction(['legacy-assessments', 'journals'], 'readonly');
    const count = (storeName: string) => new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore(storeName).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [assessmentCount, journalCount] = await Promise.all([
      count('legacy-assessments'),
      count('journals'),
    ]);
    open.close();
    return {assessmentCount, journalCount};
  })).toEqual({assessmentCount: 1, journalCount: 0});

  const proof = await page.evaluate(async () => {
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('chopdot-authority-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const requestValue = <T>(storeName: string, operation: (store: IDBObjectStore) => IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      const transaction = open.transaction(storeName, 'readonly');
      const request = operation(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const assessmentKeys = await requestValue<IDBValidKey[]>('legacy-assessments', store => store.getAllKeys());
    const journalCount = await requestValue<number>('journals', store => store.count());
    open.close();
    const modulePath = '/src/core/authority/browserAuthority.ts';
    const {IndexedDbAuthorityJournalStore} = await import(/* @vite-ignore */ modulePath);
    const recordId = String(assessmentKeys[0]).replace(/^legacy-assessment:/u, '');
    const assessment = await new IndexedDbAuthorityJournalStore().readLegacyAssessment(recordId);
    return {
      assessment,
      assessmentCount: assessmentKeys.length,
      journalCount,
      cachedGroupIds: Object.keys(JSON.parse(localStorage.getItem('chopdot-portable-shell-state-v1') ?? '{}').groups ?? {}),
    };
  });

  expect(proof.assessmentCount).toBe(1);
  expect(proof.journalCount).toBe(0);
  expect(proof.cachedGroupIds).toEqual(['dinner']);
  const assessmentJson = JSON.stringify(proof.assessment);
  expect(assessmentJson).toContain('"description":"Pasta"');
  expect(assessmentJson).toContain('"amount":{"number":"4029000000000000"}');
  expect(assessmentJson).not.toContain('excluded-wallet');
  expect(assessmentJson).not.toContain('excluded-room');
  expect(assessmentJson).not.toContain('excluded-secret');
  expect(assessmentJson).not.toContain('excluded-capability');
  expect(proof.assessment).toMatchObject({
    kind: 'legacy-migration-assessment',
    digestDomain: 'chopdot:legacy-assessment:v1',
    overallVerdict: 'ready_for_review',
    createsAuthority: false,
  });
});
