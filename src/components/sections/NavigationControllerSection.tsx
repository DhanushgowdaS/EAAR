import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleStop, Gamepad2, Navigation2,
  Play, Radio, RotateCcw, Save, Settings, Square, TimerReset, Zap, Wifi, Link2,
} from 'lucide-react';

type ControllerMode = 'arrow' | 'joystick';
type RoverMode = 'manual' | 'training' | 'auto';
type NavigationCommand = 'F' | 'B' | 'L' | 'R' | 'S';
type LayoutKey =
  | 'manual' | 'training' | 'auto'
  | 'forward' | 'back' | 'left' | 'right' | 'stop'
  | 'status' | 'emergency' | 'endTraining' | 'storeFlash' | 'joystick';

type LayoutPosition = { x: number; y: number; w: number; h: number };
type LayoutMap = Record<LayoutKey, LayoutPosition>;

const STORAGE_KEY = 'eaar-navigation-controller-layout-v1';
const ESP32_URL_KEY = 'eaar-navigation-esp32-url-v1';
const S3_GATEWAY_DEFAULT = 'http://10.102.214.176';
const ESP32_API_KEY = 'eaar-navigation-esp32-api-key-v1';
const ESP32_HEARTBEAT_MS = 300;

const DEFAULT_LAYOUT: LayoutMap = {
  manual: { x: 12, y: 12, w: 11, h: 8 },
  training: { x: 25, y: 12, w: 12, h: 8 },
  auto: { x: 39, y: 12, w: 12, h: 8 },
  forward: { x: 14, y: 29, w: 9, h: 13 },
  left: { x: 4, y: 42, w: 9, h: 13 },
  stop: { x: 14, y: 42, w: 9, h: 13 },
  right: { x: 24, y: 42, w: 9, h: 13 },
  back: { x: 14, y: 55, w: 9, h: 13 },
  status: { x: 39, y: 31, w: 23, h: 31 },
  emergency: { x: 45, y: 64, w: 11, h: 16 },
  endTraining: { x: 68, y: 34, w: 17, h: 11 },
  storeFlash: { x: 68, y: 48, w: 17, h: 11 },
  joystick: { x: 9, y: 29, w: 28, h: 48 },
};

const COMMANDS: Record<'forward' | 'back' | 'left' | 'right' | 'stop', NavigationCommand> = {
  forward: 'F', back: 'B', left: 'L', right: 'R', stop: 'S',
};

const emitCommand = (command: NavigationCommand) => {
  window.dispatchEvent(new CustomEvent('eaar-navigation-command', {
    detail: { command, timestamp: new Date().toISOString(), source: 'web-controller' },
  }));
};

const emitMode = (mode: RoverMode) => {
  window.dispatchEvent(new CustomEvent('eaar-navigation-mode', {
    detail: { mode, timestamp: new Date().toISOString(), source: 'web-controller' },
  }));
};

