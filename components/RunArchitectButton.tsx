import React, { useEffect, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';

interface Props {
  onClick: () => void;
  isGenerating: boolean;
  label?: string;
  disabled?: boolean;
}

export const RunArchitectButton: React.FC<Props> = ({ 
  onClick, 
  isGenerating, 
  label = "Run Architect", 
  disabled 
}) => {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success' | 'reset'>('idle');

  useEffect(() => {
    if (isGenerating && phase === 'idle') {
      setPhase('loading');
    } else if (!isGenerating && phase === 'loading') {
      setPhase('success');
      const timer = setTimeout(() => {
        setPhase('reset');
        const resetTimer = setTimeout(() => {
          setPhase('idle');
        }, 60);
        return () => clearTimeout(resetTimer);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, phase]);

  const getLabelStyle = (): React.CSSProperties => {
    if (phase === 'idle') {
      return { 
        transform: 'translateY(0)', 
        opacity: 1, 
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease' 
      };
    }
    if (phase === 'loading' || phase === 'success') {
      return { 
        transform: 'translateY(24px)', 
        opacity: 0, 
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease' 
      };
    }
    return { 
      transform: 'translateY(-24px)', 
      opacity: 0, 
      transition: 'none' 
    };
  };

  // Mathematically precise continuous sine wave paths (Period = 40px, cy = 13px)
  // Perfectly loops when translating by -80px (exact 2 full periods) with zero deviation
  const primaryWavePath = "M -40,13 C -32.80,6.50 -27.20,6.50 -20.00,13 C -12.80,19.50 -7.20,19.50 0.00,13 C 7.20,6.50 12.80,6.50 20.00,13 C 27.20,19.50 32.80,19.50 40.00,13 C 47.20,6.50 52.80,6.50 60.00,13 C 67.20,19.50 72.80,19.50 80.00,13 C 87.20,6.50 92.80,6.50 100.00,13 C 107.20,19.50 112.80,19.50 120.00,13 C 127.20,6.50 132.80,6.50 140.00,13 C 147.20,19.50 152.80,19.50 160.00,13 C 167.20,6.50 172.80,6.50 180.00,13 C 187.20,19.50 192.80,19.50 200.00,13 C 207.20,6.50 212.80,6.50 220.00,13 C 227.20,19.50 232.80,19.50 240.00,13 C 247.20,6.50 252.80,6.50 260.00,13 C 267.20,19.50 272.80,19.50 280.00,13 C 287.20,6.50 292.80,6.50 300.00,13 C 307.20,19.50 312.80,19.50 320.00,13 C 327.20,6.50 332.80,6.50 340.00,13 C 347.20,19.50 352.80,19.50 360.00,13 C 367.20,6.50 372.80,6.50 380.00,13 C 387.20,19.50 392.80,19.50 400.00,13 C 407.20,6.50 412.80,6.50 420.00,13 C 427.20,19.50 432.80,19.50 440.00,13";
  
  const secondaryWavePath = "M -40,13 C -32.80,9.00 -27.20,9.00 -20.00,13 C -12.80,17.00 -7.20,17.00 0.00,13 C 7.20,9.00 12.80,9.00 20.00,13 C 27.20,17.00 32.80,17.00 40.00,13 C 47.20,9.00 52.80,9.00 60.00,13 C 67.20,17.00 72.80,17.00 80.00,13 C 87.20,9.00 92.80,9.00 100.00,13 C 107.20,17.00 112.80,17.00 120.00,13 C 127.20,9.00 132.80,9.00 140.00,13 C 147.20,17.00 152.80,17.00 160.00,13 C 167.20,9.00 172.80,9.00 180.00,13 C 187.20,17.00 192.80,17.00 200.00,13 C 207.20,9.00 212.80,9.00 220.00,13 C 227.20,17.00 232.80,17.00 240.00,13 C 247.20,9.00 252.80,9.00 260.00,13 C 267.20,17.00 272.80,17.00 280.00,13 C 287.20,9.00 292.80,9.00 300.00,13 C 307.20,17.00 312.80,17.00 320.00,13 C 327.20,9.00 332.80,9.00 340.00,13 C 347.20,17.00 352.80,17.00 360.00,13 C 367.20,9.00 372.80,9.00 380.00,13 C 387.20,17.00 392.80,17.00 400.00,13 C 407.20,9.00 412.80,9.00 420.00,13 C 427.20,17.00 432.80,17.00 440.00,13";

  return (
    <>
      <style>{`
        @keyframes modernAiWavePrimary {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-80px, 0, 0); }
        }
        @keyframes modernAiWaveSecondary {
          0% { transform: translate3d(-80px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes modernAiWaveBreathe {
          0%, 100% { transform: scaleY(0.92); opacity: 0.92; }
          50% { transform: scaleY(1.14); opacity: 1; }
        }
        @keyframes modernBorderBeam {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-ai-wave-primary {
          animation: modernAiWavePrimary 2.2s linear infinite;
          will-change: transform;
        }
        .animate-ai-wave-secondary {
          animation: modernAiWaveSecondary 3.1s linear infinite;
          will-change: transform;
        }
        .animate-ai-wave-breathe {
          animation: modernAiWaveBreathe 2.8s ease-in-out infinite;
        }
        .animate-border-beam {
          animation: modernBorderBeam 3.5s linear infinite;
          will-change: transform;
        }
      `}</style>

      <div className="relative w-full group select-none">
        <button 
          onClick={(e) => {
            e.preventDefault();
            if (phase === 'idle' && !disabled) {
              onClick();
            }
          }}
          disabled={disabled || phase !== 'idle'}
          aria-busy={phase === 'loading'}
          aria-label={phase === 'loading' ? 'Generating prompts...' : label}
          className={`relative z-10 w-full h-[50px] sm:h-[52px] rounded-full overflow-hidden flex items-center justify-center font-black uppercase tracking-[0.14em] text-[12.5px] sm:text-[13px] backdrop-blur-2xl backdrop-saturate-[190%] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
            phase === 'loading' 
              ? 'bg-gradient-to-b from-white/95 via-white/90 to-white/85 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-[#0b1329]/95 text-blue-600 dark:text-blue-400 border border-blue-500/40 dark:border-blue-400/30 shadow-[0_0_24px_rgba(59,130,246,0.22),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_0_28px_rgba(99,102,241,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.2)]'
              : phase === 'success'
              ? 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/10 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
              : 'bg-gradient-to-b from-white/90 via-white/80 to-white/70 hover:from-white hover:to-white/90 dark:from-white/[0.12] dark:via-white/[0.08] dark:to-white/[0.05] dark:hover:from-white/[0.18] dark:hover:to-white/[0.1] text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/90 dark:border-white/[0.15] shadow-[0_8px_24px_rgba(0,0,0,0.05),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.18)] hover:shadow-[0_12px_32px_rgba(59,130,246,0.18)] hover:-translate-y-0.5 active:scale-[0.98]'
          } ${
            disabled && phase === 'idle' ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-none' : 'opacity-100'
          }`}
        >
          {/* Top Specular Rim Reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 dark:via-white/35 to-transparent pointer-events-none z-20" />

          {/* Liquid Gloss Top Arc */}
          <div className="absolute top-0 left-2 right-2 h-1/2 bg-gradient-to-b from-white/30 dark:from-white/10 to-transparent rounded-t-full pointer-events-none z-10" />

          {/* Dynamic Border Beam (Active during loading phase) */}
          {phase === 'loading' && (
            <div className="absolute -inset-[150%] pointer-events-none flex items-center justify-center opacity-60 dark:opacity-75 z-0">
              <div className="w-[300%] h-[300%] bg-[conic-gradient(from_0deg,transparent_0_310deg,#38bdf8_335deg,#818cf8_350deg,#ec4899_360deg)] animate-border-beam" />
            </div>
          )}

          {/* Inner Surface Card Mask (Overlays border beam so only thin 1.5px border glows) */}
          {phase === 'loading' && (
            <div className="absolute inset-[1.5px] rounded-full bg-white/95 dark:bg-[#0c1527]/95 backdrop-blur-xl pointer-events-none z-[1]" />
          )}

          {/* Ambient Radial Glow behind waves during loading */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-[2] ${
              phase === 'loading' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-32 h-6 rounded-full bg-gradient-to-r from-cyan-500/25 via-blue-500/30 to-fuchsia-500/25 blur-md" />
          </div>

          {/* MODERN AI GENERATIVE WAVE ANIMATION CONTAINER */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 z-[3] ${
              phase === 'loading' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            {/* Viewport Capsule with Silky Edge Gradient Mask */}
            <div 
              className="relative w-[116px] sm:w-[130px] h-[28px] overflow-hidden flex items-center justify-center animate-ai-wave-breathe"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)'
              }}
            >
              <svg 
                className="absolute left-0 top-[1px] w-[440px] h-[26px]" 
                viewBox="0 0 440 26" 
                fill="none"
              >
                <defs>
                  {/* Primary Apple Intelligence / Gemini Gradient */}
                  <linearGradient id="modernAiWaveGradPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="30%" stopColor="#3b82f6" />
                    <stop offset="65%" stopColor="#818cf8" />
                    <stop offset="85%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>

                  {/* Secondary Harmonic Wave Gradient */}
                  <linearGradient id="modernAiWaveGradSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#a855f7" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
                  </linearGradient>

                  {/* Luminous Glow Filter */}
                  <filter id="modernAiGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1" result="glow" />
                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                  </filter>
                </defs>

                {/* Secondary Harmonic Resonance Wave (Opposite flow for quantum fluid depth) */}
                <path 
                  d={secondaryWavePath}
                  className="animate-ai-wave-secondary"
                  stroke="url(#modernAiWaveGradSecondary)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.65"
                />

                {/* Primary Radiant Wave (Forward silky smooth continuous sine flow) */}
                <path 
                  d={primaryWavePath}
                  className="animate-ai-wave-primary"
                  stroke="url(#modernAiWaveGradPrimary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#modernAiGlow)"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))'
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Success State Indicator */}
          <div 
            className={`absolute inset-0 flex items-center justify-center gap-2 pointer-events-none transition-all duration-400 z-[4] ${
              phase === 'success' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              <Check size={14} strokeWidth={3} className="animate-in zoom-in-50 duration-300" />
            </div>
            <span className="text-[12px] font-black tracking-wider text-emerald-600 dark:text-emerald-400">
              SYNTHESIZED
            </span>
          </div>

          {/* Idle Label Text with Sparkles Icon */}
          <div className="relative z-[5] flex items-center justify-center gap-2.5 w-full h-full pointer-events-none">
            <span style={getLabelStyle()} className="absolute flex items-center gap-2 whitespace-nowrap">
              <Sparkles size={16} className="text-blue-500 dark:text-blue-400 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
              <span>{label}</span>
            </span>
          </div>
        </button>
      </div>
    </>
  );
};
