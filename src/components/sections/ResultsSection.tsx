import React, { useState, useEffect, useRef } from 'react';
import { useRover } from '../../context/RoverContext';
import {
  Thermometer,
  Droplets,
  Sprout,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  Scan,
  CheckCircle2,
  Syringe,
  Wind,
  Info,
} from 'lucide-react';
import { AiResult } from '../../types';

export const ResultsSection: React.FC = () => {
  const { environment, aiResults, activeAiResult, setActiveAiResult, t } = useRover();

  // Smoothly interpolated values for animations
  const [smoothTemp, setSmoothTemp] = useState<number>(environment?.temperature ?? 26);
  const [smoothHumidity, setSmoothHumidity] = useState<number>(environment?.humidity ?? 65);
  const [smoothMoisture, setSmoothMoisture] = useState<number>(environment?.soil_moisture ?? 55);

  const prevValues = useRef({
    temp: smoothTemp,
    humidity: smoothHumidity,
    moisture: smoothMoisture,
  });

  // Natural smooth interpolation when environment changes
  useEffect(() => {
    if (!environment) return;

    const targetTemp = environment.temperature;
    const targetHumidity = environment.humidity;
    const targetMoisture = environment.soil_moisture;

    let startTime: number | null = null;
    const duration = 1200; // ms for smooth physics-like rise/fall

    const startTemp = prevValues.current.temp;
    const startHumidity = prevValues.current.humidity;
    const startMoisture = prevValues.current.moisture;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const curTemp = startTemp + (targetTemp - startTemp) * ease;
      const curHumidity = startHumidity + (targetHumidity - startHumidity) * ease;
      const curMoisture = startMoisture + (targetMoisture - startMoisture) * ease;

      setSmoothTemp(curTemp);
      setSmoothHumidity(curHumidity);
      setSmoothMoisture(curMoisture);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValues.current = {
          temp: targetTemp,
          humidity: targetHumidity,
          moisture: targetMoisture,
        };
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [environment]);

  const activeDetection: AiResult | null = activeAiResult || (aiResults.length > 0 ? aiResults[0] : null);

  return (
    <section className="py-16 bg-[#040905] border-t border-emerald-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2">
            <span>Dual Telemetry Pipeline</span>
            <span aria-hidden="true" className="text-emerald-700">/</span>
            <span>Real-time Inferences</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            {t('results_title')}
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-body">
            {t('results_subtitle')}
          </p>
        </div>

        {/* ============================================================== */}
        {/* PART A: ENVIRONMENTAL CONDITIONS (Large Horizontal Cards)     */}
        {/* ============================================================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xl font-heading font-bold text-white tracking-tight">
                {t('env_heading')}
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              ESP32-S3 Tri-Sensor Stream
            </span>
          </div>

          {!environment ? (
            <div className="p-8 rounded-2xl bg-[#07130a] border border-dashed border-emerald-900/60 text-center space-y-2">
              <Clock className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
              <h4 className="text-base font-heading font-bold text-white">
                {t('waiting_for_data')}
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                Listening on Supabase Realtime channel for ESP32-S3 sensor packets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. TEMPERATURE: Smooth Animated Thermometer */}
              <div className="rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                      Thermal Atmospheric
                    </span>
                    <Thermometer className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-heading font-bold text-white">
                    {t('temperature')}
                  </h4>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-white tabular-nums">
                      {smoothTemp.toFixed(1)}
                    </span>
                    <span className="text-lg font-mono text-emerald-400 font-semibold">
                      {t('temp_unit')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-body mt-1">
                    Optimal crop photosynthesis band: 22.0°C – 30.0°C
                  </p>
                </div>

                {/* Animated Physical Thermometer Simulation */}
                <div className="my-6 p-4 rounded-xl bg-[#061008] border border-emerald-950 flex items-center justify-center gap-6">
                  {/* Vertical Thermometer Stem & Bulb */}
                  <div className="relative flex flex-col items-center">
                    {/* Glass Tube Frame */}
                    <div className="relative w-6 h-48 rounded-t-full bg-[#0a1b0f] border-2 border-emerald-800/80 overflow-hidden flex flex-col justify-end p-0.5">
                      {/* Scale Tick Marks */}
                      <div className="absolute inset-y-2 left-1 flex flex-col justify-between text-[8px] font-mono text-slate-500 pointer-events-none">
                        <span>50°</span>
                        <span>40°</span>
                        <span>30°</span>
                        <span>20°</span>
                        <span>10°</span>
                        <span>0°</span>
                      </div>

                      {/* Rising / Falling Liquid Column */}
                      {/* Map temp (0° to 50°) to percentage (0% to 100%) */}
                      <div
                        className="w-full rounded-b-sm bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                        style={{
                          height: `${Math.min(100, Math.max(5, (smoothTemp / 50) * 100))}%`,
                        }}
                      >
                        {/* Meniscus surface shimmer */}
                        <div className="w-full h-1 bg-white/80 rounded-t-full" />
                      </div>
                    </div>

                    {/* Thermometer Bulb Base */}
                    <div className="w-10 h-10 -mt-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-700 border-2 border-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.6)] flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-200/80 animate-pulse" />
                    </div>
                  </div>

                  {/* Temperature Legend & Range Guidance */}
                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">Target Range (24-28°C)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-slate-400">High Heat Stress (&gt;35°C)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-slate-400">Frost Hazard (&lt;10°C)</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-emerald-950 pt-3">
                  <span>ESP32-S3 DHT/SHT40</span>
                  <span className="text-emerald-400">Calibrated ±0.2°C</span>
                </div>
              </div>

              {/* 2. HUMIDITY: Smooth Animated Laboratory Flask / Glass Beaker */}
              <div className="rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                      Atmospheric Moisture
                    </span>
                    <Droplets className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h4 className="text-lg font-heading font-bold text-white">
                    {t('humidity')}
                  </h4>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-white tabular-nums">
                      {smoothHumidity.toFixed(1)}
                    </span>
                    <span className="text-lg font-mono text-cyan-400 font-semibold">
                      {t('humidity_unit')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-body mt-1">
                    Fungal spore threshold risk above 75% RH
                  </p>
                </div>

                {/* Animated Laboratory Flask */}
                <div className="my-6 p-4 rounded-xl bg-[#061008] border border-emerald-950 flex items-center justify-center gap-6">
                  {/* Glass Flask SVG & Fluid Simulation */}
                  <div className="relative w-32 h-44 flex items-center justify-center">
                    {/* Flask Outline Container */}
                    <div className="relative w-28 h-40">
                      {/* Flask Neck */}
                      <div className="absolute top-0 left-10 w-8 h-10 border-x-2 border-t-2 border-cyan-500/60 rounded-t-sm bg-cyan-950/20" />
                      {/* Flask Body Conical Shape */}
                      <div
                        className="absolute bottom-0 inset-x-0 h-32 border-2 border-cyan-500/60 bg-gradient-to-b from-cyan-950/30 to-[#041014]/60 overflow-hidden"
                        style={{
                          clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
                          borderRadius: '0 0 16px 16px',
                        }}
                      >
                        {/* Smooth Rising / Falling Animated Liquid */}
                        <div
                          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-cyan-600 via-teal-500 to-cyan-300 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                          style={{
                            height: `${Math.min(95, Math.max(10, smoothHumidity))}%`,
                          }}
                        >
                          {/* Liquid Surface Wave */}
                          <div className="absolute top-0 inset-x-0 h-2 bg-cyan-100/70 animate-pulse" />
                          {/* Rising Bubbles */}
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60 absolute left-4 bottom-2 animate-bounce" />
                          <div className="w-1 h-1 rounded-full bg-white/80 absolute right-6 bottom-5 animate-ping" />
                        </div>
                      </div>

                      {/* Measurement Graduation Lines on Glass */}
                      <div className="absolute bottom-4 left-2 flex flex-col justify-between h-20 text-[7px] font-mono text-cyan-300/80 pointer-events-none">
                        <span>— 80%</span>
                        <span>— 60%</span>
                        <span>— 40%</span>
                        <span>— 20%</span>
                      </div>
                    </div>
                  </div>

                  {/* Humidity Status Indicator */}
                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-slate-300">
                        {smoothHumidity > 75
                          ? 'High Humidity'
                          : smoothHumidity < 40
                          ? 'Dry Air'
                          : 'Nominal Vapor'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Vapor Deficit: {(100 - smoothHumidity).toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-cyan-300/80">
                      Dew Point: {(smoothTemp - (100 - smoothHumidity) / 5).toFixed(1)}°C
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-emerald-950 pt-3">
                  <span>Capacitive Sensor</span>
                  <span className="text-cyan-400">Response &lt;1.2s</span>
                </div>
              </div>

              {/* 3. SOIL MOISTURE: Animated Plant & Soil Layers */}
              <div className="rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                      Rhizosphere Hydration
                    </span>
                    <Sprout className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-heading font-bold text-white">
                    {t('soil_moisture')}
                  </h4>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-white tabular-nums">
                      {smoothMoisture.toFixed(1)}
                    </span>
                    <span className="text-lg font-mono text-amber-400 font-semibold">
                      {t('soil_unit')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-body mt-1">
                    Root saturation equilibrium target: 50% – 70%
                  </p>
                </div>

                {/* Animated Soil Layers & Plant Roots */}
                <div className="my-6 p-4 rounded-xl bg-[#061008] border border-emerald-950 flex flex-col items-center">
                  {/* Thriving Crop Plant Header */}
                  <div className="relative mb-2 flex items-center justify-center">
                    <div className="relative w-12 h-14 flex items-center justify-center">
                      <Sprout
                        className={`w-10 h-10 transition-transform duration-500 ${
                          smoothMoisture < 30
                            ? 'text-amber-500 rotate-12 scale-90'
                            : 'text-emerald-400 scale-110 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 4 Soil Horizons Stack */}
                  <div className="w-full space-y-1 text-[10px] font-mono">
                    {/* Layer 1: Organic Mulch */}
                    <div className="p-1.5 rounded-sm bg-[#2b1f13] border border-amber-900/60 flex items-center justify-between text-amber-300">
                      <span>{t('soil_layer_organic')}</span>
                      <span>Humus</span>
                    </div>

                    {/* Layer 2: Topsoil Horizon */}
                    <div className="p-1.5 rounded-sm bg-[#1c150c] border border-amber-950 flex items-center justify-between text-slate-300">
                      <span>{t('soil_layer_topsoil')}</span>
                      <span className="text-cyan-400 font-semibold">
                        {smoothMoisture.toFixed(0)}% Vol
                      </span>
                    </div>

                    {/* Layer 3: Root Zone with dynamic moisture saturation */}
                    <div
                      className="p-2 rounded-sm border transition-all duration-300 flex items-center justify-between relative overflow-hidden"
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${Math.min(0.4, (smoothMoisture / 100) * 0.4)})`,
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      <div className="z-10 flex items-center gap-1.5 text-emerald-200">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>{t('soil_layer_rootzone')}</span>
                      </div>
                      <span className="z-10 text-cyan-300 font-mono">
                        {smoothMoisture > 50 ? 'Well Hydrated' : 'Needs Irrigation'}
                      </span>
                    </div>

                    {/* Layer 4: Deep Subsoil */}
                    <div className="p-1.5 rounded-sm bg-[#100d07] border border-amber-950/80 flex items-center justify-between text-slate-400">
                      <span>{t('soil_layer_subsoil')}</span>
                      <span>Permeable</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-emerald-950 pt-3">
                  <span>FDR Capacitive Probe</span>
                  <span className="text-amber-400">Depth: 25 cm</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* PART B: DISEASE & RECOMMENDED SOLUTION                        */}
        {/* ============================================================== */}
        <div className="space-y-6 pt-6 border-t border-emerald-950">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-950 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-xl font-heading font-bold text-white tracking-tight">
                {t('disease_heading')}
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              Raspberry Pi Edge AI Model Output
            </span>
          </div>

          {activeDetection ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: AI Detection Card */}
              <div className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-[#09180f] to-[#050e08] border border-emerald-900/60 p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                      Target Plant Inspection
                    </span>
                    <h4 className="text-2xl font-heading font-bold text-white mt-1">
                      {activeDetection.plant_name}
                    </h4>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${
                      activeDetection.severity === 'Severe' || activeDetection.severity === 'High'
                        ? 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                        : activeDetection.severity === 'Moderate'
                        ? 'bg-amber-950/80 border-amber-500/80 text-amber-300'
                        : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                    }`}
                  >
                    {activeDetection.severity} Severity
                  </span>
                </div>

                {/* Macro Plant Leaf Optical Viewport with Bounding Box Overlay */}
                <div className="relative h-56 rounded-xl bg-[#030904] border border-emerald-900/80 overflow-hidden flex items-center justify-center">
                  {/* Subtle stylized leaf background representation */}
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full text-emerald-900/40 p-4"
                    fill="none"
                  >
                    <path
                      d="M100 20 C150 60 170 140 100 180 C30 140 50 60 100 20 Z"
                      fill="currentColor"
                      stroke="#10b981"
                      strokeWidth="1.5"
                    />
                    <path d="M100 20 L100 180" stroke="#34d399" strokeWidth="1.5" />
                    <path d="M100 70 Q130 90 150 110" stroke="#34d399" strokeWidth="1" />
                    <path d="M100 110 Q60 130 40 140" stroke="#34d399" strokeWidth="1" />
                  </svg>

                  {/* Laser Scanning Line */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" />

                  {/* AI Bounding Box on Detected Lesion Area */}
                  {activeDetection.affected_percentage > 0 && (
                    <div className="absolute w-28 h-24 border-2 border-dashed border-rose-500 rounded bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.4)] flex flex-col justify-between p-1.5 animate-pulse">
                      <span className="text-[9px] font-mono text-rose-300 font-bold bg-black/70 px-1 py-0.5 rounded w-max">
                        {activeDetection.disease}
                      </span>
                      <span className="text-[8px] font-mono text-rose-200 text-right">
                        Conf: {activeDetection.confidence.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Corner Target Reticles */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
                </div>

                {/* Structured Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                    <span className="text-slate-400 block mb-1">{t('detected_disease')}</span>
                    <span className="text-sm font-semibold text-rose-300">
                      {activeDetection.disease}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                    <span className="text-slate-400 block mb-1">{t('confidence')}</span>
                    <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                      {activeDetection.confidence.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                    <span className="text-slate-400 block mb-1">{t('affected_area')}</span>
                    <span className="text-sm font-semibold text-amber-300 tabular-nums">
                      {activeDetection.affected_percentage.toFixed(1)}% Foliage
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                    <span className="text-slate-400 block mb-1">{t('batch_no')}</span>
                    <span className="text-xs text-slate-300">
                      {activeDetection.batch_id} · Step {activeDetection.capture_step}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: RECOMMENDED SOLUTION CARD */}
              <div className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-[#0c2214] to-[#06120a] border border-emerald-600/50 p-6 sm:p-8 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Syringe className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-xl font-heading font-bold text-white">
                      {t('rec_solution')}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-900/60 text-xs font-mono text-emerald-300">
                    Precision Protocol
                  </span>
                </div>

                {/* Healthy Plant Specific Banner */}
                {activeDetection.disease.toLowerCase().includes('healthy') || activeDetection.affected_percentage === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/80 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-heading font-bold text-sm text-emerald-300">
                        Healthy Crop Verified · No Chemical Treatment Required
                      </h5>
                      <p className="text-xs text-emerald-200/80 mt-1 font-body leading-relaxed">
                        Foliage exhibits prime chlorophyll turgidity. EAAR targeted electrostatic spraying pump is safely disabled for this plant to conserve chemical inputs and soil microbial ecology.
                      </p>
                    </div>
                  </div>
                ) : null}

                {activeDetection.solution ? (
                  <div className="space-y-4">
                    {/* Prescribed Treatment */}
                    <div className="p-3.5 rounded-xl bg-[#061109] border border-emerald-900/80">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                        {t('treatment')}
                      </span>
                      <p className="text-sm sm:text-base font-heading font-semibold text-emerald-300">
                        {activeDetection.solution.treatment}
                      </p>
                    </div>

                    {/* Pesticide / Formulation */}
                    <div className="p-3.5 rounded-xl bg-[#061109] border border-emerald-900/80">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                        {t('pesticide')}
                      </span>
                      <p className="text-sm font-body text-white font-medium">
                        {activeDetection.solution.pesticide}
                      </p>
                    </div>

                    {/* Dosage & Application Method */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-[#061109] border border-emerald-950">
                        <span className="text-xs font-mono text-slate-400 block mb-1">
                          {t('quantity')}
                        </span>
                        <p className="text-xs font-mono text-cyan-300 font-semibold">
                          {activeDetection.solution.quantity}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#061109] border border-emerald-950">
                        <span className="text-xs font-mono text-slate-400 block mb-1">
                          {t('timing')}
                        </span>
                        <p className="text-xs font-mono text-amber-300">
                          {activeDetection.solution.timing}
                        </p>
                      </div>
                    </div>

                    {/* Robotic Sprayer Configuration */}
                    <div className="p-3.5 rounded-xl bg-[#061109] border border-emerald-900/80 space-y-1">
                      <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 block">
                        {t('spraying_info')}
                      </span>
                      <p className="text-xs text-slate-200 font-body leading-relaxed">
                        {activeDetection.solution.spraying_info}
                      </p>
                    </div>

                    {/* Agronomic Safety Note */}
                    {activeDetection.solution.safety_note && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200/90 font-body">
                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{activeDetection.solution.safety_note}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">
                    Generating agronomic prescription from knowledge base...
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#07130a] border border-dashed border-emerald-900/60 text-center">
              <span className="text-xs font-mono text-slate-400">
                No plant disease captures logged yet in current session.
              </span>
            </div>
          )}

          {/* Historical Inferences Carousel / Selector */}
          {aiResults.length > 1 && (
            <div className="pt-6 space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                Session Inspection History ({aiResults.length} Plants Sampled):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {aiResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveAiResult(item)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeDetection?.id === item.id
                        ? 'bg-emerald-950/80 border-emerald-500 shadow-md'
                        : 'bg-[#060e08] border-emerald-950 hover:border-emerald-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Step #{item.capture_step}</span>
                      <span className={item.severity === 'Severe' || item.severity === 'High' ? 'text-rose-400' : 'text-emerald-400'}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="text-xs font-heading font-semibold text-white truncate">
                      {item.plant_name}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 mt-0.5 truncate">
                      {item.disease}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
