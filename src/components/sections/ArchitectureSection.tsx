import React, { useState } from 'react';
import { useRover } from '../../context/RoverContext';
import {
  Cpu,
  Radio,
  Eye,
  Database,
  ArrowDown,
  Layers,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  const { t, isSupabaseLive, connectionMode } = useRover();
  const [selectedNode, setSelectedNode] = useState<number>(0);

  const architectureNodes = [
    {
      id: 0,
      title: 'Navigation Controller',
      device: 'ESP32 DevKit',
      badge: 'Tier 1 · Motion & Route Engine',
      description:
        'Dedicated real-time motion and path executor. Interfaces directly with dual motor H-bridges, rotary encoders, and ultrasonic/LiDAR obstacle sensors.',
      roles: [
        'Navigation controller & dual H-bridge motor driver',
        'HC-05 Bluetooth module for manual field teaching',
        'Manual route recording and waypoint interpolation',
        'Non-volatile Flash memory route storage',
        'Autonomous route playback across designated crop rows',
        'Real-time obstacle detection & emergency stop handling',
        'Navigation mode and step status broadcast',
      ],
      protocols: ['UART serial bus to Raspberry Pi', 'Bluetooth SPP to operator handset'],
      icon: Radio,
      accentColor: 'border-emerald-500/80 text-emerald-400',
    },
    {
      id: 1,
      title: 'Main Brain',
      device: 'Raspberry Pi 5 · Edge AI',
      badge: 'Tier 2 · Vision & Edge Intelligence',
      description:
        'High-performance onboard compute hub hosting the camera pipeline, lightweight quantized ONNX neural network models, and agronomic reasoning engine.',
      roles: [
        'Central coordination brain & high-resolution camera interface',
        'Macro image acquisition & optical image pre-processing',
        'On-device Edge AI neural network inference',
        'Plant verification (foliage segmentation vs background soil)',
        'Disease, fungal stress & pest infestation classification',
        'Affected leaf surface percentage & severity estimation',
        'Agronomic treatment and pesticide recipe generation',
        'Local SD card high-resolution capture logging',
        'Wi-Fi telemetry dispatch directly to Supabase cloud',
      ],
      protocols: ['CSI camera ribbon', 'UART to microcontrollers', 'HTTPS/WSS to Supabase'],
      icon: Eye,
      accentColor: 'border-cyan-500/80 text-cyan-400',
    },
    {
      id: 2,
      title: 'Sensor & Actuator Controller',
      device: 'ESP32-S3',
      badge: 'Tier 3 · Tri-Sensor & Precision Arm',
      description:
        'Dual-core ESP32-S3 micro-actuator controller managing the 3-DOF robotic arm, environmental sensor cluster, and electrostatic pesticide delivery pump.',
      roles: [
        '3-DOF articulated robotic arm servo angle coordination',
        'Camera focal distance and leaf underside positioning',
        'High-precision ambient temperature monitoring',
        'Relative atmospheric humidity sampling',
        'Volumetric soil moisture probe readout',
        'Onboard status display & local diagnostic visualizer',
        'Targeted pesticide solenoid valve & pump micro-burst pulse',
        'Wi-Fi sensor payload streaming directly to Supabase',
      ],
      protocols: ['I2C / ADC tri-sensor bus', 'PWM servo rail', 'Wi-Fi to Supabase'],
      icon: Cpu,
      accentColor: 'border-amber-500/80 text-amber-400',
    },
    {
      id: 3,
      title: 'EAAR Central Dashboard',
      device: 'Web App & Supabase Realtime Hub',
      badge: 'Tier 4 · Real-time Operator Console',
      description:
        'Real-time digital twin monitoring console powered by Supabase Realtime subscriptions, responsive telemetry visualizations, and localized multi-language farmer alerts.',
      roles: [
        'Sub-second environmental condition monitoring',
        'Animated fluid flask, precision thermometer & soil layer animations',
        'Live autonomous robot tracking and crop-row navigation telemetry',
        'Newly received Raspberry Pi Edge AI disease classifications',
        'Actionable agronomic treatment recipes & spray parameters',
        'Device health fleet diagnostics (ESP32, RPi, ESP32-S3)',
        'Multi-lingual audio/text support (EN, KN, HI, TE, TA)',
      ],
      protocols: ['Supabase PostgreSQL Realtime WebSocket (WSS)', 'HTML5 Web Speech API'],
      icon: Database,
      accentColor: 'border-emerald-400 text-emerald-300',
    },
  ];

  return (
    <section className="py-16 bg-[#040905] border-t border-emerald-950/60 relative overflow-hidden">
      {/* Background technical watermarks */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2">
            <span>Hardware Architecture</span>
            <span aria-hidden="true" className="text-emerald-700">/</span>
            <span>Edge Computing Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            {t('arch_title')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 font-body leading-relaxed">
            {t('arch_subtitle')}
          </p>
        </div>

        {/* Dynamic Animated Data-Flow Bus Diagram */}
        <div className="mb-14 p-6 rounded-2xl bg-gradient-to-b from-[#09170e] to-[#050e07] border border-emerald-900/40 shadow-2xl">
          <div className="flex items-center justify-between border-b border-emerald-950 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                {t('data_flow_title')}
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {connectionMode === 'supabase' && isSupabaseLive ? '● WSS Socket Active' : '● Hardware Data Stream'}
            </span>
          </div>

          {/* Interactive Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
            {/* 1. ESP32 DevKit */}
            <div
              onClick={() => setSelectedNode(0)}
              className={`p-4 rounded-xl cursor-pointer transition-all border text-center ${
                selectedNode === 0
                  ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-[#08140b] border-emerald-950 hover:border-emerald-800'
              }`}
            >
              <Radio className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-xs font-mono text-emerald-400 uppercase font-semibold">ESP32 DevKit</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Navigation Controller</div>
            </div>

            {/* Pulse Line 1: ESP32 -> RPi */}
            <div className="hidden md:flex flex-col items-center justify-center">
              <div className="text-[10px] font-mono text-cyan-400 mb-1">UART Bus</div>
              <div className="w-full h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-400 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/80 animate-wave w-1/2" />
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1">Route Status</span>
            </div>

            {/* 2. Raspberry Pi */}
            <div
              onClick={() => setSelectedNode(1)}
              className={`p-4 rounded-xl cursor-pointer transition-all border text-center ${
                selectedNode === 1
                  ? 'bg-cyan-950/80 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#08140b] border-emerald-950 hover:border-emerald-800'
              }`}
            >
              <Eye className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
              <div className="text-xs font-mono text-cyan-400 uppercase font-semibold">Raspberry Pi 4B</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Edge AI Brain</div>
            </div>

            {/* Pulse Line 2: RPi -> ESP32-S3 */}
            <div className="hidden md:flex flex-col items-center justify-center">
              <div className="text-[10px] font-mono text-amber-400 mb-1">Actuation Cmd</div>
              <div className="w-full h-0.5 bg-gradient-to-r from-cyan-400 to-amber-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/80 animate-wave w-1/2" />
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1">Arm & Sprayer</span>
            </div>

            {/* 3. ESP32-S3 */}
            <div
              onClick={() => setSelectedNode(2)}
              className={`p-4 rounded-xl cursor-pointer transition-all border text-center ${
                selectedNode === 2
                  ? 'bg-amber-950/80 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-[#08140b] border-emerald-950 hover:border-emerald-800'
              }`}
            >
              <Cpu className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <div className="text-xs font-mono text-amber-400 uppercase font-semibold">ESP32-S3</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Sensors & Actuator</div>
            </div>
          </div>

          {/* Cloud Upload Flow to Supabase & Central Dashboard */}
          <div className="mt-6 pt-6 border-t border-emerald-950/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="p-3 rounded-lg bg-[#071109] border border-cyan-900/50 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Raspberry Pi → Wi-Fi</span>
              <span className="text-cyan-400 font-semibold">AI Results & Captures</span>
            </div>

            <div
              onClick={() => setSelectedNode(3)}
              className={`p-4 rounded-xl cursor-pointer border text-center transition-all ${
                selectedNode === 3
                  ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  : 'bg-[#0a180f] border-emerald-900/80 hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-heading font-bold text-sm text-white">
                  Supabase Central Backend
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/80 font-mono">
                PostgreSQL + Supabase Realtime Subscriptions
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#071109] border border-amber-900/50 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">ESP32-S3 → Wi-Fi</span>
              <span className="text-amber-400 font-semibold">Temp, Humidity, Moisture</span>
            </div>
          </div>
        </div>

        {/* Tier Details Card Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Tier Selector Tabs */}
          <div className="lg:col-span-5 space-y-3">
            {architectureNodes.map((node, index) => {
              const Icon = node.icon;
              const isSelected = selectedNode === index;
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(index)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#0a1d10] border-emerald-500/80 shadow-lg'
                      : 'bg-[#07120a] border-emerald-950 text-slate-400 hover:text-white hover:border-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/50'
                          : 'bg-[#060e08] text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 block uppercase">
                        {node.device}
                      </span>
                      <h4 className="font-heading font-bold text-sm sm:text-base text-white">
                        {node.title}
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Tier 0{index + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Active Tier Deep Dive Panel */}
          <div className="lg:col-span-7">
            {(() => {
              const activeNode = architectureNodes[selectedNode];
              const Icon = activeNode.icon;
              return (
                <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0a1c10] to-[#061008] border border-emerald-900/60 shadow-xl space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950 pb-4">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                        {activeNode.badge}
                      </span>
                      <h3 className="text-2xl font-heading font-bold text-white mt-1">
                        {activeNode.title}
                      </h3>
                      <span className="text-sm font-mono text-emerald-400">
                        {activeNode.device}
                      </span>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 font-body leading-relaxed">
                    {activeNode.description}
                  </p>

                  {/* Core Hardware & Software Roles */}
                  <div>
                    <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                      Core Functional Responsibilities:
                    </h5>
                    <ul className="space-y-2">
                      {activeNode.roles.map((role, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-body">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Protocol Interfaces */}
                  <div className="pt-4 border-t border-emerald-950 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">Interconnects:</span>
                    {activeNode.protocols.map((proto, pIdx) => (
                      <span
                        key={pIdx}
                        className="px-2.5 py-1 rounded bg-[#050e07] border border-emerald-900 text-xs font-mono text-cyan-300"
                      >
                        {proto}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
};
