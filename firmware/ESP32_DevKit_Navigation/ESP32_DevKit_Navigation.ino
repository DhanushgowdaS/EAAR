#include <Preferences.h>
#include <Adafruit_NeoPixel.h>

#define ENA 25
#define ENB 26
#define IN1 32
#define IN2 23
#define IN3 33
#define IN4 22

#define DEFAULT_SPEED 255
#define FORWARD_LEFT_SPEED 255
#define FORWARD_RIGHT_SPEED 254.93
#define BACKWARD_LEFT_SPEED 255
#define BACKWARD_RIGHT_SPEED 254.93
#define DEFAULT_TURN_SPEED 225
#define CORR_AMOUNT 40
#define CORR_TIMEOUT_MS 200
#define MAX_RECORDS 100

#define LED_PIN 4
#define LED_COUNT 8
#define LED_BRIGHTNESS 255

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

HardwareSerial NanoSerial(1);
HardwareSerial HC05Serial(2);
Preferences prefs;

struct RouteRecord {
  char command;
  unsigned long duration;
};

RouteRecord route[MAX_RECORDS];
int routeCount = 0;

char currentState = 'S';
char lastCorrection = 'N';
unsigned long lastCorrectionTime = 0;
unsigned long stateStartTime = 0;

bool recording = false;
bool automaticMode = false;

enum LightingMode {
  LIGHT_SOLID,
  LIGHT_SNAKE,
  LIGHT_FADE,
  LIGHT_DJ
};

LightingMode lightingMode = LIGHT_SOLID;
uint32_t solidColor = 0;
uint32_t effectColor = 0;
uint8_t fadeStep = 0;
uint8_t snakePosition = 0;
unsigned long lastLightingUpdate = 0;
bool djState = false;

char serialCommandBuffer[24];
uint8_t serialCommandIndex = 0;
char bluetoothCommandBuffer[24];
uint8_t bluetoothCommandIndex = 0;
unsigned long lastBluetoothByteTime = 0;

void setColor(uint8_t r, uint8_t g, uint8_t b) {
  solidColor = strip.Color(r, g, b);
  lightingMode = LIGHT_SOLID;
  strip.fill(solidColor);
  strip.show();
}

void setLightingMode(LightingMode mode) {
  lightingMode = mode;
  lastLightingUpdate = 0;
}

void updateLighting() {
  unsigned long now = millis();

  if (lightingMode == LIGHT_SOLID) {
    return;
  }

  if (lightingMode == LIGHT_SNAKE) {
    if (now - lastLightingUpdate < 100) {
      return;
    }

    lastLightingUpdate = now;
    strip.clear();
    strip.setPixelColor(snakePosition, effectColor);
    strip.setPixelColor((snakePosition + LED_COUNT - 1) % LED_COUNT, effectColor);
    strip.show();
    snakePosition = (snakePosition + 1) % LED_COUNT;
    return;
  }

  if (lightingMode == LIGHT_FADE) {
    if (now - lastLightingUpdate < 25) {
      return;
    }

    lastLightingUpdate = now;
    uint8_t r = 127 + (127 * sin(fadeStep * 0.02454369));
    uint8_t g = 127 + (127 * sin((fadeStep + 85) * 0.02454369));
    uint8_t b = 127 + (127 * sin((fadeStep + 170) * 0.02454369));

    strip.fill(strip.Color(r, g, b));
    strip.show();
    fadeStep++;
    return;
  }

  if (lightingMode == LIGHT_DJ) {
    if (now - lastLightingUpdate < 120) {
      return;
    }

    lastLightingUpdate = now;
    djState = !djState;

    if (djState) {
      uint8_t colorIndex = random(0, 7);
      uint32_t colors[] = {
        strip.Color(255, 0, 0),
        strip.Color(0, 255, 0),
        strip.Color(0, 0, 255),
        strip.Color(255, 255, 0),
        strip.Color(0, 255, 255),
        strip.Color(255, 0, 255),
        strip.Color(255, 255, 255)
      };
      effectColor = colors[colorIndex];
      strip.fill(effectColor);
    } else {
      strip.clear();
    }

    strip.show();
  }
}

