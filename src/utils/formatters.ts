export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string) {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatDateBr(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isoDateToBr(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function brDateToIso(value: string) {
  const digits = digitsOnly(value);
  if (digits.length !== 8) return '';
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

export function isoDateToDisplayDash(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return `${value.slice(8, 10)}-${value.slice(5, 7)}-${value.slice(0, 4)}`;
}

export function formatWeight(value: string) {
  const digits = digitsOnly(value).slice(0, 3);
  if (!digits) return '';
  if (digits.length === 1) return `0${digits}.0`;
  if (digits.length === 2) return `${digits}.0`;
  return `${digits.slice(0, 2)}.${digits.slice(2)}`;
}

export function weightToNumberString(value: string) {
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return '';
  return parsed.toFixed(1);
}

export function formatCentimeters(value: string) {
  return digitsOnly(value).slice(0, 3);
}
