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

#define ULTRASONIC_A_TRIG 18
#define ULTRASONIC_A_ECHO 5
#define ULTRASONIC_B_TRIG 12
#define ULTRASONIC_B_ECHO 34

#define OBSTACLE_LED_1 13
#define OBSTACLE_LED_2 15

#define OBSTACLE_DISTANCE_CM 20.0
#define SIMILAR_DISTANCE_CM 5.0
#define OBSTACLE_TURN_TIME_MS 200
#define ULTRASONIC_TIMEOUT_US 25000

HardwareSerial NanoSerial(1);
HardwareSerial HC05Serial(2);
Preferences prefs;
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

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
bool obstacleCorrection = false;
char obstacleTurnDirection = 'N';
unsigned long obstacleTurnStart = 0;
unsigned long lastObstacleBlink = 0;
bool obstacleBlinkState = false;
unsigned long lastUltrasonicPrint = 0;

bool isNavigationCommand(char command) {
  return command == 'F' || command == 'B' ||
         command == 'L' || command == 'R' ||
         command == 'S' || command == 'T' ||
         command == 'E' || command == 'M' ||
         command == 'A' || command == 'D';
}

void setup() {
  Serial.begin(115200);

  NanoSerial.begin(9600, SERIAL_8N1, 27, 19);
  HC05Serial.begin(9600, SERIAL_8N1, 16, 17);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  stopMotor();

  pinMode(ULTRASONIC_A_TRIG, OUTPUT);
  pinMode(ULTRASONIC_A_ECHO, INPUT);
  pinMode(ULTRASONIC_B_TRIG, OUTPUT);
  pinMode(ULTRASONIC_B_ECHO, INPUT);

  pinMode(OBSTACLE_LED_1, OUTPUT);
  pinMode(OBSTACLE_LED_2, OUTPUT);

  digitalWrite(ULTRASONIC_A_TRIG, LOW);
  digitalWrite(ULTRASONIC_B_TRIG, LOW);
  digitalWrite(OBSTACLE_LED_1, LOW);
  digitalWrite(OBSTACLE_LED_2, LOW);

  strip.begin();
  strip.setBrightness(LED_BRIGHTNESS);
  strip.fill(strip.Color(0, 255, 255));
  strip.show();

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
  Serial.println("Nano:  RX27/TX19 @ 9600");
  Serial.println("Ultrasonic A: TRIG18 ECHO5");
  Serial.println("Ultrasonic B: TRIG12 ECHO34");
  Serial.println("================================");
}

void loop() {
  readHeadingCorrection();
  readBluetooth();
  printUltrasonicDistances();
  handleObstacle();
  applyDrive();
}

void printUltrasonicDistances() {
  if (millis() - lastUltrasonicPrint < 1000) {
    return;
  }

  lastUltrasonicPrint = millis();

  float distanceA = readDistanceCM(ULTRASONIC_A_TRIG, ULTRASONIC_A_ECHO);
  delay(50);
  float distanceB = readDistanceCM(ULTRASONIC_B_TRIG, ULTRASONIC_B_ECHO);

  Serial.print("ULTRASONIC A = ");
  if (distanceA < 0) {
    Serial.print("NO ECHO");
  } else {
    Serial.print(distanceA, 1);
    Serial.print(" cm");
  }

  Serial.print(" | B = ");

  if (distanceB < 0) {
    Serial.print("NO ECHO");
  } else {
    Serial.print(distanceB, 1);
    Serial.print(" cm");
  }

  Serial.println();
}

float readDistanceCM(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long duration = pulseIn(echoPin, HIGH, ULTRASONIC_TIMEOUT_US);

  if (duration == 0) {
    return -1.0;
  }

  return duration * 0.0343 / 2.0;
}

void setObstacleIndicators(bool active) {
  if (active) {
    strip.fill(strip.Color(255, 0, 0));
    strip.show();
  } else {
    strip.fill(strip.Color(0, 255, 255));
    strip.show();
  }
}

