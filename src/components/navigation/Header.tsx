import React, { useState } from 'react';
import { useRover } from '../../context/RoverContext';
import { Menu, Wifi, Database, Radio, Sparkles, SlidersHorizontal, Search, X } from 'lucide-react';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const sectionNames: Record<string, string> = {
    home: 'Home',
    architecture: 'Architecture',
    results: 'Results & Environmental Conditions',
    devices: 'Devices & Hardware',
    'live-status': 'Live Status & Navigation',
    'navigation-controller': 'Navigation Controller',
  };

  const searchTargets = [
    { label: 'Home', keywords: ['home', 'overview', 'hero'] },
    { label: 'Architecture', keywords: ['architecture', 'hardware', 'edge computing', 'esp32', 'raspberry pi', 'esp32-s3', 'hc-05', 'camera', 'supabase'] },
    { label: 'Results', keywords: ['results', 'environment', 'temperature', 'humidity', 'soil moisture', 'moisture', 'disease', 'spraying', 'telemetry', 'ai'] },
    { label: 'Devices', keywords: ['devices', 'device fleet', 'hardware', 'module', 'online', 'offline', 'diagnostic'] },
    { label: 'Live Status', keywords: ['live status', 'navigation mode', 'current row', 'heading', 'obstacle', 'lidar', 'waypoint'] },
    { label: 'Navigation Controller', keywords: ['navigation controller', 'arrow controller', 'joystick', 'training mode', 'automatic mode', 'manual mode', 'store to flash', 'end training', 'forward', 'backward', 'left', 'right', 'stop'] },
  ];

  const goToSearchResult = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;

    const target = searchTargets.find((item) =>
      item.label.toLowerCase() === normalized ||
      item.keywords.some((keyword) => keyword === normalized)
    );

    const scrollToMatch = () => {
      const sections = Array.from(document.querySelectorAll('main section')) as HTMLElement[];
      const tokens = normalized.split(/\\s+/).filter(Boolean);

      let best: { element: HTMLElement; score: number } | null = null;
      for (const section of sections) {
        const text = (section.innerText || '').toLowerCase();
        if (!text) continue;

        const phraseScore = text.includes(normalized) ? 100 : 0;
        const tokenScore = tokens.reduce((score, token) => score + (text.includes(token) ? 10 : 0), 0);
        const score = phraseScore + tokenScore;

        if (score > 0 && (!best || score > best.score)) {
          best = { element: section, score };
        }
      }

      if (best) {
        best.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    setIsSearchFocused(false);
    setSearchQuery('');

    if (target) {
      const id = target.label === 'Navigation Controller'
        ? 'navigation-controller'
        : target.label === 'Live Status'
          ? 'live-status'
          : target.label.toLowerCase();
      setActiveSection(id);
      window.setTimeout(scrollToMatch, 80);
      return;
    }

    setActiveSection('home');
    window.setTimeout(scrollToMatch, 80);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      goToSearchResult(searchQuery);
    }
    if (event.key === 'Escape') {
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

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

        {/* Site Search */}
        <div className="relative hidden lg:block w-48 xl:w-64">
          <div className={`flex items-center gap-2 rounded-lg bg-[#09150d] border transition-colors ${isSearchFocused ? 'border-emerald-500/70' : 'border-emerald-900/60'}`}>
            <Search className="w-4 h-4 ml-3 text-emerald-400/80 shrink-0" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 150)}
              placeholder="Search site..."
              aria-label="Search EAAR site"
              className="w-full bg-transparent px-1.5 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSearchQuery('')}
                className="mr-2 text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isSearchFocused && searchQuery.trim() && (
            <div className="absolute top-full right-0 mt-2 w-72 rounded-xl bg-[#07120a] border border-emerald-900/70 shadow-2xl overflow-hidden z-50">
              <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-emerald-950">
                Press Enter to jump
              </div>
              {searchTargets
                .filter((item) => {
                  const q = searchQuery.toLowerCase().trim();
                  return item.label.toLowerCase().includes(q) || item.keywords.some((keyword) => keyword.includes(q));
                })
                .slice(0, 6)
                .map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSearchResult(item.label)}
                    className="w-full text-left px-3 py-2.5 text-xs font-mono text-slate-300 hover:bg-emerald-950/60 hover:text-emerald-300 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              <div className="px-3 py-2 text-[10px] font-mono text-slate-600 border-t border-emerald-950">
                Searches page content too
              </div>
            </div>
          )}
        </div>

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
