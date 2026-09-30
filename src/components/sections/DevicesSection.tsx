import React, { useState } from 'react';
import { useRover } from '../../context/RoverContext';
import {
  Cpu,
  Radio,
  Eye,
  Wifi,
  Battery,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Layers,
  Thermometer,
} from 'lucide-react';

export const DevicesSection: React.FC = () => {
  const { devices, t, isSupabaseLive, connectionMode, injectHardwareReading, injectRobotStatus } = useRover();
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);

  const handlePingDevice = async (deviceId: string) => {
    setPingingDeviceId(deviceId);
    setTimeout(() => {
      setPingingDeviceId(null);
    }, 800);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'esp32_devkit':
        return Radio;
      case 'raspberry_pi':
        return Eye;
      case 'esp32_s3':
        return Cpu;
      default:
        return Cpu;
    }
  };

  const formatLastSeen = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="py-16 bg-[#040905] border-t border-emerald-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2">
              <span>Rover Telemetry</span>
              <span aria-hidden="true" className="text-emerald-700">/</span>
              <span>Compute Hardware</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
              {t('devices_title')}
            </h2>
            <p className="mt-2 text-sm text-slate-300 font-body">
              {t('devices_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              Fleet Status:
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>3 / 3 Modules Synchronized</span>
            </span>
          </div>
        </div>

        {/* 3 Main Device Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {devices.map((device) => {
            const Icon = getDeviceIcon(device.device_type);
            const isOnline = device.status === 'online';
            const isPinging = pingingDeviceId === device.device_id;

            return (
              <div
                key={device.device_id}
                className="rounded-2xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 hover:border-emerald-700/60 p-6 flex flex-col justify-between transition-all shadow-xl group"
              >
                <div>
                  {/* Top Bar: Device Name & Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#061209] border border-emerald-700/50 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                          {device.role_title}
                        </span>
                        <h3 className="text-lg font-heading font-bold text-white">
                          {device.device_name}
                        </h3>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 border ${
                        isOnline
                          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                          : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                        }`}
                      />
                      <span>{isOnline ? t('status_online') : t('status_offline')}</span>
                    </div>
                  </div>

                  {/* Active Task / Role */}
                  <div className="p-3 rounded-xl bg-[#060e08] border border-emerald-950 mb-5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      {t('active_task')}
                    </span>
                    <p className="text-xs text-slate-200 font-body leading-relaxed">
                      {device.active_task || 'Executing background RTOS kernel loop'}
                    </p>
                  </div>

                  {/* Diagnostic Metrics Grid */}
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between py-1.5 border-b border-emerald-950">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                        <span>Connection Status</span>
                      </span>
                      <span className="text-emerald-400 font-medium">
                        {isOnline ? (isSupabaseLive ? 'Wi-Fi → Supabase WSS' : 'Wi-Fi Connected (Local AP)') : 'Awaiting Heartbeat'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-emerald-950">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('last_seen')}</span>
                      </span>
                      <span className="text-slate-200 tabular-nums">
                        {formatLastSeen(device.last_seen)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-emerald-950">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('ip_address')}</span>
                      </span>
                      <span className="text-cyan-300 tabular-nums">
                        {device.ip_address || '192.168.4.10'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-emerald-950">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('firmware')}</span>
                      </span>
                      <span className="text-slate-300">
                        {device.firmware_version || 'v2.4-rtos'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-emerald-950">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Battery className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('battery')}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold tabular-nums">
                        {device.battery_level ?? 94}%
                      </span>
                    </div>

                    {device.cpu_temp && (
                      <div className="flex items-center justify-between py-1.5 border-b border-emerald-950">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-slate-500" />
                          <span>CPU Core Temp</span>
                        </span>
                        <span className="text-amber-400 tabular-nums">
                          {device.cpu_temp.toFixed(1)}°C
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Device Action */}
                <div className="mt-6 pt-4 border-t border-emerald-950 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {device.device_id}
                  </span>
                  <button
                    onClick={() => handlePingDevice(device.device_id)}
                    disabled={isPinging}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#07130a] hover:bg-emerald-950 border border-emerald-900/60 hover:border-emerald-600 text-xs font-mono text-emerald-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Pinging...' : 'Ping Diagnostics'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
