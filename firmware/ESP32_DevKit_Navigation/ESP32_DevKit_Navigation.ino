#include <Preferences.h>

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
unsigned long stateStartTime = 0;

bool recording = false;
bool automaticMode = false;

bool isNavigationCommand(char command) {
  return command == 'F' || command == 'B' ||
         command == 'L' || command == 'R' ||
         command == 'S' || command == 'T' ||
         command == 'E' || command == 'M' ||
         command == 'A' || command == 'D';
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
  Serial.println("HC-05: RX16/TX17 @ 9600");
  Serial.println("Nano:  RX27/TX14 @ 9600");
  Serial.println("================================");
}

void loop() {
  readHeadingCorrection();
  readBluetooth();
  applyDrive();
}

void readHeadingCorrection() {
  while (NanoSerial.available()) {
    char c = NanoSerial.read();

    if (c == 'L' || c == 'R' || c == 'N') {
      lastCorrection = c;
    }
  }
}

void readBluetooth() {
  while (HC05Serial.available()) {
    char command = HC05Serial.read();

    if (command == '\r' || command == '\n' || command == ' ') {
      continue;
    }

    if (isNavigationCommand(command) ||
        command == 'f' || command == 'b' ||
        command == 'l' || command == 'r' ||
        command == 's' || command == 't' ||
        command == 'e' || command == 'm' ||
        command == 'a' || command == 'd') {

      command = toupper(command);

      Serial.print("BT CMD: ");
      Serial.println(command);

      handleCommand(command);
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

  if (currentState == 'L' || currentState == 'R') {
    leftSpeed = DEFAULT_TURN_SPEED;
    rightSpeed = DEFAULT_TURN_SPEED;
  }

  if (!automaticMode && !recording &&
      (currentState == 'F' || currentState == 'B')) {

    char correction = lastCorrection;

    if (currentState == 'B') {
      if (correction == 'L') correction = 'R';
      else if (correction == 'R') correction = 'L';
    }

    if (correction == 'L') {
      leftSpeed = max(0, DEFAULT_SPEED - CORR_AMOUNT);
    } else if (correction == 'R') {
      rightSpeed = max(0, DEFAULT_SPEED - CORR_AMOUNT);
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

  for (int i = 0; i < routeCount; i++) {
    char command = route[i].command;
    unsigned long duration = route[i].duration;

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

    applyDrive();
    delay(duration);
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
