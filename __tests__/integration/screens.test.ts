import React from 'react';
import { Alert, Linking, Pressable, Text, TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUseSafeAreaInsets = jest.fn();
const mockUseGpsTracking = jest.fn();
const mockUseBleTracking = jest.fn();
const mockUseAppStore = jest.fn();
const mockRefreshActiveCollar = jest.fn();
const mockHydrate = jest.fn();
const mockRegisterCollar = jest.fn();
const mockDeleteAccount = jest.fn();
const mockSetActiveCollarId = jest.fn();
const mockSetBleAlarmLevel = jest.fn();
const mockSetSilencedBleAlarmKey = jest.fn();
const mockFetchEditableDeviceProfile = jest.fn();
const mockFetchTutorProfile = jest.fn();
const mockSaveTutorProfile = jest.fn();
const mockFetchPrimaryPetProfile = jest.fn();
const mockSavePrimaryPetProfile = jest.fn();
const mockOpenConfigTab = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockUpdatePassword = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockSignUp = jest.fn();
const mockStartBleAlarm = jest.fn();
const mockStopBleAlarm = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack
  }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = require('react');
    ReactRuntime.useEffect(callback, [callback]);
  }
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: mockUseSafeAreaInsets
}));

jest.mock('react-native-maps', () => {
  const ReactRuntime = require('react');
  const { View } = require('react-native');
  const MapView = ReactRuntime.forwardRef((props: any, ref: any) => {
    ReactRuntime.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn()
    }));
    return ReactRuntime.createElement(View, props, props.children);
  });
  return {
    __esModule: true,
    default: MapView,
    Marker: (props: any) => ReactRuntime.createElement(View, props),
    Polyline: (props: any) => ReactRuntime.createElement(View, props)
  };
});

jest.mock('@/hooks/useGpsTracking', () => ({
  useGpsTracking: mockUseGpsTracking
}));

jest.mock('@/components/ui/AppLogo', () => {
  const ReactRuntime = require('react');
  const { Text } = require('react-native');
  return {
    AppLogo: () => ReactRuntime.createElement(Text, null, 'Cuidado Constante')
  };
});

jest.mock('@/hooks/useBleTracking', () => ({
  useBleTracking: mockUseBleTracking
}));

jest.mock('@/store/appStore', () => ({
  useAppStore: mockUseAppStore
}));

jest.mock('@/services/edgeApi', () => ({
  registerCollar: mockRegisterCollar,
  deleteAccount: mockDeleteAccount
}));

jest.mock('@/services/device', () => ({
  fetchEditableDeviceProfile: mockFetchEditableDeviceProfile
}));

jest.mock('@/services/profile', () => ({
  fetchTutorProfile: mockFetchTutorProfile,
  saveTutorProfile: mockSaveTutorProfile,
  fetchPrimaryPetProfile: mockFetchPrimaryPetProfile,
  savePrimaryPetProfile: mockSavePrimaryPetProfile
}));

jest.mock('@/services/auth', () => ({
  authService: {
    signIn: mockSignIn,
    signOut: mockSignOut,
    updatePassword: mockUpdatePassword,
    resetPasswordForEmail: mockResetPasswordForEmail,
    signUp: mockSignUp
  }
}));

jest.mock('@/services/bleAlarm', () => ({
  startBleAlarm: mockStartBleAlarm,
  stopBleAlarm: mockStopBleAlarm
}));

jest.mock('@/navigation/navigationRef', () => ({
  openConfigTab: mockOpenConfigTab
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: mockFrom
  }
}));

const { GpsScreen } = require('@/screens/GpsScreen');
const { AddCollarScreen } = require('@/screens/AddCollarScreen');
const { EditDeviceScreen } = require('@/screens/EditDeviceScreen');
const { EditPetScreen } = require('@/screens/EditPetScreen');
const { AuthScreen } = require('@/screens/AuthScreen');
const { ConfigScreen } = require('@/screens/ConfigScreen');
const { BleScreen } = require('@/screens/BleScreen');
const { EditTutorScreen } = require('@/screens/EditTutorScreen');
const { ResetPasswordScreen } = require('@/screens/ResetPasswordScreen');
const { DeleteAccountScreen } = require('@/screens/DeleteAccountScreen');

