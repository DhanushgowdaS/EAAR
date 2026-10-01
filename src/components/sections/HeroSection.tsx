import React from 'react';
import { useRover } from '../../context/RoverContext';
import { RoverFiber } from '../3d/RoverFiber';
import { ArrowRight, Activity, Cpu, ShieldCheck, Zap, Sparkles, Navigation, Droplets } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { setActiveSection, t, environment, robotStatus, totalRows } = useRover();

  return (
    <section className="relative pt-6 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Subtle Category Lead-In (Zero-Pill Discipline: unboxed clean text) */}
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 mb-4 tracking-wider uppercase">
          <span>{t('badge_autonomous')}</span>
          <span aria-hidden="true" className="text-emerald-700">·</span>
          <span>{t('badge_edge_ai')}</span>
          <span aria-hidden="true" className="text-emerald-700">·</span>
          <span>{t('badge_targeted_spray')}</span>
        </div>

        {/* Hero Headline & Description */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-10">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-heading text-white leading-[1.08] text-balance">
              EAAR
              <span className="block text-2xl sm:text-4xl lg:text-5xl font-medium text-emerald-400 mt-2">
                Edge-AI Enabled
              </span>
              <span className="block text-2xl sm:text-4xl lg:text-5xl font-medium text-slate-200">
                Autonomous Agricultural Rover
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-body leading-relaxed max-w-2xl text-pretty">
              {t('hero_desc')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveSection('results')}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] flex items-center gap-2 cursor-pointer"
              >
                <Activity className="w-4 h-4 text-slate-950" />
                <span>{t('hero_btn_telemetry')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveSection('architecture')}
                className="px-5 py-3 rounded-xl bg-[#09170e] hover:bg-[#0f2416] border border-emerald-800/60 hover:border-emerald-500/80 text-emerald-200 font-heading font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>{t('hero_btn_arch')}</span>
              </button>

              <button
                onClick={() => setActiveSection('live-status')}
                className="px-5 py-3 rounded-xl bg-[#09170e] hover:bg-[#0f2416] border border-emerald-800/60 hover:border-emerald-500/80 text-emerald-200 font-heading font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-amber-400" />
                <span>{t('hero_btn_status')}</span>
              </button>
            </div>
          </div>

          {/* Quick Telemetry Summary Column */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1a10] to-[#071009] border border-emerald-900/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
                    Active Mission Telemetry
                  </span>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  {robotStatus.navigation_mode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                  <span className="text-[11px] font-mono text-slate-400 block mb-1">
                    Current Crop Row
                  </span>
                  <div className="text-2xl font-mono font-bold text-white tabular-nums">
                    Row {robotStatus.current_row}
                    <span className="text-xs text-slate-500 ml-1 font-normal">/ {totalRows}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                  <span className="text-[11px] font-mono text-slate-400 block mb-1">
                    Ambient Temperature
                  </span>
                  <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                    {environment ? `${environment.temperature.toFixed(1)}°C` : '--'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                  <span className="text-[11px] font-mono text-slate-400 block mb-1">
                    Soil Moisture
                  </span>
                  <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
                    {environment ? `${environment.soil_moisture.toFixed(1)}%` : '--'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950">
                  <span className="text-[11px] font-mono text-slate-400 block mb-1">
                    Targeted Spray Tank
                  </span>
                  <div className="text-2xl font-mono font-bold text-amber-400 tabular-nums flex items-baseline gap-1">
                    <Droplets className="w-4 h-4 text-amber-400 inline" />
                    <span>{robotStatus.pesticide_tank_pct ?? 74}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Waypoint Step: {robotStatus.current_step} / {robotStatus.total_steps || 120}</span>
                <span className="text-emerald-400">Heading {robotStatus.heading.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Interactive 3D EAAR Rover Showcase */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-emerald-950 pb-3">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Digital Twin
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mt-0.5">
                {t('rover_interactive_label')}
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-400">
              {t('rover_drag_hint')}
            </p>
          </div>

          <RoverFiber />
        </div>
      </div>
    </section>
  );
};
