const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom
  }
}));

describe('services/device', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it('busca dados do dispositivo em modo de visualizacao', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'collar-1',
        serial: 'SERIAL-1',
        activation_code: 'ABC123',
        display_name: 'Coleira Thor',
        ble_device_name: 'ThorBLE',
        pets: { name: 'Thor' }
      },
      error: null
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({ select });

    const { fetchEditableDeviceProfile } = require('@/services/device');
    const result = await fetchEditableDeviceProfile('collar-1');

    expect(result).toEqual({
      id: 'collar-1',
      petName: 'Thor',
      serial: 'SERIAL-1',
      activationCode: 'ABC123',
      displayName: 'Coleira Thor',
      bleDeviceName: 'ThorBLE'
    });
    expect(select).toHaveBeenCalledWith('id, serial, activation_code, display_name, ble_device_name, pets(name)');
    expect(eq).toHaveBeenCalledWith('id', 'collar-1');
  });

  it('atualizacao de dados do dispositivo nao altera serial nem codigo de ativacao', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({ update });

    const { saveEditableDeviceProfile } = require('@/services/device');
    await saveEditableDeviceProfile({
      id: 'collar-1',
      petName: 'Thor',
      serial: 'SERIAL-TENTATIVA',
      activationCode: 'CODIGO-TENTATIVA',
      displayName: ' Coleira Thor ',
      bleDeviceName: ' ThorBLE '
    });

    expect(update).toHaveBeenCalledWith({
      display_name: 'Coleira Thor',
      ble_device_name: 'ThorBLE'
    });
  });

  it('bloqueia acesso quando nao ha usuario autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { fetchEditableDeviceProfile } = require('@/services/device');

    await expect(fetchEditableDeviceProfile('collar-1')).rejects.toThrow('usuario_nao_autenticado');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

export {};