void updateObstacleBlink() {
  if (!obstacleCorrection) {
    digitalWrite(OBSTACLE_LED_1, LOW);
    digitalWrite(OBSTACLE_LED_2, LOW);
    return;
  }

  if (millis() - lastObstacleBlink >= 250) {
    lastObstacleBlink = millis();
    obstacleBlinkState = !obstacleBlinkState;

    digitalWrite(OBSTACLE_LED_1, obstacleBlinkState ? HIGH : LOW);
    digitalWrite(OBSTACLE_LED_2, obstacleBlinkState ? HIGH : LOW);
  }
}

void handleObstacle() {
  updateObstacleBlink();

  if (recording || currentState != 'F') {
    return;
  }

  if (obstacleCorrection) {
    if (millis() - obstacleTurnStart >= OBSTACLE_TURN_TIME_MS) {
      obstacleCorrection = false;
      obstacleTurnDirection = 'N';
      stopMotor();
      setObstacleIndicators(false);
    }
    return;
  }

  float distanceA = readDistanceCM(ULTRASONIC_A_TRIG, ULTRASONIC_A_ECHO);
  delay(50);
  float distanceB = readDistanceCM(ULTRASONIC_B_TRIG, ULTRASONIC_B_ECHO);

  if (distanceA >= OBSTACLE_DISTANCE_CM &&
      distanceB >= OBSTACLE_DISTANCE_CM) {
    setObstacleIndicators(false);
    return;
  }

  Serial.print("OBSTACLE: A=");
  Serial.print(distanceA);
  Serial.print(" cm, B=");
  Serial.print(distanceB);
  Serial.println(" cm");

  setObstacleIndicators(true);
  stopMotor();

  obstacleBlinkState = true;
  digitalWrite(OBSTACLE_LED_1, HIGH);
  digitalWrite(OBSTACLE_LED_2, HIGH);
  lastObstacleBlink = millis();

  if (distanceA < OBSTACLE_DISTANCE_CM &&
      distanceB < OBSTACLE_DISTANCE_CM) {

    float difference = distanceA > distanceB
                        ? distanceA - distanceB
                        : distanceB - distanceA;

    if (difference <= SIMILAR_DISTANCE_CM) {
      Serial.println("OBSTACLE: BOTH SIDES BLOCKED - STOP");
      currentState = 'S';
      automaticMode = false;
      obstacleCorrection = false;
      obstacleTurnDirection = 'N';
      return;
    }
  }

  if (distanceA < distanceB) {
    obstacleTurnDirection = 'L';
  } else {
    obstacleTurnDirection = 'R';
  }

  Serial.print("OBSTACLE: TURN ");
  Serial.println(obstacleTurnDirection);

  obstacleCorrection = true;
  obstacleTurnStart = millis();
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
      automaticMode = false;
      currentState = 'S';
      obstacleCorrection = false;
      obstacleTurnDirection = 'N';
      setObstacleIndicators(false);
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
  if (obstacleCorrection) {
    if (obstacleTurnDirection == 'L') {
      left();
    } else if (obstacleTurnDirection == 'R') {
      right();
    }
    return;
  }

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
      readBluetooth();
      handleObstacle();
      applyDrive();
      delay(5);
    }

    stopMotor();
  }

  automaticMode = false;
  currentState = 'S';
  setObstacleIndicators(false);
  digitalWrite(OBSTACLE_LED_1, LOW);
  digitalWrite(OBSTACLE_LED_2, LOW);
  stopMotor();

  Serial.println("AUTOMATIC COMPLETED");
}

void deleteFlash() {
  stopMotor();

  recording = false;
  automaticMode = false;
  routeCount = 0;
  currentState = 'S';
  obstacleCorrection = false;
  obstacleTurnDirection = 'N';
  setObstacleIndicators(false);

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
