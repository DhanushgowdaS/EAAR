import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DeviceInfo, EnvironmentReading, RobotStatus, AiResult, Solution } from '../types';

// Detect Supabase credentials from Vite environment or localStorage override
const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('EAAR_SUPABASE_URL') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('EAAR_SUPABASE_KEY') : null;

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = localUrl || envUrl || '';
  const key = localKey || envKey || '';

  // Validate format
  const isValid = Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    key !== 'your-anon-public-key' &&
    key.length > 20
  );

  return { url, key, isValid };
};

export const { url: SUPABASE_URL, key: SUPABASE_KEY, isValid: IS_SUPABASE_VALID } = getSupabaseConfig();

export let supabase: SupabaseClient | null = null;

if (IS_SUPABASE_VALID) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabase = null;
  }
}

export const reinitializeSupabase = (newUrl: string, newKey: string): boolean => {
  try {
    if (newUrl && newKey && newUrl.startsWith('https://')) {
      localStorage.setItem('EAAR_SUPABASE_URL', newUrl);
      localStorage.setItem('EAAR_SUPABASE_KEY', newKey);
      supabase = createClient(newUrl, newKey);
      return true;
    }
  } catch (e) {
    console.error('Reinit failed:', e);
  }
  return false;
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('EAAR_SUPABASE_URL');
  localStorage.removeItem('EAAR_SUPABASE_KEY');
  supabase = null;
};

// SQL Migration Script for Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- EAAR (Edge-AI Enabled Autonomous Agricultural Rover) SCHEMA
-- Run this in your Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- 1. Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL, -- esp32_devkit, raspberry_pi, esp32_s3
    status TEXT NOT NULL DEFAULT 'online', -- online, offline, standby
    role_title TEXT,
    ip_address TEXT,
    firmware_version TEXT,
    battery_level NUMERIC,
    rssi NUMERIC,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Environmental Readings (ESP32-S3 -> Wi-Fi -> Supabase)
CREATE TABLE IF NOT EXISTS public.environment_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
    temperature NUMERIC(5,2) NOT NULL, -- in °C
    humidity NUMERIC(5,2) NOT NULL,    -- in %
    soil_moisture NUMERIC(5,2) NOT NULL, -- in %
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Robot Realtime Navigation Status
CREATE TABLE IF NOT EXISTS public.robot_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    navigation_mode TEXT NOT NULL, -- Manual Route Teaching, Autonomous Route Playback, Idle, Evading
    current_row INTEGER NOT NULL DEFAULT 1,
    current_step INTEGER NOT NULL DEFAULT 0,
    heading NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    obstacle_status TEXT NOT NULL DEFAULT 'Clear',
    arm_status TEXT NOT NULL DEFAULT 'Idle',
    camera_status TEXT NOT NULL DEFAULT 'Active',
    current_inspection_point TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Plant Captures (Raspberry Pi -> Wi-Fi -> Supabase)
CREATE TABLE IF NOT EXISTS public.captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL,
    plant_name TEXT NOT NULL,
    capture_step INTEGER NOT NULL,
    image_url TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. AI Inference Results (Raspberry Pi Edge AI -> Supabase)
CREATE TABLE IF NOT EXISTS public.ai_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capture_id UUID REFERENCES public.captures(id) ON DELETE SET NULL,
    batch_id TEXT NOT NULL,
    plant_name TEXT NOT NULL,
    disease TEXT NOT NULL,
    confidence NUMERIC(5,2) NOT NULL, -- 0 to 100
    affected_percentage NUMERIC(5,2) NOT NULL, -- 0 to 100
    severity TEXT NOT NULL, -- Low, Moderate, High, Severe
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Agronomic Solutions (Prescribed Treatments)
CREATE TABLE IF NOT EXISTS public.solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease TEXT UNIQUE NOT NULL,
    treatment TEXT NOT NULL,
    pesticide TEXT NOT NULL,
    quantity TEXT NOT NULL,
    application_method TEXT NOT NULL,
    timing TEXT NOT NULL,
    spraying_info TEXT NOT NULL
);

