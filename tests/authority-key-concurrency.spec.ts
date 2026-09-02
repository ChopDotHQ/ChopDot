import {expect, test} from '@playwright/test';

const resolveAuthorityKeyTestBaseUrl = (override?: string) => override ?? 'http://127.0.0.1:4177';
const baseUrl = resolveAuthorityKeyTestBaseUrl(process.env.AUTHORITY_KEY_TEST_BASE_URL);

test('authority test isolation preserves the default 4177 server contract', () => {
  expect(resolveAuthorityKeyTestBaseUrl()).toBe('http://127.0.0.1:4177');
  expect(resolveAuthorityKeyTestBaseUrl('http://127.0.0.1:4277')).toBe('http://127.0.0.1:4277');
});

test('simultaneous vault startups converge on one durable assessment key', async ({page}) => {
  await page.goto(baseUrl);

  const result = await page.evaluate(async () => {
    const dbName = `chopdot-authority-key-concurrency-${crypto.randomUUID()}`;
    const browserAuthorityPath = '/src/core/authority/browserAuthority.ts';
    const legacyMigrationPath = '/src/core/legacyMoneyMigration.ts';
    const statePath = '/src/state/store.ts';
    const [{IndexedDbAuthorityJournalStore}, {bootstrapLegacyAssessment}, {createCleanState}] = await Promise.all([
      import(/* @vite-ignore */ browserAuthorityPath),
      import(/* @vite-ignore */ legacyMigrationPath),
      import(/* @vite-ignore */ statePath),
    ]);

    const leftVault = new IndexedDbAuthorityJournalStore(dbName);
    const rightVault = new IndexedDbAuthorityJournalStore(dbName);
    const [left, right] = await Promise.all([
      bootstrapLegacyAssessment(createCleanState(), leftVault),
      bootstrapLegacyAssessment(createCleanState(), rightVault),
    ]);

    const recordId = `${left.assessment.sourceDigest}:${left.assessment.authorityContextDigest}`;
    const recovered = await new IndexedDbAuthorityJournalStore(dbName).readLegacyAssessment(recordId) as {
      assessmentDigest?: string;
    } | null;

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
    });
    const storedKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const transaction = database.transaction('keys', 'readonly');
      const request = transaction.objectStore('keys').getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB key read failed.'));
    });
    const storedKey = await new Promise<CryptoKey>((resolve, reject) => {
      const transaction = database.transaction('keys', 'readonly');
      const request = transaction.objectStore('keys').get('journal-encryption-key');
      request.onsuccess = () => resolve(request.result as CryptoKey);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB encryption key read failed.'));
    });
    database.close();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('IndexedDB deletion timed out.')), 2_000);
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => { clearTimeout(timeout); resolve(); };
      request.onerror = () => { clearTimeout(timeout); reject(request.error ?? new Error('IndexedDB deletion failed.')); };
      request.onblocked = () => { clearTimeout(timeout); reject(new Error('IndexedDB deletion was blocked by an open connection.')); };
    });

    return {
      assessmentDigests: [left.assessment.assessmentDigest, right.assessment.assessmentDigest],
      outcomes: [left.outcome, right.outcome].sort(),
      recoveredAssessmentDigest: recovered?.assessmentDigest ?? null,
      storedKeys,
      databaseDeleted: true,
      key: {
        isCryptoKey: storedKey instanceof CryptoKey,
        type: storedKey.type,
        extractable: storedKey.extractable,
        algorithm: storedKey.algorithm.name,
        length: 'length' in storedKey.algorithm ? storedKey.algorithm.length : null,
        usages: [...storedKey.usages].sort(),
      },
    };
  });

  expect(result.outcomes).toEqual(['duplicate', 'persisted']);
  expect(new Set(result.assessmentDigests).size).toBe(1);
  expect(result.recoveredAssessmentDigest).toBe(result.assessmentDigests[0]);
  expect(result.storedKeys).toEqual(['journal-encryption-key']);
  expect(result.databaseDeleted).toBe(true);
  expect(result.key).toEqual({
    isCryptoKey: true,
    type: 'secret',
    extractable: false,
    algorithm: 'AES-GCM',
    length: 256,
    usages: ['decrypt', 'encrypt'],
  });
});

