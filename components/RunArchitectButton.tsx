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

  const isDark = document.documentElement.classList.contains('dark');
  const activeColor = isDark ? '#0f172a' : '#ffffff';

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
        @keyframes aiGlow {
          0%, 100% { transform: scale(0.95); filter: blur(10px); }
          50% { transform: scale(1.02); filter: blur(15px); }
        }
        .animate-ai-glow {
          animation: aiGlow 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="relative w-full group">
        {/* AI SaaS Glow - Behind the button */}
        <div 
          className={`absolute -inset-1 rounded-full transition-all duration-700 pointer-events-none z-0 ${phase === 'loading' ? 'opacity-100' : 'opacity-0'}`}
        >
           <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-pink-500 animate-ai-glow opacity-70"></div>
        </div>

        <button 
          onClick={(e) => {
            e.preventDefault();
            if (phase === 'idle' && !disabled) {
              onClick();
            }
          }}
          disabled={disabled || phase !== 'idle'}
          className="relative z-10 w-full h-[52px] rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[13px] flex items-center justify-center shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 overflow-hidden"
        >
          {/* Subtle internal gradient to make it look premium */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800/0 via-slate-800/50 to-slate-800/0 dark:from-slate-100/0 dark:via-slate-100/50 dark:to-slate-100/0 pointer-events-none"></div>

          {/* Loading Wavy Line */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${phase === 'loading' ? 'opacity-100 scale-100 delay-150' : 'opacity-0 scale-90'}`}
          >
             <div className="relative w-[40px] h-[32px] overflow-hidden">
                <svg className="animate-arch-progress absolute left-0 top-[11px] w-[444px] h-[10px]" viewBox="0 0 444 10" stroke={activeColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M2,5 L42,5 C60.0089086,6.33131695 73.3422419,6.99798362 82,7 C87.572404,7.00129781 91.0932494,1.72677301 102,1.99944178 C112.906751,2.27211054 112.000464,7.99986045 122,8 C131.999536,8.00013955 132,2 142,2 C152,2 152,8 162,8 C172,8 172,2 182,2 C192,2 192,8 202,8 C212,8 212,2 222,2 C232,2 232,8 242,8 C252,8 252,2 262,2 C272,2 272,8 282,8 C292,8 292,2 302,2 C312,2 312,8 322,8 C332,8 332,2 342,2 C352,2 351.897852,7.49489262 362,8 C372.102148,8.50510738 378.620177,5.22532154 402,5 L442,5"></path>
                </svg>
             </div>
          </div>

          {/* Success Tick Mark */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${phase === 'success' ? 'opacity-100 scale-100 delay-100' : 'opacity-0 scale-50'}`}
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={activeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
