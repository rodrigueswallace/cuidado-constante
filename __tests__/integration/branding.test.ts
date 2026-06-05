const mockGetPublicUrl = jest.fn();
const mockFrom = jest.fn(() => ({ getPublicUrl: mockGetPublicUrl }));

jest.mock('@/services/supabase', () => ({
  supabase: {
    storage: {
      from: mockFrom
    }
  }
}));

describe('services/branding', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(Date, 'now').mockReturnValue(123456);
    mockGetPublicUrl.mockReset();
    mockFrom.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna URL publica da logo com cache busting', () => {
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/logo.png' } });

    const { getBrandLogoUrl, brandConfig } = require('@/services/branding');

    expect(getBrandLogoUrl()).toBe('https://cdn.test/logo.png?v=123456');
    expect(mockFrom).toHaveBeenCalledWith('branding');
    expect(mockGetPublicUrl).toHaveBeenCalledWith('logo.png');
    expect(brandConfig).toEqual({ bucket: 'branding', logoPath: 'logo.png' });
  });

  it('retorna null quando nao ha URL publica', () => {
    mockGetPublicUrl.mockReturnValue({ data: {} });

    const { getBrandLogoUrl } = require('@/services/branding');

    expect(getBrandLogoUrl()).toBeNull();
  });
});

export {};

