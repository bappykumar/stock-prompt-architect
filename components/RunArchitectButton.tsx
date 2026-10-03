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
        @keyframes smoothWave {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-48px, 0, 0); }
        }
        .animate-smooth-wave {
          animation: smoothWave 1.4s linear infinite;
          will-change: transform;
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
          className={`relative z-10 w-full h-[52px] rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 dark:from-blue-500 dark:via-indigo-500 dark:to-blue-600 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-500 text-white font-black uppercase tracking-widest text-[13px] flex items-center justify-center backdrop-blur-2xl backdrop-saturate-[200%] border border-white/40 dark:border-white/35 shadow-[0_10px_30px_rgba(37,99,235,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(0,0,0,0.2)] hover:shadow-[0_16px_40px_rgba(37,99,235,0.55),inset_0_1.5px_2px_rgba(255,255,255,0.9)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
            disabled && phase === 'idle' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer opacity-100'
          }`}
        >
          {/* Top Specular Rim Reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent pointer-events-none" />

          {/* Liquid Gloss Top Arc */}
          <div className="absolute top-0 left-2 right-2 h-1/2 bg-gradient-to-b from-white/25 via-white/10 to-transparent rounded-t-full pointer-events-none" />

          {/* Loading Continuous Sine Wave - Crisp Solid White, No Glow, Soft Faded Ends */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-400 ${phase === 'loading' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
          >
             <div 
               className="relative w-[96px] h-[28px] overflow-hidden flex items-center"
               style={{
                 WebkitMaskImage: 'linear-gradient(to right, transparent, black 16%, black 84%, transparent)',
                 maskImage: 'linear-gradient(to right, transparent, black 16%, black 84%, transparent)'
               }}
             >
                <svg 
                  className="animate-smooth-wave shrink-0" 
                  width="288" 
                  height="28" 
                  viewBox="0 0 288 28" 
                  fill="none"
                >
                   <path 
                     d="M 0,14 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0 c 6 -5.5, 6 -5.5, 12 0 c 6 5.5, 6 5.5, 12 0"
                     stroke="#ffffff" 
                     strokeWidth="2.4" 
                     strokeLinecap="round" 
                     strokeLinejoin="round"
                   />
                </svg>
             </div>
          </div>

          {/* Success Tick Mark - Crisp Pure White */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${phase === 'success' ? 'opacity-100 scale-100 delay-100' : 'opacity-0 scale-50'}`}
          >
            <svg 
              className="w-7 h-7" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="3.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Label Text */}
          <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none">
              <span style={getLabelStyle()} className="absolute whitespace-nowrap text-white">
                  {label}
              </span>
          </div>
        </button>
      </div>
    </>
  );
};
