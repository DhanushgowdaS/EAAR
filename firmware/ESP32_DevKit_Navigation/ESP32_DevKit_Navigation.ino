#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <Adafruit_NeoPixel.h>

#define RX_PIN 16
#define TX_PIN 17

#define ENA 25
#define ENB 26

#define IN1 32
#define IN2 23
#define IN3 33
#define IN4 22

#define SPEED 225
#define CORR_AMOUNT 40
#define MAX_RECORDS 100

#define LED_PIN 4
#define NUM_LEDS 8
#define SNAKE_STEP_MS 150
#define EFFECT_STEP_MS 30
#define HUE_STEP 512
#define DJ_SPREAD (65536 / NUM_LEDS)

// =====================================================
// WIFI SETTINGS
// =====================================================

// Keep your existing Wi-Fi credentials here.
// Do NOT publish the password to GitHub.
const char* WIFI_SSID = "Admin";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// HTTP server used by the EAAR website.
WebServer server(80);

// Persistent API key stored in ESP32 Preferences.
String apiKey = "";

// Website command safety timeout.
// The website repeatedly sends movement commands while a control is held.
// If communication stops, the rover automatically stops.
const unsigned long WEB_COMMAND_TIMEOUT_MS = 900;
unsigned long lastWebCommandTime = 0;
bool webCommandActive = false;

HardwareSerial HC05(2);
HardwareSerial NanoSerial(1);
Preferences prefs;
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

struct RouteRecord {
  char command;
  unsigned long duration;
};

RouteRecord route[MAX_RECORDS];

int routeCount = 0;

char currentState = 'S';
unsigned long stateStartTime = 0;

bool recording = false;
bool automaticMode = false;

char lastCorrection = 'N';

char cmdBuffer[16];
int bufLen = 0;
unsigned long lastCharTime = 0;
const unsigned long GAP_MS = 60;

int currentR = 255, currentG = 190, currentB = 20;

bool snakeActive = false;
bool snakeGrowing = true;
int snakeStep = 0;
unsigned long lastSnakeStep = 0;

bool fadeActive = false;
uint16_t fadeHue = 0;
unsigned long lastFadeStep = 0;

bool djActive = false;
uint16_t djHue = 0;
unsigned long lastDjStep = 0;

// =====================================================
// API KEY
// =====================================================

String generateApiKey() {

  uint32_t a = esp_random();
  uint32_t b = esp_random();
  uint32_t c = esp_random();
  uint32_t d = esp_random();

  char key[33];

  snprintf(
    key,
    sizeof(key),
    "%08lX%08lX%08lX%08lX",
    (unsigned long)a,
    (unsigned long)b,
    (unsigned long)c,
    (unsigned long)d
  );

  return String(key);
}

void loadOrCreateApiKey() {

  apiKey = prefs.getString("api_key", "");

  if (apiKey.length() == 0) {

    apiKey = generateApiKey();

    prefs.putString("api_key", apiKey);

    Serial.println("NEW API KEY CREATED");
  }
  else {

    Serial.println("EXISTING API KEY LOADED");
  }

  Serial.print("API KEY: ");
  Serial.println(apiKey);
}

// =====================================================
// WIFI
// =====================================================

void connectWiFi() {

  WiFi.mode(WIFI_STA);

  // Reduce Wi-Fi transmit power to lower the instantaneous current
  // demand during startup and normal operation.
  WiFi.setTxPower(WIFI_POWER_8_5dBm);

  Serial.println("WIFI: RADIO INITIALIZED");
  Serial.println("WIFI: STARTING CONNECTION...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println();
  Serial.println("================================");
  Serial.println(" CONNECTING TO WIFI");
  Serial.println("================================");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < 15000) {

    delay(250);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("WIFI: CONNECTED");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());

    Serial.print("ESP32 URL: http://");
    Serial.println(WiFi.localIP());
  }
  else {

    Serial.println("WIFI: CONNECTION FAILED");
    Serial.println("Bluetooth/motor functions will still work.");
  }
}

