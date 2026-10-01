#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <Adafruit_NeoPixel.h>

#define ENA 25
#define ENB 26

#define IN1 32
#define IN2 23
#define IN3 33
#define IN4 22

#define DEFAULT_SPEED 225
#define DEFAULT_TURN_SPEED 255
#define CORR_AMOUNT 40
#define MAX_RECORDS 100

#define LED_PIN 4
#define NUM_LEDS 8
#define SNAKE_STEP_MS 150
#define EFFECT_STEP_MS 30
#define HUE_STEP 512
#define DJ_SPREAD (65536 / NUM_LEDS)

// =====================================================
// NAVIGATION / HARDWARE STATE
// =====================================================

HardwareSerial NanoSerial(1);
HardwareSerial HC05Serial(2);
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

// NeoPixel color state
int currentR = 255;
int currentG = 190;
int currentB = 20;

// Snake effect
bool snakeActive = false;
bool snakeGrowing = true;
int snakeStep = 0;
unsigned long lastSnakeStep = 0;

// Fade effect
bool fadeActive = false;
uint16_t fadeHue = 0;
unsigned long lastFadeStep = 0;

// DJ effect
bool djActive = false;
uint16_t djHue = 0;
unsigned long lastDjStep = 0;

// =====================================================
// WIFI WEB SERVER LINK
// =====================================================

// The ESP32 DevKit connects directly to the same Wi-Fi network as
// the computer/phone running the EAAR website. The website sends
// navigation commands directly to this ESP32 over HTTP.

#define WIFI_SSID     "Admin"
#define WIFI_PASSWORD "password"
#define API_KEY       "eaar-navigation-esp32-api-key-v1"

WebServer server(80);

bool isNavigationCommand(char command) {
  return command == 'F' || command == 'B' ||
         command == 'L' || command == 'R' ||
         command == 'S' || command == 'T' || command == 'E' ||
         command == 'M' || command == 'A' ||
         command == 'D';
}

uint8_t forwardBackwardSpeed = DEFAULT_SPEED;
uint8_t leftRightSpeed = DEFAULT_TURN_SPEED;

bool isLightingCommand(char command) {
  return command == '1' || command == '2' ||
         command == '3' || command == '4' ||
         command == '5' || command == '6' ||
         command == '7' || command == '8' ||
         command == '9' || command == '0' ||
         command == 'X';
}

void handleLightingCommand(char command) {
  switch (command) {
    case '1': setColor(255, 0, 0); Serial.println("LIGHTING: ALERT / RED"); break;
    case '2': setColor(0, 255, 0); Serial.println("LIGHTING: READY / GREEN"); break;
    case '3': setColor(0, 0, 255); Serial.println("LIGHTING: ACTIVE / BLUE"); break;
    case '4': setColor(255, 255, 0); Serial.println("LIGHTING: TRAINING / YELLOW"); break;
    case '5': setColor(255, 190, 20); Serial.println("LIGHTING: NIGHT / WARM"); break;
    case '6': setColor(128, 0, 32); Serial.println("LIGHTING: HARVEST / MAROON"); break;
    case '7': setColor(0, 130, 140); Serial.println("LIGHTING: SCAN / PEACOCK"); break;
    case '8': setColor(0, 0, 0); Serial.println("LIGHTING: OFF"); break;
    case '9':
      fadeActive = false;
      djActive = false;
      snakeActive = true;
      snakeGrowing = true;
      snakeStep = 0;
      lastSnakeStep = millis();
      Serial.println("LIGHTING: SNAKE");
      break;
    case '0':
      snakeActive = false;
      djActive = false;
      fadeActive = true;
      fadeHue = 0;
      lastFadeStep = millis();
      Serial.println("LIGHTING: FADE");
      break;
    case 'X':
    case 'x':
      snakeActive = false;
      fadeActive = false;
      djActive = true;
      djHue = 0;
      lastDjStep = millis();
      Serial.println("LIGHTING: DJ");
      break;
  }
}

