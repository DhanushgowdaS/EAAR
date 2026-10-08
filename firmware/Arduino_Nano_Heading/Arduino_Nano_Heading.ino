#include <Wire.h>

// Serial is the Nano-to-ESP32 heading-control link.
// N = no correction, L = correct left, R = correct right.
// Do not add debug text to Serial; it would corrupt the control protocol.

#define MPU_ADDR 0x68
#define PWR_MGMT_1 0x6B
#define GYRO_ZOUT_H 0x47
#define GYRO_SENS 131.0

#define CALIBRATION_SAMPLES 500
#define CALIBRATION_DELAY_MS 3
#define CORRECTION_DEADBAND 3.0
#define OUTPUT_INTERVAL_MS 50

float gyroZoffset = 0.0;
float yaw = 0.0;

unsigned long lastTime = 0;
unsigned long lastOutput = 0;

void mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

int16_t readGyroZ() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(GYRO_ZOUT_H);
  Wire.endTransmission(false);

  Wire.requestFrom(MPU_ADDR, 2);

  if (Wire.available() < 2) {
    return 0;
  }

  return (int16_t)((Wire.read() << 8) | Wire.read());
}

void calibrateGyro() {
  long sum = 0;

  for (int i = 0; i < CALIBRATION_SAMPLES; i++) {
    sum += readGyroZ();
    delay(CALIBRATION_DELAY_MS);
  }

  gyroZoffset = sum / (float)CALIBRATION_SAMPLES;
}

void setup() {
  Serial.begin(9600);
  Wire.begin();

  mpuWrite(PWR_MGMT_1, 0x00);
  delay(100);

  calibrateGyro();

  yaw = 0.0;
  lastTime = micros();
  lastOutput = millis();

  Serial.write('N');
}

void loop() {
  unsigned long nowMicros = micros();
  float dt = (nowMicros - lastTime) / 1000000.0;
  lastTime = nowMicros;

  if (dt <= 0.0 || dt > 0.1) {
    return;
  }

  float gz = (readGyroZ() - gyroZoffset) / GYRO_SENS;

  yaw -= gz * dt;

  while (yaw > 180.0) {
    yaw -= 360.0;
  }

  while (yaw < -180.0) {
    yaw += 360.0;
  }

  unsigned long nowMillis = millis();

  if (nowMillis - lastOutput >= OUTPUT_INTERVAL_MS) {
    lastOutput = nowMillis;

    if (yaw > CORRECTION_DEADBAND) {
      Serial.write('L');
    } else if (yaw < -CORRECTION_DEADBAND) {
      Serial.write('R');
    } else {
      Serial.write('N');
    }
  }
}
