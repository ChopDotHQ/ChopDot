import assert from 'node:assert/strict';
import test from 'node:test';
import {extractReceiptDraft} from './receiptDraft';

test('extracts a merchant and CHF total as a draft that needs review', async () => {
  const result = await extractReceiptDraft({
    name: 'gusto-receipt.txt',
    type: 'text/plain',
    text: async () => 'Dinner at Gusto\n2 pasta 80.00\nWine 40.00\nTotal CHF 120.00',
  });

  assert.deepEqual(result, {
    status: 'needs_review',
    amount: 120,
    title: 'Dinner at Gusto',
    fileName: 'gusto-receipt.txt',
  });
});

test('supports comma decimal totals without treating extraction as final truth', async () => {
  const result = await extractReceiptDraft({
    name: 'cafe.csv',
    type: 'text/csv',
    text: async () => 'Cafe Central\nAmount due EUR 42,50',
  });

  assert.equal(result.status, 'needs_review');
  if (result.status === 'needs_review') {
    assert.equal(result.amount, 42.5);
    assert.equal(result.title, 'Cafe Central');
  }
});

test('reports image receipts as unsupported instead of pretending OCR succeeded', async () => {
  const result = await extractReceiptDraft({
    name: 'receipt.png',
    type: 'image/png',
    text: async () => 'Dinner at Gusto\nTotal CHF 120.00',
  });

  assert.deepEqual(result, {
    status: 'could_not_read',
    reason: 'unsupported_file',
    fileName: 'receipt.png',
  });
});

test('uses optional local image text only as a reviewable draft', async () => {
  const result = await extractReceiptDraft({
    name: 'camera-receipt.jpg',
    type: 'image/jpeg',
    text: async () => '',
  }, {
    readImageText: async () => 'Gusto Zurich\nGrand total CHF 87.40',
  });

  assert.deepEqual(result, {
    status: 'needs_review',
    amount: 87.4,
    title: 'Gusto Zurich',
    fileName: 'camera-receipt.jpg',
  });
});

test('an unavailable local image detector keeps the manual-correction fallback', async () => {
  const result = await extractReceiptDraft({
    name: 'camera-receipt.jpg',
    type: 'image/jpeg',
    text: async () => '',
  }, {
    readImageText: async () => null,
  });

  assert.deepEqual(result, {
    status: 'could_not_read',
    reason: 'unsupported_file',
    fileName: 'camera-receipt.jpg',
  });
});

test('routes supported receipts without a total to manual correction', async () => {
  const result = await extractReceiptDraft({
    name: 'receipt.txt',
    type: 'text/plain',
    text: async () => 'Dinner at Gusto\nNo total on this copy',
  });

  assert.deepEqual(result, {
    status: 'could_not_read',
    reason: 'missing_total',
    fileName: 'receipt.txt',
  });
});
