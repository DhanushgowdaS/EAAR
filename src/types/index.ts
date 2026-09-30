export type NavigationMode =
  | 'Manual Route Teaching'
  | 'Autonomous Route Playback'
  | 'Idle'
  | 'Obstacle Evading'
  | 'Targeted Spraying';

export type DeviceType = 'esp32_devkit' | 'raspberry_pi' | 'esp32_s3';
export type DeviceStatus = 'online' | 'offline' | 'standby' | 'transmitting';

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  status: DeviceStatus;
  last_seen: string;
  role_title: string;
  ip_address?: string;
  firmware_version?: string;
  battery_level?: number;
  rssi?: number;
  cpu_temp?: number;
  active_task?: string;
}

export interface EnvironmentReading {
  id?: string;
  temperature: number; // in Celsius
  humidity: number; // in %
  soil_moisture: number; // in %
  device_id: string;
  timestamp: string;
}

export interface RobotStatus {
  id?: string;
  navigation_mode: NavigationMode;
  current_row: number;
  total_rows?: number;
  current_step: number;
  total_steps?: number;
  heading: number; // in degrees 0-360
  obstacle_status: 'Clear' | 'Obstacle Detected' | 'Evading' | 'Route Re-planning';
  arm_status: 'Idle' | 'Positioning' | 'Scanning' | 'Spraying' | 'Homed';
  camera_status: 'Active' | 'Standby' | 'Capturing' | 'AI Inference';
  current_inspection_point: string;
  timestamp: string;
  speed_mps?: number;
  battery_pct?: number;
  pesticide_tank_pct?: number;
}

export interface Capture {
  id: string;
  batch_id: string;
  plant_name: string;
  capture_step: number;
  image_url: string;
  timestamp: string;
}

export type DiseaseSeverity = 'Low' | 'Moderate' | 'High' | 'Severe';

export interface Solution {
  id?: string;
  disease: string;
  treatment: string;
  pesticide: string;
  quantity: string;
  application_method: string;
  timing: string;
  spraying_info: string;
  safety_note?: string;
}

export interface AiResult {
  id: string;
  capture_id?: string;
  batch_id: string;
  plant_name: string;
  capture_step: number;
  image_url?: string;
  disease: string;
  confidence: number; // percentage 0-100
  affected_percentage: number; // percentage 0-100
  severity: DiseaseSeverity;
  timestamp: string;
  symptoms?: string[];
  solution?: Solution;
}

export type SupportedLanguage = 'en' | 'kn' | 'hi' | 'te' | 'ta';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}