void addCorsHeaders() {

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

// =====================================================
// WEB API
// =====================================================

bool validApiKey() {

  return server.hasArg("key") &&
         server.arg("key") == apiKey;
}

void handleWebCommand() {

  addCorsHeaders();

  if (!validApiKey()) {

    server.send(
      401,
      "text/plain",
      "UNAUTHORIZED"
    );

    return;
  }

  if (!server.hasArg("cmd")) {

    server.send(
      400,
      "text/plain",
      "MISSING COMMAND"
    );

    return;
  }

  String value = server.arg("cmd");

  if (value.length() != 1) {

    server.send(
      400,
      "text/plain",
      "INVALID COMMAND"
    );

    return;
  }

  char command = value.charAt(0);

  if (command != 'F' &&
      command != 'B' &&
      command != 'L' &&
      command != 'R' &&
      command != 'S' &&
      command != 'T' &&
      command != 'M' &&
      command != 'A' &&
      command != 'D') {

    server.send(
      400,
      "text/plain",
      "UNSUPPORTED COMMAND"
    );

    return;
  }

  handleMotorCommand(command);

  if (command == 'F' ||
      command == 'B' ||
      command == 'L' ||
      command == 'R') {

    lastWebCommandTime = millis();
    webCommandActive = true;
  }
  else if (command == 'S') {

    webCommandActive = false;
  }

  server.send(
    200,
    "text/plain",
    "OK"
  );
}

void handleWebStatus() {

  addCorsHeaders();

  if (!validApiKey()) {

    server.send(
      401,
      "text/plain",
      "UNAUTHORIZED"
    );

    return;
  }

  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"state\":\"";
  json += currentState;
  json += "\",";
  json += "\"recording\":";
  json += recording ? "true" : "false";
  json += ",";
  json += "\"automatic\":";
  json += automaticMode ? "true" : "false";
  json += ",";
  json += "\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\"";
  json += "}";

  server.send(
    200,
    "application/json",
    json
  );
}

void handleOptions() {

  addCorsHeaders();

  server.send(
    204,
    "text/plain",
    ""
  );
}

void startWebServer() {

  server.on(
    "/",
    HTTP_GET,
    []() {

      addCorsHeaders();

      server.send(
        200,
        "text/plain",
        "EAAR AGRIBOT ESP32 ONLINE"
      );
    }
  );

  server.on(
    "/command",
    HTTP_GET,
    handleWebCommand
  );

  server.on(
    "/command",
    HTTP_OPTIONS,
    handleOptions
  );

  server.on(
    "/status",
    HTTP_GET,
    handleWebStatus
  );

  server.on(
    "/status",
    HTTP_OPTIONS,
    handleOptions
  );

  server.begin();

  Serial.println("HTTP SERVER: STARTED");
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  HC05.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  NanoSerial.begin(9600, SERIAL_8N1, 27, 14);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // Keep the motor-driver enable pins OFF during startup.
  // This prevents the connected motor driver from drawing unnecessary
  // current while the ESP32 is initializing and connecting to Wi-Fi.
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);

  stopMotor();

  strip.begin();
  // Keep NeoPixels at a moderate brightness to reduce 5V current draw.
  strip.setBrightness(64);
  strip.show();

  prefs.begin("agribot", false);

  // API key is stored in the same Preferences namespace as the route.
  // It is created only once and survives normal ESP32 restarts.
  loadOrCreateApiKey();

  // Give the USB/regulator supply a moment to settle before the
  // Wi-Fi radio starts its connection attempt.
  delay(500);

  connectWiFi();
  startWebServer();

  Serial.println();
  Serial.println("================================");
  Serial.println("       AGRIBOT ROUTE SYSTEM");
  Serial.println("================================");
  Serial.println("T = Start Recording");
  Serial.println("F = Forward");
  Serial.println("B = Backward");
  Serial.println("L = Left");
  Serial.println("R = Right");
  Serial.println("S = Stop");
  Serial.println("M = Save Route");
  Serial.println("A = Automatic Mode");
  Serial.println("D = Delete Flash");
  Serial.println("Colors: red green blue yellow moon maroon peacock off");
  Serial.println("Effects: snake fade dj");
  Serial.println("================================");
  Serial.println("READY");
}

