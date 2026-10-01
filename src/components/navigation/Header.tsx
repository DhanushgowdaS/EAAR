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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const levenshtein = (a: string, b: string) => {
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prevDiagonal = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const temp = prev[j];
        prev[j] = Math.min(
          prev[j] + 1,
          prev[j - 1] + 1,
          prevDiagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prevDiagonal = temp;
      }
    }
    return prev[b.length];
  };

  const searchTargets = [
    { keywords: ['navigation controller', 'remote', 'joystick', 'arrow controller', 'controller'], section: 'navigation-controller', label: 'Navigation Controller — Remote / Joystick / Arrow Controller' },
    { keywords: ['home'], section: 'home', label: 'Home' },
    { keywords: ['about', 'ar', 'computer module', 'supported regions'], section: 'about', label: 'About — AR Computer Module / Supported Regions' },
    { keywords: ['temperature', 'humidity', 'moisture', 'environmental condition'], section: 'results', label: 'Field Inspection — Environmental Conditions' },
    { keywords: ['solution', 'recommendation', 'disease', 'problem'], section: 'results', label: 'Disease and Recommendation Solution' },
    { keywords: ['device', 'devices', 'hardware', 'esp32', 'esp32 devkit'], section: 'devices', label: 'Devices — ESP32 / Hardware' },
    { keywords: ['navigation', 'autonomous navigation'], section: 'results', label: 'Autonomous Navigation' },
    { keywords: ['ros', 'checkpoints', 'visual navigation progress'], section: 'results', label: 'Visual Navigation Progress — ROS / Checkpoints' },
  ];

  const getSearchMatches = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const exact = searchTargets.filter((target) =>
      target.keywords.some((keyword) => keyword === normalized || keyword.startsWith(normalized))
    );
    const partial = searchTargets.filter((target) =>
      !exact.includes(target) && target.keywords.some((keyword) => keyword.includes(normalized))
    );
    const targets = [...exact, ...partial].slice(0, 8);

    return targets.map((target) => {
      const sections = Array.from(document.querySelectorAll('main section')) as HTMLElement[];
      const section = sections.find((element) =>
        element.id === target.section || element.dataset.section === target.section ||
        element.innerText.toLowerCase().includes(target.keywords[0])
      );
      return { element: section || document.querySelector('main') as HTMLElement, label: target.label, keyword: target.keywords[0] };
    });
  };

  const goToSearchResult = (query: string) => {
    const normalized = query.trim().toLowerCase();
    const target = searchTargets.find((item) =>
      item.keywords.some((keyword) => keyword === normalized || keyword.startsWith(normalized))
    );
    if (!target) return;

    setActiveSection(target.section);
    setSearchQuery('');
    setIsSearchOpen(false);

    const keyword = target.keywords.find((item) =>
      item === normalized || item.startsWith(normalized)
    ) || target.keywords[0];

    let attempts = 0;
    const scrollToMatch = () => {
      const main = document.querySelector('main');
      if (!main) return;
      const section = Array.from(main.querySelectorAll('section')).find((element) =>
        element.id === target.section || element.dataset.section === target.section
      ) as HTMLElement | undefined;

      if (!section) {
        if (attempts++ < 20) window.setTimeout(scrollToMatch, 50);
        return;
      }

      if (target.section === 'home' && keyword === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const needle = keyword.toLowerCase();
      const matches = Array.from(section.querySelectorAll('h1,h2,h3,h4,p,span,li,button')).filter((element) =>
        (element.textContent || '').toLowerCase().includes(needle)
      ) as HTMLElement[];

      (matches[0] || section).scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.setTimeout(scrollToMatch, 50);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      goToSearchResult(searchQuery);
    }
    if (event.key === 'Escape') {
      setSearchQuery('');
      setIsSearchOpen(false);
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

        {/* Slide-out Site Search */}
        <div className="relative flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsSearchOpen((open) => !open)}
            className="p-2 rounded-lg bg-[#09150d] border border-emerald-900/60 text-emerald-300 hover:text-white hover:border-emerald-500 hover:bg-emerald-900/40 transition-colors"
            aria-label="Open website search"
            title="Search website"
          >
            <Search className="w-5 h-5" />
          </button>

          {isSearchOpen && (
            <div className="absolute top-full right-0 mt-3 z-[60] w-[min(90vw,360px)]">
              <div className="flex items-center rounded-lg bg-[#09150d] border border-emerald-500/70 shadow-2xl shadow-black/40">
                <Search className="w-4 h-4 ml-3 text-emerald-400 shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search website..."
                  aria-label="Search EAAR site"
                  className="w-full bg-transparent px-2 py-2.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                  className="mr-2 p-1 text-slate-500 hover:text-white"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {searchQuery.trim() && (
                <div className="mt-2 w-full rounded-xl bg-[#07120a] border border-emerald-900/70 shadow-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => goToSearchResult(searchQuery)}
                    className="w-full text-left px-3 py-3 text-xs font-mono text-emerald-300 hover:bg-emerald-950/60 transition-colors border-b border-emerald-950"
                  >
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Smart website search
                    </span>
                    Press Enter or click to jump to the closest match
                  </button>
                  {getSearchMatches(searchQuery).map((match, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToSearchResult(match.keyword)}
                      className="w-full text-left px-3 py-2.5 text-xs font-mono text-slate-300 hover:bg-emerald-950/60 hover:text-emerald-300 transition-colors"
                    >
                      {match.label}
                    </button>
                  ))}
                  {getSearchMatches(searchQuery).length === 0 && (
                    <div className="px-3 py-3 text-xs font-mono text-slate-500">
                      No close match found.
                    </div>
                  )}
                </div>
              )}
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
