import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';

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
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasGeneratingRef = useRef<boolean>(isGenerating);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
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
          setPhase('idle');
        }, 1600);
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

  const isLoading = phase === 'loading' || isGenerating;
  const isSuccess = phase === 'success';

  return (
    <div className="relative w-full select-none group">
      {/* Soft Ambient AI Aura Bloom (Becomes vibrant on hover / breathing when generating) */}
      <div 
        className={`absolute -inset-1 rounded-full transition-all duration-700 pointer-events-none blur-xl ${
          isLoading
            ? 'bg-gradient-to-r from-blue-600/50 via-indigo-500/40 to-cyan-500/50 opacity-100 animate-pulse'
            : isSuccess
            ? 'bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-emerald-600/40 opacity-90'
            : 'bg-gradient-to-r from-blue-600/25 via-indigo-500/20 to-purple-600/25 opacity-0 group-hover:opacity-100'
        }`}
        style={isLoading ? { animationDuration: '2s' } : undefined}
      />

      {/* Main Glassy Pill Button */}
      <button 
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? 'Architecting Prompts...' : label}
        className={`w-full h-[52px] rounded-full flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[13px] relative overflow-hidden backdrop-blur-2xl backdrop-saturate-[190%] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
          isLoading
            ? 'bg-slate-900/85 dark:bg-slate-950/85 text-cyan-200 border border-cyan-500/40 shadow-[0_8px_28px_rgba(59,130,246,0.25),inset_0_1px_1.5px_rgba(255,255,255,0.2)] cursor-wait'
            : isSuccess
            ? 'bg-emerald-500/15 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-500/50 shadow-[0_8px_24px_rgba(16,185,129,0.2),inset_0_1px_1.5px_rgba(255,255,255,0.3)]'
            : 'bg-gradient-to-b from-white/95 via-white/85 to-white/75 hover:from-white hover:to-white/90 dark:from-white/[0.14] dark:via-white/[0.08] dark:to-white/[0.04] dark:hover:from-white/[0.22] dark:hover:to-white/[0.12] text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/90 dark:border-white/[0.18] hover:border-blue-500/40 dark:hover:border-blue-400/40 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.18)] hover:shadow-[0_10px_32px_rgba(59,130,246,0.2)] hover:-translate-y-0.5 active:scale-[0.98]'
        } ${
          (disabled && !isLoading) ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-none' : 'opacity-100'
        }`}
      >
        {/* Soft Liquid Glass Specular Shimmer (Subtle, elegant light reflection) */}
        {!isLoading && !isSuccess && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
          </div>
        )}

        {/* Ambient Top Specular Rim */}
        <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 dark:via-white/30 to-transparent pointer-events-none" />

        {/* Dynamic Wave during Generation */}
        {isLoading && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <div 
              className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent animate-pulse"
              style={{ animationDuration: '1.5s' }}
            />
          </div>
        )}

        {/* Button Content */}
        <div className="relative z-10 flex items-center justify-center gap-2.5">
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin text-cyan-400 shrink-0" />
              <span className="tracking-[0.16em] text-cyan-200 font-black">
                Architecting...
              </span>
            </>
          ) : isSuccess ? (
            <>
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center quantum-check-spring">
                <Check size={14} className="text-emerald-500 dark:text-emerald-300" strokeWidth={3} />
              </div>
              <span className="tracking-[0.15em] font-black">
                Prompts Ready!
              </span>
            </>
          ) : (
            <>
              <Sparkles 
                size={17} 
                className="fill-current text-blue-500 dark:text-blue-400 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 shrink-0" 
              />
              <span className="tracking-[0.18em]">
                {label}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
};
