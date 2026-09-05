import assert from 'node:assert/strict';
import test from 'node:test';
import {verifiedContactFixture} from '../../tests/fixtures/verifiedContactFixture.ts';
import {verifiedContactFromUrl, verifiedContactUrl} from './verifiedContactLink.ts';

test('link and QR carrier use one exact strict message format and create no authority', async () => {
  const {offer} = await verifiedContactFixture();
  const url = verifiedContactUrl('https://chopdot.example/friends?source=app', offer);
  assert.deepEqual(verifiedContactFromUrl(url), offer);
  assert.equal(new URL(url).searchParams.get('source'), 'app');

  const extraParam = `${url}&another=value`;
  assert.equal(verifiedContactFromUrl(extraParam), null);

  const decoded = JSON.parse(Buffer.from(new URL(url).hash.split('=')[1], 'base64url').toString()) as Record<string, unknown>;
  decoded.groupKey = 'forbidden';
  const unknownField = `https://chopdot.example/#chopdot-contact=${Buffer.from(JSON.stringify(decoded)).toString('base64url')}`;
  assert.equal(verifiedContactFromUrl(unknownField), null);
  assert.equal(verifiedContactFromUrl('https://chopdot.example/#chopdot-contact=broken'), null);
});
