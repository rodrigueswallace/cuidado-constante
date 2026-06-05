import {
  brDateToIso,
  digitsOnly,
  formatCentimeters,
  formatDateBr,
  formatPhone,
  formatWeight,
  isoDateToBr,
  isoDateToDisplayDash,
  weightToNumberString
} from '@/utils/formatters';

describe('utils/formatters', () => {
  it('remove caracteres nao numericos', () => {
    expect(digitsOnly('abc123-45')).toBe('12345');
  });

  it('formata telefone, data e centimetros', () => {
    expect(formatPhone('11948809483')).toBe('(11) 94880-9483');
    expect(formatDateBr('01062026')).toBe('01/06/2026');
    expect(formatCentimeters('1234cm')).toBe('123');
  });

  it('converte datas ISO e BR', () => {
    expect(isoDateToBr('2026-06-01')).toBe('01/06/2026');
    expect(isoDateToDisplayDash('2026-06-01')).toBe('01-06-2026');
    expect(brDateToIso('01/06/2026')).toBe('2026-06-01');
  });

  it('retorna vazio para datas invalidas', () => {
    expect(isoDateToBr('2026')).toBe('');
    expect(isoDateToDisplayDash(undefined)).toBe('');
    expect(brDateToIso('01/06')).toBe('');
  });

  it('formata peso legado e normaliza numero', () => {
    expect(formatWeight('1')).toBe('01.0');
    expect(formatWeight('12')).toBe('12.0');
    expect(formatWeight('125')).toBe('12.5');
    expect(weightToNumberString('12,5')).toBe('12.5');
    expect(weightToNumberString('abc')).toBe('');
  });
});

export {};