const emitAction = (action: 'end-training' | 'store-to-flash') => {
  window.dispatchEvent(new CustomEvent('eaar-navigation-action', {
    detail: { action, timestamp: new Date().toISOString(), source: 'web-controller' },
  }));
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ModeButton: React.FC<{
  active: boolean; label: string; icon: React.ReactNode; onClick: () => void;
}> = ({ active, label, icon, onClick }) => (
  <button type="button" onClick={onClick}
    className={(active
      ? 'border-emerald-300 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.16)]'
      : 'border-slate-700 bg-black/30 text-slate-500 hover:text-slate-200 hover:border-slate-500')
      + ' w-full h-full rounded-full border font-mono text-[10px] sm:text-xs tracking-wider transition-all'}>
    <span className="flex items-center justify-center gap-2">{icon}{label}</span>
  </button>
);

const CommandButton: React.FC<{
  label: string; command: NavigationCommand; icon: React.ReactNode;
  onStart: (command: NavigationCommand) => void; onStop: () => void; stopStyle?: boolean;
}> = ({ label, command, icon, onStart, onStop, stopStyle = false }) => (
  <button type="button" aria-label={label}
    onPointerDown={(event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (stopStyle) onStop(); else onStart(command);
    }}
    onPointerUp={onStop} onPointerCancel={onStop}
    onClick={() => stopStyle && onStop()}
    className={'w-full h-full relative flex items-center justify-center rounded-2xl border text-slate-200 shadow-[inset_0_2px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.35)] transition-all duration-100 hover:border-emerald-400/70 hover:text-emerald-300 active:translate-y-[2px] active:scale-[0.98] touch-none select-none ' +
      (stopStyle
        ? 'border-rose-400/70 bg-gradient-to-b from-rose-700 to-rose-950 text-rose-100 shadow-[0_0_22px_rgba(244,63,94,0.22)]'
        : 'border-slate-600/80 bg-gradient-to-b from-slate-700 to-slate-950')}>
    <span className="absolute inset-1 rounded-xl border border-white/5 pointer-events-none" />
    {icon}
  </button>
);

const Joystick: React.FC<{
  activeCommand: NavigationCommand; onCommand: (command: NavigationCommand) => void; onStop: () => void;
}> = ({ activeCommand, onCommand, onStop }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastCommand = useRef<NavigationCommand>('S');

  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const dx = clamp(x, -1, 1);
    const dy = clamp(y, -1, 1);
    setPosition({ x: dx * 42, y: dy * 42 });
    let command: NavigationCommand = 'S';
    if (Math.abs(dx) >= 0.2 || Math.abs(dy) >= 0.2) {
      command = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy < 0 ? 'F' : 'B');
    }
    if (lastCommand.current !== command) {
      lastCommand.current = command;
      onCommand(command);
    }
  };

  const stop = () => {
    dragging.current = false;
    setPosition({ x: 0, y: 0 });
    lastCommand.current = 'S';
    onStop();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-[min(100%,220px)] aspect-square rounded-full border border-slate-600/70 bg-[radial-gradient(circle_at_35%_30%,#27343a,#0a1014_62%,#05080a)] shadow-[inset_0_0_35px_rgba(0,0,0,0.75),0_14px_30px_rgba(0,0,0,0.4)] touch-none"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragging.current = true; update(event); }}
        onPointerMove={(event) => { if (dragging.current) update(event); }}
        onPointerUp={stop} onPointerCancel={stop}>
        <div className="absolute inset-7 rounded-full border border-slate-700/80" />
        <div className="absolute inset-14 rounded-full border border-slate-800/80" />
        <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/50 bg-gradient-to-b from-emerald-700 to-emerald-950 shadow-[0_0_32px_rgba(16,185,129,0.2),inset_0_3px_4px_rgba(255,255,255,0.12)] flex items-center justify-center transition-transform duration-75"
          style={{ transform: 'translate(calc(-50% + ' + position.x + 'px), calc(-50% + ' + position.y + 'px))' }}>
          <Navigation2 className="w-8 h-8 text-emerald-200" />
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.25em] text-slate-500">FORWARD</div>
      </div>
      <button type="button" onClick={stop} className="mt-3 rounded-full px-5 py-2 border border-rose-400/60 bg-rose-950/70 text-rose-200 font-mono text-xs tracking-wider">STOP · S</button>
      <div className="mt-2 text-center font-mono text-[10px] text-slate-500">ACTIVE COMMAND <span className="ml-2 text-emerald-300">{activeCommand}</span></div>
    </div>
  );
};

