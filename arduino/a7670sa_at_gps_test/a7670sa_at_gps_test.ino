/*
  ESP32-C6-Zero + A7670SA - teste AT, 4G e GPS/GNSS

  Ligacao usada:
  - ESP32 GPIO2  -> RXD do A7670SA
  - ESP32 GPIO3  -> TXD do A7670SA
  - ESP32 GPIO21 -> PWR-K do A7670SA
  - ESP32 GND    -> GND do A7670SA

  Serial Monitor:
  - Baud: 115200
  - Line ending: Newline ou Both NL & CR

  Comandos locais:
  - help      mostra ajuda
  - pwr       pulsa PWR-K por 1.5s
  - init      comandos basicos de modem
  - net       status de SIM, sinal e rede
  - gpson     liga GNSS/GPS
  - gps       le localizacao GNSS
  - gpsoff    desliga GNSS/GPS
  - http      teste HTTP simples via 4G
  - sms       envia SMS de teste
  - scanbaud  tenta detectar o baud rate do modem

  Qualquer outro texto digitado e enviado direto ao modem como comando AT.
*/

#define MODEM_RX_PIN 3
#define MODEM_TX_PIN 2
#define MODEM_PWRKEY_PIN 21
#define MODEM_BAUD 115200

const char* TEST_SMS_NUMBER = "+5511948809483";
const char* TEST_SMS_MESSAGE = "Teste Cuidado Constante via A7670SA";

HardwareSerial ModemSerial(1);

String inputLine;

const uint32_t BAUD_CANDIDATES[] = { 115200, 9600, 19200, 38400, 57600, 230400 };
const size_t BAUD_CANDIDATES_COUNT = sizeof(BAUD_CANDIDATES) / sizeof(BAUD_CANDIDATES[0]);

void printHelp() {
  Serial.println();
  Serial.println("=== ESP32-C6-Zero + A7670SA teste ===");
  Serial.println("Comandos locais:");
  Serial.println("  help   - mostra esta ajuda");
  Serial.println("  pwr    - pulsa PWR-K por 1.5s");
  Serial.println("  init   - AT basico");
  Serial.println("  net    - SIM, sinal e rede");
  Serial.println("  gpson  - liga GNSS/GPS");
  Serial.println("  gps    - le localizacao GNSS");
  Serial.println("  gpsoff - desliga GNSS/GPS");
  Serial.println("  http   - teste HTTP GET via 4G");
  Serial.println("  sms    - envia SMS de teste");
  Serial.println("  scanbaud - tenta detectar baud rate do modem");
  Serial.println();
  Serial.println("Comandos AT manuais tambem funcionam:");
  Serial.println("  AT");
  Serial.println("  ATI");
  Serial.println("  AT+CPIN?");
  Serial.println("  AT+CSQ");
  Serial.println("  AT+CEREG?");
  Serial.println("  AT+CGATT?");
  Serial.println("  AT+CGNSSPWR?");
  Serial.println("  AT+CGNSSINFO");
  Serial.println();
}

void pulsePowerKey() {
  Serial.println("Pulsando PWR-K por 1.5s...");
  pinMode(MODEM_PWRKEY_PIN, OUTPUT);
  digitalWrite(MODEM_PWRKEY_PIN, LOW);
  delay(1500);
  pinMode(MODEM_PWRKEY_PIN, INPUT);
  Serial.println("PWR-K solto. Aguarde o modem iniciar.");
}

void drainModem(unsigned long timeoutMs) {
  const unsigned long startedAt = millis();

  while (millis() - startedAt < timeoutMs) {
    while (ModemSerial.available()) {
      Serial.write(ModemSerial.read());
    }
    delay(5);
  }
}

void sendAT(const char* command, unsigned long waitMs = 1000) {
  Serial.print(">> ");
  Serial.println(command);
  ModemSerial.print(command);
  ModemSerial.print("\r\n");
  drainModem(waitMs);
  Serial.println();
}

bool waitForToken(const char* token, unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();

  while (millis() - startedAt < timeoutMs) {
    while (ModemSerial.available()) {
      char c = (char)ModemSerial.read();
      Serial.write(c);
      response += c;
      if (response.indexOf(token) >= 0) {
        return true;
      }
      if (response.length() > 300) {
        response.remove(0, response.length() - 120);
      }
    }
    delay(5);
  }

  return false;
}