void handleSpeed() {
  sendCorsHeaders();
  String key = server.hasArg("key") ? server.arg("key") : "";
  if (key != API_KEY) {
    server.send(401, "application/json", "{\"ok\":false,\"error\":\"unauthorized\"}");
    return;
  }
  if (!server.hasArg("fb") && !server.hasArg("lr")) {
    String response = "{\"ok\":true,\"forwardBackward\":";
    response += forwardBackwardSpeed;
    response += ",\"leftRight\":";
    response += leftRightSpeed;
    response += "}";
    server.send(200, "application/json", response);
    return;
  }
  if (server.hasArg("fb")) {
    int value = server.arg("fb").toInt();
    if (value < 0 || value > 255) {
      server.send(400, "application/json", "{\"ok\":false,\"error\":\"fb speed must be 0-255\"}");
      return;
    }
    forwardBackwardSpeed = (uint8_t)value;
    prefs.putUChar("fbSpeed", forwardBackwardSpeed);
  }
  if (server.hasArg("lr")) {
    int value = server.arg("lr").toInt();
    if (value < 0 || value > 255) {
      server.send(400, "application/json", "{\"ok\":false,\"error\":\"lr speed must be 0-255\"}");
      return;
    }
    leftRightSpeed = (uint8_t)value;
    prefs.putUChar("lrSpeed", leftRightSpeed);
  }
  Serial.print("SPEED SETTINGS: F/B=");
  Serial.print(forwardBackwardSpeed);
  Serial.print(" L/R=");
  Serial.println(leftRightSpeed);
  String response = "{\"ok\":true,\"forwardBackward\":";
  response += forwardBackwardSpeed;
  response += ",\"leftRight\":";
  response += leftRightSpeed;
  response += "}";
  server.send(200, "application/json", response);
}
void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleCommand() {
  sendCorsHeaders();

  String key = server.hasArg("key") ? server.arg("key") : "";
  String cmd = server.hasArg("cmd") ? server.arg("cmd") : "";

  if (key != API_KEY) {
    server.send(401, "application/json",
                "{\"ok\":false,\"error\":\"unauthorized\"}");
    return;
  }

  if (cmd.length() != 1 || (!isNavigationCommand(cmd[0]) && !isLightingCommand(cmd[0]) && cmd[0] != 'x')) {
    server.send(400, "application/json",
                "{\"ok\":false,\"error\":\"invalid command\"}");
    return;
  }

  char command = cmd[0];

  if (isLightingCommand(command) || command == 'x') {
    Serial.println();
    Serial.println("================================");
    Serial.println(" WEBSITE LIGHTING COMMAND");
    Serial.print("COMMAND: ");
    Serial.println(command);
    Serial.println("SOURCE: EAAR WEBSITE -> WIFI -> ESP32 DEVKIT");
    Serial.println("================================");
    handleLightingCommand(command);
    server.send(200, "application/json",
                "{\"ok\":true,\"command\":\"" + String(command) + "\",\"type\":\"lighting\",\"device\":\"EAAR-ESP32-DEVKIT\"}");
    return;
  }

  Serial.println();
  Serial.println("================================");
  Serial.println(" WEBSITE COMMAND RECEIVED");
  Serial.print("COMMAND: ");
  Serial.println(command);
  Serial.println("SOURCE: EAAR WEBSITE -> WIFI -> ESP32 DEVKIT");
  Serial.println("================================");

  handleMotorCommand(command);

  String response = "{\"ok\":true,\"command\":\"";
  response += command;
  response += "\",\"device\":\"EAAR-ESP32-DEVKIT\"}";

  server.send(200, "application/json", response);
}

