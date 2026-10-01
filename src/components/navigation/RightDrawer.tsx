import React from 'react';
import { useRover } from '../../context/RoverContext';
import { LANGUAGES } from '../../i18n/translations';
import { SupportedLanguage } from '../../types';
import {
  X,
  Home,
  Layers,
  Cpu,
  Navigation,
  Globe,
  Mic,
  MicOff,
  Database,
  SlidersHorizontal,
  ChevronRight,
  FileCode,
  Gamepad2,
  Lightbulb,
  AlertTriangle,
  Leaf,
  Activity,
  Radio,
  Moon,
  Sun,
  Sparkles,
  Power,
} from 'lucide-react';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({ isOpen, onClose }) => {
  const {
    activeSection,
    setActiveSection,
    language,
    setLanguage,
    t,
    isVoiceListening,
    voiceTranscript,
    voiceStatusMessage,
    startVoiceListening,
    stopVoiceListening,
    setIsConfigModalOpen,
    setIsSimulatorModalOpen,
    connectionMode,
    isSupabaseLive,
    totalRows,
    setTotalRows,
    checkpointsPerRow,
    setCheckpointsPerRow,
  } = useRover();

  if (!isOpen) return null;

  const navLinks = [
    { id: 'home', labelKey: 'nav_home', icon: Home },
    { id: 'architecture', labelKey: 'nav_architecture', icon: Layers },
    { id: 'results', labelKey: 'nav_results', icon: Activity },
    { id: 'devices', labelKey: 'nav_devices', icon: Cpu },
    { id: 'live-status', labelKey: 'nav_live_status', icon: Navigation },
    { id: 'navigation-controller', labelKey: 'nav_navigation_controller', icon: Gamepad2 },
  ];

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        {/* Sliding Panel */}
        <div className="w-screen max-w-md bg-[#07120a] border-l border-emerald-900/40 text-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-emerald-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center">
                <span className="font-heading font-extrabold text-sm text-emerald-400">E</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">EAAR Console</h3>
                <span className="text-[11px] font-mono text-emerald-400/80">
                  {connectionMode === 'supabase'
                    ? isSupabaseLive
                      ? '● Supabase Realtime'
                      : '○ Reconnecting Supabase'
                    : '● Development Demo Mode'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#0e2113] text-slate-400 hover:text-white hover:bg-emerald-900/50 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-6 py-4 flex-1 space-y-6">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Navigation
              </span>
              <div className="space-y-1">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/40'
                          : 'text-slate-300 hover:bg-[#0c1e11] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{t(item.labelKey)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Settings (English, Kannada, Hindi, Telugu, Tamil) */}
            <div className="pt-2 border-t border-emerald-950">
              <div className="flex items-center gap-2 mb-2.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {t('language_select')}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as SupportedLanguage)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors border ${
                      language === lang.code
                        ? 'bg-emerald-900/50 border-emerald-500/80 text-emerald-300'
                        : 'bg-[#0a170e] border-emerald-950 text-slate-400 hover:text-white hover:border-emerald-800'
                    }`}
                  >
                    <div className="font-semibold">{lang.nativeName}</div>
                    <div className="text-[10px] text-slate-500">{lang.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Command Section */}
            <div className="pt-2 border-t border-emerald-950">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    {t('voice_command')}
                  </span>
                </div>
                {isVoiceListening && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#09170e] border border-emerald-900/50 space-y-2.5">
                <p className="text-xs text-slate-300 font-body">
                  {isVoiceListening ? t('voice_listening') : t('voice_ready')}
                </p>

                {voiceTranscript && (
                  <div className="p-2 rounded bg-black/40 border border-emerald-800/40 text-xs font-mono text-cyan-300">
                    "{voiceTranscript}"
                  </div>
                )}

                {voiceStatusMessage && (
                  <p className="text-[11px] text-amber-300/80 font-mono">
                    {voiceStatusMessage}
                  </p>
                )}

                <button
                  onClick={isVoiceListening ? stopVoiceListening : startVoiceListening}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors ${
                    isVoiceListening
                      ? 'bg-rose-950/60 border border-rose-600/60 text-rose-300 hover:bg-rose-900/50'
                      : 'bg-emerald-900/40 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/50'
                  }`}
                >
                  {isVoiceListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>{t('voice_mic_tap')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Field Configuration */}
            <div className="pt-2 border-t border-emerald-950 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Field Configuration
              </span>
              <div className="p-3 rounded-lg bg-[#09170e] border border-emerald-900/50 space-y-2">
                <label className="text-xs text-slate-300 font-mono block" htmlFor="eaar-total-rows">
                  Total Crop Rows
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="eaar-total-rows"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={totalRows}
                    onChange={(e) => setTotalRows(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-lg bg-[#050e07] border border-emerald-900 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">rows</span>
                </div>
                <label className="text-xs text-slate-300 font-mono block" htmlFor="eaar-checkpoints-per-row">
                  Total Checkpoints Per Row
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="eaar-checkpoints-per-row"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={checkpointsPerRow}
                    onChange={(e) => setCheckpointsPerRow(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-lg bg-[#050e07] border border-emerald-900 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">checkpoints</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">Rows and checkpoints are saved locally for this field.</p>
              </div>
            </div>

            {/* Rover Lighting */}
            <div className="pt-2 border-t border-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Rover Lighting
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#09170e] border border-emerald-900/50">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { command: '1', label: 'ALERT', detail: 'RED', icon: AlertTriangle, cls: 'text-rose-300 border-rose-500/40 bg-rose-500/10' },
                    { command: '2', label: 'READY', detail: 'GREEN', icon: Leaf, cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
                    { command: '3', label: 'ACTIVE', detail: 'BLUE', icon: Activity, cls: 'text-blue-300 border-blue-500/40 bg-blue-500/10' },
                    { command: '4', label: 'TRAINING', detail: 'YELLOW', icon: Radio, cls: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10' },
                    { command: '5', label: 'NIGHT', detail: 'WARM', icon: Moon, cls: 'text-orange-300 border-orange-500/40 bg-orange-500/10' },
                    { command: '6', label: 'HARVEST', detail: 'MAROON', icon: Sun, cls: 'text-red-300 border-red-900/60 bg-red-950/20' },
                    { command: '7', label: 'SCAN', detail: 'PEACOCK', icon: Sparkles, cls: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' },
                    { command: '8', label: 'LIGHTS OFF', detail: '', icon: Power, cls: 'text-slate-200 border-slate-600 bg-slate-900/50' },
                    { command: '9', label: 'SNAKE', detail: 'EFFECT', icon: Sparkles, cls: 'text-purple-300 border-purple-500/40 bg-purple-500/10' },
                    { command: '0', label: 'FADE', detail: 'COLOR CYCLE', icon: Sparkles, cls: 'text-indigo-300 border-indigo-500/40 bg-indigo-500/10' },
                    { command: 'X', label: 'DJ', detail: 'RAINBOW', icon: Sparkles, cls: 'text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.command}
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('eaar-lighting-command', { detail: { command: item.command } }))}
                        className={`rounded-md border px-2 py-2 text-left transition-all hover:brightness-125 ${item.cls}`}
                      >
                        <Icon className="w-3.5 h-3.5 mb-0.5" />
                        <div className="text-[9px] font-mono font-semibold leading-tight">{item.label}</div>
                        {item.detail && <div className="text-[7px] font-mono opacity-60 leading-tight">{item.detail}</div>}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[9px] text-slate-500 font-mono">
                  Sends the selected lighting command to the ESP32 DevKit.
                </p>
              </div>
            </div>

            {/* Backend & Tools Quick Action */}
            <div className="pt-2 border-t border-emerald-950 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Backend & Field Operations
              </span>

              <button
                onClick={() => {
                  onClose();
                  setIsConfigModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[#09170e] border border-emerald-900/50 text-xs text-slate-300 hover:border-emerald-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <div className="text-left">
                    <div className="font-medium text-white">{t('supabase_settings')}</div>
                    <div className="text-[10px] text-slate-400">View credentials & SQL schema</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  setIsSimulatorModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[#09170e] border border-emerald-900/50 text-xs text-slate-300 hover:border-emerald-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="font-medium text-white">{t('simulator_title')}</div>
                    <div className="text-[10px] text-slate-400">{t('simulator_desc')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-6 border-t border-emerald-950 bg-[#050e07] text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>EAAR Core · v3.2</span>
            <span>2026 Field Edition</span>
          </div>
        </div>
      </div>
    </div>
  );
};
