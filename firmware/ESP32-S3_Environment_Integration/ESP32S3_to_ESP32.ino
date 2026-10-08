#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ---------- Wi-Fi ----------
const char* WIFI_SSID = "Admin";
const char* WIFI_PASSWORD = "password";

// ---------- Supabase ----------
const char* SUPABASE_URL = "https://mtnmknzwfuedryclqbyr.supabase.co";
const char* SUPABASE_KEY = "sb_publishable_A_Bklp1oP-X2Vm00TC7sng_yzl3eQWP";

const unsigned long SUPABASE_INTERVAL = 1000;
unsigned long lastSupabaseUpload = 0;

// ---------- DHT22 ----------
#define DHT1_PIN 4
#define DHT2_PIN 5
#define DHT_TYPE DHT22

DHT dht1(DHT1_PIN, DHT_TYPE);
DHT dht2(DHT2_PIN, DHT_TYPE);

// ---------- Soil Moisture ----------
#define SOIL_PIN 1
#define SOIL_DRY 4095
#define SOIL_WET 100

// ---------- LCD ----------
#define SDA_PIN 8
#define SCL_PIN 9

LiquidCrystal_I2C lcd(0x27, 20, 4);

// ---------- Motor (TB6612FNG) ----------
#define PWM_A 38
#define AIN1 39
#define AIN2 40
#define STBY 41

// ---------- GPIO Triggers ----------
#define PULL_UP_TRIG 2
#define PULL_DOWN_TRIG 6

// Navigation handshake
#define NAV_CHECKPOINT_TRIG 7
#define NAV_READY_TRIG 10

// ---------- Timings ----------
#define DOWN_TIME 800
#define UP_TIME 1100
#define CHECKPOINT_DOWN_TIME 5000
#define DHT_INTERVAL 2000
#define SOIL_SAMPLE_INTERVAL 500
#define LCD_INTERVAL 500

enum State {
  STATE_UP,
  STATE_MOVING_DOWN,
  STATE_DOWN_READING,
  STATE_MOVING_UP
};

State state = STATE_UP;

bool lastUpTrig = LOW;
bool lastDownTrig = LOW;
bool lastNavCheckpointTrig = LOW;
bool navigationCycle = false;

unsigned long stateStart = 0;
unsigned long lastDhtRead = 0;
unsigned long lastSoilSample = 0;
unsigned long lastLcdUpdate = 0;

float avgTemp = 0;
float avgHum = 0;

int currentSoilPct = 0;

long soilSum = 0;
int soilCount = 0;
int finalSoilAvg = 0;

const char* stateText[] = {
  "UP",
  "MOVING DOWN",
  "DOWN-READING",
  "MOVING UP"
};

// ---------- BLE ----------
#define SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

BLECharacteristic* pRxChar;

volatile bool bleUpFlag = false;
volatile bool bleDownFlag = false;

class RxCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    String val = c->getValue();

    if (val.length() > 0) {
      char cmd = val[0];

      if (cmd == 'U' || cmd == 'u') {
        bleUpFlag = true;
      }

      if (cmd == 'D' || cmd == 'd') {
        bleDownFlag = true;
      }
    }
  }
};

void bleInit() {
  BLEDevice::init("EAAR");

  BLEServer* pServer = BLEDevice::createServer();

  BLEService* pService =
    pServer->createService(SERVICE_UUID);

  pRxChar = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );

  pRxChar->setCallbacks(new RxCallback());

  pService->start();
  pServer->getAdvertising()->start();
}

// ---------- Wi-Fi ----------
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to Wi-Fi");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 15000) {
    delay(250);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed");
  }
}

// ---------- Supabase ----------
void uploadToSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Supabase upload skipped: Wi-Fi disconnected");
    return;
  }

  if (isnan(avgTemp) || isnan(avgHum)) {
    Serial.println("Supabase upload skipped: invalid DHT data");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  String url =
    String(SUPABASE_URL) +
    "/rest/v1/environment_readings";

  if (!http.begin(client, url)) {
    Serial.println("Supabase HTTP begin failed");
    return;
  }

  http.setTimeout(2000);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  String payload = "{";
  payload += "\"temperature\":" + String(avgTemp, 2) + ",";
  payload += "\"humidity\":" + String(avgHum, 2) + ",";
  payload += "\"soil_moisture\":" + String(currentSoilPct);
  payload += "}";

  int httpCode = http.POST(payload);

  Serial.print("Supabase HTTP: ");
  Serial.println(httpCode);

  if (httpCode >= 200 && httpCode < 300) {
    Serial.println("Supabase upload OK");
  } else {
    Serial.print("Supabase error: ");
    Serial.println(http.getString());
  }

  http.end();
}

// ---------- Motor ----------
void motorStop() {
  ledcWrite(PWM_A, 0);
}

void motorDown() {
  digitalWrite(AIN1, LOW);
  digitalWrite(AIN2, HIGH);
  ledcWrite(PWM_A, 50);
}

void motorUp() {
  digitalWrite(AIN1, HIGH);
  digitalWrite(AIN2, LOW);
  ledcWrite(PWM_A, 50);
}

// ---------- Soil ----------
int readSoilPercent() {
  int raw = analogRead(SOIL_PIN);

  return constrain(
    map(raw, SOIL_DRY, SOIL_WET, 0, 100),
    0,
    100
  );
}

