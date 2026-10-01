import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleStop, Gamepad2, Navigation2, Play, Radio, Save, Square, TimerReset, Zap,
} from 'lucide-react';

type ControllerMode = 'arrow' | 'joystick';
type RoverMode = 'manual' | 'training' | 'auto';
type NavigationCommand = 'F' | 'B' | 'L' | 'R' | 'S';

const COMMANDS: Record<'forward' | 'back' | 'left' | 'right' | 'stop', NavigationCommand> = {
  forward: 'F', back: 'B', left: 'L', right: 'R', stop: 'S',
};

const emitCommand = (command: NavigationCommand) => {
  window.dispatchEvent(new CustomEvent('eaar-navigation-command', { detail: { command, timestamp: new Date().toISOString(), source: 'web-controller' } }));
};

const emitMode = (mode: RoverMode) => {
  window.dispatchEvent(new CustomEvent('eaar-navigation-mode', { detail: { mode, timestamp: new Date().toISOString(), source: 'web-controller' } }));
};

const emitAction = (action: 'end-training' | 'store-to-flash') => {
  window.dispatchEvent(new CustomEvent('eaar-navigation-action', { detail: { action, timestamp: new Date().toISOString(), source: 'web-controller' } }));
};

const ControllerButton: React.FC<{
  label: string; command: NavigationCommand; children: React.ReactNode;
  onPressStart: (command: NavigationCommand) => void; onPressEnd: () => void; className?: string;
}> = ({ label, command, children, onPressStart, onPressEnd, className = '' }) => (
  <button type="button" aria-label={label}
    onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onPressStart(command); }}
    onPointerUp={onPressEnd} onPointerCancel={onPressEnd}
    className={'relative flex items-center justify-center rounded-full border border-slate-600/80 bg-gradient-to-b from-slate-700 to-slate-950 text-slate-200 shadow-[inset_0_2px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.35)] transition-all duration-100 hover:border-emerald-400/70 hover:text-emerald-300 active:translate-y-[2px] active:from-emerald-700 active:to-emerald-950 active:text-white touch-none select-none ' + className}>
    <span className="absolute inset-1 rounded-full border border-white/5 pointer-events-none" />
    {children}
  </button>
);

const DPad: React.FC<{ onStart: (command: NavigationCommand) => void; onStop: () => void }> = ({ onStart, onStop }) => (
  <div className="relative w-44 h-44 sm:w-52 sm:h-52">
    <ControllerButton label="Forward" command={COMMANDS.forward} onPressStart={onStart} onPressEnd={onStop} className="absolute left-1/2 top-0 -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"><ArrowUp className="w-7 h-7 sm:w-8 sm:h-8" /></ControllerButton>
    <ControllerButton label="Left" command={COMMANDS.left} onPressStart={onStart} onPressEnd={onStop} className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"><ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8" /></ControllerButton>
    <ControllerButton label="Right" command={COMMANDS.right} onPressStart={onStart} onPressEnd={onStop} className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"><ArrowRight className="w-7 h-7 sm:w-8 sm:h-8" /></ControllerButton>
    <ControllerButton label="Backward" command={COMMANDS.back} onPressStart={onStart} onPressEnd={onStop} className="absolute left-1/2 bottom-0 -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"><ArrowDown className="w-7 h-7 sm:w-8 sm:h-8" /></ControllerButton>
    <button type="button" aria-label="Stop" onClick={onStop} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-rose-400/70 bg-gradient-to-b from-rose-700 to-rose-950 text-rose-100 shadow-[0_0_22px_rgba(244,63,94,0.22),inset_0_2px_2px_rgba(255,255,255,0.12)] active:scale-95 transition-transform"><CircleStop className="w-7 h-7 mx-auto" /></button>
  </div>
);

