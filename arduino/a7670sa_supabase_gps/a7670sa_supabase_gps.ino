/*
  ESP32-C6-Zero + A7670SA -> Supabase ingest-gps

  Fluxo:
  1. Consulta o Supabase a cada alguns segundos.
  2. Se houver pedido pendente, liga GNSS/GPS.
  3. Tenta obter coordenadas reais.
  4. Se nao conseguir, usa coordenada fallback.
  5. Assina collar_id|lat|lng|ts com HMAC SHA-256.
  6. Envia POST JSON para Supabase Edge Function ingest-gps.

  Ligacao:
  - ESP32 GPIO2  -> RXD do A7670SA
  - ESP32 GPIO3  -> TXD do A7670SA
  - ESP32 GPIO21 -> PWR-K do A7670SA
  - ESP32 GND    -> GND do A7670SA
*/

#include "mbedtls/md.h"

#define MODEM_RX_PIN 3
#define MODEM_TX_PIN 2
#define MODEM_PWRKEY_PIN 21
#define MODEM_BAUD 115200

// Ajuste estes valores.
static const char* SUPABASE_FUNCTION_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1/ingest-gps";
static const char* SUPABASE_POLL_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1/poll-gps-request";
static const char* COLLAR_ID = "COLOQUE_O_UUID_DA_COLEIRA";
static const char* COLLAR_SHARED_SECRET = "COLOQUE_O_COLLAR_SHARED_SECRET";

// Coordenada usada se o GNSS nao conseguir fix.
static const double FALLBACK_LAT = -23.4066756;
static const double FALLBACK_LNG = -46.8783888;

static const int FALLBACK_BATTERY = 80;
static const unsigned long GPS_WAIT_MS = 180000; // 3 minutos
static const unsigned long GPS_POLL_MS = 15000;
static const unsigned long REQUEST_POLL_MS = 10000;

HardwareSerial ModemSerial(1);

struct GpsFix {
  bool valid;
  double lat;
  double lng;
};

String lastResponse;
unsigned long lastRequestPollAt = 0;
bool modemInitialized = false;

void logLine(const String& value) {
  Serial.println(value);
}

void pulsePowerKey() {
  Serial.println("Pulsando PWR-K...");
  pinMode(MODEM_PWRKEY_PIN, OUTPUT);
  digitalWrite(MODEM_PWRKEY_PIN, LOW);
  delay(1500);
  pinMode(MODEM_PWRKEY_PIN, INPUT);
  Serial.println("PWR-K solto.");
}

String readModem(unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();

  while (millis() - startedAt < timeoutMs) {
    while (ModemSerial.available()) {
      char c = (char)ModemSerial.read();
      response += c;
      Serial.write(c);
    }
    delay(5);
  }

  lastResponse = response;
  return response;
}

String sendAT(const String& command, unsigned long timeoutMs = 1000) {
  Serial.print(">> ");
  Serial.println(command);
  ModemSerial.print(command);
  ModemSerial.print("\r\n");
  String response = readModem(timeoutMs);
  Serial.println();
  return response;
}

bool responseHasOk(const String& response) {
  return response.indexOf("OK") >= 0;
}

bool waitForToken(const char* token, unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();

  while (millis() - startedAt < timeoutMs) {
    while (ModemSerial.available()) {
      char c = (char)ModemSerial.read();
      response += c;
      Serial.write(c);
      if (response.indexOf(token) >= 0) return true;
    }
    delay(5);
  }

  return false;
}

String hmacSha256Hex(const String& key, const String& message) {
  unsigned char hmac[32];
  const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (!md) return "";

  int rc = mbedtls_md_hmac(
    md,
    (const unsigned char*)key.c_str(),
    key.length(),
    (const unsigned char*)message.c_str(),
    message.length(),
    hmac
  );
  if (rc != 0) return "";

  char out[65];
  for (int i = 0; i < 32; i++) {
    sprintf(&out[i * 2], "%02x", hmac[i]);
  }
  out[64] = '\0';
  return String(out);
}

double nmeaToDecimal(const String& raw, const String& hemisphere) {
  if (!raw.length()) return 0.0;

  int dot = raw.indexOf('.');
  if (dot < 0 || dot < 2) return 0.0;

  int degDigits = dot > 4 ? 3 : 2;
  double degrees = raw.substring(0, degDigits).toDouble();
  double minutes = raw.substring(degDigits).toDouble();
  double value = degrees + (minutes / 60.0);

  if (hemisphere == "S" || hemisphere == "W") value *= -1.0;
  return value;
}