void setModemBaud(uint32_t baud) {
  ModemSerial.end();
  delay(100);
  ModemSerial.begin(baud, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  delay(150);
}

void scanModemBaud() {
  Serial.println("Iniciando scan de baud do modem...");
  Serial.println("Se aparecer OK, mantenha esse baud no #define MODEM_BAUD.");

  for (size_t i = 0; i < BAUD_CANDIDATES_COUNT; i++) {
    uint32_t baud = BAUD_CANDIDATES[i];
    Serial.print("Testando baud ");
    Serial.println(baud);

    setModemBaud(baud);
    while (ModemSerial.available()) ModemSerial.read();

    for (int attempt = 0; attempt < 3; attempt++) {
      Serial.print(">> AT @ ");
      Serial.println(baud);
      ModemSerial.print("AT\r\n");
      if (waitForToken("OK", 900)) {
        Serial.println();
        Serial.print("BAUD_DETECTADO=");
        Serial.println(baud);
        return;
      }
      Serial.println();
      delay(200);
    }
  }

  Serial.println("Nenhum baud respondeu OK.");
  Serial.println("Confira: TX/RX cruzados, GND comum, modem ligado e pino correto TXD/RXD no A7670.");
  setModemBaud(MODEM_BAUD);
}

void runInit() {
  sendAT("AT", 800);
  sendAT("ATE1", 800);
  sendAT("ATI", 1200);
  sendAT("AT+CMEE=2", 800);
}

void runNetworkCheck() {
  sendAT("AT+CPIN?", 1000);
  sendAT("AT+CSQ", 1000);
  sendAT("AT+COPS?", 1500);
  sendAT("AT+CEREG?", 1000);
  sendAT("AT+CGREG?", 1000);
  sendAT("AT+CGATT?", 1000);
  sendAT("AT+CGDCONT?", 1000);
}

void runGpsOn() {
  sendAT("AT+CGNSSPWR=1", 1500);
  sendAT("AT+CGNSSPWR?", 1000);
  Serial.println("GNSS ligado. Para primeiro fix, aguarde alguns minutos em area aberta.");
}

void runGpsRead() {
  sendAT("AT+CGNSSINFO", 2000);
}

void runGpsOff() {
  sendAT("AT+CGNSSPWR=0", 1500);
  sendAT("AT+CGNSSPWR?", 1000);
}

void runHttpTest() {
  Serial.println("Teste HTTP. Se falhar, confira APN/SIM/sinal.");
  sendAT("AT+CGATT?", 1000);
  sendAT("AT+HTTPTERM", 500);
  sendAT("AT+HTTPINIT", 1000);
  sendAT("AT+HTTPPARA=\"CID\",1", 800);
  sendAT("AT+HTTPPARA=\"URL\",\"http://httpbin.org/get\"", 800);
  sendAT("AT+HTTPACTION=0", 8000);
  sendAT("AT+HTTPREAD", 5000);
  sendAT("AT+HTTPTERM", 1000);
}

void runSmsTest() {
  Serial.print("Enviando SMS para ");
  Serial.println(TEST_SMS_NUMBER);

  sendAT("AT+CMGF=1", 1000);
  sendAT("AT+CSCS=\"GSM\"", 1000);

  Serial.print(">> AT+CMGS=\"");
  Serial.print(TEST_SMS_NUMBER);
  Serial.println("\"");

  ModemSerial.print("AT+CMGS=\"");
  ModemSerial.print(TEST_SMS_NUMBER);
  ModemSerial.print("\"\r\n");

  if (!waitForToken(">", 5000)) {
    Serial.println();
    Serial.println("Nao recebi prompt '>' do modem. SMS nao enviado.");
    return;
  }

  Serial.println();
  Serial.print(">> ");
  Serial.println(TEST_SMS_MESSAGE);

  ModemSerial.print(TEST_SMS_MESSAGE);
  ModemSerial.write(26);

  drainModem(15000);
  Serial.println();
}

void handleLocalCommand(String line) {
  line.trim();
  if (!line.length()) return;

  String lower = line;
  lower.toLowerCase();

  if (lower == "help") {
    printHelp();
  } else if (lower == "pwr") {
    pulsePowerKey();
  } else if (lower == "init") {
    runInit();
  } else if (lower == "net") {
    runNetworkCheck();
  } else if (lower == "gpson") {
    runGpsOn();
  } else if (lower == "gps") {
    runGpsRead();
  } else if (lower == "gpsoff") {
    runGpsOff();
  } else if (lower == "http") {
    runHttpTest();
  } else if (lower == "sms") {
    runSmsTest();
  } else if (lower == "scanbaud") {
    scanModemBaud();
  } else {
    ModemSerial.print(line);
    ModemSerial.print("\r\n");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  ModemSerial.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  pinMode(MODEM_PWRKEY_PIN, INPUT);

  Serial.println();
  Serial.println("ESP32-C6-Zero + A7670SA pronto.");
  Serial.println("Serial Monitor em 115200.");
  Serial.println("Digite 'help'. Se o modem nao responder a AT, digite 'pwr' e aguarde.");
  printHelp();
}

void loop() {
  while (ModemSerial.available()) {
    Serial.write(ModemSerial.read());
  }

  while (Serial.available()) {
    const char c = (char)Serial.read();

    if (c == '\n' || c == '\r') {
      if (inputLine.length()) {
        handleLocalCommand(inputLine);
        inputLine = "";
      }
    } else {
      inputLine += c;
    }
  }
}
