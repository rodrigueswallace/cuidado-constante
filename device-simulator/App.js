import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { sha256 } from 'js-sha256';

const SUPABASE_FUNCTION_URL = 'https://nodzwvvbcoejqfbgsfbw.supabase.co/functions/v1/ingest-gps';
const SUPABASE_POLL_URL = 'https://nodzwvvbcoejqfbgsfbw.supabase.co/functions/v1/poll-gps-request';
const COLLAR_ID = 'c0b1b208-38aa-48c2-88a3-8d343964e117';
const COLLAR_SHARED_SECRET = 'test';

const POLL_INTERVAL_MS = 10000;
const LOCATION_TIMEOUT_MS = 25000;

function nowIso() {
  return new Date().toISOString();
}

function formatLogTime(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function withTimeout(promise, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout_localizacao')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    json
  };
}

export default function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Inicializando');
  const [lastLocation, setLastLocation] = useState(null);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const permissionGrantedRef = useRef(false);
  const scrollRef = useRef(null);

  const log = useCallback((message) => {
    setLogs((current) => {
      const next = [...current, `${formatLogTime()} -> ${message}`];
      return next.slice(-220);
    });
  }, []);

  const requestPermission = useCallback(async () => {
    log('Solicitando permissao de localizacao do celular...');
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setPermissionGranted(false);
      permissionGrantedRef.current = false;
      setStatus('Sem permissao de localizacao');
      log('ERRO: permissao de localizacao negada.');
      return false;
    }

    setPermissionGranted(true);
    permissionGrantedRef.current = true;
    log('Permissao de localizacao concedida.');
    return true;
  }, [log]);

  const getPhoneLocation = useCallback(async () => {
    log('Capturando coordenadas do celular...');
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      }),
      LOCATION_TIMEOUT_MS
    );

    const latitude = Number(position.coords.latitude.toFixed(7));
    const longitude = Number(position.coords.longitude.toFixed(7));
    const accuracy = Math.round(position.coords.accuracy ?? 0);

    setLastLocation({ latitude, longitude, accuracy });
    log(`Localizacao obtida: lat=${latitude}, lng=${longitude}, accuracy=${accuracy}m`);

    return { latitude, longitude };
  }, [log]);

  const pollRequest = useCallback(async () => {
    const ts = nowIso();
    const signature = sha256.hmac(COLLAR_SHARED_SECRET, `${COLLAR_ID}|${ts}|poll`);
    const payload = {
      collar_id: COLLAR_ID,
      ts,
      signature
    };

    log('');
    log('Consultando pedido GPS...');
    log(`COLLAR_ID do simulador: ${COLLAR_ID}`);
    log(`POST ${SUPABASE_POLL_URL}`);

    const response = await postJson(SUPABASE_POLL_URL, payload);
    log(`HTTP poll status: ${response.status}`);
    log(`Resposta poll: ${response.text || '(sem body)'}`);

    if (!response.ok) {
      throw new Error(`poll_http_${response.status}`);
    }

    return response.json;
  }, [log]);

  const sendLocation = useCallback(
    async (requestId, latitude, longitude) => {
      const ts = nowIso();
      const signature = sha256.hmac(COLLAR_SHARED_SECRET, `${COLLAR_ID}|${latitude}|${longitude}|${ts}`);
      const payload = {
        collar_id: COLLAR_ID,
        lat: latitude,
        lng: longitude,
        battery: 100,
        ts,
        signature,
        request_id: requestId
      };

      log('Enviando coordenadas para o Supabase...');
      log(`POST ${SUPABASE_FUNCTION_URL}`);
      log(`Payload GPS: ${JSON.stringify({ ...payload, signature: '***' })}`);

      const response = await postJson(SUPABASE_FUNCTION_URL, payload);
      log(`HTTP ingest status: ${response.status}`);
      log(`Resposta ingest: ${response.text || '(sem body)'}`);

      if (!response.ok) {
        throw new Error(`ingest_http_${response.status}`);
      }
    },
    [log]
  );

  const cycle = useCallback(async () => {
    if (busyRef.current) {
      log('Ciclo anterior ainda em andamento. Aguardando...');
      return;
    }

    busyRef.current = true;

    try {
      setStatus('Consultando pedido');
      const pending = await pollRequest();

      if (!pending?.has_request) {
        setStatus('Aguardando pedido');
        log('Nenhum pedido GPS pendente.');
        return;
      }

      const requestId = pending.request_id;
      setLastRequestId(requestId);
      setStatus('Pedido encontrado');
      log(`Pedido GPS encontrado: ${requestId}`);

      const hasPermission = permissionGrantedRef.current || (await requestPermission());
      if (!hasPermission) {
        return;
      }

      setStatus('Capturando localizacao');
      const { latitude, longitude } = await getPhoneLocation();

      setStatus('Enviando para Supabase');
      await sendLocation(requestId, latitude, longitude);

      setStatus('Pedido atendido');
      log('Pedido GPS atendido com sucesso.');
    } catch (error) {
      setStatus('Erro no ciclo');
      log(`ERRO: ${error.message || String(error)}`);
    } finally {
      busyRef.current = false;
    }
  }, [getPhoneLocation, log, pollRequest, requestPermission, sendLocation]);

  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    log('Simulador iniciado.');
    log('Modo automatico: consultando pedidos sem acao do usuario.');
    log(`Intervalo de consulta: ${POLL_INTERVAL_MS / 1000}s`);

    requestPermission().finally(() => {
      cycle();
    });

    const intervalId = setInterval(cycle, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [cycle, log, requestPermission]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [logs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1116" />
      <View style={styles.header}>
        <Text style={styles.title}>Simulador Coleira</Text>
        <Text style={styles.subtitle}>Executando automaticamente como dispositivo GPS</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.meta}>Coleira: {COLLAR_ID}</Text>
        {lastRequestId ? <Text style={styles.meta}>Ultimo pedido: {lastRequestId}</Text> : null}
        {lastLocation ? (
          <Text style={styles.meta}>
            Ultima posicao: {lastLocation.latitude}, {lastLocation.longitude} ({lastLocation.accuracy}m)
          </Text>
        ) : null}
      </View>

      <View style={styles.logBox}>
        <Text style={styles.logTitle}>Monitor serial</Text>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.logContent}>
          {logs.map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0E1116'
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12
  },
  title: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: '700'
  },
  subtitle: {
    color: '#A7B0BD',
    fontSize: 14,
    marginTop: 4
  },
  panel: {
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A323D',
    backgroundColor: '#171C23'
  },
  label: {
    color: '#7B8795',
    fontSize: 12,
    textTransform: 'uppercase'
  },
  status: {
    color: '#48D597',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8
  },
  meta: {
    color: '#D3D9E2',
    fontSize: 13,
    marginTop: 4
  },
  logBox: {
    flex: 1,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A323D',
    backgroundColor: '#05070A',
    overflow: 'hidden'
  },
  logTitle: {
    color: '#F5F7FA',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#202833',
    backgroundColor: '#111820'
  },
  logContent: {
    padding: 12
  },
  logLine: {
    color: '#B8F7C5',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18
  }
});
