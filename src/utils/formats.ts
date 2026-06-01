export function onlyDigits(value: string) {
  return value.replace(/\D+/g, '');
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatDateDigits(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isoDateToDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function isoDateToDashedDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

export function displayDateToIso(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 8) return null;

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return `${year}-${month}-${day}`;
}

export function formatWeightInput(value: string) {
  const digits = onlyDigits(value).slice(0, 4);

  if (!digits) return '';
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, -1)}.${digits.slice(-1)}`;
}

export function weightInputToNumberString(value: string) {
  return value ? value.replace(',', '.').trim() : '';
}

export function formatCmInput(value: string) {
  const digits = onlyDigits(value).slice(0, 3);
  return digits;
}

export function cmInputToNumberString(value: string) {
  return onlyDigits(value);
}
