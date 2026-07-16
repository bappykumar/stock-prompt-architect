const fs = require('fs');
let code = fs.readFileSync('components/RunArchitectButton.tsx', 'utf8');

const targetStr = `      <button 
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          if (phase === 'idle' && !disabled) {
            onClick();
          }
        }}
        disabled={disabled}
        className={\`arch-btn w-full py-4 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 font-black uppercase tracking-widest text-[13px] flex items-center justify-center shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group phase-\${phase}\`}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: '9999px' }}>
            <rect className="rect-active" x="1" y="1" width="100%" height="100%" rx="28" fill="none" strokeWidth="2" style={{ strokeDashoffset: 2000 - (progress/100)*2000, display: phase === 'idle' ? 'none' : 'block' }}></rect>
        </svg>

        <div className="icon">
          <svg className="line" viewBox="0 0 4 37">
            <line x1="2" y1="2" x2="2" y2="35"></line>
          </svg>
          <div className="icon-inner" ref={iconDivRef} style={{ overflow: phase === 'success' ? 'visible' : 'hidden' }}>
            <svg className="arrow" viewBox="0 0 40 32" ref={arrowRef}></svg>
            <svg className="progress-line" viewBox="0 0 444 10">
              <path d="M2,5 L42,5 C60.0089086,6.33131695 73.3422419,6.99798362 82,7 C87.572404,7.00129781 91.0932494,1.72677301 102,1.99944178 C112.906751,2.27211054 112.000464,7.99986045 122,8 C131.999536,8.00013955 132,2 142,2 C152,2 152,8 162,8 C172,8 172,2 182,2 C192,2 192,8 202,8 C212,8 212,2 222,2 C232,2 232,8 242,8 C252,8 252,2 262,2 C272,2 272,8 282,8 C292,8 292,2 302,2 C312,2 312,8 322,8 C332,8 332,2 342,2 C352,2 351.897852,7.49489262 362,8 C372.102148,8.50510738 378.620177,5.22532154 402,5 L442,5"></path>
            </svg>
          </div>
        </div>

        <span className="relative z-10 flex flex-col items-center justify-center">
            <span className={\`transition-all duration-300 \${phase !== 'idle' ? '-translate-y-4 opacity-0 absolute' : 'translate-y-0 opacity-100'}\`}>
                {label}
            </span>
            <span className={\`transition-all duration-300 font-bold \${phase !== 'idle' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 absolute'}\`}>
                {phase === 'success' ? 'Complete!' : \`\${progress}%\`}
            </span>
        </span>
      </button>`;

const replaceStr = `      <button 
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          if (phase === 'idle' && !disabled) {
            onClick();
          }
        }}
        disabled={disabled}
        className={\`arch-btn w-full h-[52px] rounded-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group phase-\${phase}\`}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: '9999px' }}>
            <rect className="rect-active" x="1" y="1" width="100%" height="100%" rx="28" fill="none" strokeWidth="2" style={{ strokeDashoffset: 2000 - (progress/100)*2000, display: phase === 'idle' ? 'none' : 'block' }}></rect>
        </svg>

        <div className="relative w-[18px] h-[18px] flex items-center justify-center shrink-0">
          <div className="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.6]">
            <svg className="line" viewBox="0 0 4 37">
              <line x1="2" y1="2" x2="2" y2="35"></line>
            </svg>
            <div className="icon-inner" ref={iconDivRef} style={{ overflow: phase === 'success' ? 'visible' : 'hidden' }}>
              <svg className="arrow" viewBox="0 0 40 32" ref={arrowRef}></svg>
              <svg className="progress-line" viewBox="0 0 444 10">
                <path d="M2,5 L42,5 C60.0089086,6.33131695 73.3422419,6.99798362 82,7 C87.572404,7.00129781 91.0932494,1.72677301 102,1.99944178 C112.906751,2.27211054 112.000464,7.99986045 122,8 C131.999536,8.00013955 132,2 142,2 C152,2 152,8 162,8 C172,8 172,2 182,2 C192,2 192,8 202,8 C212,8 212,2 222,2 C232,2 232,8 242,8 C252,8 252,2 262,2 C272,2 272,8 282,8 C292,8 292,2 302,2 C312,2 312,8 322,8 C332,8 332,2 342,2 C352,2 351.897852,7.49489262 362,8 C372.102148,8.50510738 378.620177,5.22532154 402,5 L442,5"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full min-w-[130px]">
            <span className={\`transition-all duration-300 absolute \${phase !== 'idle' ? '-translate-y-8 opacity-0' : 'translate-y-0 opacity-100'}\`}>
                {label}
            </span>
            <span className={\`transition-all duration-300 absolute font-bold \${phase !== 'idle' ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}\`}>
                {phase === 'success' ? 'Complete!' : \`\${progress}%\`}
            </span>
        </div>
      </button>`;

code = code.replace(targetStr, replaceStr);

// Also remove margin-right from .icon since we use gap-3 now
code = code.replace('margin-right: 8px;', '');

fs.writeFileSync('components/RunArchitectButton.tsx', code);
console.log("Patched button layout");