-- Enable Row Level Security (RLS) and grant read/insert to anon
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on devices" ON public.devices FOR SELECT USING (true);
CREATE POLICY "Allow public insert on devices" ON public.devices FOR ALL USING (true);

CREATE POLICY "Allow public read on environment_readings" ON public.environment_readings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on environment_readings" ON public.environment_readings FOR ALL USING (true);

CREATE POLICY "Allow public read on robot_status" ON public.robot_status FOR SELECT USING (true);
CREATE POLICY "Allow public insert on robot_status" ON public.robot_status FOR ALL USING (true);

CREATE POLICY "Allow public read on captures" ON public.captures FOR SELECT USING (true);
CREATE POLICY "Allow public insert on captures" ON public.captures FOR ALL USING (true);

CREATE POLICY "Allow public read on ai_results" ON public.ai_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ai_results" ON public.ai_results FOR ALL USING (true);

CREATE POLICY "Allow public read on solutions" ON public.solutions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on solutions" ON public.solutions FOR ALL USING (true);

-- Enable Supabase Realtime for instant push updates to EAAR Dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.environment_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.robot_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.captures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_results;

-- Seed Default Devices
INSERT INTO public.devices (device_id, device_name, device_type, status, role_title, ip_address, firmware_version, battery_level, rssi)
VALUES
('ESP32-NAV-01', 'ESP32 DevKit', 'esp32_devkit', 'online', 'Navigation Controller', '192.168.4.15', 'v2.4.1-nav', 94, -58),
('RPI-BRAIN-01', 'Raspberry Pi 5', 'raspberry_pi', 'online', 'Edge AI Brain', '192.168.4.10', 'v3.2.0-onnx', 92, -52),
('ESP32-S3-ACT-01', 'ESP32-S3', 'esp32_s3', 'online', 'Sensor & Actuator Controller', '192.168.4.20', 'v2.8.3-s3', 96, -64)
ON CONFLICT (device_id) DO UPDATE SET status = 'online', last_seen = now();

