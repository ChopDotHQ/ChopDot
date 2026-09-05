// Spike: can a ChopDot "Leo paid" notification reach a second device through
// public Nostr relays, encrypted, with no server of ours?
//
// This is the delivery candidate for the doors the Polkadot host cannot reach —
// plain web, Telegram, and .dot opened in a browser. It uses only WebSocket, so
// whatever works here works in a browser.
//
//   node scripts/spike-nostr-delivery.mjs
//
// Nothing here touches ChopDot state. It answers one question: does the pipe
// work, and how fast.
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  SimplePool,
  nip44,
} from 'nostr-tools';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
];

// A ChopDot group already has a shared secret (the chapter key from the invite).
// Derive one Nostr identity for the group from it: every member can read, and
// relays only ever see ciphertext addressed to a random-looking key.
const groupSecret = generateSecretKey();
const groupPubkey = getPublicKey(groupSecret);
const groupTag = `chopdot:${Buffer.from(groupPubkey, 'hex').subarray(0, 8).toString('hex')}`;

// Compact "Leo paid" notification — the same shape measured against the
// statement store budget (115 B plain).
const notification = {
  v: 1,
  g: 'Zm9vYmFyYmF6cXV4MTIzNA',
  u: 'bGVvLWlkLTAwMDAwMDAwMDA',
  c: 3,
  s: 'c3BsaXQtaWQtMDAwMDAwMDA',
  t: Math.floor(Date.now() / 1000),
};

const conversationKey = nip44.getConversationKey(groupSecret, groupPubkey);
const ciphertext = nip44.encrypt(JSON.stringify(notification), conversationKey);

console.log(`relays              ${RELAYS.length} public`);
console.log(`plain payload       ${Buffer.byteLength(JSON.stringify(notification))} B`);
console.log(`encrypted payload   ${Buffer.byteLength(ciphertext)} B`);
console.log(`group tag           ${groupTag}\n`);

const poolB = new SimplePool();   // "Nina's device" — subscribes first
const poolA = new SimplePool();   // "Leo's device"  — publishes

let received = null;
let receivedAt = null;

const sub = poolB.subscribeMany(
  RELAYS,
  { kinds: [30078], '#d': [groupTag], since: Math.floor(Date.now() / 1000) - 5 },
  {
    onevent(ev) {
      if (received) return;
      receivedAt = Date.now();
      try {
        const key = nip44.getConversationKey(groupSecret, ev.pubkey);
        received = JSON.parse(nip44.decrypt(ev.content, key));
      } catch (e) {
        received = { decryptFailed: e.message };
      }
    },
  },
);

await new Promise((r) => setTimeout(r, 2500)); // let subscriptions settle

const event = finalizeEvent({
  kind: 30078,                                  // parameterised replaceable —
  created_at: Math.floor(Date.now() / 1000),    // newer replaces older per #d,
  tags: [['d', groupTag]],                      // i.e. last-write-wins per group
  content: ciphertext,
}, groupSecret);

const publishedAt = Date.now();
const results = await Promise.allSettled(poolA.publish(RELAYS, event));
const accepted = results.filter((r) => r.status === 'fulfilled').length;
console.log(`published           accepted by ${accepted}/${RELAYS.length} relays`);
for (const [i, r] of results.entries()) {
  console.log(`  ${RELAYS[i].padEnd(26)} ${r.status === 'fulfilled' ? 'ok' : `rejected — ${String(r.reason).slice(0, 60)}`}`);
}

const deadline = Date.now() + 15000;
while (!received && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));

console.log('');
if (received && !received.decryptFailed) {
  const match = JSON.stringify(received) === JSON.stringify(notification);
  console.log(`delivered           yes, in ${receivedAt - publishedAt} ms`);
  console.log(`decrypted intact    ${match ? 'yes' : 'NO — payload differs'}`);
  console.log(`\nRESULT: PASS — second device got the notification through public relays`);
} else if (received?.decryptFailed) {
  console.log(`delivered but decrypt failed: ${received.decryptFailed}`);
  console.log(`\nRESULT: FAIL`);
} else {
  console.log(`delivered           no (15s timeout)`);
  console.log(`\nRESULT: FAIL`);
}

sub.close();
poolA.close(RELAYS);
poolB.close(RELAYS);
process.exit(received && !received.decryptFailed ? 0 : 1);