function getTextContent(value: unknown): string {
  if (Array.isArray(value)) return value.map(getTextContent).join('');
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function pressByText(tree: renderer.ReactTestRenderer, title: string | RegExp) {
  const textNode = tree.root.findAllByType(Text).find((node) => {
    const content = getTextContent(node.props.children);
    return typeof title === 'string' ? content === title : title.test(content);
  });
  if (!textNode) throw new Error(`Texto nao encontrado: ${title}`);
  let current: any = textNode;
  while (current && typeof current.props?.onPress !== 'function') {
    current = current.parent;
  }
  if (!current) throw new Error(`Botao nao encontrado para: ${title}`);
  current.props.onPress();
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('screens principais', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGoBack.mockReset();
    mockUseSafeAreaInsets.mockReset();
    mockUseGpsTracking.mockReset();
    mockUseBleTracking.mockReset();
    mockUseAppStore.mockReset();
    mockRefreshActiveCollar.mockReset();
    mockHydrate.mockReset();
    mockRegisterCollar.mockReset();
    mockDeleteAccount.mockReset();
    mockSetActiveCollarId.mockReset();
    mockSetBleAlarmLevel.mockReset();
    mockSetSilencedBleAlarmKey.mockReset();
    mockFetchEditableDeviceProfile.mockReset();
    mockFetchTutorProfile.mockReset();
    mockSaveTutorProfile.mockReset();
    mockFetchPrimaryPetProfile.mockReset();
    mockSavePrimaryPetProfile.mockReset();
    mockOpenConfigTab.mockReset();
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockUpdatePassword.mockReset();
    mockResetPasswordForEmail.mockReset();
    mockSignUp.mockReset();
    mockStartBleAlarm.mockReset();
    mockStopBleAlarm.mockReset();
    mockFrom.mockReset();
    mockSelect.mockReset();
    mockOrder.mockReset();
    mockLimit.mockReset();
    mockMaybeSingle.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    mockUseSafeAreaInsets.mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
    mockRefreshActiveCollar.mockResolvedValue('collar-1');
    mockUseAppStore.mockReturnValue({
      activeCollarId: 'collar-1',
      routeThrottleSeconds: 120,
      hydrate: mockHydrate,
      refreshActiveCollar: mockRefreshActiveCollar,
      setActiveCollarId: mockSetActiveCollarId,
      connectedBleDeviceName: 'Coleira BLE',
      bleAlarmLevel: 'very_far',
      isBleAlarmPlaying: false,
      silencedBleAlarmKey: null,
      setBleAlarmLevel: mockSetBleAlarmLevel,
      setSilencedBleAlarmKey: mockSetSilencedBleAlarmKey
    });
    mockUseGpsTracking.mockReturnValue({
      events: [],
      route: null,
      userLocation: null,
      recalcRoute: jest.fn(),
      refresh: jest.fn(),
      requestPositionUpdate: jest.fn(),
      loading: false,
      requestingUpdate: false,
      error: null
    });
    mockUseBleTracking.mockReturnValue({
      devices: [],
      rssi: null,
      battery: null,
      connectedDevice: null,
      scan: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      isScanning: false,
      isConnecting: false,
      connectingDeviceId: null,
      scanStatus: null,
      hasConnectedOnce: false,
      lastDisconnectUnexpected: false
    });
    mockSignIn.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    mockUpdatePassword.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    mockDeleteAccount.mockResolvedValue(undefined);

    mockSelect.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GpsScreen abre o Maps com destino da ultima localizacao da coleira', async () => {
    const requestPositionUpdate = jest.fn();
    const recalcRoute = jest.fn();
    mockUseGpsTracking.mockReturnValue({
      events: [{ id: 'gps-1', lat: -23.4066756, lng: -46.8783888, ts: '2026-06-05T12:00:00Z' }],
      route: null,
      userLocation: { latitude: -23.5, longitude: -46.6 },
      recalcRoute,
      refresh: jest.fn(),
      requestPositionUpdate,
      loading: false,
      requestingUpdate: false,
      error: null
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(GpsScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Abrir no Maps');
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&origin=-23.5,-46.6&destination=-23.4066756,-46.8783888&travelmode=driving'
    );

    await act(async () => {
      pressByText(tree!, 'Recalcular rota');
    });
    expect(recalcRoute).toHaveBeenCalledWith(true);

    await act(async () => {
      pressByText(tree!, 'Atualizar posicao');
    });
    expect(mockRefreshActiveCollar).toHaveBeenCalled();
    expect(requestPositionUpdate).toHaveBeenCalledWith('collar-1');
  });

  it('AddCollarScreen ativa coleira usando pet, serial e codigo informados', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'pet-1', name: 'Thor' }, error: null });
    mockRegisterCollar.mockResolvedValue({ collar_id: 'collar-1', serial: 'ABC123' });
    mockSetActiveCollarId.mockResolvedValue(undefined);
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(AddCollarScreen));
    });
    await flush();

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[1].props.onChangeText('abc123');
      inputs[2].props.onChangeText('code-1');
    });

    await act(async () => {
      pressByText(tree!, 'Ativar dispositivo');
    });

    expect(mockRegisterCollar).toHaveBeenCalledWith({
      pet_id: 'pet-1',
      serial: 'ABC123',
      activation_code: 'code-1'
    });
    expect(mockSetActiveCollarId).toHaveBeenCalledWith('collar-1');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('EditDeviceScreen mostra dados do dispositivo sem campos editaveis e sem botao de salvar', async () => {
    mockFetchEditableDeviceProfile.mockResolvedValue({
      id: 'collar-1',
      petName: 'Thor',
      serial: 'SERIAL-1',
      activationCode: 'ATIV-1',
      displayName: 'Coleira do Thor',
      bleDeviceName: 'BLE Thor'
    });
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(EditDeviceScreen));
    });
    await flush();

    const inputs = tree!.root.findAllByType(TextInput);
    expect(inputs).toHaveLength(5);
    expect(inputs.every((input) => input.props.editable === false)).toBe(true);
    expect(tree!.root.findAllByType(Pressable)).toHaveLength(0);
    expect(mockFetchEditableDeviceProfile).toHaveBeenCalledWith('collar-1');
  });

  it('EditPetScreen usa opcoes de sexo, formata peso e tamanho, e salva payload normalizado', async () => {
    mockFetchPrimaryPetProfile.mockResolvedValue({
      id: 'pet-1',
      name: 'Thor',
      species: 'cachorro',
      birthDate: '',
      color: '',
      sex: 'macho',
      weightKg: '',
      size: '',
      microchip: '',
      breed: '',
      notes: ''
    });
    mockSavePrimaryPetProfile.mockResolvedValue(undefined);
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(EditPetScreen));
    });
    await flush();

    await act(async () => {
      pressByText(tree!, /^F.mea$/);
    });

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[3].props.onChangeText('125');
      inputs[4].props.onChangeText('38cm');
    });

    await act(async () => {
      pressByText(tree!, 'Salvar dados');
    });

    expect(mockSavePrimaryPetProfile).toHaveBeenCalledWith(expect.objectContaining({
      id: 'pet-1',
      name: 'Thor',
      sex: 'femea',
      weightKg: '12.5',
      size: '38'
    }));
    expect(mockOpenConfigTab).toHaveBeenCalled();
  });

  it('AuthScreen faz login com email e senha informados', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(AuthScreen));
    });

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText(' tutor@email.com ');
      inputs[1].props.onChangeText('123456');
    });

    await act(async () => {
      pressByText(tree!, 'Entrar');
    });

    expect(mockSignIn).toHaveBeenCalledWith('tutor@email.com', '123456');
  });

  it('AuthScreen recupera senha por email e atualiza senha no modo recovery', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(AuthScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Esqueci minha senha');
    });

    let inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText('tutor@email.com');
    });
    await act(async () => {
      pressByText(tree!, /Enviar link/);
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('tutor@email.com');

    const onRecoveryComplete = jest.fn();
    await act(async () => {
      tree = renderer.create(React.createElement(AuthScreen, {
        recoveryMode: true,
        onRecoveryComplete
      }));
    });

    inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText('nova123');
      inputs[1].props.onChangeText('nova123');
    });
    await act(async () => {
      pressByText(tree!, 'Atualizar senha');
    });

    expect(mockUpdatePassword).toHaveBeenCalledWith('nova123');
    expect(mockSignOut).toHaveBeenCalled();
    expect(onRecoveryComplete).toHaveBeenCalled();
  });

  it('ConfigScreen navega para telas e executa logout', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(ConfigScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Alterar dados do tutor');
      pressByText(tree!, 'Alterar dados do pet');
      pressByText(tree!, 'Dados do dispositivo');
      pressByText(tree!, 'Redefinir senha');
      pressByText(tree!, 'Excluir conta');
      pressByText(tree!, 'Sair da conta');
    });

    expect(mockNavigate).toHaveBeenCalledWith('EditTutor');
    expect(mockNavigate).toHaveBeenCalledWith('EditPet');
    expect(mockNavigate).toHaveBeenCalledWith('EditDevice');
    expect(mockNavigate).toHaveBeenCalledWith('ResetPassword');
    expect(mockNavigate).toHaveBeenCalledWith('DeleteAccount');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('BleScreen escaneia, conecta dispositivo, escolhe regra e para alarme', async () => {
    const scan = jest.fn();
    const connect = jest.fn();
    const disconnect = jest.fn();
    mockUseAppStore.mockReturnValue({
      activeCollarId: 'collar-1',
      bleAlarmLevel: 'disconnected',
      isBleAlarmPlaying: true,
      silencedBleAlarmKey: null,
      setBleAlarmLevel: mockSetBleAlarmLevel,
      setSilencedBleAlarmKey: mockSetSilencedBleAlarmKey
    });
    mockUseBleTracking.mockReturnValue({
      devices: [{ id: 'dev-1', name: 'ColeiraPadrao', localName: null, rssi: -55 }],
      rssi: -55,
      battery: 75,
      connectedDevice: { id: 'dev-connected', name: 'ColeiraConectada', localName: null },
      scan,
      connect,
      disconnect,
      isScanning: false,
      isConnecting: false,
      connectingDeviceId: null,
      scanStatus: 'Conectado',
      hasConnectedOnce: true,
      lastDisconnectUnexpected: false
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(BleScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Escanear BLE');
      pressByText(tree!, 'Desconectar');
      pressByText(tree!, 'Muito distante');
      pressByText(tree!, 'Parar som');
      pressByText(tree!, 'Conectar');
    });

    expect(scan).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(mockSetBleAlarmLevel).toHaveBeenCalledWith('very_far');
    expect(mockStopBleAlarm).toHaveBeenCalledWith({ silenceCurrent: true });
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ id: 'dev-1' }), 'collar-1');
  });

  it('EditTutorScreen carrega, formata telefone e salva dados do tutor', async () => {
    mockFetchTutorProfile.mockResolvedValue({
      fullName: 'Wallace',
      phone: '11948809483',
      createdAt: '2026-06-05T12:00:00Z'
    });
    mockSaveTutorProfile.mockResolvedValue(undefined);
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(EditTutorScreen));
    });
    await flush();

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText('Wallace Rodrigues');
      inputs[1].props.onChangeText('11999998888');
    });

    await act(async () => {
      pressByText(tree!, 'Salvar dados');
    });

    expect(mockSaveTutorProfile).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Wallace Rodrigues',
      phone: '(11) 99999-8888'
    }));
    expect(mockOpenConfigTab).toHaveBeenCalled();
  });

  it('ResetPasswordScreen valida confirmacao e salva nova senha', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(ResetPasswordScreen));
    });

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText('senha123');
      inputs[1].props.onChangeText('senha123');
    });
    await act(async () => {
      pressByText(tree!, 'Ver senha');
    });
    await act(async () => {
      pressByText(tree!, 'Salvar nova senha');
    });

    expect(mockUpdatePassword).toHaveBeenCalledWith('senha123');
    expect(mockOpenConfigTab).toHaveBeenCalled();
  });

  it('DeleteAccountScreen exclui conta, limpa coleira ativa e encerra sessao', async () => {
    mockSetActiveCollarId.mockResolvedValue(undefined);
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(DeleteAccountScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Excluir conta permanentemente');
    });

    expect(mockDeleteAccount).toHaveBeenCalled();
    expect(mockSetActiveCollarId).toHaveBeenCalledWith(null);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('GpsScreen alerta quando Maps e aberto sem localizacao da coleira', async () => {
    mockUseGpsTracking.mockReturnValue({
      events: [],
      route: null,
      userLocation: { latitude: -23.5, longitude: -46.6 },
      recalcRoute: jest.fn(),
      refresh: jest.fn(),
      requestPositionUpdate: jest.fn(),
      loading: false,
      requestingUpdate: false,
      error: null
    });
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(GpsScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Abrir no Maps');
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Localizacao indisponivel',
      'Atualize a posicao da coleira antes de abrir o Maps.'
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('AddCollarScreen mostra erro amigavel quando serial ou codigo sao invalidos', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'pet-1', name: 'Thor' }, error: null });
    mockRegisterCollar.mockRejectedValue(new Error('serial_ou_codigo_invalido'));
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(AddCollarScreen));
    });
    await flush();

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[1].props.onChangeText('abc123');
      inputs[2].props.onChangeText('code-errado');
    });

    await act(async () => {
      pressByText(tree!, 'Ativar dispositivo');
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Erro ao ativar',
      expect.stringContaining('Serial')
    );
    expect(mockSetActiveCollarId).not.toHaveBeenCalled();
  });

  it('EditPetScreen bloqueia salvar pet sem nome', async () => {
    mockFetchPrimaryPetProfile.mockResolvedValue({
      id: 'pet-1',
      name: '',
      species: 'cachorro',
      birthDate: '',
      color: '',
      sex: '',
      weightKg: '',
      size: '',
      microchip: '',
      breed: '',
      notes: ''
    });
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(EditPetScreen));
    });
    await flush();

    await act(async () => {
      pressByText(tree!, 'Salvar dados');
    });

    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Informe o nome do pet.');
    expect(mockSavePrimaryPetProfile).not.toHaveBeenCalled();
  });

  it('AuthScreen alerta quando login e enviado sem email e senha', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(AuthScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Entrar');
    });

    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Preencha e-mail e senha.');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('ResetPasswordScreen bloqueia senha com confirmacao diferente', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(ResetPasswordScreen));
    });

    const inputs = tree!.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText('senha123');
      inputs[1].props.onChangeText('outra123');
    });
    await act(async () => {
      pressByText(tree!, 'Salvar nova senha');
    });

    expect(Alert.alert).toHaveBeenCalledWith('Erro', expect.stringContaining('senhas'));
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('DeleteAccountScreen mostra erro e nao encerra sessao quando exclusao falha', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('edge indisponivel'));
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(DeleteAccountScreen));
    });

    await act(async () => {
      pressByText(tree!, 'Excluir conta permanentemente');
    });

    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'edge indisponivel');
    expect(mockSetActiveCollarId).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

export {};