-- Seed Default Agronomic Solutions
INSERT INTO public.solutions (disease, treatment, pesticide, quantity, application_method, timing, spraying_info)
VALUES
('Early Blight (Alternaria solani)', 'Targeted Fungicide Spraying', 'Mancozeb 75% WP / Copper Hydroxide', '2.5 g / liter water', 'Micro-droplet electrostatic nozzle spray to lower foliage', 'Early morning before direct sunlight', '30 PSI pressure, 50ml per infected plant cluster'),
('Powdery Mildew (Erysiphe cichoracearum)', 'Systemic Bio-Fungicide', 'Potassium Bicarbonate / Azoxystrobin', '3.0 g / liter water', 'High-angle canopy leaf coverage with fine mist', 'Late afternoon (16:30 - 18:00)', 'Targeted upper adaxial leaf surface spray'),
('Bacterial Spot (Xanthomonas spp.)', 'Copper-Bactericide Conjugate', 'Copper Oxychloride 50 WP + Streptocycline', '2.0 g + 0.1 g / liter water', 'Direct focal spray to diseased leaf lesions', 'Cool overcast window or post-dew dispersal', 'Precision burst nozzle: 25ml localized application'),
('Two-Spotted Spider Mite', 'Botanical Acaricide / Neem Extract', 'Azadirachtin 1% EC (Cold Pressed Neem)', '4.0 ml / liter water', 'Underside leaf axial nozzle inversion', 'Evening at dusk to preserve beneficial pollinators', 'High-pressure under-canopy misting'),
('Healthy Crop - No Pathogen', 'Nutrient Maintenance Foliar Spray', 'Organic Seaweed Extract & Micronutrients', '1.5 ml / liter water', 'Light periodic canopy misting', 'Pre-dawn autonomous run', 'Preventative maintenance cycle')
ON CONFLICT (disease) DO NOTHING;
`;

// Initial hardware device definitions
export const INITIAL_DEVICES: DeviceInfo[] = [
  {
    device_id: 'ESP32-NAV-01',
    device_name: 'ESP32 DevKit',
    device_type: 'esp32_devkit',
    status: 'online',
    last_seen: new Date().toISOString(),
    role_title: 'Navigation Controller',
    ip_address: '192.168.4.15',
    firmware_version: 'v2.4.1-nav',
    battery_level: 94,
    rssi: -58,
    active_task: 'Autonomous Route Playback (Row 4)',
  },
  {
    device_id: 'RPI-BRAIN-01',
    device_name: 'Raspberry Pi 5',
    device_type: 'raspberry_pi',
    status: 'online',
    last_seen: new Date().toISOString(),
    role_title: 'Edge AI Brain',
    ip_address: '192.168.4.10',
    firmware_version: 'v3.2.0-edge-onnx',
    battery_level: 91,
    rssi: -52,
    cpu_temp: 46.2,
    active_task: 'Plant Verification & Real-time Disease Detection',
  },
  {
    device_id: 'ESP32-S3-ACT-01',
    device_name: 'ESP32-S3',
    device_type: 'esp32_s3',
    status: 'online',
    last_seen: new Date().toISOString(),
    role_title: 'Sensor & Actuator Controller',
    ip_address: '192.168.4.20',
    firmware_version: 'v2.8.3-s3-arm',
    battery_level: 96,
    rssi: -64,
    active_task: 'Robotic Arm Positioning & Tri-Sensor Telemetry',
  },
];

// Curated Solutions Database for Agronomic Field Operations
export const KNOWN_SOLUTIONS: Record<string, Solution> = {
  'Early Blight (Alternaria solani)': {
    disease: 'Early Blight (Alternaria solani)',
    treatment: 'Targeted Fungicide Spraying',
    pesticide: 'Mancozeb 75% WP / Copper Hydroxide',
    quantity: '2.5 g / liter water',
    application_method: 'Micro-droplet electrostatic nozzle spray to lower foliage',
    timing: 'Early morning before direct sunlight (06:00 - 08:30)',
    spraying_info: 'Robotic arm positioned at 45° angle, 30 PSI pressure, 50ml targeted per plant cluster',
    safety_note: 'Avoid spraying when wind speed exceeds 12 km/h. Minimum 7-day pre-harvest interval.',
  },
  'Powdery Mildew (Erysiphe)': {
    disease: 'Powdery Mildew (Erysiphe)',
    treatment: 'Systemic Bio-Fungicide',
    pesticide: 'Potassium Bicarbonate + Azoxystrobin 23% SC',
    quantity: '1.2 ml / liter water',
    application_method: 'High-angle canopy sweep with fine aerosol mist',
    timing: 'Late afternoon (16:30 - 18:00)',
    spraying_info: 'Overhead 90° axial nozzle dispersion across upper adaxial leaf surfaces',
    safety_note: 'Non-toxic to soil earthworms. Safe for immediate re-entry after 4 hours.',
  },
  'Bacterial Spot (Xanthomonas)': {
    disease: 'Bacterial Spot (Xanthomonas)',
    treatment: 'Copper-Bactericide Conjugate',
    pesticide: 'Copper Oxychloride 50% WP + Streptocycline',
    quantity: '2.0 g + 0.1 g / liter water',
    application_method: 'Direct focal spot application onto active water-soaked lesions',
    timing: 'Post-dew dispersal under dry canopy condition',
    spraying_info: 'Localized 25ml pulse injection per quadrant; isolates infected tissue',
    safety_note: 'Wear chemical-resistant gloves during reservoir refill. Keep away from water bodies.',
  },
  'Two-Spotted Spider Mite': {
    disease: 'Two-Spotted Spider Mite',
    treatment: 'Botanical Acaricide / Neem Formulation',
    pesticide: 'Cold-Pressed Neem Seed Oil (Azadirachtin 1% EC)',
    quantity: '4.0 ml / liter water with organic surfactant',
    application_method: 'Underside leaf axial nozzle inversion (targeting abaxial surface)',
    timing: 'Dusk window (18:00 - 19:30) to preserve beneficial predatory insects',
    spraying_info: 'Dual bottom-up spray jets targeting dense mite webbing colonies',
    safety_note: 'Organic certified formulation. Fully biodegradable within 48 hours.',
  },
  'Healthy Foliage': {
    disease: 'Healthy Foliage - No Pathogen',
    treatment: 'Preventative Bio-Stimulant Foliar Feed',
    pesticide: 'Ascophyllum nodosum Seaweed Extract & Zinc Chelates',
    quantity: '1.5 ml / liter water',
    application_method: 'Broad canopy misting during routine row navigation',
    timing: 'Pre-dawn autonomous run (05:30)',
    spraying_info: 'Low volume periodic misting for optimal chlorophyll synthesis and drought resilience',
    safety_note: 'Completely natural bio-stimulant. Zero withholding period.',
  },
};

// Default Initial Mock Data for Development Mode
export const INITIAL_ENVIRONMENT: EnvironmentReading = {
  temperature: 27.4,
  humidity: 68.2,
  soil_moisture: 62.8,
  device_id: 'ESP32-S3-ACT-01',
  timestamp: new Date().toISOString(),
};

export const INITIAL_ROBOT_STATUS: RobotStatus = {
  navigation_mode: 'Autonomous Route Playback',
  current_row: 3,
  total_rows: 8,
  current_step: 42,
  total_steps: 120,
  heading: 142.5,
  obstacle_status: 'Clear',
  arm_status: 'Scanning',
  camera_status: 'Active',
  current_inspection_point: 'Row 3 · Plant #14 (Tomato Solanum lycopersicum)',
  timestamp: new Date().toISOString(),
  speed_mps: 0.35,
  battery_pct: 88,
  pesticide_tank_pct: 74,
};

export const INITIAL_AI_RESULTS: AiResult[] = [
  {
    id: 'ai-res-101',
    batch_id: 'BATCH-2026-0930-A',
    plant_name: 'Tomato (Solanum lycopersicum)',
    capture_step: 42,
    disease: 'Early Blight (Alternaria solani)',
    confidence: 94.6,
    affected_percentage: 28.5,
    severity: 'Moderate',
    timestamp: new Date().toISOString(),
    symptoms: [
      'Concentric target-like rings on mature lower leaves',
      'Chlorotic yellow halos surrounding dark necrotic lesions',
      'Collar rot manifestation near lower stem junction',
    ],
    solution: KNOWN_SOLUTIONS['Early Blight (Alternaria solani)'],
  },
  {
    id: 'ai-res-100',
    batch_id: 'BATCH-2026-0930-A',
    plant_name: 'Bell Pepper (Capsicum annuum)',
    capture_step: 38,
    disease: 'Bacterial Spot (Xanthomonas)',
    confidence: 89.2,
    affected_percentage: 16.0,
    severity: 'Low',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    symptoms: [
      'Small water-soaked spots on adaxial leaf margins',
      'Brown angular necrotic flecks with translucent margins',
    ],
    solution: KNOWN_SOLUTIONS['Bacterial Spot (Xanthomonas)'],
  },
  {
    id: 'ai-res-099',
    batch_id: 'BATCH-2026-0930-A',
    plant_name: 'Tomato (Solanum lycopersicum)',
    capture_step: 31,
    disease: 'Healthy Foliage',
    confidence: 98.4,
    affected_percentage: 0.0,
    severity: 'Low',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    symptoms: [
      'Vibrant deep green chlorophyll coloration',
      'Uniform leaf turgidity without mechanical or fungal damage',
    ],
    solution: KNOWN_SOLUTIONS['Healthy Foliage'],
  },
  {
    id: 'ai-res-098',
    batch_id: 'BATCH-2026-0930-A',
    plant_name: 'Eggplant (Solanum melongena)',
    capture_step: 24,
    disease: 'Two-Spotted Spider Mite',
    confidence: 91.8,
    affected_percentage: 42.0,
    severity: 'High',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    symptoms: [
      'Stippled pale speckling along major leaf veins',
      'Fine silken webbing spun across lower canopy clusters',
      'Leaf bronzing and dehydration stress',
    ],
    solution: KNOWN_SOLUTIONS['Two-Spotted Spider Mite'],
  },
];