void handleStatus() {
  sendCorsHeaders();

  String response = "{";
  response += "\"device\":\"EAAR-ESP32-DEVKIT\",";
  response += "\"wifi\":\"";
  response += (WiFi.status() == WL_CONNECTED ? "connected" : "disconnected");
  response += "\",";
  response += "\"ip\":\"";
  response += WiFi.localIP().toString();
  response += "\",";
  response += "\"command\":\"";
  response += currentState;
  response += "\",";
  response += "\"recording\":";
  response += (recording ? "true" : "false");
  response += ",";
  response += "\"automatic\":";
  response += (automaticMode ? "true" : "false");
  response += "}";

  server.send(200, "application/json", response);
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

void startWiFiServer() {
  Serial.println();
  Serial.println("================================");
  Serial.println(" DIRECT WIFI WEBSITE LINK");
  Serial.println("================================");
  Serial.println("Communication: WEBSITE -> WIFI -> ESP32 DEVKIT");
  Serial.println("No ESP32-S3 gateway is used for navigation.");

  WiFi.mode(WIFI_STA);
  WiFi.setHostname("eaar-devkit");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startAttempt < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WIFI: CONNECTION FAILED");
    Serial.println("Check WIFI_SSID and WIFI_PASSWORD.");
    return;
  }

  Serial.println("WIFI: CONNECTED");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  Serial.print("DEVKIT IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Website can use the IP above.");
  Serial.println("mDNS name: http://eaar-devkit.local");

  server.on("/command", HTTP_GET, handleCommand);
  server.on("/command", HTTP_OPTIONS, handleOptions);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/speed", HTTP_GET, handleSpeed);
  server.on("/status", HTTP_OPTIONS, handleOptions);
  server.on("/speed", HTTP_OPTIONS, handleOptions);

  server.on("/", HTTP_GET, []() {
    sendCorsHeaders();
    server.send(200, "text/plain",
                "EAAR ESP32 DevKit navigation server is online.");
  });

  server.onNotFound([]() {
    sendCorsHeaders();
    server.send(404, "application/json",
                "{\"ok\":false,\"error\":\"not found\"}");
  });

  server.begin();

  Serial.println("HTTP SERVER: STARTED");
  Serial.println("ENDPOINT: /command?cmd=F&key=...");
  Serial.println("ENDPOINT: /status");
  Serial.println("================================");
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  // Arduino Nano heading correction: RX=27, TX=14
  NanoSerial.begin(9600, SERIAL_8N1, 27, 14);

  // HC-05 Bluetooth fallback: ESP32 RX=16, TX=17, 9600 baud.
  // Website/Wi-Fi and Bluetooth can both send commands to this DevKit.
  HC05Serial.begin(9600, SERIAL_8N1, 16, 17);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  startWiFiServer();

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
  forwardBackwardSpeed = prefs.getUChar("fbSpeed", DEFAULT_SPEED);
  leftRightSpeed = prefs.getUChar("lrSpeed", DEFAULT_TURN_SPEED);

  // Route data remains stored in Preferences across restarts.

  Serial.println();
  Serial.println("================================");
  Serial.println("       AGRIBOT ROUTE SYSTEM");
  Serial.println("================================");
  Serial.println("T = Start Recording");
  Serial.println("E = End Training");
  Serial.println("F = Forward");
  Serial.println("B = Backward");
  Serial.println("L = Left");
  Serial.println("R = Right");
  Serial.println("S = Stop");
  Serial.println("M = Save Route");
  Serial.println("A = Automatic Mode");
  Serial.println("D = Delete Flash");
  Serial.print("SPEED: F/B=");
  Serial.print(forwardBackwardSpeed);
  Serial.print(" L/R=");
  Serial.println(leftRightSpeed);
  Serial.println("LIGHTING: 1 Red | 2 Green | 3 Blue | 4 Yellow | 5 Warm");
  Serial.println("LIGHTING: 6 Maroon | 7 Peacock | 8 Off");
  Serial.println("LIGHTING: 9 Snake | 0 Fade | X DJ");
  Serial.println("================================");
  Serial.println("WIFI READY");
  Serial.println("Website -> Wi-Fi -> DevKit");
  Serial.println("BLUETOOTH READY");
  Serial.println("HC-05 -> UART2 RX16/TX17 -> DevKit");
  Serial.println("Website and Bluetooth commands can both control the rover.");
  Serial.println("Website commands will be printed above when received.");
  Serial.println("Bluetooth commands will be printed above when received.");
}