// =====================================================
// MAIN LOOP
// =====================================================

void loop() {

  // =============================================
  // WEB SERVER
  // =============================================

  server.handleClient();

  // =============================================
  // WIFI RECONNECT
  // =============================================

  if (WiFi.status() != WL_CONNECTED) {

    static unsigned long lastReconnectAttempt = 0;

    if (millis() - lastReconnectAttempt > 5000) {

      lastReconnectAttempt = millis();

      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

      Serial.println("WIFI: RECONNECTING...");
    }
  }

  // =============================================
  // WEBSITE COMMAND SAFETY TIMEOUT
  // =============================================

  if (webCommandActive &&
      millis() - lastWebCommandTime > WEB_COMMAND_TIMEOUT_MS) {

    handleMotorCommand('S');

    webCommandActive = false;

    Serial.println("WEB COMMAND TIMEOUT -> STOP");
  }

  // =============================================
  // HEADING CORRECTION (non-blocking)
  // =============================================

  if (NanoSerial.available()) {

    char c = NanoSerial.read();

    if (c == 'L' || c == 'R' || c == 'N') {

      if (c != lastCorrection) {

        Serial.print("Correction: ");
        Serial.println(c);
      }

      lastCorrection = c;
    }
  }

  applyDrive();
  updateSnake();
  updateFade();
  updateDJ();

  // =============================================
  // BLUETOOTH INPUT (buffered)
  // =============================================

  if (HC05.available()) {

    char c = HC05.read();

    if (c == '\r' || c == '\n') {

      if (bufLen > 0) {

        cmdBuffer[bufLen] = '\0';

        processToken();

        bufLen = 0;
      }
    }

    else if (c == ' ') {
      // ignore
    }

    else {

      if (bufLen < (int)sizeof(cmdBuffer) - 1) {

        cmdBuffer[bufLen++] = c;
      }

      lastCharTime = millis();
    }
  }

  if (bufLen > 0 &&
      millis() - lastCharTime > GAP_MS) {

    cmdBuffer[bufLen] = '\0';

    processToken();

    bufLen = 0;
  }
}

// =====================================================
// PROCESS TOKEN (motor command or color/effect word)
// =====================================================

void processToken() {

  if (bufLen == 1) {

    handleMotorCommand(cmdBuffer[0]);

    return;
  }

  String word = String(cmdBuffer);

  word.toLowerCase();

  if (word == "red") {

    setColor(255, 0, 0);
  }

  else if (word == "green") {

    setColor(0, 255, 0);
  }

  else if (word == "blue") {

    setColor(0, 0, 255);
  }

  else if (word == "yellow") {

    setColor(255, 255, 0);
  }

  else if (word == "moon") {

    setColor(255, 190, 20);
  }

  else if (word == "maroon") {

    setColor(128, 0, 32);
  }

  else if (word == "peacock") {

    setColor(0, 130, 140);
  }

  else if (word == "off") {

    setColor(0, 0, 0);
  }

  else if (word == "snake") {

    fadeActive = false;
    djActive = false;
    snakeActive = true;
    snakeGrowing = true;
    snakeStep = 0;
    lastSnakeStep = millis();

    Serial.println("SNAKE: ON");
  }

  else if (word == "fade") {

    snakeActive = false;
    djActive = false;
    fadeActive = true;
    fadeHue = 0;
    lastFadeStep = millis();

    Serial.println("FADE: ON");
  }

  else if (word == "dj") {

    snakeActive = false;
    fadeActive = false;
    djActive = true;
    djHue = 0;
    lastDjStep = millis();

    Serial.println("DJ: ON");
  }

  else {

    Serial.print("UNKNOWN: ");
    Serial.println(cmdBuffer);
  }
}

// =====================================================
// SET SOLID LED COLOR (stops effects)
// =====================================================

