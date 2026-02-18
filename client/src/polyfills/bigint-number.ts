/**
 * Hermes BigInt → Number polyfill.
 *
 * Hermes (React Native JS engine) supports BigInt but throws
 * "Cannot convert BigInt to number" when you do `Number(someBigInt)`.
 * V8 and JSC handle this fine.
 *
 * starknet.js v8 does `Number(BigInt)` in dozens of internal paths
 * (nonce arithmetic, fee estimation, block scanning, hash computation).
 * Instead of patching each call-site, we fix it globally.
 *
 * MUST be imported before any starknet / dojo code.
 */

const OrigNumber = globalThis.Number;

function PatchedNumber(value?: any) {
  if (typeof value === 'bigint') {
    return OrigNumber(value.toString());
  }
  return OrigNumber(value);
}

// Copy all static properties (isNaN, isInteger, MAX_SAFE_INTEGER, parseFloat, etc.)
for (const key of Object.getOwnPropertyNames(OrigNumber)) {
  if (key !== 'length' && key !== 'name') {
    try {
      const desc = Object.getOwnPropertyDescriptor(OrigNumber, key);
      if (desc) Object.defineProperty(PatchedNumber, key, desc);
    } catch {}
  }
}

// Ensure instanceof and prototype chain work
PatchedNumber.prototype = OrigNumber.prototype;

globalThis.Number = PatchedNumber as any;