test('forced distinct-record writers converge and leave no blocking loser connections', async ({page}) => {
  await page.goto(`${baseUrl}/tests/fixtures/authority-key-storage-shell.html`);

  const result = await page.evaluate(async () => {
    const dbName = `chopdot-authority-key-distinct-${crypto.randomUUID()}`;
    const browserAuthorityPath = '/src/core/authority/browserAuthority.ts';
    const {IndexedDbAuthorityJournalStore} = await import(/* @vite-ignore */ browserAuthorityPath);
    const writerCount = 8;
    const originalGenerateKey = crypto.subtle.generateKey.bind(crypto.subtle) as (...args: unknown[]) => Promise<CryptoKey | CryptoKeyPair>;
    let aesGenerateCount = 0;
    let release!: () => void;
    let rejectGate!: (reason: Error) => void;
    const allGenerated = new Promise<void>((resolve, reject) => { release = resolve; rejectGate = reject; });
    const gateTimeout = setTimeout(() => rejectGate(new Error('Concurrent key generation did not reach the barrier.')), 2_000);
    Object.defineProperty(crypto.subtle, 'generateKey', {
      configurable: true,
      value: async (...args: unknown[]) => {
        const generated = await Reflect.apply(originalGenerateKey, crypto.subtle, args) as CryptoKey | CryptoKeyPair;
        const algorithm = args[0];
        if (algorithm && typeof algorithm === 'object' && 'name' in algorithm && algorithm.name === 'AES-GCM') {
          aesGenerateCount += 1;
          if (aesGenerateCount === writerCount) {
            clearTimeout(gateTimeout);
            release();
          }
          await allGenerated;
        }
        return generated;
      },
    });

    const records = Array.from({length: writerCount}, (_, index) => ({
      id: `distinct-record-${index}`,
      value: {v: 1, index, marker: `value-${index}`},
    }));
    try {
      const outcomes = await Promise.all(records.map(({id, value}) => (
        new IndexedDbAuthorityJournalStore(dbName).putLegacyAssessmentIfAbsent(id, value)
      )));
      const reader = new IndexedDbAuthorityJournalStore(dbName);
      const recovered = await Promise.all(records.map(({id}) => reader.readLegacyAssessment(id)));
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('IndexedDB deletion timed out.')), 2_000);
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => { clearTimeout(timeout); resolve(); };
        request.onerror = () => { clearTimeout(timeout); reject(request.error ?? new Error('IndexedDB deletion failed.')); };
        request.onblocked = () => { clearTimeout(timeout); reject(new Error('IndexedDB deletion was blocked by an open connection.')); };
      });
      return {outcomes, recovered, aesGenerateCount, databaseDeleted: true};
    } finally {
      clearTimeout(gateTimeout);
      delete (crypto.subtle as unknown as Record<string, unknown>).generateKey;
    }
  });

  const writerCount = 8;
  expect(result.aesGenerateCount).toBe(writerCount);
  expect(result.outcomes).toEqual(Array.from({length: writerCount}, () => 'stored'));
  expect(result.recovered).toEqual(Array.from({length: writerCount}, (_, index) => ({v: 1, index, marker: `value-${index}`})));
  expect(result.databaseDeleted).toBe(true);
});

test('a malformed stored authority key fails closed without replacement', async ({page}) => {
  await page.goto(baseUrl);

  const result = await page.evaluate(async () => {
    const dbName = `chopdot-authority-key-malformed-${crypto.randomUUID()}`;
    const browserAuthorityPath = '/src/core/authority/browserAuthority.ts';
    const {IndexedDbAuthorityJournalStore} = await import(/* @vite-ignore */ browserAuthorityPath);
    const vault = new IndexedDbAuthorityJournalStore(dbName);
    await vault.listGroupIds();

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('keys', 'readwrite');
      transaction.objectStore('keys').put({malformed: true}, 'journal-encryption-key');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB key write failed.'));
    });
    database.close();

    let error = '';
    try {
      await vault.putLegacyAssessmentIfAbsent('malformed-key-record', {v: 1});
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    }

    const inspection = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB inspection open failed.'));
    });
    const rawKey = await new Promise<unknown>((resolve, reject) => {
      const transaction = inspection.transaction('keys', 'readonly');
      const request = transaction.objectStore('keys').get('journal-encryption-key');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB key inspection failed.'));
    });
    const assessmentCount = await new Promise<number>((resolve, reject) => {
      const transaction = inspection.transaction('legacy-assessments', 'readonly');
      const request = transaction.objectStore('legacy-assessments').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB assessment count failed.'));
    });
    inspection.close();
    return {error, rawKey, assessmentCount};
  });

  expect(result).toEqual({
    error: 'Participant authority encryption key is invalid.',
    rawKey: {malformed: true},
    assessmentCount: 0,
  });
});