void setColor(int r, int g, int b) {

  snakeActive = false;
  fadeActive = false;
  djActive = false;

  currentR = r;
  currentG = g;
  currentB = b;

  for (int i = 0; i < NUM_LEDS; i++) {

    strip.setPixelColor(
      i,
      strip.Color(r, g, b)
    );
  }

  strip.show();

  Serial.print("LED: ");
  Serial.print(r);
  Serial.print(",");
  Serial.print(g);
  Serial.print(",");
  Serial.println(b);
}

// =====================================================
// SNAKE FILL/DRAIN EFFECT (non-blocking)
// =====================================================

void updateSnake() {

  if (!snakeActive) {
    return;
  }

  if (millis() - lastSnakeStep < SNAKE_STEP_MS) {
    return;
  }

  lastSnakeStep = millis();

  if (snakeGrowing) {

    for (int i = 0; i < NUM_LEDS; i++) {

      if (i <= snakeStep) {

        strip.setPixelColor(
          i,
          strip.Color(
            currentR,
            currentG,
            currentB
          )
        );
      }

      else {

        strip.setPixelColor(i, 0);
      }
    }

    strip.show();

    if (snakeStep >= NUM_LEDS - 1) {

      snakeGrowing = false;
      snakeStep = 0;
    }

    else {

      snakeStep++;
    }
  }

  else {

    for (int i = 0; i < NUM_LEDS; i++) {

      if (i <= snakeStep) {

        strip.setPixelColor(i, 0);
      }

      else {

        strip.setPixelColor(
          i,
          strip.Color(
            currentR,
            currentG,
            currentB
          )
        );
      }
    }

    strip.show();

    if (snakeStep >= NUM_LEDS - 1) {

      snakeGrowing = true;
      snakeStep = 0;
    }

    else {

      snakeStep++;
    }
  }
}

// =====================================================
// FADE EFFECT (all LEDs together, non-blocking)
// =====================================================

void updateFade() {

  if (!fadeActive) {
    return;
  }

  if (millis() - lastFadeStep < EFFECT_STEP_MS) {
    return;
  }

  lastFadeStep = millis();

  uint32_t color =
    strip.gamma32(
      strip.ColorHSV(
        fadeHue,
        255,
        255
      )
    );

  for (int i = 0; i < NUM_LEDS; i++) {

    strip.setPixelColor(i, color);
  }

  strip.show();

  fadeHue += HUE_STEP;
}

// =====================================================
// DJ EFFECT (different color per LED, shifting, non-blocking)
// =====================================================

void updateDJ() {

  if (!djActive) {
    return;
  }

  if (millis() - lastDjStep < EFFECT_STEP_MS) {
    return;
  }

  lastDjStep = millis();

  for (int i = 0; i < NUM_LEDS; i++) {

    uint16_t hue =
      djHue + (i * DJ_SPREAD);

    uint32_t color =
      strip.gamma32(
        strip.ColorHSV(
          hue,
          255,
          255
        )
      );

    strip.setPixelColor(i, color);
  }

  strip.show();

  djHue += HUE_STEP;
}

// =====================================================
// HANDLE MOTOR COMMAND (single character)
// =====================================================

