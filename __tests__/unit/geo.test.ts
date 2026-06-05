import { estimateProximityFromRssi, haversineMeters } from '@/utils/geo';

describe('utils/geo', () => {
  it('calcula distancia zero para coordenadas iguais', () => {
    expect(haversineMeters({ lat: -23.5, lng: -46.6 }, { lat: -23.5, lng: -46.6 })).toBeCloseTo(0, 5);
  });

  it('calcula distancia aproximada entre dois pontos conhecidos', () => {
    const meters = haversineMeters(
      { lat: -23.4066756, lng: -46.8783888 },
      { lat: -23.4076756, lng: -46.8783888 }
    );

    expect(meters).toBeGreaterThan(100);
    expect(meters).toBeLessThan(120);
  });

  it('retorna infinito quando RSSI e zero', () => {
    expect(estimateProximityFromRssi(0)).toBe(Infinity);
  });

  it('estima proximidade maior para sinal mais fraco', () => {
    expect(estimateProximityFromRssi(-90)).toBeGreaterThan(estimateProximityFromRssi(-50));
  });
});

export {};