test('invalid stored CryptoKey classes fail closed without replacement', async ({page}) => {
  await page.goto(baseUrl);

  const results = await page.evaluate(async () => {
    const fingerprint = (value: unknown) => {
      if (!(value instanceof CryptoKey)) return {kind: 'not-crypto-key', json: JSON.stringify(value)};
      return {
        kind: 'crypto-key',
        type: value.type,
        extractable: value.extractable,
        algorithm: value.algorithm.name,
        length: 'length' in value.algorithm ? value.algorithm.length : null,
        usages: [...value.usages].sort(),
      };
    };
    const invalidKeys = [
      {
        name: 'extractable-aes-256',
        key: await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']),
      },
      {
        name: 'aes-128',
        key: await crypto.subtle.generateKey({name: 'AES-GCM', length: 128}, false, ['encrypt', 'decrypt']),
      },
      {
        name: 'wrong-algorithm',
        key: await crypto.subtle.generateKey({name: 'HMAC', hash: 'SHA-256', length: 256}, false, ['sign', 'verify']),
      },
      {
        name: 'encrypt-only',
        key: await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt']),
      },
      {
        name: 'extra-usage',
        key: await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt', 'wrapKey']),
      },
    ];
    const browserAuthorityPath = '/src/core/authority/browserAuthority.ts';
    const {IndexedDbAuthorityJournalStore} = await import(/* @vite-ignore */ browserAuthorityPath);

    return Promise.all(invalidKeys.map(async ({name, key}) => {
      const dbName = `chopdot-authority-key-invalid-${name}-${crypto.randomUUID()}`;
      const vault = new IndexedDbAuthorityJournalStore(dbName);
      await vault.listGroupIds();
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('keys', 'readwrite');
        transaction.objectStore('keys').put(key, 'journal-encryption-key');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB key write failed.'));
      });
      database.close();

      let error = '';
      try {
        await vault.putLegacyAssessmentIfAbsent(`record-${name}`, {v: 1, name});
      } catch (reason) {
        error = reason instanceof Error ? reason.message : String(reason);
      }

      const inspection = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB inspection open failed.'));
      });
      // Resolve on transaction completion, not request success. A request succeeds
      // while its transaction is still active, and close() only takes effect once
      // every transaction has completed — so resolving on onsuccess let
      // deleteDatabase() run against a still-open connection and hit onblocked.
      const rawKey = await new Promise<unknown>((resolve, reject) => {
        const transaction = inspection.transaction('keys', 'readonly');
        const request = transaction.objectStore('keys').get('journal-encryption-key');
        request.onerror = () => reject(request.error ?? new Error('IndexedDB key inspection failed.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB key inspection aborted.'));
        transaction.oncomplete = () => resolve(request.result);
      });
      const assessmentCount = await new Promise<number>((resolve, reject) => {
        const transaction = inspection.transaction('legacy-assessments', 'readonly');
        const request = transaction.objectStore('legacy-assessments').count();
        request.onerror = () => reject(request.error ?? new Error('IndexedDB assessment count failed.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB assessment count aborted.'));
        transaction.oncomplete = () => resolve(request.result);
      });
      inspection.close();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('IndexedDB deletion timed out.')), 2_000);
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => { clearTimeout(timeout); resolve(); };
        request.onerror = () => { clearTimeout(timeout); reject(request.error ?? new Error('IndexedDB deletion failed.')); };
        request.onblocked = () => { clearTimeout(timeout); reject(new Error('IndexedDB deletion was blocked by an open connection.')); };
      });
      return {
        name,
        error,
        original: fingerprint(key),
        stored: fingerprint(rawKey),
        assessmentCount,
        databaseDeleted: true,
      };
    }));
  });

  expect(results.map(({name}) => name)).toEqual([
    'extractable-aes-256',
    'aes-128',
    'wrong-algorithm',
    'encrypt-only',
    'extra-usage',
  ]);
  for (const result of results) {
    expect(result.error).toBe('Participant authority encryption key is invalid.');
    expect(result.stored).toEqual(result.original);
    expect(result.assessmentCount).toBe(0);
    expect(result.databaseDeleted).toBe(true);
  }
});

test('a synchronous request setup failure preserves its error and closes the database', async ({page}) => {
  await page.goto(baseUrl);

  const result = await page.evaluate(async () => {
    const dbName = `chopdot-authority-sync-request-failure-${crypto.randomUUID()}`;
    const browserAuthorityPath = '/src/core/authority/browserAuthority.ts';
    const {IndexedDbAuthorityJournalStore} = await import(/* @vite-ignore */ browserAuthorityPath);
    const vault = new IndexedDbAuthorityJournalStore(dbName);
    let error = '';
    try {
      await vault.read('   ');
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    }
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('IndexedDB deletion timed out.')), 2_000);
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => { clearTimeout(timeout); resolve(); };
      request.onerror = () => { clearTimeout(timeout); reject(request.error ?? new Error('IndexedDB deletion failed.')); };
      request.onblocked = () => { clearTimeout(timeout); reject(new Error('IndexedDB deletion was blocked by an open connection.')); };
    });
    return {error, databaseDeleted: true};
  });

  expect(result).toEqual({
    error: 'Participant authority identifier is required.',
    databaseDeleted: true,
  });
});
