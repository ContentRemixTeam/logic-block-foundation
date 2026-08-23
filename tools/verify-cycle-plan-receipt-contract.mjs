#!/usr/bin/env node
import fs from 'node:fs';
import { cyclePlanReceiptMatchesReadback } from '../src/lib/cyclePlanReceiptVerification.ts';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
if (!Array.isArray(input) || input.length === 0) {
  throw new Error('Expected at least one receipt/readback pair.');
}
for (const [index, pair] of input.entries()) {
  if (!cyclePlanReceiptMatchesReadback(pair.receipt, pair.readback)) {
    throw new Error(`Client receipt readback contract rejected pair ${index + 1}.`);
  }
}
console.log(`PASS ${input.length} receipt/readback pairs`);
