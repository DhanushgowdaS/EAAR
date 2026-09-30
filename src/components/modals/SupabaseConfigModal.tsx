import React, { useState } from 'react';
import { useRover } from '../../context/RoverContext';
import {
  SUPABASE_SQL_SCHEMA,
  reinitializeSupabase,
  clearSupabaseConfig,
  SUPABASE_URL,
  SUPABASE_KEY,
} from '../../lib/supabase';
import {
  X,
  Database,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Key,
} from 'lucide-react';

export const SupabaseConfigModal: React.FC = () => {
  const {
    isConfigModalOpen,
    setIsConfigModalOpen,
    connectionMode,
    setConnectionMode,
    isSupabaseLive,
    supabaseError,
    t,
  } = useRover();

  const [inputUrl, setInputUrl] = useState<string>(SUPABASE_URL || '');
  const [inputKey, setInputKey] = useState<string>(SUPABASE_KEY || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (!isConfigModalOpen) return null;

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSaveConfig = () => {
    if (!inputUrl || !inputKey) {
      setSaveSuccess('Please provide both Supabase URL and Anon Public Key.');
      return;
    }

    const success = reinitializeSupabase(inputUrl.trim(), inputKey.trim());
    if (success) {
      setConnectionMode('supabase');
      setSaveSuccess('Credentials saved! Reconnecting to Supabase...');
      setTimeout(() => {
        setSaveSuccess(null);
        setIsConfigModalOpen(false);
      }, 1500);
    } else {
      setSaveSuccess('Invalid URL format. Must start with https://');
    }
  };

  const handleResetToDemo = () => {
    clearSupabaseConfig();
    setConnectionMode('demo');
    setIsConfigModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setIsConfigModalOpen(false)}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#07120a] border border-emerald-900/60 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-slate-200 z-10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-emerald-950 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-white">
                {t('supabase_settings')}
              </h3>
              <p className="text-xs font-mono text-emerald-400/80">
                Central Cloud Backend & Realtime WebSocket Channel
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsConfigModalOpen(false)}
            className="p-2 rounded-lg bg-[#0e2213] text-slate-400 hover:text-white hover:bg-emerald-900/50 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
            {t('connection_mode')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConnectionMode('supabase')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                connectionMode === 'supabase'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-[#050e07] border-emerald-950 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t('mode_supabase')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-body">
                Live ESP32-S3 & Raspberry Pi 5 hardware telemetry via Realtime
              </p>
            </button>

            <button
              onClick={() => setConnectionMode('demo')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                connectionMode === 'demo'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-[#050e07] border-emerald-950 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{t('mode_demo')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-body">
                Simulated field packet telemetry & evaluation tester
              </p>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4 pt-2 border-t border-emerald-950">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              VITE_SUPABASE_URL
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050e07] border border-emerald-900 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              VITE_SUPABASE_ANON_KEY
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050e07] border border-emerald-900 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/60 text-xs font-mono text-emerald-300">
              {saveSuccess}
            </div>
          )}

          {supabaseError && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-300">
              {supabaseError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-semibold text-xs transition-colors cursor-pointer"
            >
              Save Credentials & Connect
            </button>

            <button
              onClick={handleResetToDemo}
              className="px-4 py-2.5 rounded-lg bg-[#0a180f] hover:bg-emerald-950 border border-emerald-900 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear & Switch to Demo
            </button>
          </div>
        </div>

        {/* Database Schema Exporter */}
        <div className="pt-4 border-t border-emerald-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-white">
                Supabase SQL Database Schema
              </span>
            </div>
            <button
              onClick={handleCopySchema}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1b0f] hover:bg-emerald-900 border border-emerald-600 text-xs font-mono text-emerald-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('sql_copied') : t('copy_sql')}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 font-body">
            Paste this schema into your Supabase Dashboard SQL Editor to instantly provision all required tables (<code className="text-cyan-300 font-mono">devices</code>, <code className="text-cyan-300 font-mono">environment_readings</code>, <code className="text-cyan-300 font-mono">robot_status</code>, <code className="text-cyan-300 font-mono">captures</code>, <code className="text-cyan-300 font-mono">ai_results</code>, <code className="text-cyan-300 font-mono">solutions</code>) and enable Realtime replication.
          </p>
        </div>
      </div>
    </div>
  );
};