export const NavigationControllerSection: React.FC = () => {
  const [controllerMode, setControllerMode] = useState<ControllerMode>('arrow');
  const [roverMode, setRoverMode] = useState<RoverMode>('manual');
  const [activeCommand, setActiveCommand] = useState<NavigationCommand>('S');
  const [trainingEnded, setTrainingEnded] = useState(false);
  const [flashRequested, setFlashRequested] = useState(false);
  const [layout, setLayout] = useState<LayoutMap>(DEFAULT_LAYOUT);
  const [draftLayout, setDraftLayout] = useState<LayoutMap>(DEFAULT_LAYOUT);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [esp32Url, setEsp32Url] = useState(S3_GATEWAY_DEFAULT);
  const [esp32ApiKey, setEsp32ApiKey] = useState('');
  const [esp32Status, setEsp32Status] = useState<'not-configured' | 'online' | 'offline'>('not-configured');
  const [esp32Message, setEsp32Message] = useState('ESP32-S3 gateway not configured');
  const commandHeartbeatRef = useRef<number | null>(null);
  const dragRef = useRef<{ key: LayoutKey; dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLayout({ ...DEFAULT_LAYOUT, ...JSON.parse(saved) });
      setEsp32Url(localStorage.getItem(ESP32_URL_KEY) || S3_GATEWAY_DEFAULT);
      setEsp32ApiKey(localStorage.getItem(ESP32_API_KEY) || '');
    } catch {}
    emitCommand('S');
    emitMode('manual');

    return () => {
      if (commandHeartbeatRef.current) window.clearInterval(commandHeartbeatRef.current);
      commandHeartbeatRef.current = null;
    };
  }, []);

  const normalizedEsp32Url = () => esp32Url.trim().replace(/\\/+$/, '');

  const sendToEsp32 = async (command: NavigationCommand) => {
    const baseUrl = normalizedEsp32Url();
    const key = esp32ApiKey.trim();
    if (!baseUrl || !key) return false;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 900);
    try {
      const url = `${baseUrl}/command?cmd=${encodeURIComponent(command)}&key=${encodeURIComponent(key)}`;
      const request = new Request(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        targetAddressSpace: 'local',
      } as RequestInit & { targetAddressSpace: 'local' });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setEsp32Status('online');
      setEsp32Message(`ESP32-S3 received ${command}`);
      return true;
    } catch {
      setEsp32Status('offline');
      setEsp32Message('ESP32-S3 gateway unreachable');
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const startCommandHeartbeat = (command: NavigationCommand) => {
    if (commandHeartbeatRef.current) window.clearInterval(commandHeartbeatRef.current);
    if (command === 'S') return;
    commandHeartbeatRef.current = window.setInterval(() => {
      void sendToEsp32(command);
    }, ESP32_HEARTBEAT_MS);
  };

  const stop = () => {
    if (commandHeartbeatRef.current) window.clearInterval(commandHeartbeatRef.current);
    commandHeartbeatRef.current = null;
    setActiveCommand('S');
    emitCommand('S');
    void sendToEsp32('S');
  };

  const sendCommand = (command: NavigationCommand) => {
    setActiveCommand(command);
    emitCommand(command);
    void sendToEsp32(command);
    startCommandHeartbeat(command);
  };

  const changeRoverMode = (nextMode: RoverMode) => {
    stop();
    setRoverMode(nextMode);
    if (nextMode === 'training') {
      setTrainingEnded(false);
      setFlashRequested(false);
      void sendToEsp32('T');
    } else if (nextMode === 'auto') {
      void sendToEsp32('A');
    } else {
      void sendToEsp32('S');
    }
    emitMode(nextMode);
  };

  const endTraining = () => {
    stop();
    setTrainingEnded(true);
    emitAction('end-training');
  };

  const storeToFlash = () => {
    stop();
    setFlashRequested(true);
    emitAction('store-to-flash');
    void sendToEsp32('M');
  };

  const saveEsp32Connection = () => {
    const url = normalizedEsp32Url();
    setEsp32Url(url);
    localStorage.setItem(ESP32_URL_KEY, url);
    localStorage.setItem(ESP32_API_KEY, esp32ApiKey.trim());
    setEsp32Message('Connection settings saved');
    setEsp32Status(url && esp32ApiKey.trim() ? 'offline' : 'not-configured');
  };

  const testEsp32Connection = () => { void sendToEsp32('S'); };

  const openSettings = () => { setDraftLayout(layout); setSettingsOpen(true); };
  const saveSettings = () => {
    setLayout(draftLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftLayout));
    setSettingsOpen(false);
  };
  const resetSettings = () => setDraftLayout(DEFAULT_LAYOUT);

  const beginDrag = (key: LayoutKey, event: React.PointerEvent<HTMLDivElement>) => {
    if (!settingsOpen) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const p = draftLayout[key];
    dragRef.current = {
      key,
      dx: event.clientX - (rect.left + rect.width * p.x / 100),
      dy: event.clientY - (rect.top + rect.height * p.y / 100),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const canvas = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!canvas) return;
    const { key, dx, dy } = dragRef.current;
    const p = draftLayout[key];
    const x = ((event.clientX - canvas.left - dx) / canvas.width) * 100;
    const y = ((event.clientY - canvas.top - dy) / canvas.height) * 100;
    setDraftLayout(prev => ({
      ...prev,
      [key]: { ...prev[key], x: clamp(x, 0, 100 - p.w), y: clamp(y, 0, 100 - p.h) },
    }));
  };

  const endDrag = () => { dragRef.current = null; };

  const pos = (key: LayoutKey) => settingsOpen ? draftLayout[key] : layout[key];

  const movable = (key: LayoutKey, children: React.ReactNode, extra = '') => {
    const p = pos(key);
    return (
      <div
        key={key}
        onPointerDown={(event) => beginDrag(key, event)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={'absolute touch-none ' + (settingsOpen ? 'cursor-move z-30 rounded-2xl ring-2 ring-dashed ring-emerald-400/70 bg-emerald-400/5 p-1' : 'z-10 ') + extra}
        style={{ left: p.x + '%', top: p.y + '%', width: p.w + '%', height: p.h + '%' }}>
        {settingsOpen && <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-40 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-mono text-black whitespace-nowrap pointer-events-none">{key}</div>}
        {children}
      </div>
    );
  };

  const modeButton = (key: LayoutKey, mode: RoverMode, label: string, icon: React.ReactNode) =>
    movable(key, <ModeButton active={roverMode === mode} label={label} icon={icon} onClick={() => !settingsOpen && changeRoverMode(mode)} />);

  const commandButton = (key: LayoutKey, label: string, command: NavigationCommand, icon: React.ReactNode, stopStyle = false) =>
    movable(key, <CommandButton label={label} command={command} icon={icon} onStart={sendCommand} onStop={stop} stopStyle={stopStyle} />);

  return (
    <section id="navigation-controller" className="py-20 bg-[#050807] border-t border-emerald-950/60 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,0.07),transparent_42%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2">
              <Gamepad2 className="w-4 h-4" /><span>Rover Control Deck</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">Navigation Controller</h2>
            <p className="mt-2 text-sm text-slate-300 font-body">Manual driving, route training, flash storage and autonomous replay.</p>
          </div>
          <button type="button" onClick={openSettings}
            className="self-start sm:self-auto flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-5 py-2.5 text-emerald-200 font-mono text-xs tracking-wider hover:bg-emerald-500/20 hover:border-emerald-300 transition-all">
            <Settings className="w-4 h-4" /> CONTROLLER SETTINGS
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-cyan-300 uppercase mb-2">
                <Wifi className="w-3.5 h-3.5" /> ESP32-S3 GATEWAY LINK
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  value={esp32Url}
                  onChange={(event) => setEsp32Url(event.target.value)}
                  placeholder="http://10.102.214.176"
                  aria-label="ESP32-S3 gateway address"
                  className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-400"
                />
                <input
                  value={esp32ApiKey}
                  onChange={(event) => setEsp32ApiKey(event.target.value)}
                  placeholder="ESP32-S3 API key"
                  type="password"
                  aria-label="ESP32 API key"
                  className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={saveEsp32Connection} className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-[10px] font-mono tracking-wider text-cyan-200 hover:bg-cyan-500/20">SAVE LINK</button>
              <button type="button" onClick={testEsp32Connection} disabled={!esp32Url.trim() || !esp32ApiKey.trim()} className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-[10px] font-mono tracking-wider text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"><Link2 className="w-3.5 h-3.5" /> TEST</button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className={'inline-block w-2 h-2 rounded-full ' + (esp32Status === 'online' ? 'bg-emerald-400' : esp32Status === 'offline' ? 'bg-rose-400' : 'bg-slate-600')} />
            {esp32Message} · HOLD = continuous command · RELEASE = S
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setControllerMode('arrow')} className={(controllerMode === 'arrow' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 text-slate-500 hover:text-slate-200') + ' px-4 py-2 rounded-full border font-mono text-xs tracking-wider transition-all'}>ARROW CONTROLLER</button>
          <button type="button" onClick={() => setControllerMode('joystick')} className={(controllerMode === 'joystick' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 text-slate-500 hover:text-slate-200') + ' px-4 py-2 rounded-full border font-mono text-xs tracking-wider transition-all'}>JOYSTICK</button>
        </div>

        <div className="mt-8 relative mx-auto w-full max-w-5xl h-[650px] sm:h-[610px] overflow-hidden rounded-[42px]">
          <svg viewBox="0 0 1000 620" className="absolute inset-0 w-full h-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)] pointer-events-none" aria-hidden="true">
            <defs>
              <linearGradient id="eaarControllerBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20292d" /><stop offset="52%" stopColor="#0e1518" /><stop offset="100%" stopColor="#05090b" /></linearGradient>
              <linearGradient id="eaarControllerEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#56656b" stopOpacity="0.9" /><stop offset="48%" stopColor="#182327" stopOpacity="0.35" /><stop offset="100%" stopColor="#020506" stopOpacity="0.9" /></linearGradient>
              <filter id="eaarControllerGlow"><feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path d="M190 76 C130 64 79 95 56 156 L18 287 C5 333 31 383 76 386 C111 388 132 360 155 326 L185 282 C218 293 276 300 342 300 C408 300 466 293 499 282 L529 326 C552 360 573 388 608 386 C653 383 679 333 666 287 L628 156 C605 95 554 64 494 76 C444 87 399 100 342 100 C285 100 240 87 190 76 Z" transform="translate(167 0) scale(1 1.35)" fill="url(#eaarControllerBody)" stroke="url(#eaarControllerEdge)" strokeWidth="7" filter="url(#eaarControllerGlow)" />
          </svg>

          <div className="absolute inset-[4%]">
            {modeButton('manual', 'manual', 'MANUAL', <Gamepad2 className="w-3.5 h-3.5" />)}
            {modeButton('training', 'training', 'TRAINING', <Radio className="w-3.5 h-3.5" />)}
            {modeButton('auto', 'auto', 'AUTOMATIC', <Play className="w-3.5 h-3.5" />)}

            {controllerMode === 'arrow' ? <>
              {commandButton('forward', 'Forward', COMMANDS.forward, <ArrowUp className="w-7 h-7" />)}
              {commandButton('left', 'Left', COMMANDS.left, <ArrowLeft className="w-7 h-7" />)}
              {commandButton('stop', 'Stop', COMMANDS.stop, <CircleStop className="w-7 h-7" />, true)}
              {commandButton('right', 'Right', COMMANDS.right, <ArrowRight className="w-7 h-7" />)}
              {commandButton('back', 'Backward', COMMANDS.back, <ArrowDown className="w-7 h-7" />)}
            </> : movable('joystick', <Joystick activeCommand={activeCommand} onCommand={sendCommand} onStop={stop} />)}

            {movable('status',
              <div className="w-full h-full rounded-[28px] border border-slate-700/80 bg-black/45 backdrop-blur-sm p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between"><span className="text-[9px] font-mono tracking-widest text-slate-600">ROVER MODE</span><span className="text-[9px] font-mono text-emerald-400">{roverMode.toUpperCase()}</span></div>
                <div className="mt-4 text-center"><div className="text-[9px] font-mono tracking-widest text-slate-600">CURRENT COMMAND</div><div className="mt-1 text-4xl font-black font-mono text-white tracking-widest">{activeCommand}</div></div>
                <div className="mt-4 h-px bg-slate-800" />
                <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2"><div className="text-slate-600">TRAINING</div><div className={(roverMode === 'training' && !trainingEnded ? 'text-amber-300' : 'text-slate-500') + ' mt-1'}>{roverMode === 'training' && !trainingEnded ? 'RECORDING' : trainingEnded ? 'ENDED' : 'IDLE'}</div></div>
                  <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2"><div className="text-slate-600">FLASH</div><div className={(flashRequested ? 'text-emerald-300' : 'text-slate-500') + ' mt-1'}>{flashRequested ? 'STORED' : 'READY'}</div></div>
                </div>
              </div>
            )}

            {movable('emergency',
              <button type="button" onClick={stop} className="w-full h-full rounded-full border-2 border-rose-400/70 bg-gradient-to-b from-rose-600 to-rose-950 text-white shadow-[0_0_30px_rgba(244,63,94,0.2)] active:scale-95 transition-transform">
                <CircleStop className="w-7 h-7 mx-auto" /><span className="block mt-1 text-[8px] font-mono tracking-widest">EMERGENCY STOP</span>
              </button>
            )}

            {movable('endTraining',
              <button type="button" onClick={endTraining} disabled={settingsOpen || roverMode !== 'training' || trainingEnded}
                className="w-full h-full rounded-2xl border border-slate-600 bg-gradient-to-b from-slate-700 to-slate-950 text-slate-200 shadow-[inset_0_2px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.3)] disabled:opacity-35 hover:border-amber-400/60 transition-all">
                <span className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-wider"><Square className="w-4 h-4" />END TRAINING</span>
              </button>
            )}

            {movable('storeFlash',
              <button type="button" onClick={storeToFlash} disabled={settingsOpen || !trainingEnded}
                className="w-full h-full rounded-2xl border border-emerald-700/70 bg-gradient-to-b from-emerald-800 to-emerald-950 text-emerald-100 shadow-[inset_0_2px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.3)] disabled:opacity-35 hover:border-emerald-300 transition-all">
                <span className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-wider"><Save className="w-4 h-4" />STORE TO FLASH</span>
              </button>
            )}
          </div>

          <div className="absolute bottom-3 left-8 right-8 flex items-center justify-between pointer-events-none text-[8px] font-mono text-slate-600">
            <div className="flex items-center gap-2"><TimerReset className="w-3.5 h-3.5" />HOLD = MOVE · RELEASE = STOP</div>
            <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-emerald-500/60" />F · B · L · R · S</div>
          </div>
        </div>

        {settingsOpen && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs font-mono text-emerald-200">
              <span className="font-bold">LAYOUT EDIT MODE:</span> drag any control to the position you want. The saved layout stays on this browser.
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={resetSettings} className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-mono text-slate-300 hover:border-slate-400">
                <RotateCcw className="w-3.5 h-3.5" /> RESET
              </button>
              <button type="button" onClick={saveSettings} className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-500/15 px-4 py-2 text-xs font-mono text-emerald-200 hover:bg-emerald-500/25">
                <Save className="w-3.5 h-3.5" /> SAVE SETTINGS
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
