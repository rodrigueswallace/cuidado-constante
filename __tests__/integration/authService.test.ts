const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockSetSession = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      setSession: mockSetSession,
      signOut: mockSignOut,
      getSession: mockGetSession
    }
  }
}));

describe('services/auth', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockResetPasswordForEmail.mockReset();
    mockUpdateUser.mockReset();
    mockSetSession.mockReset();
    mockSignOut.mockReset();
    mockGetSession.mockReset();
  });

  it('realiza login com email e senha', () => {
    const { authService } = require('@/services/auth');
    authService.signIn('user@test.com', '123456');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'user@test.com', password: '123456' });
  });

  it('cadastra tutor e pet enviando metadados normalizados', () => {
    const { authService } = require('@/services/auth');
    authService.signUp(
      { fullName: ' Tutor ', phone: ' 11999999999 ', email: 'user@test.com', password: '123456' },
      {
        name: ' Thor ',
        species: ' Cachorro ',
        birthDate: '2020-01-01',
        color: ' Preto ',
        sex: 'Macho',
        weightKg: '12.5',
        size: '45',
        microchip: '',
        breed: ' SRD ',
        notes: ''
      }
    );

    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@test.com',
      password: '123456',
      options: expect.objectContaining({
        emailRedirectTo: 'cuidado-constante://auth-callback',
        data: expect.objectContaining({
          full_name: 'Tutor',
          phone: '11999999999',
          pet_name: 'Thor',
          pet_species: 'Cachorro',
          pet_microchip: null,
          pet_breed: 'SRD',
          pet_notes: null
        })
      })
    }));
  });

  it('extrai tokens de URL e cria sessao', async () => {
    mockSetSession.mockResolvedValue({ data: { session: { id: 'session-1' } }, error: null });

    const { authService } = require('@/services/auth');
    const result = await authService.setSessionFromUrl('cuidado://reset#access_token=access&refresh_token=refresh');

    expect(result.data.session.id).toBe('session-1');
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('retorna sessao nula quando URL nao possui tokens', async () => {
    const { authService } = require('@/services/auth');

    await expect(authService.setSessionFromUrl('cuidado://reset')).resolves.toEqual({ data: { session: null }, error: null });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('configura reset de senha com deep link correto', () => {
    const { authService } = require('@/services/auth');
    authService.resetPasswordForEmail('user@test.com');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com', {
      redirectTo: 'cuidado-constante://reset-password'
    });
  });
});

export {};

