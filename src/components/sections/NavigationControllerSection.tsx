import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleStop, Gamepad2, Navigation2 } from 'lucide-react';

type ControllerMode = 'arrow' | 'joystick';
type NavigationCommand = 'FFF' | 'BBB' | 'LLL' | 'RRR' | 'SSS';

const COMMANDS: Record<string, NavigationCommand> = {
  forward: 'FFF',
  back: 'BBB',
  left: 'LLL',
  right: 'RRR',
  stop: 'SSS',
};

const emitCommand = (command: NavigationCommand) => {
  window.dispatchEvent(
    new CustomEvent('eaar-navigation-command', {
      detail: { command, timestamp: new Date().toISOString() },
    })
  );
};

const ControlButton: React.FC<{
  label: string;
  command: NavigationCommand;
  children: React.ReactNode;
  onPressStart: (command: NavigationCommand) => void;
  onPressEnd: () => void;
}> = ({ label, command, children, onPressStart, onPressEnd }) => (
  <button
    type="button"
    aria-label={label}
    onPointerDown={(event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onPressStart(command);
    }}
    onPointerUp={onPressEnd}
    onPointerCancel={onPressEnd}
    onPointerLeave={onPressEnd}
    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#09180f] border border-emerald-800/70 text-emerald-300 hover:bg-emerald-950 hover:border-emerald-500 active:bg-emerald-800/60 active:text-white transition-all duration-100 flex items-center justify-center shadow-lg touch-none select-none"
  >
    {children}
  </button>
);

const ArrowController: React.FC = () => {
  const [activeCommand, setActiveCommand] = useState<NavigationCommand>('SSS');

  const start = (command: NavigationCommand) => {
    setActiveCommand(command);
    emitCommand(command);
  };

  const stop = () => {
    setActiveCommand('SSS');
    emitCommand('SSS');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <ControlButton label="Forward" command={COMMANDS.forward} onPressStart={start} onPressEnd={stop}>
        <ArrowUp className="w-9 h-9" />
      </ControlButton>

      <div className="flex items-center gap-3">
        <ControlButton label="Left" command={COMMANDS.left} onPressStart={start} onPressEnd={stop}>
          <ArrowLeft className="w-9 h-9" />
        </ControlButton>

        <button
          type="button"
          aria-label="Stop"
          onClick={stop}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center transition-all ${
            activeCommand === 'SSS'
              ? 'bg-rose-950/50 border-rose-500/60 text-rose-300'
              : 'bg-[#09180f] border-emerald-800/70 text-slate-300'
          }`}
        >
          <CircleStop className="w-9 h-9" />
        </button>

        <ControlButton label="Right" command={COMMANDS.right} onPressStart={start} onPressEnd={stop}>
          <ArrowRight className="w-9 h-9" />
        </ControlButton>
      </div>

      <ControlButton label="Back" command={COMMANDS.back} onPressStart={start} onPressEnd={stop}>
        <ArrowDown className="w-9 h-9" />
      </ControlButton>

      <div className="mt-3 text-center font-mono text-xs text-slate-400">
        Command: <span className="text-cyan-300">{activeCommand}</span>
      </div>
    </div>
  );
};

const JoystickController: React.FC = () => {
  const [activeCommand, setActiveCommand] = useState<NavigationCommand>('SSS');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);

  const send = (command: NavigationCommand) => {
    setActiveCommand(command);
    emitCommand(command);
  };

  const stop = () => {
    dragging.current = false;
    setPosition({ x: 0, y: 0 });
    setActiveCommand('SSS');
    emitCommand('SSS');
  };

  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const dx = Math.max(-1, Math.min(1, x));
    const dy = Math.max(-1, Math.min(1, y));
    setPosition({ x: dx * 42, y: dy * 42 });

    if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) return send('SSS');
    if (Math.abs(dx) > Math.abs(dy)) return send(dx > 0 ? 'RRR' : 'LLL');
    return send(dy < 0 ? 'FFF' : 'BBB');
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-64 h-64 rounded-full bg-[#07120a] border border-emerald-800/70 shadow-inner touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragging.current = true;
          update(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) update(event);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={() => dragging.current && stop()}
      >
        <div className="absolute inset-10 rounded-full border border-emerald-900/60" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-emerald-950 border border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.18)] flex items-center justify-center transition-transform duration-75" style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}>
          <Navigation2 className="w-8 h-8 text-emerald-300" />
        </div>
      </div>
      <button
        type="button"
        onClick={stop}
        className="mt-5 px-5 py-2 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 font-mono text-xs"
      >
        STOP · SSS
      </button>
      <div className="mt-3 text-center font-mono text-xs text-slate-400">
        Command: <span className="text-cyan-300">{activeCommand}</span>
      </div>
    </div>
  );
};

export const NavigationControllerSection: React.FC = () => {
  const [mode, setMode] = useState<ControllerMode>('arrow');

  useEffect(() => {
    emitCommand('SSS');
  }, []);

  return (
    <section id="navigation-controller" className="py-20 bg-[#050b07] border-t border-emerald-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 tracking-wider uppercase mb-2">
            <Gamepad2 className="w-4 h-4" />
            <span>Manual Navigation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            Navigation Controller
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-body">
            Choose a control style. Both controllers use the same navigation commands and return to STOP when released.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setMode('arrow')}
            className={`p-4 rounded-xl border text-left transition-colors ${
              mode === 'arrow'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                : 'bg-[#09180f] border-emerald-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUp className="w-5 h-5 mb-2" />
            <div className="font-semibold text-sm">Arrow Controller</div>
            <div className="text-[11px] font-mono mt-1 opacity-70">Press & hold</div>
          </button>

          <button
            type="button"
            onClick={() => setMode('joystick')}
            className={`p-4 rounded-xl border text-left transition-colors ${
              mode === 'joystick'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                : 'bg-[#09180f] border-emerald-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-5 h-5 mb-2" />
            <div className="font-semibold text-sm">Joystick</div>
            <div className="text-[11px] font-mono mt-1 opacity-70">Drag & release</div>
          </button>
        </div>

        <div className="mt-8 p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#09180f] to-[#050e08] border border-emerald-900/50 shadow-2xl">
          {mode === 'arrow' ? <ArrowController /> : <JoystickController />}
        </div>
      </div>
    </section>
  );
};
