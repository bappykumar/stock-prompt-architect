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
      {/* Subtle Ambient Aura */}
      <div 
        className={`absolute -inset-0.5 rounded-2xl transition-all duration-500 pointer-events-none blur-md ${
          isLoading
            ? 'bg-blue-500/25 opacity-100 animate-pulse'
            : isSuccess
            ? 'bg-emerald-500/20 opacity-80'
            : 'bg-blue-500/15 opacity-0 group-hover:opacity-100'
        }`}
        style={isLoading ? { animationDuration: '2s' } : undefined}
      />

      {/* Minimal Glass Button */}
      <button 
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? 'Architecting Prompts...' : label}
        className={`w-full h-[44px] rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-[0.14em] text-[12px] relative overflow-hidden backdrop-blur-xl transition-all duration-200 cursor-pointer ${
          isLoading
            ? 'bg-slate-900/90 dark:bg-slate-950/90 text-cyan-200 border border-cyan-500/35 cursor-wait'
            : isSuccess
            ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
            : 'bg-white/90 hover:bg-white dark:bg-white/[0.1] dark:hover:bg-white/[0.16] text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/90 dark:border-white/[0.14] hover:border-blue-500/35 shadow-xs active:scale-[0.98]'
        } ${
          (disabled && !isLoading) ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
        }`}
      >
        {/* Subtle Specular Shimmer */}
        {!isLoading && !isSuccess && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 dark:via-white/[0.07] to-transparent -translate-x-full group-hover:translate-x-[250%] transition-transform duration-700 ease-out" />
          </div>
        )}

        {/* Button Content */}
        <div className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin text-cyan-400 shrink-0" />
              <span className="tracking-[0.14em] text-cyan-200 font-bold">
                Architecting...
              </span>
            </>
          ) : isSuccess ? (
            <>
              <Check size={15} className="text-emerald-500 dark:text-emerald-300 shrink-0" strokeWidth={2.5} />
              <span className="tracking-[0.12em] font-bold">
                Prompts Ready
              </span>
            </>
          ) : (
            <>
              <Sparkles 
                size={15} 
                className="fill-current text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200 shrink-0" 
              />
              <span>
                {label}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
};