void processLightingCommand(const char *command) {
  if (strcmp(command, "RED") == 0) {
    setColor(255, 0, 0);
  } else if (strcmp(command, "GREEN") == 0) {
    setColor(0, 255, 0);
  } else if (strcmp(command, "BLUE") == 0) {
    setColor(0, 0, 255);
  } else if (strcmp(command, "YELLOW") == 0) {
    setColor(255, 255, 0);
  } else if (strcmp(command, "CYAN") == 0) {
    setColor(0, 255, 255);
  } else if (strcmp(command, "MAGENTA") == 0) {
    setColor(255, 0, 255);
  } else if (strcmp(command, "WHITE") == 0) {
    setColor(255, 255, 255);
  } else if (strcmp(command, "ORANGE") == 0) {
    setColor(255, 80, 0);
  } else if (strcmp(command, "PURPLE") == 0) {
    setColor(128, 0, 255);
  } else if (strcmp(command, "PINK") == 0) {
    setColor(255, 20, 100);
  } else if (strcmp(command, "WARM") == 0) {
    setColor(255, 100, 20);
  } else if (strcmp(command, "MAROON") == 0) {
    setColor(80, 0, 20);
  } else if (strcmp(command, "PEACOCK") == 0) {
    setColor(0, 180, 180);
  } else if (strcmp(command, "OFF") == 0) {
    setColor(0, 0, 0);
  } else if (strcmp(command, "SNAKE") == 0) {
    effectColor = strip.Color(0, 0, 255);
    snakePosition = 0;
    setLightingMode(LIGHT_SNAKE);
  } else if (strcmp(command, "FADE") == 0 || strcmp(command, "FADING") == 0) {
    fadeStep = 0;
    setLightingMode(LIGHT_FADE);
  } else if (strcmp(command, "DJ") == 0) {
    setLightingMode(LIGHT_DJ);
  }
}

void processCommandText(char *command) {
  for (char *p = command; *p; p++) {
    *p = toupper(*p);
  }

  if (command[0] == '\0') {
    return;
  }

  processLightingCommand(command);

  if (strlen(command) == 1) {
    handleCommand(command[0]);
  }
}

void readTextCommand(Stream &stream, char *buffer, uint8_t &index) {
  while (stream.available()) {
    char c = stream.read();

    if (c == '\r' || c == '\n') {
      if (index > 0) {
        buffer[index] = '\0';
        processCommandText(buffer);
        index = 0;
      }
      continue;
    }

    if (c == ' ') {
      continue;
    }

    if (index < 23) {
      buffer[index++] = c;
    }
  }
}

bool isNavigationCommand(char command) {
  return command == 'F' || command == 'B' ||
         command == 'L' || command == 'R' ||
         command == 'S' || command == 'T' ||
         command == 'E' || command == 'M' ||
         command == 'A' || command == 'D';
}

void readBluetoothTerminal() {
  while (HC05Serial.available()) {
    char c = HC05Serial.read();

    if (c == '\r' || c == '\n') {
      if (bluetoothCommandIndex > 0) {
        bluetoothCommandBuffer[bluetoothCommandIndex] = '\0';
        processCommandText(bluetoothCommandBuffer);
        bluetoothCommandIndex = 0;
      }
      lastBluetoothByteTime = millis();
      continue;
    }

    if (c == ' ') {
      continue;
    }

    if (bluetoothCommandIndex < 23) {
      bluetoothCommandBuffer[bluetoothCommandIndex++] = c;
    }

    lastBluetoothByteTime = millis();
  }

  if (bluetoothCommandIndex > 0 &&
      millis() - lastBluetoothByteTime >= 50) {
    bluetoothCommandBuffer[bluetoothCommandIndex] = '\0';
    processCommandText(bluetoothCommandBuffer);
    bluetoothCommandIndex = 0;
  }
}

