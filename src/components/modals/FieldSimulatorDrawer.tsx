import React, { useState } from 'react';
import { useRover } from '../../context/RoverContext';
import {
  X,
  SlidersHorizontal,
  Thermometer,
  Droplets,
  Sprout,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { DiseaseSeverity } from '../../types';

export const FieldSimulatorDrawer: React.FC = () => {
  const {
    isSimulatorModalOpen,
    setIsSimulatorModalOpen,
    environment,
    injectHardwareReading,
    injectAiResult,
    injectRobotStatus,
    robotStatus,
    t,
    connectionMode,
  } = useRover();

  // Simulated ESP32-S3 Sensor Sliders
  const [simTemp, setSimTemp] = useState<number>(environment?.temperature ?? 28.5);
  const [simHumidity, setSimHumidity] = useState<number>(environment?.humidity ?? 72.0);
  const [simMoisture, setSimMoisture] = useState<number>(environment?.soil_moisture ?? 64.0);

  // Simulated Raspberry Pi AI Detection
  const [simPlant, setSimPlant] = useState<string>('Tomato (Solanum lycopersicum)');
  const [simDisease, setSimDisease] = useState<string>('Early Blight (Alternaria solani)');
  const [simConfidence, setSimConfidence] = useState<number>(93.5);
  const [simAffected, setSimAffected] = useState<number>(26.0);
  const [simSeverity, setSimSeverity] = useState<DiseaseSeverity>('Moderate');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isSimulatorModalOpen) return null;

  const handleSendSensorPacket = async () => {
    setStatusMsg('Transmitting ESP32-S3 Wi-Fi packet...');
    const ok = await injectHardwareReading({
      temperature: simTemp,
      humidity: simHumidity,
      soil_moisture: simMoisture,
      device_id: 'ESP32-S3-ACT-01',
    });
    setStatusMsg(ok ? '✓ Packet received by EAAR!' : '✓ Demo state updated');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleSendAiDetection = async () => {
    setStatusMsg('Dispatching Raspberry Pi Edge AI inference...');
    const ok = await injectAiResult({
      plant_name: simPlant,
      disease: simDisease,
      confidence: simConfidence,
      affected_percentage: simAffected,
      severity: simSeverity,
      capture_step: robotStatus.current_step,
    });
    setStatusMsg(ok ? '✓ New AI diagnosis logged!' : '✓ Diagnosis logged');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsSimulatorModalOpen(false)}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-[#07130a] border-l border-emerald-900/60 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto text-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-cyan-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-white">
                  {t('simulator_title')}
                </h3>
                <p className="text-xs font-mono text-emerald-400/80">
                  {connectionMode === 'supabase'
                    ? 'Target: Real Supabase Cloud DB'
                    : 'Target: Local Field Emulator'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSimulatorModalOpen(false)}
              className="p-2 rounded-lg bg-[#0e2113] text-slate-400 hover:text-white hover:bg-emerald-900/50 transition-colors"
              aria-label="Close simulator"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {statusMsg && (
            <div className="p-3 my-3 rounded-lg bg-emerald-950/80 border border-emerald-500/80 text-xs font-mono text-emerald-300">
              {statusMsg}
            </div>
          )}

          {/* Body Sections */}
          <div className="space-y-8 flex-1 py-4">
            {/* SECTION 1: ESP32-S3 SENSORS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  1. ESP32-S3 Sensor Telemetry
                </span>
                <span className="text-[11px] font-mono text-slate-400">Tri-Sensor Payload</span>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Temperature</span>
                  </span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {simTemp.toFixed(1)}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="48"
                  step="0.5"
                  value={simTemp}
                  onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-black rounded-lg cursor-pointer"
                />
              </div>

              {/* Humidity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Humidity</span>
                  </span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    {simHumidity.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="98"
                  step="0.5"
                  value={simHumidity}
                  onChange={(e) => setSimHumidity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-black rounded-lg cursor-pointer"
                />
              </div>

              {/* Soil Moisture Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-amber-400" />
                    <span>Soil Moisture</span>
                  </span>
                  <span className="text-amber-400 font-bold tabular-nums">
                    {simMoisture.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="95"
                  step="0.5"
                  value={simMoisture}
                  onChange={(e) => setSimMoisture(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-black rounded-lg cursor-pointer"
                />
              </div>

              <button
                onClick={handleSendSensorPacket}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit ESP32-S3 Packet</span>
              </button>
            </div>

            {/* SECTION 2: RASPBERRY PI EDGE AI INFERENCE */}
            <div className="space-y-4 pt-4 border-t border-emerald-950">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  2. Raspberry Pi Edge AI Inference
                </span>
                <span className="text-[11px] font-mono text-slate-400">Vision Model</span>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Plant Specimen
                </label>
                <select
                  value={simPlant}
                  onChange={(e) => setSimPlant(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#050e07] border border-emerald-900 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Tomato (Solanum lycopersicum)">Tomato (Solanum lycopersicum)</option>
                  <option value="Bell Pepper (Capsicum annuum)">Bell Pepper (Capsicum annuum)</option>
                  <option value="Eggplant (Solanum melongena)">Eggplant (Solanum melongena)</option>
                  <option value="Cucumber (Cucumis sativus)">Cucumber (Cucumis sativus)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Classified Pathogen / Pest
                </label>
                <select
                  value={simDisease}
                  onChange={(e) => setSimDisease(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#050e07] border border-emerald-900 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Early Blight (Alternaria solani)">Early Blight (Alternaria solani)</option>
                  <option value="Powdery Mildew (Erysiphe)">Powdery Mildew (Erysiphe)</option>
                  <option value="Bacterial Spot (Xanthomonas)">Bacterial Spot (Xanthomonas)</option>
                  <option value="Two-Spotted Spider Mite">Two-Spotted Spider Mite</option>
                  <option value="Healthy Foliage">Healthy Foliage - No Pathogen</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">
                    Confidence ({simConfidence}%)
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="99"
                    value={simConfidence}
                    onChange={(e) => setSimConfidence(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-black rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">
                    Affected Area ({simAffected}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={simAffected}
                    onChange={(e) => setSimAffected(parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-black rounded cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleSendAiDetection}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Simulate Raspberry Pi AI Inference</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-emerald-950 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>EAAR Field Hardware Injector</span>
            <span>Realtime Test Harness</span>
          </div>
        </div>
      </div>
    </div>
  );
};