const JoystickController: React.FC<{ activeCommand: NavigationCommand; onCommand: (command: NavigationCommand) => void; onStop: () => void }> = ({ activeCommand, onCommand, onStop }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastCommand = useRef<NavigationCommand>('S');
  const sendIfChanged = (command: NavigationCommand) => { if (lastCommand.current !== command) { lastCommand.current = command; onCommand(command); } };
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const dx = Math.max(-1, Math.min(1, x)); const dy = Math.max(-1, Math.min(1, y));
    setPosition({ x: dx * 48, y: dy * 48 });
    if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) return sendIfChanged('S');
    if (Math.abs(dx) > Math.abs(dy)) return sendIfChanged(dx > 0 ? 'R' : 'L');
    return sendIfChanged(dy < 0 ? 'F' : 'B');
  };
  const stop = () => { dragging.current = false; setPosition({ x: 0, y: 0 }); lastCommand.current = 'S'; onStop(); };
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-slate-600/70 bg-[radial-gradient(circle_at_35%_30%,#27343a,#0a1014_62%,#05080a)] shadow-[inset_0_0_35px_rgba(0,0,0,0.75),0_14px_30px_rgba(0,0,0,0.4)] touch-none"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragging.current = true; update(event); }}
        onPointerMove={(event) => { if (dragging.current) update(event); }} onPointerUp={stop} onPointerCancel={stop}>
        <div className="absolute inset-7 rounded-full border border-slate-700/80" /><div className="absolute inset-14 rounded-full border border-slate-800/80" />
        <div className="absolute left-1/2 top-1/2 w-24 h-24 sm:w-28 sm:h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/50 bg-gradient-to-b from-emerald-700 to-emerald-950 shadow-[0_0_32px_rgba(16,185,129,0.2),inset_0_3px_4px_rgba(255,255,255,0.12)] flex items-center justify-center transition-transform duration-75" style={{ transform: 'translate(calc(-50% + ' + position.x + 'px), calc(-50% + ' + position.y + 'px))' }}>
          <Navigation2 className="w-8 h-8 text-emerald-200" />
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.25em] text-slate-500">FORWARD</div>
      </div>
      <button type="button" onClick={stop} className="mt-5 rounded-full px-5 py-2 border border-rose-400/60 bg-rose-950/70 text-rose-200 font-mono text-xs tracking-wider shadow-lg active:scale-95 transition-transform">STOP · S</button>
      <div className="mt-3 text-center font-mono text-xs text-slate-500">ACTIVE COMMAND <span className="ml-2 text-emerald-300">{activeCommand}</span></div>
    </div>
  );
};

const ModeButton: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button type="button" onClick={onClick}
    className={(active ? 'border-emerald-300 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.16)]' : 'border-slate-700 bg-black/30 text-slate-500 hover:text-slate-200 hover:border-slate-500') + ' min-w-24 sm:min-w-28 px-3 sm:px-4 py-2.5 rounded-full border font-mono text-[10px] sm:text-xs tracking-wider transition-all'}>
    <span className="flex items-center justify-center gap-2">{icon}{label}</span>
  </button>
);

