#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// =====================================================
// EAAR ESP32-S3 ENVIRONMENT + WI-FI GATEWAY
// Website -> HTTP -> ESP32-S3 -> UART -> HC-05 -> Bluetooth -> ESP32 DevKit
// =====================================================

// ---------- Wi-Fi ----------
// Fill these locally. Do NOT commit real credentials to GitHub.
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// The website sends this key in /command?key=...
// Set the same value in the EAAR website Navigation Controller.
#define API_KEY "YOUR_EAAR_S3_API_KEY"

// ---------- DHT22 ----------
#define DHT1_PIN 4
#define DHT2_PIN 5
#define DHT_TYPE DHT22

DHT dht1(DHT1_PIN, DHT_TYPE);
DHT dht2(DHT2_PIN, DHT_TYPE);

// ---------- Soil moisture ----------
#define SOIL_PIN 1
#define SOIL_DRY 4095
#define SOIL_WET 100

// ---------- LCD ----------
#define LCD_SDA 8
#define LCD_SCL 9
#define LCD_ADDRESS 0x27

LiquidCrystal_I2C lcd(LCD_ADDRESS, 20, 4);

// ---------- HC-05 UART ----------
// S3 UART1: RX=GPIO16, TX=GPIO17
// HC-05 TX -> S3 GPIO16 (RX)
// HC-05 RX <- S3 GPIO17 (TX)
#define HC05_RX 16
#define HC05_TX 17
#define HC05_BAUD 9600

HardwareSerial HC05(1);

WebServer server(80);

float temperature1 = NAN;
float temperature2 = NAN;
float temperatureAverage = NAN;

float humidity1 = NAN;
float humidity2 = NAN;
float humidityAverage = NAN;

int soilRaw = 0;
int soilMoisture = 0;

unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL_MS = 2000;

// =====================================================
// SENSOR READING
// =====================================================

void readSensors() {
  float t1 = dht1.readTemperature();
  float t2 = dht2.readTemperature();

  float h1 = dht1.readHumidity();
  float h2 = dht2.readHumidity();

  if (!isnan(t1)) temperature1 = t1;
  if (!isnan(t2)) temperature2 = t2;
  if (!isnan(h1)) humidity1 = h1;
  if (!isnan(h2)) humidity2 = h2;

  if (!isnan(temperature1) && !isnan(temperature2)) {
    temperatureAverage = (temperature1 + temperature2) / 2.0;
  }

  if (!isnan(humidity1) && !isnan(humidity2)) {
    humidityAverage = (humidity1 + humidity2) / 2.0;
  }

  soilRaw = analogRead(SOIL_PIN);

  int percent = map(
    soilRaw,
    SOIL_DRY,
    SOIL_WET,
    0,
    100
  );

  soilMoisture = constrain(percent, 0, 100);
}

// =====================================================
// LCD
// =====================================================

void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.print("T1:");
  lcd.print(temperature1, 1);
  lcd.print(" T2:");
  lcd.print(temperature2, 1);
  lcd.print("  ");

  lcd.setCursor(0, 1);
  lcd.print("H1:");
  lcd.print(humidity1, 1);
  lcd.print(" H2:");
  lcd.print(humidity2, 1);
  lcd.print("  ");

  lcd.setCursor(0, 2);
  lcd.print("Temp Avg:");
  lcd.print(temperatureAverage, 1);
  lcd.print(" C   ");

  lcd.setCursor(0, 3);
  lcd.print("Soil:");
  lcd.print(soilMoisture);
  lcd.print("% Raw:");
  lcd.print(soilRaw);
  lcd.print("   ");
}

// =====================================================
// HC-05 UART GATEWAY
// =====================================================

bool sendDevKitCommand(char command) {
  if (!(
    command == 'F' ||
    command == 'B' ||
    command == 'L' ||
    command == 'R' ||
    command == 'S' ||
    command == 'T' ||
    command == 'M' ||
    command == 'A' ||
    command == 'D'
  )) {
    return false;
  }

  HC05.write((uint8_t)command);
  HC05.flush();

  Serial.print("[S3 -> HC-05 -> DEVKIT] ");
  Serial.println(command);

  return true;
}

// =====================================================
// HTTP HELPERS
// =====================================================

void addCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

bool checkApiKey() {
  if (!server.hasArg("key")) {
    return false;
  }

  return server.arg("key") == API_KEY;
}

// =====================================================
// HTTP: /status
// =====================================================

