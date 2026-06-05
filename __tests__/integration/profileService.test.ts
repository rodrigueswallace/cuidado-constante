const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom
  }
}));

describe('services/profile', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it('busca perfil do tutor autenticado', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { full_name: 'Tutor', phone: '11999999999' }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', created_at: '2026-06-01T10:00:00Z' } }, error: null });
    mockFrom.mockReturnValue({ select });

    const { fetchTutorProfile } = require('@/services/profile');

    await expect(fetchTutorProfile()).resolves.toEqual({
      fullName: 'Tutor',
      phone: '11999999999',
      createdAt: '2026-06-01'
    });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('salva perfil do tutor removendo espacos vazios', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({ upsert });

    const { saveTutorProfile } = require('@/services/profile');
    await saveTutorProfile({ fullName: ' Tutor ', phone: ' ', createdAt: '' });

    expect(upsert).toHaveBeenCalledWith(
      { id: 'user-1', full_name: 'Tutor', phone: null },
      { onConflict: 'id' }
    );
  });

  it('busca pet principal e converte data para exibicao', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'pet-1',
        name: 'Thor',
        species: 'Cachorro',
        birth_date: '2020-01-02',
        color: 'Preto',
        sex: 'Macho',
        weight_kg: 12.5,
        size: '45',
        microchip: null,
        breed: 'SRD',
        notes: null
      },
      error: null
    });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({ select });

    const { fetchPrimaryPetProfile } = require('@/services/profile');

    await expect(fetchPrimaryPetProfile()).resolves.toEqual(expect.objectContaining({
      id: 'pet-1',
      name: 'Thor',
      birthDate: '02/01/2020',
      weightKg: '12.5',
      microchip: '',
      notes: ''
    }));
  });

  it('atualiza pet existente com owner_user_id e campos opcionais normalizados', async () => {
    const eqOwner = jest.fn().mockResolvedValue({ error: null });
    const eqId = jest.fn().mockReturnValue({ eq: eqOwner });
    const update = jest.fn().mockReturnValue({ eq: eqId });

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({ update });

    const { savePrimaryPetProfile } = require('@/services/profile');
    await savePrimaryPetProfile({
      id: 'pet-1',
      name: ' Thor ',
      species: '',
      birthDate: '2020-01-02',
      color: '',
      sex: 'Macho',
      weightKg: '12,5',
      size: '45',
      microchip: '',
      breed: '',
      notes: ''
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      owner_user_id: 'user-1',
      name: 'Thor',
      species: null,
      weight_kg: 12.5,
      size: '45'
    }));
  });

  it('insere novo pet quando nao ha id', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({ insert });

    const { savePrimaryPetProfile } = require('@/services/profile');
    await savePrimaryPetProfile({
      id: null,
      name: 'Thor',
      species: '',
      birthDate: '',
      color: '',
      sex: '',
      weightKg: '',
      size: '',
      microchip: '',
      breed: '',
      notes: ''
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_user_id: 'user-1', name: 'Thor' }));
  });
});

export {};