void setup() {
  Serial.begin(115200);

  NanoSerial.begin(9600, SERIAL_8N1, 27, 14);
  HC05Serial.begin(9600, SERIAL_8N1, 16, 17);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  stopMotor();

  strip.begin();
  strip.setBrightness(LED_BRIGHTNESS);
  setColor(80, 0, 20);

  prefs.begin("agribot", false);

  Serial.println();
  Serial.println("================================");
  Serial.println("   AGRIBOT BLUETOOTH CONTROLLER");
  Serial.println("================================");
  Serial.println("F = Forward");
  Serial.println("B = Backward");
  Serial.println("L = Left");
  Serial.println("R = Right");
  Serial.println("S = Stop");
  Serial.println("T = Start Training");
  Serial.println("E = End Training");
  Serial.println("M = Store Route");
  Serial.println("A = Automatic");
  Serial.println("D = Delete Route");
  Serial.println("LED: RED GREEN BLUE YELLOW CYAN MAGENTA WHITE");
  Serial.println("LED: ORANGE PURPLE PINK WARM MAROON PEACOCK OFF");
  Serial.println("EFFECTS: SNAKE FADE FADING DJ");
  Serial.println("HC-05: RX16/TX17 @ 9600");
  Serial.println("Nano:  RX27/TX14 @ 9600");
  Serial.println("================================");
}

void loop() {
  readHeadingCorrection();
  readBluetoothTerminal();
  readTextCommand(Serial, serialCommandBuffer, serialCommandIndex);
  applyDrive();
  updateLighting();
}

void readHeadingCorrection() {
  while (NanoSerial.available()) {
    char c = NanoSerial.read();

    if (c == 'L' || c == 'R' || c == 'N') {
      lastCorrection = c;
      lastCorrectionTime = millis();
    }
  }
}

void handleCommand(char command) {
  if (command == 'T') {
    startRecording();
    return;
  }

  if (command == 'F') {
    if (recording) {
      changeState('F');
    } else if (!automaticMode) {
      currentState = 'F';
      forward();
    }
    return;
  }

  if (command == 'B') {
    if (recording) {
      changeState('B');
    } else if (!automaticMode) {
      currentState = 'B';
      backward();
    }
    return;
  }

  if (command == 'L') {
    if (recording) {
      changeState('L');
    } else if (!automaticMode) {
      currentState = 'L';
      left();
    }
    return;
  }

  if (command == 'R') {
    if (recording) {
      changeState('R');
    } else if (!automaticMode) {
      currentState = 'R';
      right();
    }
    return;
  }

  if (command == 'S') {
    if (recording) {
      changeState('S');
    } else {
      automaticMode = false;
      currentState = 'S';
      stopMotor();
    }
    return;
  }

  if (command == 'E') {
    endRecording();
    return;
  }

  if (command == 'M') {
    saveToFlash();
    return;
  }

  if (command == 'A') {
    startAutomatic();
    return;
  }

  if (command == 'D') {
    deleteFlash();
  }
}

void applyDrive() {
  if (currentState != 'F' &&
      currentState != 'B' &&
      currentState != 'L' &&
      currentState != 'R') {
    analogWrite(ENA, 0);
    analogWrite(ENB, 0);
    return;
  }

  int leftSpeed = DEFAULT_SPEED;
  int rightSpeed = DEFAULT_SPEED;

  if (currentState == 'F') {
    leftSpeed = FORWARD_LEFT_SPEED;
    rightSpeed = FORWARD_RIGHT_SPEED;
  } else if (currentState == 'B') {
    leftSpeed = BACKWARD_LEFT_SPEED;
    rightSpeed = BACKWARD_RIGHT_SPEED;
  } else if (currentState == 'L' || currentState == 'R') {
    leftSpeed = DEFAULT_TURN_SPEED;
    rightSpeed = DEFAULT_TURN_SPEED;
  }

  if (!recording &&
      (currentState == 'F' || currentState == 'B')) {

    char correction = 'N';

    if (millis() - lastCorrectionTime <= CORR_TIMEOUT_MS) {
      correction = lastCorrection;
    }

    if (currentState == 'B') {
      if (correction == 'L') {
        correction = 'R';
      } else if (correction == 'R') {
        correction = 'L';
      }
    }

    if (correction == 'L') {
      leftSpeed = max(0, leftSpeed - CORR_AMOUNT);
    } else if (correction == 'R') {
      rightSpeed = max(0, rightSpeed - CORR_AMOUNT);
    }
  }

  analogWrite(ENA, leftSpeed);
  analogWrite(ENB, rightSpeed);
}

