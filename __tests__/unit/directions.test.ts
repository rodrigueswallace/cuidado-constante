describe('utils/directions', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-google-key';
    global.fetch = jest.fn();
  });

  it('busca rota no Google Directions e decodifica polyline', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        routes: [
          {
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
            legs: [{ distance: { value: 1200 }, duration: { value: 480 } }]
          }
        ]
      })
    });

    const { fetchDirections } = require('@/utils/directions');
    const route = await fetchDirections('-23.1,-46.1', '-23.2,-46.2');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('origin=-23.1%2C-46.1'));
    expect(route).toEqual({
      polyline: [
        { latitude: 38.5, longitude: -120.2 },
        { latitude: 40.7, longitude: -120.95 },
        { latitude: 43.252, longitude: -126.453 }
      ],
      distanceMeters: 1200,
      durationSeconds: 480
    });
  });

  it('retorna null quando API nao retorna rotas', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ routes: [] })
    });

    const { fetchDirections } = require('@/utils/directions');

    await expect(fetchDirections('a', 'b')).resolves.toBeNull();
  });
});

export {};