String getCsvField(const String& csv, int index) {
  int start = 0;
  int current = 0;

  for (int i = 0; i <= csv.length(); i++) {
    if (i == csv.length() || csv.charAt(i) == ',') {
      if (current == index) return csv.substring(start, i);
      current++;
      start = i + 1;
    }
  }

  return "";
}

GpsFix parseGpsInfo(const String& response, const String& prefix) {
  GpsFix fix = { false, FALLBACK_LAT, FALLBACK_LNG };

  int lineStart = response.indexOf(prefix);
  if (lineStart < 0) return fix;

  int valueStart = response.indexOf(':', lineStart);
  if (valueStart < 0) return fix;
  valueStart++;

  int lineEnd = response.indexOf('\n', valueStart);
  if (lineEnd < 0) lineEnd = response.length();

  String csv = response.substring(valueStart, lineEnd);
  csv.trim();

  // Formato comum:
  // +CGPSINFO: <lat>,<N/S>,<lng>,<E/W>,<date>,<UTC>,...
  if (prefix == "+CGPSINFO") {
    String latRaw = getCsvField(csv, 0);
    String latHem = getCsvField(csv, 1);
    String lngRaw = getCsvField(csv, 2);
    String lngHem = getCsvField(csv, 3);

    if (latRaw.length() && latHem.length() && lngRaw.length() && lngHem.length()) {
      fix.valid = true;
      fix.lat = nmeaToDecimal(latRaw, latHem);
      fix.lng = nmeaToDecimal(lngRaw, lngHem);
    }
    return fix;
  }

  // Formato comum:
  // +CGNSSINFO: <mode>,<sat>,...,<lat>,<N/S>,<lng>,<E/W>,...
  // Em alguns firmwares os campos variam; tentamos localizar o primeiro par N/S + E/W.
  for (int i = 0; i < 12; i++) {
    String field = getCsvField(csv, i);
    if (field == "N" || field == "S") {
      String latRaw = getCsvField(csv, i - 1);
      String lngRaw = getCsvField(csv, i + 1);
      String lngHem = getCsvField(csv, i + 2);

      if (latRaw.length() && lngRaw.length() && (lngHem == "E" || lngHem == "W")) {
        fix.valid = true;
        fix.lat = nmeaToDecimal(latRaw, field);
        fix.lng = nmeaToDecimal(lngRaw, lngHem);
        return fix;
      }
    }
  }

  return fix;
}

String getTimestampIso() {
  String response = sendAT("AT+CCLK?", 1000);
  int start = response.indexOf("+CCLK:");
  if (start >= 0) {
    int firstQuote = response.indexOf('"', start);
    int secondQuote = response.indexOf('"', firstQuote + 1);
    if (firstQuote >= 0 && secondQuote > firstQuote) {
      String raw = response.substring(firstQuote + 1, secondQuote);
      // Exemplo: 26/06/01,20:30:10-12
      if (raw.length() >= 17) {
        String yy = raw.substring(0, 2);
        String mm = raw.substring(3, 5);
        String dd = raw.substring(6, 8);
        String hh = raw.substring(9, 11);
        String mi = raw.substring(12, 14);
        String ss = raw.substring(15, 17);
        return "20" + yy + "-" + mm + "-" + dd + "T" + hh + ":" + mi + ":" + ss + "Z";
      }
    }
  }

  return "2026-06-01T20:00:00Z";
}

bool initModem() {
  sendAT("AT", 1000);
  sendAT("ATE1", 1000);
  sendAT("AT+CMEE=2", 1000);
  sendAT("AT+CPIN?", 1000);
  sendAT("AT+CSQ", 1000);
  sendAT("AT+CEREG?", 1000);
  sendAT("AT+CGATT?", 1000);
  sendAT("AT+CGDCONT?", 1000);
  return true;
}

void ensurePacketData() {
  sendAT("AT+CPIN?", 1000);
  sendAT("AT+CSQ", 1000);
  sendAT("AT+CEREG?", 1000);
  sendAT("AT+CGATT?", 1000);
  sendAT("AT+CGDCONT?", 1000);

  // Em alguns firmwares SIMCom, o HTTP precisa da rede de dados aberta antes.
  sendAT("AT+NETOPEN", 8000);
  sendAT("AT+IPADDR", 2000);
}

void powerGnss() {
  sendAT("AT+CGNSSPWR=1", 1500);
  sendAT("AT+CGNSSPWR?", 1000);
}

