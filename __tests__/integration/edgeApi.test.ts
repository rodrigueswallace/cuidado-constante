const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockGetUser = jest.fn();
const mockUpsert = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabaseUrl: 'https://test-project.supabase.co',
  supabaseAnonKey: 'test-anon-key',
  supabase: {
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      getUser: mockGetUser
    },
    from: mockFrom
  }
}));

const validJwt = [
  'header',
  btoa(JSON.stringify({ ref: 'test-project', iss: 'https://test-project.supabase.co/auth/v1' })),
  'signature'
].join('.');

describe('services/edgeApi', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockGetUser.mockReset();
    mockUpsert.mockReset();
    mockMaybeSingle.mockReset();
    mockEq.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('envia pedido de atualizacao GPS para Edge Function com token valido', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: validJwt, expires_at: Math.floor(Date.now() / 1000) + 3600 } },
      error: null
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true, request_id: 'req-1', status: 'pending', already_pending: false }))
    });

    const { requestGpsUpdate } = require('@/services/edgeApi');
    const result = await requestGpsUpdate('collar-1');

    expect(result).toEqual({ ok: true, request_id: 'req-1', status: 'pending', already_pending: false });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/request-gps-update',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'test-anon-key',
          Authorization: `Bearer ${validJwt}`,
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ collar_id: 'collar-1' })
      })
    );
  });

  it('rejeita token emitido por outro projeto Supabase', async () => {
    const foreignJwt = [
      'header',
      btoa(JSON.stringify({ ref: 'other-project', iss: 'https://other-project.supabase.co/auth/v1' })),
      'signature'
    ].join('.');

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: foreignJwt, expires_at: Math.floor(Date.now() / 1000) + 3600 } },
      error: null
    });

    const { requestGpsUpdate } = require('@/services/edgeApi');

    await expect(requestGpsUpdate('collar-1')).rejects.toThrow('token_de_outro_projeto');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('salva coleira ativa no perfil autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const { saveActiveCollarId } = require('@/services/edgeApi');
    await saveActiveCollarId('collar-1');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'user-1', active_collar: 'collar-1' },
      { onConflict: 'id' }
    );
  });

  it('busca coleira ativa do perfil autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { active_collar: 'collar-1' }, error: null });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { fetchActiveCollarId } = require('@/services/edgeApi');

    await expect(fetchActiveCollarId()).resolves.toBe('collar-1');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('active_collar');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
  });
});

export {};