void handleMotorCommand(char command) {

  Serial.print("CMD: ");
  Serial.println(command);

  // =============================================
  // START RECORDING
  // =============================================

  if (command == 'T' || command == 't') {

    startRecording();
  }

  // =============================================
  // FORWARD
  // =============================================

  else if (command == 'F' || command == 'f') {

    if (recording) {

      changeState('F');
    }

    else if (!automaticMode) {

      forward();

      currentState = 'F';

      Serial.println("STATE: F");
    }
  }

  // =============================================
  // BACKWARD
  // =============================================

  else if (command == 'B' || command == 'b') {

    if (recording) {

      changeState('B');
    }

    else if (!automaticMode) {

      backward();

      currentState = 'B';

      Serial.println("STATE: B");
    }
  }

  // =============================================
  // LEFT
  // =============================================

  else if (command == 'L' || command == 'l') {

    if (recording) {

      changeState('L');
    }

    else if (!automaticMode) {

      left();

      currentState = 'L';

      Serial.println("STATE: L");
    }
  }

  // =============================================
  // RIGHT
  // =============================================

  else if (command == 'R' || command == 'r') {

    if (recording) {

      changeState('R');
    }

    else if (!automaticMode) {

      right();

      currentState = 'R';

      Serial.println("STATE: R");
    }
  }

  // =============================================
  // STOP
  // =============================================

  else if (command == 'S' || command == 's') {

    if (recording) {

      changeState('S');
    }

    else {

      stopMotor();

      currentState = 'S';

      Serial.println("STATE: S");
    }
  }

  // =============================================
  // SAVE
  // =============================================

  else if (command == 'M' || command == 'm') {

    saveToFlash();
  }

  // =============================================
  // AUTOMATIC
  // =============================================

  else if (command == 'A' || command == 'a') {

    startAutomatic();
  }

  // =============================================
  // DELETE
  // =============================================

  else if (command == 'D' || command == 'd') {

    deleteFlash();
  }
}

// =====================================================
// APPLY DRIVE SPEEDS (heading correction)
// =====================================================

void applyDrive() {

  // Keep the motor-driver enable pins OFF whenever the rover is stopped.
  // This reduces unnecessary current draw while idle and during startup.
  if (currentState != 'F' &&
      currentState != 'B' &&
      currentState != 'L' &&
      currentState != 'R') {

    analogWrite(ENA, 0);
    analogWrite(ENB, 0);

    return;
  }

  int leftSpeed = SPEED;
  int rightSpeed = SPEED;

  // During automatic playback or recording, use full configured speed.
  if (!automaticMode && !recording &&
      (currentState == 'F' || currentState == 'B')) {

    char corr = lastCorrection;

    if (currentState == 'B') {

      if (corr == 'L') corr = 'R';
      else if (corr == 'R') corr = 'L';
    }

    if (corr == 'L') {

      leftSpeed =
        SPEED - CORR_AMOUNT;
    }

    else if (corr == 'R') {

      rightSpeed =
        SPEED - CORR_AMOUNT;
    }
  }

  analogWrite(ENA, leftSpeed);
  analogWrite(ENB, rightSpeed);
}

// =====================================================
// START RECORDING
// =====================================================

void startRecording() {

  stopMotor();

  routeCount = 0;

  currentState = 'S';

  recording = true;
  automaticMode = false;

  stateStartTime = millis();

  Serial.println();
  Serial.println("================================");
  Serial.println(" RECORDING STARTED");
  Serial.println("================================");

  Serial.println("STATE: S");
  Serial.println("Waiting for movement...");
}

// =====================================================
// CHANGE STATE
// =====================================================

void changeState(char newState) {

  if (newState == currentState) {
    return;
  }

  recordCurrentState();

  currentState = newState;

  stateStartTime = millis();

  if (newState == 'F') {

    forward();
  }

  else if (newState == 'B') {

    backward();
  }

  else if (newState == 'L') {

    left();
  }

  else if (newState == 'R') {

    right();
  }

  else if (newState == 'S') {

    stopMotor();
  }

  Serial.print("STATE: ");
  Serial.println(newState);
}

// =====================================================
// RECORD CURRENT STATE
// =====================================================

void recordCurrentState() {

  if (!recording) {
    return;
  }

  if (routeCount >= MAX_RECORDS) {

    Serial.println("RECORD MEMORY FULL");

    return;
  }

  unsigned long duration =
    millis() - stateStartTime;

  route[routeCount].command =
    currentState;

  route[routeCount].duration =
    duration;

  Serial.println("--------------------------------");
  Serial.println("RECORDED");

  Serial.print("CMD: ");
  Serial.println(currentState);

  Serial.print("TIME: ");
  Serial.print(duration);
  Serial.println(" ms");

  routeCount++;
}

// =====================================================
// SAVE TO FLASH
// =====================================================