void startRecording() {
  stopMotor();

  routeCount = 0;
  currentState = 'S';
  recording = true;
  automaticMode = false;
  stateStartTime = millis();

  Serial.println("TRAINING STARTED");
}

void changeState(char newState) {
  if (newState == currentState) {
    return;
  }

  recordCurrentState();

  currentState = newState;
  stateStartTime = millis();

  if (newState == 'F') {
    forward();
  } else if (newState == 'B') {
    backward();
  } else if (newState == 'L') {
    left();
  } else if (newState == 'R') {
    right();
  } else {
    stopMotor();
  }
}

void recordCurrentState() {
  if (!recording || routeCount >= MAX_RECORDS) {
    return;
  }

  route[routeCount].command = currentState;
  route[routeCount].duration = millis() - stateStartTime;
  routeCount++;
}

void endRecording() {
  if (!recording) {
    Serial.println("NOT TRAINING");
    return;
  }

  recordCurrentState();

  stopMotor();
  recording = false;
  currentState = 'S';
  stateStartTime = millis();

  Serial.print("TRAINING ENDED. RECORDS: ");
  Serial.println(routeCount);
  printRoute();
}

void saveToFlash() {
  if (recording) {
    Serial.println("END TRAINING FIRST");
    return;
  }

  if (routeCount <= 0) {
    Serial.println("NO ROUTE TO STORE");
    return;
  }

  prefs.putInt("count", routeCount);
  prefs.putBytes("route", route, routeCount * sizeof(RouteRecord));

  Serial.println("ROUTE STORED IN FLASH");
}

bool loadFromFlash() {
  int savedCount = prefs.getInt("count", 0);

  if (savedCount <= 0 || savedCount > MAX_RECORDS) {
    Serial.println("NO VALID ROUTE IN FLASH");
    return false;
  }

  size_t size = savedCount * sizeof(RouteRecord);

  if (prefs.getBytes("route", route, size) != size) {
    Serial.println("FLASH READ ERROR");
    return false;
  }

  routeCount = savedCount;
  return true;
}

void startAutomatic() {
  if (recording) {
    Serial.println("END TRAINING FIRST");
    return;
  }

  stopMotor();

  if (!loadFromFlash()) {
    Serial.println("AUTOMATIC CANCELLED");
    return;
  }

  automaticMode = true;

  Serial.println("AUTOMATIC STARTED");

  for (int i = 0; i < routeCount && automaticMode; i++) {
    char command = route[i].command;
    unsigned long duration = route[i].duration;
    unsigned long startTime = millis();

    currentState = command;

    if (command == 'F') {
      forward();
    } else if (command == 'B') {
      backward();
    } else if (command == 'L') {
      left();
    } else if (command == 'R') {
      right();
    } else {
      currentState = 'S';
      stopMotor();
    }

    while (automaticMode && millis() - startTime < duration) {
      readHeadingCorrection();
      readBluetoothTerminal();
      readTextCommand(Serial, serialCommandBuffer, serialCommandIndex);
      applyDrive();
      updateLighting();
      delay(5);
    }

    stopMotor();
  }

  automaticMode = false;
  currentState = 'S';
  stopMotor();

  Serial.println("AUTOMATIC COMPLETED");
}

void deleteFlash() {
  stopMotor();

  recording = false;
  automaticMode = false;
  routeCount = 0;
  currentState = 'S';

  prefs.remove("count");
  prefs.remove("route");

  Serial.println("STORED ROUTE DELETED");
}

void printRoute() {
  Serial.println("========== ROUTE ==========");

  for (int i = 0; i < routeCount; i++) {
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(route[i].command);
    Serial.print(" = ");
    Serial.print(route[i].duration);
    Serial.println(" ms");
  }

  Serial.println("===========================");
}

void forward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void backward() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void left() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void right() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stopMotor() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);

  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}
