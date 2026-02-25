export function validateSerial(serial) {
  // Formato esperado: COL-1234-ABCD
  return /^COL-\d{4}-[A-Z0-9]{4}$/.test(serial);
}

export function validateCode(code) {
  // Código de 6 dígitos
  return /^\d{6}$/.test(code);
}