// =====================================================
// MAIN LOOP
// =====================================================

void loop() {

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

  server.handleClient();

  // =============================================
  // HC-05 BLUETOOTH FALLBACK
  // =============================================
  // Commands from the Bluetooth app are processed immediately,
  // using the same F/B/L/R/S navigation commands as the website.
  while (HC05Serial.available()) {
    char btCommand = HC05Serial.read();

    // Ignore line endings/spaces commonly added by Bluetooth apps.
    if (btCommand == '\\r' || btCommand == '\\n' || btCommand == ' ') {
      continue;
    }

    if (isNavigationCommand(btCommand) ||
        isLightingCommand(btCommand) ||
        btCommand == 'f' || btCommand == 'b' ||
        btCommand == 'l' || btCommand == 'r' ||
        btCommand == 's' || btCommand == 't' ||
        btCommand == 'm' || btCommand == 'a' ||
        btCommand == 'd' || btCommand == 'e' ||
        btCommand == 'x') {

      Serial.println();
      Serial.println("================================");
      Serial.println(" BLUETOOTH COMMAND RECEIVED");
      Serial.print("COMMAND: ");
      Serial.println(btCommand);
      Serial.println("SOURCE: HC-05 -> ESP32 DEVKIT");
      Serial.println("================================");

      if (isLightingCommand(btCommand) || btCommand == 'x') {
        handleLightingCommand(btCommand);
      } else {
        handleMotorCommand(btCommand);
      }
    }
  }

  applyDrive();
  updateSnake();
  updateFade();
  updateDJ();

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
  // END TRAINING
  // =============================================

  else if (command == 'E' || command == 'e') {

    endRecording();
  }

  // =============================================
  // SAVE TO FLASH
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

  // Forward/backward keeps the existing SPEED value (225).
  // Left/right turns use full PWM speed (255) for quicker turning.
  int leftSpeed = forwardBackwardSpeed;
  int rightSpeed = forwardBackwardSpeed;

  if (currentState == 'L' || currentState == 'R') {
    leftSpeed = leftRightSpeed;
    rightSpeed = leftRightSpeed;
  }

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
        max(0, (int)forwardBackwardSpeed - CORR_AMOUNT);
    }

    else if (corr == 'R') {

      rightSpeed =
        max(0, (int)forwardBackwardSpeed - CORR_AMOUNT);
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
// END TRAINING
// =====================================================

void endRecording() {

  if (!recording) {
    Serial.println("NOT RECORDING");
    return;
  }

  // Capture the final movement interval before ending training.
  recordCurrentState();

  stopMotor();
  recording = false;
  currentState = 'S';
  stateStartTime = millis();

  Serial.println();
  Serial.println("================================");
  Serial.println(" TRAINING ENDED");
  Serial.println(" ROUTE READY TO STORE");
  Serial.println("================================");
  Serial.print("TOTAL RECORDS: ");
  Serial.println(routeCount);
  printRoute();
}

// =====================================================
// SAVE TO FLASH
// =====================================================

void saveToFlash() {

  if (recording) {
    Serial.println("END TRAINING FIRST");
    return;
  }

  if (routeCount <= 0) {
    Serial.println("NO RECORDED ROUTE TO STORE");
    return;
  }

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

    // Direction functions set the H-bridge pins, while applyDrive()
    // supplies the PWM speed. Apply it before waiting for the
    // recorded duration so the rover actually moves automatically.
    applyDrive();

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

  // Keep the Preferences namespace intact; remove only route data.
  prefs.remove("count");
  prefs.remove("route");

  Serial.println();
  Serial.println("================================");
  Serial.println(" FLASH ROUTE DATA DELETED");
  Serial.println(" ROUTE STORAGE READY");
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
