import React from 'react';
import { useRover } from '../../context/RoverContext';
import { Menu, Wifi, Database, Radio, Sparkles, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  onOpenDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer }) => {
  const {
    activeSection,
    setActiveSection,
    isSupabaseLive,
    connectionMode,
    t,
    setIsConfigModalOpen,
    setIsSimulatorModalOpen,
  } = useRover();

  const navItems = [
    { id: 'home', labelKey: 'nav_home' },
    { id: 'architecture', labelKey: 'nav_architecture' },
    { id: 'results', labelKey: 'nav_results' },
    { id: 'devices', labelKey: 'nav_devices' },
    { id: 'live-status', labelKey: 'nav_live_status' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050b07]/90 backdrop-blur-md border-b border-emerald-900/30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
        {/* Zone 1: EAAR Brand Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:border-emerald-400 transition-colors">
              <span className="font-heading font-extrabold text-base text-emerald-400 tracking-tighter">
                E
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                EAAR
              </span>
              <span className="text-[10px] font-mono text-emerald-500/80 -mt-1 hidden sm:block tracking-wide">
                Autonomous Agro-Rover
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Clean text links with hover state) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`relative px-3.5 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-emerald-400 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                {t(item.labelKey)}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Real-Time Status & Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time Status Badge */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#09150d] border border-emerald-900/60 text-xs font-mono transition-colors hover:border-emerald-500/60"
            title="Configure Supabase Connection"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                connectionMode === 'supabase'
                  ? isSupabaseLive
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                    : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
              }`}
            />
            <span className="text-slate-300 hidden sm:inline">
              {connectionMode === 'supabase'
                ? isSupabaseLive
                  ? 'Supabase Live'
                  : 'Connecting...'
                : 'Demo Telemetry'}
            </span>
          </button>

          {/* Quick Field Simulator Drawer Toggle */}
          <button
            onClick={() => setIsSimulatorModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 hover:border-emerald-500 text-emerald-300 text-xs font-mono transition-colors"
            title="Open Hardware Packet Simulator"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulator</span>
          </button>

          {/* Sliding Right-Side Hamburger Menu Button */}
          <button
            onClick={onOpenDrawer}
            className="p-2 rounded-lg bg-[#09150d] border border-emerald-900/60 text-emerald-300 hover:text-white hover:border-emerald-500 hover:bg-emerald-900/40 transition-colors focus:outline-none"
            aria-label="Open menu drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