export const NavigationControllerSection: React.FC = () => {
  const [controllerMode, setControllerMode] = useState<ControllerMode>('arrow');
  const [roverMode, setRoverMode] = useState<RoverMode>('manual');
  const [activeCommand, setActiveCommand] = useState<NavigationCommand>('S');
  const [trainingEnded, setTrainingEnded] = useState(false);
  const [flashRequested, setFlashRequested] = useState(false);
  const stop = () => { setActiveCommand('S'); emitCommand('S'); };
  const sendCommand = (command: NavigationCommand) => { setActiveCommand(command); emitCommand(command); };
  const changeRoverMode = (nextMode: RoverMode) => { stop(); setRoverMode(nextMode); if (nextMode === 'training') { setTrainingEnded(false); setFlashRequested(false); } emitMode(nextMode); };
  const endTraining = () => { stop(); setTrainingEnded(true); emitAction('end-training'); };
  const storeToFlash = () => { stop(); setFlashRequested(true); emitAction('store-to-flash'); };
  useEffect(() => { emitCommand('S'); emitMode('manual'); }, []);

  return (
    <section id="navigation-controller" className="py-20 bg-[#050807] border-t border-emerald-950/60 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,0.07),transparent_42%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2"><Gamepad2 className="w-4 h-4" /><span>Rover Control Deck</span></div>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">Navigation Controller</h2>
          <p className="mt-2 text-sm text-slate-300 font-body">A console-style control surface for manual driving, route training, flash storage and autonomous replay.</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setControllerMode('arrow')} className={(controllerMode === 'arrow' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 text-slate-500 hover:text-slate-200') + ' px-4 py-2 rounded-full border font-mono text-xs tracking-wider transition-all'}>ARROW CONTROLLER</button>
          <button type="button" onClick={() => setControllerMode('joystick')} className={(controllerMode === 'joystick' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 text-slate-500 hover:text-slate-200') + ' px-4 py-2 rounded-full border font-mono text-xs tracking-wider transition-all'}>JOYSTICK</button>
        </div>

        <div className="mt-8 relative mx-auto w-full max-w-5xl h-[690px] sm:h-[610px]">
          <svg viewBox="0 0 1000 620" className="absolute inset-0 w-full h-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]" aria-hidden="true">
            <defs>
              <linearGradient id="eaarControllerBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20292d" /><stop offset="52%" stopColor="#0e1518" /><stop offset="100%" stopColor="#05090b" /></linearGradient>
              <linearGradient id="eaarControllerEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#56656b" stopOpacity="0.9" /><stop offset="48%" stopColor="#182327" stopOpacity="0.35" /><stop offset="100%" stopColor="#020506" stopOpacity="0.9" /></linearGradient>
              <filter id="eaarControllerGlow"><feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path d="M190 76 C130 64 79 95 56 156 L18 287 C5 333 31 383 76 386 C111 388 132 360 155 326 L185 282 C218 293 276 300 342 300 C408 300 466 293 499 282 L529 326 C552 360 573 388 608 386 C653 383 679 333 666 287 L628 156 C605 95 554 64 494 76 C444 87 399 100 342 100 C285 100 240 87 190 76 Z" transform="translate(167 0) scale(1 1.35)" fill="url(#eaarControllerBody)" stroke="url(#eaarControllerEdge)" strokeWidth="7" filter="url(#eaarControllerGlow)" />
          </svg>

          <div className="absolute inset-x-[8%] top-[7%] h-[86%] flex flex-col">
            <div className="flex items-center justify-between px-3 sm:px-8">
              <div className="flex gap-2"><span className="w-12 h-2 rounded-full bg-slate-800 border border-slate-600/50" /><span className="w-12 h-2 rounded-full bg-slate-800 border border-slate-600/50" /></div>
              <div className="text-center"><div className="text-[10px] font-mono tracking-[0.35em] text-slate-500">EAAR</div><div className="text-[9px] font-mono tracking-[0.18em] text-emerald-400/70 mt-1">CONTROL DECK</div></div>
              <div className="flex gap-2"><span className="w-12 h-2 rounded-full bg-slate-800 border border-slate-600/50" /><span className="w-12 h-2 rounded-full bg-slate-800 border border-slate-600/50" /></div>
            </div>

            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              <ModeButton active={roverMode === 'manual'} label="MANUAL" icon={<Gamepad2 className="w-3.5 h-3.5" />} onClick={() => changeRoverMode('manual')} />
              <ModeButton active={roverMode === 'training'} label="TRAINING" icon={<Radio className="w-3.5 h-3.5" />} onClick={() => changeRoverMode('training')} />
              <ModeButton active={roverMode === 'auto'} label="AUTOMATIC" icon={<Play className="w-3.5 h-3.5" />} onClick={() => changeRoverMode('auto')} />
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-5 sm:gap-8 flex-1">
              <div className="flex flex-col items-center"><div className="mb-3 text-[9px] font-mono tracking-[0.22em] text-slate-600">DIRECTION</div>{controllerMode === 'arrow' ? <DPad onStart={sendCommand} onStop={stop} /> : <JoystickController activeCommand={activeCommand} onCommand={sendCommand} onStop={stop} />}</div>

              <div className="flex flex-col items-center justify-center min-w-[190px]">
                <div className="w-full max-w-[260px] rounded-[28px] border border-slate-700/80 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between"><span className="text-[9px] font-mono tracking-widest text-slate-600">ROVER MODE</span><span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />{roverMode.toUpperCase()}</span></div>
                  <div className="mt-4 text-center"><div className="text-[9px] font-mono tracking-widest text-slate-600">CURRENT COMMAND</div><div className="mt-1 text-4xl font-black font-mono text-white tracking-widest">{activeCommand}</div></div>
                  <div className="mt-4 h-px bg-slate-800" />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono">
                    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2"><div className="text-slate-600">TRAINING</div><div className={(roverMode === 'training' && !trainingEnded ? 'text-amber-300' : 'text-slate-500') + ' mt-1'}>{roverMode === 'training' && !trainingEnded ? 'RECORDING' : trainingEnded ? 'ENDED' : 'IDLE'}</div></div>
                    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2"><div className="text-slate-600">FLASH</div><div className={(flashRequested ? 'text-emerald-300' : 'text-slate-500') + ' mt-1'}>{flashRequested ? 'REQUESTED' : 'READY'}</div></div>
                  </div>
                </div>
                <button type="button" onClick={stop} className="mt-4 w-20 h-20 rounded-full border-2 border-rose-400/70 bg-gradient-to-b from-rose-600 to-rose-950 text-white shadow-[0_0_30px_rgba(244,63,94,0.2),inset_0_3px_4px_rgba(255,255,255,0.12)] active:scale-95 transition-transform" aria-label="Emergency stop"><CircleStop className="w-7 h-7 mx-auto" /><span className="block mt-1 text-[8px] font-mono tracking-widest">STOP</span></button>
              </div>

              <div className="flex flex-col items-center gap-3"><div className="mb-1 text-[9px] font-mono tracking-[0.22em] text-slate-600">TRAINING DECK</div>
                <button type="button" onClick={endTraining} disabled={roverMode !== 'training' || trainingEnded} className="w-40 sm:w-44 h-14 rounded-2xl border border-slate-600 bg-gradient-to-b from-slate-700 to-slate-950 text-slate-200 shadow-[inset_0_2px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.3)] disabled:opacity-35 disabled:cursor-not-allowed hover:border-amber-400/60 hover:text-amber-200 active:translate-y-[2px] transition-all"><span className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-wider"><Square className="w-4 h-4" />END TRAINING</span></button>
                <button type="button" onClick={storeToFlash} disabled={!trainingEnded} className="w-40 sm:w-44 h-14 rounded-2xl border border-emerald-700/70 bg-gradient-to-b from-emerald-800 to-emerald-950 text-emerald-100 shadow-[inset_0_2px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.3)] disabled:opacity-35 disabled:cursor-not-allowed hover:border-emerald-300 hover:text-white active:translate-y-[2px] transition-all"><span className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-wider"><Save className="w-4 h-4" />STORE TO FLASH</span></button>
                <div className="mt-2 w-40 sm:w-44 rounded-2xl border border-slate-800 bg-black/30 p-3 text-center"><div className="text-[8px] font-mono tracking-[0.2em] text-slate-600">ROUTE MEMORY</div><div className="mt-1 flex items-center justify-center gap-2 text-[9px] font-mono text-slate-400"><span className={'w-2 h-2 rounded-full ' + (flashRequested ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600')} />{flashRequested ? 'FLASH STORED' : 'NOT STORED'}</div></div>
              </div>
            </div>

            <div className="pb-3 flex items-center justify-between px-3 sm:px-8"><div className="flex items-center gap-2 text-[8px] font-mono text-slate-600"><TimerReset className="w-3.5 h-3.5" />HOLD = MOVE · RELEASE = STOP</div><div className="flex items-center gap-2 text-[8px] font-mono text-slate-600"><Zap className="w-3.5 h-3.5 text-emerald-500/60" />F · B · L · R · S</div></div>
          </div>
        </div>
      </div>
    </section>
  );
};
