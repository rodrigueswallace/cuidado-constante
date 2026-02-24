const linkedSerials = new Set(['COL-9999-TEST']);

const knownSerials = new Map([
  ['COL-1234-ABCD', '654321'],
  ['COL-1111-AAAA', '111111'],
  ['COL-9999-TEST', '222222'],
]);

export async function registerCollar({ serial, code }) {
  // Simula chamada de API
  await new Promise((resolve) => setTimeout(resolve, 80));

  if (!knownSerials.has(serial)) {
    return { ok: false, reason: 'SERIAL_NOT_FOUND' };
  }

  if (knownSerials.get(serial) !== code) {
    return { ok: false, reason: 'INVALID_CODE' };
  }

  if (linkedSerials.has(serial)) {
    return { ok: false, reason: 'ALREADY_LINKED' };
  }

  linkedSerials.add(serial);
  return { ok: true };
}
