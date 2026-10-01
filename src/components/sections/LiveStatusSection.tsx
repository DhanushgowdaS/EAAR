import React from 'react';
import { useRover } from '../../context/RoverContext';
import {
  Navigation,
  Compass,
  AlertTriangle,
  Camera,
  Activity,
  CheckCircle2,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  MapPin,
  Shield,
  Layers,
} from 'lucide-react';

export const LiveStatusSection: React.FC = () => {
  const { robotStatus, injectRobotStatus, totalRows, t } = useRover();
  const CHECKPOINTS_PER_ROW = 6;

  const handleNextStep = () => {
    const nextStep = (robotStatus.current_step + 1) % (robotStatus.total_steps || 120);
    const nextRow = nextStep === 0 ? ((robotStatus.current_row % totalRows) + 1) : robotStatus.current_row;
    injectRobotStatus({
      current_step: nextStep,
      current_row: nextRow,
      heading: (robotStatus.heading + 2) % 360,
      current_inspection_point: `Row ${nextRow} · Plant #${Math.floor(nextStep / 3) + 1} (Solanum lycopersicum)`,
    });
  };

  const handleToggleMode = () => {
    const nextMode =
      robotStatus.navigation_mode === 'Autonomous Route Playback'
        ? 'Manual Route Teaching'
        : 'Autonomous Route Playback';
    injectRobotStatus({ navigation_mode: nextMode });
  };

  const handleToggleObstacle = () => {
    const isClear = robotStatus.obstacle_status === 'Clear';
    injectRobotStatus({
      obstacle_status: isClear ? 'Obstacle Detected' : 'Clear',
      navigation_mode: isClear ? 'Obstacle Evading' : 'Autonomous Route Playback',
    });
  };

  const progressPercent = Math.min(
    100,
    Math.round((robotStatus.current_step / (robotStatus.total_steps || 120)) * 100)
  );

  return (
    <section className="py-16 bg-[#040905] border-t border-emerald-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2">
              <span>Autonomous Guidance</span>
              <span aria-hidden="true" className="text-emerald-700">/</span>
              <span>ESP32 RTOS Navigation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
              {t('live_title')}
            </h2>
            <p className="mt-2 text-sm text-slate-300 font-body">
              {t('live_subtitle')}
            </p>
          </div>

          {/* Navigation Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMode}
              className="px-3.5 py-2 rounded-xl bg-[#09180f] hover:bg-emerald-950 border border-emerald-800/70 text-xs font-mono text-emerald-300 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Toggle Mode: {robotStatus.navigation_mode.split(' ')[0]}</span>
            </button>

            <button
              onClick={handleNextStep}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <Play className="w-3 h-3 text-slate-950 fill-current" />
              <span>Simulate Next Step</span>
            </button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Navigation Mode */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 shadow-xl">
            <span className="text-xs font-mono text-slate-400 block mb-1">
              {t('nav_mode')}
            </span>
            <div className="text-base sm:text-lg font-heading font-bold text-white mt-1">
              {robotStatus.navigation_mode}
            </div>
            <span className="text-[11px] font-mono text-emerald-400 mt-1 block">
              Flash-stored Playback
            </span>
          </div>

          {/* 2. Current Row & Step */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 shadow-xl">
            <span className="text-xs font-mono text-slate-400 block mb-1">
              {t('current_row')} & Step
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-400 mt-1 tabular-nums">
              Row {robotStatus.current_row}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                · Step {robotStatus.current_step}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 mt-1 block">
              Waypoint {robotStatus.current_step} of {robotStatus.total_steps || 120}
            </span>
          </div>

          {/* 3. Heading Compass */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 shadow-xl">
            <span className="text-xs font-mono text-slate-400 block mb-1">
              {t('heading')}
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-amber-400 mt-1 tabular-nums flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <span>{robotStatus.heading.toFixed(1)}°</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 mt-1 block">
              Magnetometer / IMU Fusion
            </span>
          </div>

          {/* 4. Obstacle Status */}
          <div
            onClick={handleToggleObstacle}
            className="p-5 rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 shadow-xl cursor-pointer hover:border-emerald-500 transition-colors"
            title="Click to toggle obstacle event"
          >
            <span className="text-xs font-mono text-slate-400 block mb-1">
              {t('obstacle_status')}
            </span>
            <div
              className={`text-base sm:text-lg font-heading font-bold mt-1 flex items-center gap-2 ${
                robotStatus.obstacle_status === 'Clear'
                  ? 'text-emerald-400'
                  : 'text-rose-400 animate-pulse'
              }`}
            >
              {robotStatus.obstacle_status === 'Clear' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{robotStatus.obstacle_status}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 mt-1 block">
              LiDAR Safety Envelope
            </span>
          </div>
        </div>

        {/* Visual Crop-Row Navigation Progress Matrix */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950 pb-4">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">
                Visual Navigation Progress
              </span>
              <h4 className="text-xl font-heading font-bold text-white mt-0.5">
                {t('crop_field_map')} ({totalRows} Rows × {CHECKPOINTS_PER_ROW} Checkpoints)
              </h4>
            </div>

            {/* Overall Mission Progress Bar */}
            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">{t('progress_label')}</span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#061008] border border-emerald-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_8px_#10b981]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Agricultural Rows Grid Canvas */}
          <div className="space-y-3 overflow-x-auto pb-2">
            {[...Array(totalRows)].map((_, rIdx) => {
              const rowNum = rIdx + 1;
              const isCurrentRow = robotStatus.current_row === rowNum;
              return (
                <div
                  key={rowNum}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                    isCurrentRow
                      ? 'bg-emerald-950/60 border-emerald-500/80'
                      : 'bg-[#060e08] border-emerald-950'
                  }`}
                >
                  {/* Row Indicator */}
                  <div className="w-16 shrink-0 text-xs font-mono font-semibold flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCurrentRow ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'
                      }`}
                    />
                    <span className={isCurrentRow ? 'text-white' : 'text-slate-500'}>
                      Row {rowNum}
                    </span>
                  </div>

                  {/* Waypoint Nodes along the Row */}
                  <div className="flex-1 flex items-center justify-between gap-1">
                    {[...Array(CHECKPOINTS_PER_ROW)].map((_, wIdx) => {
                      const stepIndex = (rowNum - 1) * CHECKPOINTS_PER_ROW + wIdx;
                      const isRoverHere =
                        isCurrentRow &&
                        Math.floor((robotStatus.current_step % (totalRows * CHECKPOINTS_PER_ROW)) / CHECKPOINTS_PER_ROW) === wIdx;
                      const isInspected =
                        rowNum < robotStatus.current_row ||
                        (isCurrentRow && wIdx <= Math.floor((robotStatus.current_step % 120) / 8));

                      return (
                        <div
                          key={wIdx}
                          className="relative flex items-center justify-center"
                          title={`Row ${rowNum} · Checkpoint #${wIdx + 1}`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 flex items-center justify-center ${
                              isRoverHere
                                ? 'bg-cyan-400 scale-125 shadow-[0_0_12px_#06b6d4] ring-2 ring-white z-10'
                                : isInspected
                                ? 'bg-emerald-600/70 border border-emerald-400/60'
                                : 'bg-emerald-950/50 border border-emerald-900/30'
                            }`}
                          >
                            {isRoverHere && (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Row Completion Status */}
                  <span className="w-20 text-right text-[10px] font-mono text-slate-400 shrink-0">
                    {rowNum < robotStatus.current_row
                      ? 'Completed'
                      : isCurrentRow
                      ? 'In Progress'
                      : 'Scheduled'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sub-system Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-emerald-950 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#060e08] border border-emerald-950 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>{t('arm_status')}</span>
              </span>
              <span className="text-emerald-300 font-semibold">
                {robotStatus.arm_status}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060e08] border border-emerald-950 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{t('camera_status')}</span>
              </span>
              <span className="text-cyan-300 font-semibold">
                {robotStatus.camera_status}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060e08] border border-emerald-950 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Target Specimen</span>
              </span>
              <span className="text-slate-200 truncate max-w-[140px]">
                {robotStatus.current_inspection_point}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
