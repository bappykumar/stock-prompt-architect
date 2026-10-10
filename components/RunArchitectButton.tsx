import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Check, Zap } from 'lucide-react';

interface Props {
  onClick: () => void;
  isGenerating: boolean;
  label?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export const RunArchitectButton: React.FC<Props> = ({ 
  onClick, 
  isGenerating, 
  label = "Run Architect", 
  disabled = false,
  hasError = false
}) => {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success' | 'reset'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasGeneratingRef = useRef<boolean>(isGenerating);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (isGenerating) {
      clearTimers();
      setPhase('loading');
    } else if (wasGeneratingRef.current && !isGenerating) {
      clearTimers();
      if (hasError) {
        setPhase('idle');
      } else {
        setPhase('success');
        timerRef.current = setTimeout(() => {
          setPhase('reset');
          resetTimerRef.current = setTimeout(() => {
            setPhase('idle');
          }, 80);
        }, 1300);
      }
    } else if (!isGenerating && phase === 'loading') {
      clearTimers();
      setPhase('idle');
    }
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, hasError]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || isGenerating || phase === 'loading') return;
    clearTimers();
    setPhase('loading');
    onClick();
  };

  return (
    <div className="relative w-full group select-none">
      {/* Outer ambient glow halo (Intensifies on hover and loading) */}
      <div 
        className={`absolute -inset-1 rounded-full blur-xl transition-all duration-500 pointer-events-none ${
          phase === 'loading'
            ? 'opacity-85 bg-gradient-to-r from-cyan-500/40 via-blue-600/40 to-indigo-500/40 scale-105'
            : phase === 'success'
            ? 'opacity-90 bg-emerald-500/35 scale-105'
            : 'opacity-0 group-hover:opacity-60 bg-gradient-to-r from-cyan-500/20 via-blue-500/25 to-indigo-500/20 scale-100'
        }`}
      />

      <button 
        onClick={handleClick}
        disabled={disabled || isGenerating || phase === 'loading'}
        aria-busy={phase === 'loading'}
        aria-label={phase === 'loading' ? 'Generating prompts...' : label}
        className={`no-global-transition relative z-10 w-full min-h-[50px] h-[50px] sm:h-[52px] md:h-[54px] rounded-full overflow-hidden flex items-center justify-center font-black uppercase tracking-[0.15em] text-[12px] xs:text-[12.5px] sm:text-[13px] md:text-[13.5px] backdrop-blur-2xl backdrop-saturate-[200%] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
          phase === 'loading' 
            ? 'bg-gradient-to-b from-white/95 via-slate-50/90 to-white/85 dark:from-slate-950/95 dark:via-[#070d1e]/90 dark:to-[#040816]/95 text-cyan-600 dark:text-cyan-300 border border-cyan-500/50 dark:border-cyan-400/40 shadow-[0_0_32px_rgba(6,182,212,0.32),inset_0_1px_2px_rgba(255,255,255,0.9)] dark:shadow-[0_0_36px_rgba(6,182,212,0.35),inset_0_1px_2px_rgba(255,255,255,0.25)]'
            : phase === 'success'
            ? 'bg-gradient-to-b from-emerald-500/20 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:via-emerald-500/15 dark:to-[#021d14]/90 text-emerald-600 dark:text-emerald-300 border border-emerald-400/60 shadow-[0_0_32px_rgba(16,185,129,0.4),inset_0_1px_2px_rgba(255,255,255,0.8)]'
            : 'bg-gradient-to-b from-white/95 via-white/85 to-white/75 hover:from-white hover:to-white/90 dark:from-white/[0.13] dark:via-white/[0.08] dark:to-white/[0.05] dark:hover:from-white/[0.20] dark:hover:to-white/[0.12] text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300 border border-slate-200/90 dark:border-white/[0.18] shadow-[0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_36px_rgba(6,182,212,0.32)] hover:-translate-y-0.5 active:scale-[0.98]'
        } ${
          (disabled || isGenerating) && phase === 'idle' ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-none' : 'opacity-100'
        }`}
      >
        {/* Top Specular Rim Reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 dark:via-white/45 to-transparent pointer-events-none z-20" />

        {/* Liquid Gloss Top Arc */}
        <div className="absolute top-0 left-2 right-2 h-1/2 bg-gradient-to-b from-white/35 dark:from-white/12 to-transparent rounded-t-full pointer-events-none z-10" />

        {/* Quantum Shimmer Border: Idle, Hover & Loading states */}
        <div 
          className={`absolute -inset-[200%] pointer-events-none flex items-center justify-center transition-opacity duration-500 z-0 ${
            phase === 'loading' 
              ? 'opacity-90 dark:opacity-95' 
              : 'opacity-25 group-hover:opacity-85 dark:opacity-30 dark:group-hover:opacity-95'
          }`}
        >
          <div 
            className={`w-[400%] h-[400%] bg-[conic-gradient(from_0deg,transparent_0_300deg,#06b6d4_325deg,#3b82f6_345deg,#818cf8_355deg,#ffffff_360deg)] ${
              phase === 'loading' ? 'quantum-btn-border-spin-fast' : 'quantum-btn-border-spin'
            }`} 
          />
        </div>

        {/* Inner Surface Card Mask to isolate the shimmer to a sharp 1.5px border glow */}
        <div 
          className={`absolute inset-[1.5px] rounded-full pointer-events-none z-[1] transition-colors duration-300 ${
            phase === 'loading'
              ? 'bg-white/95 dark:bg-[#060b18]/95 backdrop-blur-xl'
              : phase === 'success'
              ? 'bg-emerald-50/90 dark:bg-[#03150f]/95 backdrop-blur-xl'
              : 'bg-white/90 dark:bg-[#0a0f1d]/90 backdrop-blur-xl group-hover:bg-white/95 dark:group-hover:bg-[#0c1326]/95'
          }`} 
        />

        {/* ========================================================
            SUCCESS STATE: Quantum Flash Expansion & Glowing Checkmark
            ======================================================== */}
        {phase === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[4]">
            {/* Luminous Quantum Flash Expanding Shockwave */}
            <div className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 blur-md quantum-flash-expand" />
            
            {/* Success Content Badge */}
            <div className="relative flex items-center justify-center gap-2.5 quantum-check-spring">
              <div className="w-6 h-6 rounded-full bg-emerald-500/25 border border-emerald-400 flex items-center justify-center text-emerald-500 dark:text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.7)]">
                <Check size={14} strokeWidth={3.5} />
              </div>
              <span className="text-[12px] sm:text-[13px] font-black tracking-[0.18em] text-emerald-600 dark:text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                PROMPTS SYNTHESIZED
              </span>
            </div>
          </div>
        )}

        {/* ========================================================
            GENERATING STATE: Quantum Orbital Ring + Particle Energy Stream
            ======================================================== */}
        <div 
          className={`absolute inset-0 flex items-center justify-between px-3 sm:px-4 pointer-events-none transition-all duration-400 z-[3] ${
            phase === 'loading' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {/* Synchronized Micro Quantum Orbital Core (Left anchor) */}
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center">
            {/* Orbital glow backing */}
            <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-[6px] animate-pulse" />
            
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full relative z-10 overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="btn-q-orbit-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>

                <linearGradient id="btn-q-orbit-cyan" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>

                <radialGradient id="btn-q-core-dot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </radialGradient>

                <filter id="btn-q-node-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Outer Circular Track with Traveling Quantum Node */}
              <g className="quantum-orbit-cw origin-center">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="url(#btn-q-orbit-primary)"
                  strokeWidth="2.5"
                  strokeDasharray="8 8"
                  className="opacity-80"
                />
                <circle cx="50" cy="6" r="4.5" fill="#ffffff" filter="url(#btn-q-node-glow)" />
              </g>

              {/* Inclined Ellipse 1 (Counter-Clockwise) */}
              <g className="quantum-orbit-ellipse-ccw origin-center">
                <ellipse
                  cx="50"
                  cy="50"
                  rx="42"
                  ry="22"
                  fill="none"
                  stroke="url(#btn-q-orbit-cyan)"
                  strokeWidth="2.2"
                  strokeDasharray="6 7"
                  className="opacity-85"
                />
                <circle cx="92" cy="50" r="4" fill="#38bdf8" filter="url(#btn-q-node-glow)" />
              </g>

              {/* Inclined Ellipse 2 (Clockwise) */}
              <g className="quantum-orbit-ellipse-cw origin-center">
                <ellipse
                  cx="50"
                  cy="50"
                  rx="41"
                  ry="21"
                  fill="none"
                  stroke="url(#btn-q-orbit-primary)"
                  strokeWidth="2"
                  strokeDasharray="4 8"
                  className="opacity-85"
                />
                <circle cx="8" cy="50" r="3.5" fill="#818cf8" filter="url(#btn-q-node-glow)" />
              </g>

              {/* Pulsing Neural Core Center */}
              <circle
                cx="50"
                cy="50"
                r="10"
                fill="url(#btn-q-core-dot)"
                className="quantum-neural-pulse"
              />
            </svg>
          </div>

          {/* Synchronized Particle Energy Stream Conduit */}
          <div className="relative flex-1 mx-2 sm:mx-3 h-7 sm:h-8 flex items-center justify-center overflow-hidden">
            {/* Silky Edge Gradient Mask for seamless fade */}
            <div 
              className="absolute inset-0 flex items-center overflow-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
              }}
            >
              {/* Primary Streaming Conduit Beam (Flows right) */}
              <svg 
                className="w-[420px] h-full flex-shrink-0 animate-quantum-stream-left"
                viewBox="0 0 420 30" 
                fill="none"
              >
                <defs>
                  <linearGradient id="btn-stream-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="30%" stopColor="#3b82f6" />
                    <stop offset="70%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                {/* Conduit Line 1 with animated dashes */}
                <path 
                  d="M 0,10 Q 50,4 105,10 T 210,10 T 315,10 T 420,10"
                  stroke="url(#btn-stream-grad)"
                  strokeWidth="2"
                  strokeDasharray="6 8 16 8"
                  className="opacity-75"
                />
                {/* Conduit Line 2 counter-harmonic */}
                <path 
                  d="M 0,20 Q 50,26 105,20 T 210,20 T 315,20 T 420,20"
                  stroke="url(#btn-stream-grad)"
                  strokeWidth="1.6"
                  strokeDasharray="10 6 4 6"
                  className="opacity-60"
                />
                {/* High-energy particle dots */}
                <circle cx="45" cy="9" r="2.8" fill="#ffffff" filter="drop-shadow(0 0 4px #38bdf8)" />
                <circle cx="150" cy="11" r="2.5" fill="#38bdf8" filter="drop-shadow(0 0 4px #38bdf8)" />
                <circle cx="255" cy="10" r="3" fill="#ffffff" filter="drop-shadow(0 0 5px #818cf8)" />
                <circle cx="360" cy="9" r="2.5" fill="#06b6d4" />
                <circle cx="100" cy="21" r="2.5" fill="#818cf8" />
                <circle cx="310" cy="19" r="2.8" fill="#ffffff" filter="drop-shadow(0 0 4px #06b6d4)" />
              </svg>
            </div>

            {/* Energetic Overlay Label */}
            <div className="relative z-10 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 dark:border-cyan-400/25 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <Zap size={11} className="text-cyan-500 dark:text-cyan-400 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-black tracking-[0.2em] text-cyan-700 dark:text-cyan-300 whitespace-nowrap">
                SYNTHESIZING...
              </span>
            </div>
          </div>

          {/* Synchronized Micro Particle Node Anchor (Right anchor) */}
          <div className="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 animate-ping opacity-75" />
            <div className="absolute w-2 h-2 rounded-full bg-white dark:bg-cyan-200 shadow-[0_0_8px_#38bdf8]" />
          </div>
        </div>

        {/* ========================================================
            IDLE STATE: Quantum Shimmer Label & Sparkling Hover Lift
            ======================================================== */}
        <div 
          className={`relative z-[5] flex items-center justify-center gap-2.5 w-full h-full pointer-events-none transition-all duration-300 ${
            phase === 'idle' 
              ? 'opacity-100 transform-none' 
              : phase === 'loading'
              ? 'opacity-0 translate-y-3'
              : 'opacity-0 -translate-y-3'
          }`}
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Sparkles 
              size={17} 
              className="text-cyan-500 dark:text-cyan-400 group-hover:rotate-12 group-hover:scale-125 transition-all duration-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.45)]" 
            />
            <span className="group-hover:tracking-[0.18em] transition-all duration-300">
              {label}
            </span>
          </span>
        </div>
      </button>
    </div>
  );
};