GpsFix getGpsFixOrFallback() {
  const unsigned long startedAt = millis();
  GpsFix fix = { false, FALLBACK_LAT, FALLBACK_LNG };

  while (millis() - startedAt < GPS_WAIT_MS) {
    String gpsInfo = sendAT("AT+CGPSINFO", 2000);
    fix = parseGpsInfo(gpsInfo, "+CGPSINFO");
    if (fix.valid) return fix;

    String gnssInfo = sendAT("AT+CGNSSINFO", 2000);
    fix = parseGpsInfo(gnssInfo, "+CGNSSINFO");
    if (fix.valid) return fix;

    Serial.println("Sem fix GNSS ainda. Aguardando...");
    delay(GPS_POLL_MS);
  }

  Serial.println("GNSS sem fix. Usando coordenada fallback.");
  return fix;
}

String buildGpsPayload(const GpsFix& fix, const String& timestamp, const String& requestId = "") {
  String lat = String(fix.lat, 7);
  String lng = String(fix.lng, 7);
  String canonical = String(COLLAR_ID) + "|" + lat + "|" + lng + "|" + timestamp;
  String signature = hmacSha256Hex(COLLAR_SHARED_SECRET, canonical);

  String body = "{";
  body += "\"collar_id\":\"" + String(COLLAR_ID) + "\",";
  body += "\"lat\":" + lat + ",";
  body += "\"lng\":" + lng + ",";
  body += "\"battery\":" + String(FALLBACK_BATTERY) + ",";
  body += "\"ts\":\"" + timestamp + "\",";
  body += "\"signature\":\"" + signature + "\"";
  if (requestId.length()) {
    body += ",\"request_id\":\"" + requestId + "\"";
  }
  body += "}";

  Serial.print("Canonical: ");
  Serial.println(canonical);
  Serial.print("Payload: ");
  Serial.println(body);

  return body;
}

String extractHttpBody(const String& response) {
  int marker = response.indexOf("+HTTPREAD:");
  if (marker < 0) return "";

  int bodyStart = response.indexOf('\n', marker);
  if (bodyStart < 0) return "";
  bodyStart++;

  int bodyEnd = response.indexOf("\r\nOK", bodyStart);
  if (bodyEnd < 0) bodyEnd = response.indexOf("\nOK", bodyStart);
  if (bodyEnd < 0) bodyEnd = response.length();

  String body = response.substring(bodyStart, bodyEnd);
  body.trim();
  return body;
}

int extractHttpStatus(const String& response) {
  int marker = response.indexOf("+HTTPACTION:");
  if (marker < 0) return -1;

  int firstComma = response.indexOf(',', marker);
  if (firstComma < 0) return -1;

  int secondComma = response.indexOf(',', firstComma + 1);
  if (secondComma < 0) return -1;

  return response.substring(firstComma + 1, secondComma).toInt();
}

String httpPostJson(const String& url, const String& body, bool useHttps) {
  sendAT("AT+HTTPTERM", 500);
  String initResponse = sendAT("AT+HTTPINIT", 1000);
  if (!responseHasOk(initResponse)) {
    Serial.println("HTTPINIT falhou. Revalidando rede de dados e tentando novamente...");
    ensurePacketData();
    initResponse = sendAT("AT+HTTPINIT", 1000);
    if (!responseHasOk(initResponse)) {
      Serial.println("HTTPINIT continuou falhando.");
      return "";
    }
  }

  sendAT(String("AT+HTTPSSL=") + (useHttps ? "1" : "0"), 1000);
  sendAT("AT+HTTPPARA=\"URL\",\"" + url + "\"", 1000);
  sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);

  String dataCommand = "AT+HTTPDATA=" + String(body.length()) + ",10000";
  Serial.print(">> ");
  Serial.println(dataCommand);
  ModemSerial.print(dataCommand);
  ModemSerial.print("\r\n");

  if (!waitForToken("DOWNLOAD", 5000)) {
    Serial.println();
    Serial.println("Falha: modem nao entrou em modo DOWNLOAD.");
    sendAT("AT+HTTPTERM", 1000);
    return "";
  }

  Serial.println();
  Serial.println(">> JSON DATA");
  ModemSerial.print(body);
  readModem(12000);

  String action = sendAT("AT+HTTPACTION=1", 12000);
  String actionResult = readModem(12000);
  String combinedAction = action + actionResult;
  int httpStatus = extractHttpStatus(combinedAction);
  Serial.print("HTTP status detectado: ");
  Serial.println(httpStatus);

  String readResponse = sendAT("AT+HTTPREAD=0,1024", 5000);
  String responseBody = extractHttpBody(readResponse);

  if (!responseBody.length()) {
    Serial.println("HTTPREAD com parametros nao retornou body. Tentando AT+HTTPREAD sem parametros...");
    readResponse = sendAT("AT+HTTPREAD", 5000);
    responseBody = extractHttpBody(readResponse);
  }

  sendAT("AT+HTTPTERM", 1000);

  if (httpStatus != 200) {
    Serial.print("HTTP falhou com status: ");
    Serial.println(httpStatus);
    Serial.print("Body erro: ");
    Serial.println(responseBody);
    return "";
  }

  return responseBody;
}