// ---------- LCD ----------
void updateLCD() {
  char tBuf[6];
  char hBuf[6];

  dtostrf(avgTemp, 4, 1, tBuf);
  dtostrf(avgHum, 4, 1, hBuf);

  char line1[21];
  char line2[21];
  char line3[21];
  char line4[21];

  snprintf(
    line1,
    sizeof(line1),
    "Temp: %s C      ",
    tBuf
  );

  snprintf(
    line2,
    sizeof(line2),
    "Humidity: %s %%   ",
    hBuf
  );

  snprintf(
    line3,
    sizeof(line3),
    "Soil Moist: %3d %% ",
    currentSoilPct
  );

  snprintf(
    line4,
    sizeof(line4),
    "State: %-12s",
    stateText[state]
  );

  lcd.setCursor(0, 0);
  lcd.print(line1);

  lcd.setCursor(0, 1);
  lcd.print(line2);

  lcd.setCursor(0, 2);
  lcd.print(line3);

  lcd.setCursor(0, 3);
  lcd.print(line4);
}

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);

  Wire.begin(SDA_PIN, SCL_PIN);

  dht1.begin();
  dht2.begin();

  analogReadResolution(12);

  pinMode(AIN1, OUTPUT);
  pinMode(AIN2, OUTPUT);
  pinMode(STBY, OUTPUT);

  digitalWrite(STBY, HIGH);

  ledcAttach(PWM_A, 5000, 8);

  pinMode(PULL_UP_TRIG, INPUT_PULLDOWN);
  pinMode(PULL_DOWN_TRIG, INPUT_PULLDOWN);

  pinMode(NAV_CHECKPOINT_TRIG, INPUT_PULLDOWN);
  pinMode(NAV_READY_TRIG, OUTPUT);
  digitalWrite(NAV_READY_TRIG, LOW);

  lcd.init();
  lcd.backlight();

  bleInit();

  connectWiFi();
}

// ---------- Main Loop ----------
void loop() {
  unsigned long now = millis();

  // ---- DHT read ----
  if (now - lastDhtRead >= DHT_INTERVAL) {
    lastDhtRead = now;

    float t1 = dht1.readTemperature();
    float h1 = dht1.readHumidity();

    float t2 = dht2.readTemperature();
    float h2 = dht2.readHumidity();

    if (!isnan(t1) && !isnan(h1) &&
        !isnan(t2) && !isnan(h2)) {

      avgTemp = (t1 + t2) / 2.0;
      avgHum = (h1 + h2) / 2.0;

    } else {
      Serial.println("DHT read failed");
    }
  }

  // ---- Soil ----
  currentSoilPct = readSoilPercent();

  // ---- Supabase upload ----
  if (now - lastSupabaseUpload >= SUPABASE_INTERVAL) {
    lastSupabaseUpload = now;
    uploadToSupabase();
  }

  // ---- GPIO trigger edges ----
  bool upTrig = digitalRead(PULL_UP_TRIG);
  bool downTrig = digitalRead(PULL_DOWN_TRIG);

  bool upEdge =
    (upTrig == HIGH && lastUpTrig == LOW) ||
    bleUpFlag;

  bool downEdge =
    (downTrig == HIGH && lastDownTrig == LOW) ||
    bleDownFlag;

  bool navCheckpointTrig = digitalRead(NAV_CHECKPOINT_TRIG);
  bool navCheckpointEdge =
    (navCheckpointTrig == HIGH && lastNavCheckpointTrig == LOW);

  bleUpFlag = false;
  bleDownFlag = false;

  if (state == STATE_UP && navCheckpointEdge) {
    Serial.println("NAV CHECKPOINT: PROBE DOWN");

    navigationCycle = true;
    motorDown();

    stateStart = now;
    state = STATE_MOVING_DOWN;
  }

  if (state == STATE_UP && downEdge) {
    Serial.println("PULL_DOWN triggered");

    navigationCycle = false;
    motorDown();

    stateStart = now;
    state = STATE_MOVING_DOWN;
  }

  if (state == STATE_MOVING_DOWN &&
      now - stateStart >=
      (navigationCycle ? CHECKPOINT_DOWN_TIME : DOWN_TIME)) {

    motorStop();

    soilSum = 0;
    soilCount = 0;

    lastSoilSample = now;

    if (navigationCycle) {
      Serial.println("NAV CHECKPOINT: 5 SEC DOWN COMPLETE, PROBE UP");
      motorUp();
      stateStart = now;
      state = STATE_MOVING_UP;
    } else {
      state = STATE_DOWN_READING;
    }
  }

  if (state == STATE_DOWN_READING) {

    if (now - lastSoilSample >= SOIL_SAMPLE_INTERVAL) {
      lastSoilSample = now;

      soilSum += currentSoilPct;
      soilCount++;
    }

    if (upEdge) {
      finalSoilAvg =
        (soilCount > 0) ?
        (soilSum / soilCount) :
        0;

      Serial.printf(
        "Final Soil Moisture Average: %d %%\n",
        finalSoilAvg
      );

      motorUp();

      stateStart = now;
      state = STATE_MOVING_UP;
    }
  }

  if (state == STATE_MOVING_UP &&
      now - stateStart >= UP_TIME) {

    motorStop();
    state = STATE_UP;

    if (navigationCycle) {
      digitalWrite(NAV_READY_TRIG, HIGH);
      delay(100);
      digitalWrite(NAV_READY_TRIG, LOW);
      navigationCycle = false;

      Serial.println("NAV CHECKPOINT: READY SENT");
    }
  }

  lastUpTrig = upTrig;
  lastDownTrig = downTrig;
  lastNavCheckpointTrig = navCheckpointTrig;

  // ---- LCD ----
  if (now - lastLcdUpdate >= LCD_INTERVAL) {
    lastLcdUpdate = now;
    updateLCD();
  }
}
