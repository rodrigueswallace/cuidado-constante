import {
  cmInputToNumberString,
  displayDateToIso,
  formatCmInput,
  formatDateDigits,
  formatPhone,
  formatWeightInput,
  isoDateToDisplay,
  onlyDigits,
  weightInputToNumberString
} from '@/utils/formats';

describe('utils/formats', () => {
  it('remove caracteres nao numericos', () => {
    expect(onlyDigits('(11) 94880-9483')).toBe('11948809483');
  });

  it('formata telefone brasileiro com 11 digitos', () => {
    expect(formatPhone('11948809483')).toBe('(11) 94880-9483');
  });

  it('limita telefone a 11 digitos', () => {
    expect(formatPhone('11948809483999')).toBe('(11) 94880-9483');
  });

  it('formata data digitada e converte para ISO', () => {
    expect(formatDateDigits('01062026')).toBe('01/06/2026');
    expect(displayDateToIso('01/06/2026')).toBe('2026-06-01');
  });

  it('mantem data invalida como null na conversao para ISO', () => {
    expect(displayDateToIso('01/06')).toBeNull();
  });

  it('converte data ISO para exibicao', () => {
    expect(isoDateToDisplay('2026-06-01')).toBe('01/06/2026');
  });

  it('formata peso sem preencher zeros artificiais', () => {
    expect(formatWeightInput('1')).toBe('1');
    expect(formatWeightInput('12')).toBe('12');
    expect(formatWeightInput('125')).toBe('12.5');
    expect(formatWeightInput('1234')).toBe('123.4');
  });

  it('normaliza peso digitado pelo usuario', () => {
    expect(weightInputToNumberString('12,5')).toBe('12.5');
    expect(weightInputToNumberString(' 12.5 ')).toBe('12.5');
  });

  it('mantem campo de tamanho apenas com numeros', () => {
    expect(formatCmInput('45cm')).toBe('45');
    expect(cmInputToNumberString('45 cm')).toBe('45');
  });
});

export {};