void saveToFlash() {

  if (!recording) {

    Serial.println("NOT RECORDING");

    return;
  }

  recordCurrentState();

  stopMotor();

  recording = false;

  currentState = 'S';

  prefs.putInt("count", routeCount);

  if (routeCount > 0) {

    prefs.putBytes(
      "route",
      route,
      routeCount * sizeof(RouteRecord)
    );
  }

  Serial.println();
  Serial.println("================================");
  Serial.println(" RECORDING STOPPED");
  Serial.println(" ROUTE SAVED TO FLASH");
  Serial.println("================================");

  Serial.print("TOTAL RECORDS: ");
  Serial.println(routeCount);

  printRoute();

  Serial.println("================================");
  Serial.println("READY");
}

// =====================================================
// LOAD ROUTE FROM FLASH
// =====================================================

bool loadFromFlash() {

  int savedCount =
    prefs.getInt("count", 0);

  if (savedCount <= 0 ||
      savedCount > MAX_RECORDS) {

    Serial.println("NO VALID ROUTE IN FLASH");

    return false;
  }

  size_t size =
    savedCount * sizeof(RouteRecord);

  size_t result =
    prefs.getBytes(
      "route",
      route,
      size
    );

  if (result != size) {

    Serial.println("FLASH READ ERROR");

    return false;
  }

  routeCount = savedCount;

  Serial.println();
  Serial.println("ROUTE LOADED FROM FLASH");

  printRoute();

  return true;
}

// =====================================================
// AUTOMATIC MODE
// =====================================================

void startAutomatic() {

  recording = false;

  stopMotor();

  Serial.println();
  Serial.println("================================");
  Serial.println(" AUTOMATIC MODE");
  Serial.println("================================");

  if (!loadFromFlash()) {

    Serial.println("AUTOMATIC CANCELLED");

    return;
  }

  automaticMode = true;

  Serial.println();
  Serial.println("STARTING STORED ROUTE...");
  Serial.println();

  for (int i = 0; i < routeCount; i++) {

    char command =
      route[i].command;

    unsigned long duration =
      route[i].duration;

    Serial.print("AUTO CMD: ");
    Serial.println(command);

    Serial.print("TIME: ");
    Serial.print(duration);
    Serial.println(" ms");

    if (command == 'F') {

      forward();
    }

    else if (command == 'B') {

      backward();
    }

    else if (command == 'L') {

      left();
    }

    else if (command == 'R') {

      right();
    }

    else if (command == 'S') {

      stopMotor();
    }

    delay(duration);

    stopMotor();
  }

  automaticMode = false;

  stopMotor();

  Serial.println();
  Serial.println("================================");
  Serial.println(" ROUTE COMPLETED");
  Serial.println("================================");
}

// =====================================================
// DELETE FLASH
// =====================================================

void deleteFlash() {

  stopMotor();

  recording = false;
  automaticMode = false;

  routeCount = 0;

  currentState = 'S';

  // IMPORTANT:
  // Do not use prefs.clear() here because that would also
  // erase the persistent API key.
  prefs.remove("count");
  prefs.remove("route");

  Serial.println();
  Serial.println("================================");
  Serial.println(" FLASH ROUTE DATA DELETED");
  Serial.println(" API KEY PRESERVED");
  Serial.println("================================");
  Serial.println("READY FOR NEW ROUTE");
}

// =====================================================
// PRINT ROUTE
// =====================================================

void printRoute() {

  Serial.println();
  Serial.println("========== STORED ROUTE ==========");

  for (int i = 0; i < routeCount; i++) {

    Serial.print(i + 1);
    Serial.print(" : ");

    Serial.print(route[i].command);

    Serial.print(" = ");

    Serial.print(route[i].duration);

    Serial.println(" ms");
  }

  Serial.println("==================================");
}

// =====================================================
// FORWARD
// =====================================================

void forward() {

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

// =====================================================
// BACKWARD
// =====================================================

void backward() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

// =====================================================
// LEFT
// =====================================================

void left() {

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

// =====================================================
// RIGHT
// =====================================================

void right() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

// =====================================================
// STOP
// =====================================================

void stopMotor() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);

  // Disable both motor-driver channels while stopped.
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}
