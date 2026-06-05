const mockCreateClient = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}));

describe('config/env and services/supabase', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockCreateClient.mockReset();
    mockCreateClient.mockReturnValue({ mocked: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('carrega variaveis obrigatorias do env', () => {
    const { env } = require('@/config/env');

    expect(env).toEqual({
      supabaseUrl: 'https://test-project.supabase.co',
      supabaseAnonKey: 'test-anon-key',
      googleMapsApiKey: 'test-google-key'
    });
  });

  it('cria cliente Supabase com configuracoes do ambiente de teste', () => {
    const { supabase, supabaseUrl, supabaseAnonKey } = require('@/services/supabase');

    expect(supabase).toEqual({ mocked: true });
    expect(supabaseUrl).toBe('https://test-project.supabase.co');
    expect(supabaseAnonKey).toBe('test-anon-key');
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        })
      })
    );
  });
});

export {};