bool httpPostSupabase(const String& body) {
  String response = httpPostJson(SUPABASE_FUNCTION_URL, body, true);
  return response.length() > 0 || lastResponse.indexOf("\"ok\":true") >= 0;
}

void sendGpsToSupabase(const String& requestId = "") {
  Serial.println("Iniciando envio GPS para Supabase...");

  initModem();
  powerGnss();

  GpsFix fix = getGpsFixOrFallback();
  Serial.print("Coordenada escolhida: ");
  Serial.print(fix.lat, 7);
  Serial.print(", ");
  Serial.println(fix.lng, 7);
  Serial.println(fix.valid ? "Origem: GNSS real" : "Origem: fallback");

  String timestamp = getTimestampIso();
  String body = buildGpsPayload(fix, timestamp, requestId);

  bool ok = httpPostSupabase(body);
  Serial.println(ok ? "POST Supabase OK" : "POST Supabase falhou. Veja logs acima.");
}

String jsonStringValue(const String& json, const String& key) {
  String pattern = "\"" + key + "\":";
  int start = json.indexOf(pattern);
  if (start < 0) return "";
  start += pattern.length();

  while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '"')) start++;

  int end = start;
  while (end < json.length() && json.charAt(end) != '"' && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
  return json.substring(start, end);
}

bool jsonBoolValue(const String& json, const String& key) {
  String pattern = "\"" + key + "\":true";
  return json.indexOf(pattern) >= 0;
}

void pollForGpsRequest() {
  if (!modemInitialized) {
    initModem();
    modemInitialized = true;
  }

  String timestamp = getTimestampIso();
  String canonical = String(COLLAR_ID) + "|" + timestamp + "|poll";
  String signature = hmacSha256Hex(COLLAR_SHARED_SECRET, canonical);

  String body = "{";
  body += "\"collar_id\":\"" + String(COLLAR_ID) + "\",";
  body += "\"ts\":\"" + timestamp + "\",";
  body += "\"signature\":\"" + signature + "\"";
  body += "}";

  Serial.println("Consultando pedido GPS...");
  Serial.print("COLLAR_ID do firmware: ");
  Serial.println(COLLAR_ID);
  String response = httpPostJson(SUPABASE_POLL_URL, body, true);
  Serial.print("Resposta poll: ");
  Serial.println(response);

  if (!jsonBoolValue(response, "has_request")) {
    return;
  }

  String requestId = jsonStringValue(response, "request_id");
  if (!requestId.length()) {
    Serial.println("Pedido recebido sem request_id. Ignorando.");
    return;
  }

  Serial.print("Pedido GPS recebido: ");
  Serial.println(requestId);
  sendGpsToSupabase(requestId);
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  ModemSerial.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  pinMode(MODEM_PWRKEY_PIN, INPUT);

  Serial.println();
  Serial.println("ESP32-C6-Zero + A7670SA -> Supabase GPS");
  Serial.println("IMPORTANTE: preencha SUPABASE_FUNCTION_URL, SUPABASE_POLL_URL, COLLAR_ID e COLLAR_SHARED_SECRET.");
  Serial.println("O firmware consultara pedidos automaticamente. Digite 'send' para envio manual.");
}

String inputLine;

void handleCommand(String line) {
  line.trim();
  if (!line.length()) return;

  String lower = line;
  lower.toLowerCase();

  if (lower == "send") {
    sendGpsToSupabase();
  } else if (lower == "poll") {
    pollForGpsRequest();
  } else if (lower == "pwr") {
    pulsePowerKey();
  } else if (lower == "gps") {
    powerGnss();
    GpsFix fix = getGpsFixOrFallback();
    Serial.print("GPS: ");
    Serial.print(fix.lat, 7);
    Serial.print(", ");
    Serial.println(fix.lng, 7);
  } else {
    sendAT(line, 2000);
  }
}

void loop() {
  while (ModemSerial.available()) {
    Serial.write(ModemSerial.read());
  }

  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputLine.length()) {
        handleCommand(inputLine);
        inputLine = "";
      }
    } else {
      inputLine += c;
    }
  }

  if (millis() - lastRequestPollAt >= REQUEST_POLL_MS) {
    lastRequestPollAt = millis();
    pollForGpsRequest();
  }
}
