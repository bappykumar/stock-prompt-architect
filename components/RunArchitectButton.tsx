import React, { useEffect, useState } from 'react';

interface Props {
  onClick: () => void;
  isGenerating: boolean;
  label?: string;
  disabled?: boolean;
}

export const RunArchitectButton: React.FC<Props> = ({ onClick, isGenerating, label = "RUN ARCHITECT", disabled }) => {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success' | 'reset'>('idle');

  useEffect(() => {
    if (isGenerating && phase === 'idle') {
      setPhase('loading');
    } else if (!isGenerating && phase === 'loading') {
      setPhase('success');
      setTimeout(() => {
        setPhase('reset');
        setTimeout(() => {
          setPhase('idle');
        }, 50);
      }, 2000);
    }
  }, [isGenerating, phase]);

  const getLabelStyle = () => {
    if (phase === 'idle') return { transform: 'translateY(0)', opacity: 1, transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' };
    if (phase === 'loading' || phase === 'success') return { transform: 'translateY(30px)', opacity: 0, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' };
    if (phase === 'reset') return { transform: 'translateY(-30px)', opacity: 0, transition: 'none' };
  };

  return (
    <>
      <style>{`
        @keyframes archProgress {
          0% { transform: translateX(0); }
          100% { transform: translateX(-400px); }
        }
        .animate-arch-progress {
          animation: archProgress 3s linear infinite;
        }
      `}</style>
      <div className="relative w-full group">
        <button 
          onClick={(e) => {
            e.preventDefault();
            if (phase === 'idle' && !disabled) {
              onClick();
            }
          }}
          disabled={disabled || phase !== 'idle'}
          className={`relative z-10 w-full h-[52px] rounded-full bg-gradient-to-b from-white/90 via-white/80 to-white/70 hover:from-white hover:to-white/85 dark:from-white/[0.12] dark:via-white/[0.08] dark:to-white/[0.05] dark:hover:from-white/[0.18] dark:hover:to-white/[0.1] text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-black uppercase tracking-widest text-[13px] flex items-center justify-center backdrop-blur-2xl backdrop-saturate-[190%] border border-slate-200/90 dark:border-white/[0.15] shadow-[0_8px_24px_rgba(0,0,0,0.05),inset_0_1px_1.5px_rgba(255,255,255,0.95)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.18)] hover:shadow-[0_12px_32px_rgba(59,130,246,0.18)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] overflow-hidden cursor-pointer ${
            disabled && phase === 'idle' ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
          }`}
        >
          {/* Top Specular Rim Reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 dark:via-white/30 to-transparent pointer-events-none" />

          {/* Liquid Gloss Top Arc */}
          <div className="absolute top-0 left-2 right-2 h-1/2 bg-gradient-to-b from-white/25 dark:from-white/10 to-transparent rounded-t-full pointer-events-none" />

          {/* Loading Original Wavy Line - Adapts to Theme (Slate in Day, Pure White in Night) */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${phase === 'loading' ? 'opacity-100 scale-100 delay-150' : 'opacity-0 scale-90'}`}
          >
             <div className="relative w-[40px] h-[32px] overflow-hidden">
                <svg 
                  className="animate-arch-progress absolute left-0 top-[11px] w-[444px] h-[10px]" 
                  viewBox="0 0 444 10" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                   <path d="M2,5 L42,5 C60.0089086,6.33131695 73.3422419,6.99798362 82,7 C87.572404,7.00129781 91.0932494,1.72677301 102,1.99944178 C112.906751,2.27211054 112.000464,7.99986045 122,8 C131.999536,8.00013955 132,2 142,2 C152,2 152,8 162,8 C172,8 172,2 182,2 C192,2 192,8 202,8 C212,8 212,2 222,2 C232,2 232,8 242,8 C252,8 252,2 262,2 C272,2 272,8 282,8 C292,8 292,2 302,2 C312,2 312,8 322,8 C332,8 332,2 342,2 C352,2 351.897852,7.49489262 362,8 C372.102148,8.50510738 378.620177,5.22532154 402,5 L442,5"></path>
                </svg>
             </div>
          </div>

          {/* Success Tick Mark */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${phase === 'success' ? 'opacity-100 scale-100 delay-100' : 'opacity-0 scale-50'}`}
          >
            <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Label Text */}
          <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none">
              <span style={getLabelStyle()} className="absolute whitespace-nowrap">
                  {label}
              </span>
          </div>
        </button>
      </div>
    </>
  );
};
