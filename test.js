import assert from 'node:assert/strict';
import { validateCode, validateSerial } from './validation.js';
import { registerCollar } from './register-collar.js';

assert.equal(validateSerial('COL-1234-ABCD'), true);
assert.equal(validateSerial('col-1234-abcd'), false);
assert.equal(validateSerial('BAD-1234-ABCD'), false);

assert.equal(validateCode('123456'), true);
assert.equal(validateCode('12345A'), false);
assert.equal(validateCode('12345'), false);

const notFound = await registerCollar({ serial: 'COL-0000-XXXX', code: '123456' });
assert.deepEqual(notFound, { ok: false, reason: 'SERIAL_NOT_FOUND' });

const invalidCode = await registerCollar({ serial: 'COL-1111-AAAA', code: '000000' });
assert.deepEqual(invalidCode, { ok: false, reason: 'INVALID_CODE' });

const alreadyLinked = await registerCollar({ serial: 'COL-9999-TEST', code: '222222' });
assert.deepEqual(alreadyLinked, { ok: false, reason: 'ALREADY_LINKED' });

const ok = await registerCollar({ serial: 'COL-1111-AAAA', code: '111111' });
assert.deepEqual(ok, { ok: true });

console.log('All tests passed');