void handleStatus() {
  addCors();

  String json = "{";
  json += "\"device\":\"EAAR-ESP32-S3\",";
  json += "\"wifi\":\"";
  json += WiFi.status() == WL_CONNECTED ? "connected" : "disconnected";
  json += "\",";
  json += "\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",";
  json += "\"channel\":";
  json += String(WiFi.channel());
  json += ",";
  json += "\"devkit\":\"HC-05 Bluetooth\",";
  json += "\"uptime\":";
  json += String(millis());
  json += "}";

  server.send(200, "application/json", json);
}

// =====================================================
// HTTP: /environment
// =====================================================

void handleEnvironment() {
  addCors();

  String json = "{";

  json += "\"temperature1\":";
  json += String(temperature1, 1);
  json += ",";

  json += "\"temperature2\":";
  json += String(temperature2, 1);
  json += ",";

  json += "\"temperatureAverage\":";
  json += String(temperatureAverage, 1);
  json += ",";

  json += "\"humidity1\":";
  json += String(humidity1, 1);
  json += ",";

  json += "\"humidity2\":";
  json += String(humidity2, 1);
  json += ",";

  json += "\"humidityAverage\":";
  json += String(humidityAverage, 1);
  json += ",";

  json += "\"soilRaw\":";
  json += String(soilRaw);
  json += ",";

  json += "\"soilMoisture\":";
  json += String(soilMoisture);

  json += "}";

  server.send(200, "application/json", json);
}

// =====================================================
// HTTP: /command?cmd=F&key=...
// =====================================================

void handleCommand() {
  addCors();

  if (!checkApiKey()) {
    server.send(
      401,
      "application/json",
      "{\"ok\":false,\"error\":\"invalid API key\"}"
    );
    return;
  }

  if (!server.hasArg("cmd") || server.arg("cmd").length() < 1) {
    server.send(
      400,
      "application/json",
      "{\"ok\":false,\"error\":\"missing cmd\"}"
    );
    return;
  }

  char command = server.arg("cmd")[0];

  bool sent = sendDevKitCommand(command);

  String json = "{";
  json += "\"ok\":";
  json += sent ? "true" : "false";
  json += ",";
  json += "\"command\":\"";
  json += command;
  json += "\",";
  json += "\"forwarded\":\"ESP-NOW\"";
  json += "}";

  server.send(
    sent ? 200 : 500,
    "application/json",
    json
  );
}

// =====================================================
// HTTP OPTIONS
// =====================================================

void handleOptions() {
  addCors();
  server.send(204);
}

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("================================");
  Serial.println(" EAAR ESP32-S3");
  Serial.println(" ENVIRONMENT + WI-FI GATEWAY");
  Serial.println("================================");

  analogReadResolution(12);

  dht1.begin();
  dht2.begin();

  Wire.begin(LCD_SDA, LCD_SCL);

  lcd.init();
  lcd.backlight();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("EAAR ESP32-S3");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Wi-Fi connecting");

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi: CONNECTED");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Channel: ");
    Serial.println(WiFi.channel());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi: FAILED");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi FAILED");
  }

  HC05.begin(HC05_BAUD, SERIAL_8N1, HC05_RX, HC05_TX);

  Serial.println("HC-05 UART: READY");
  Serial.println("HC-05 RX <- GPIO17");
  Serial.println("HC-05 TX -> GPIO16");

  server.on("/status", HTTP_GET, handleStatus);
  server.on("/environment", HTTP_GET, handleEnvironment);
  server.on("/command", HTTP_GET, handleCommand);

  server.on("/status", HTTP_OPTIONS, handleOptions);
  server.on("/environment", HTTP_OPTIONS, handleOptions);
  server.on("/command", HTTP_OPTIONS, handleOptions);

  server.begin();

  Serial.println("HTTP SERVER: READY");
  Serial.println("GET /status");
  Serial.println("GET /environment");
  Serial.println("GET /command?cmd=F&key=...");
  Serial.println("Website -> S3 -> HC-05 -> DevKit");
  Serial.println("================================");

  readSensors();
  updateLCD();
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  server.handleClient();

  if (millis() - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = millis();

    readSensors();
    updateLCD();

    Serial.print("T=");
    Serial.print(temperatureAverage, 1);
    Serial.print(" C | H=");
    Serial.print(humidityAverage, 1);
    Serial.print(" % | Soil=");
    Serial.print(soilMoisture);
    Serial.println(" %");
  }
}
