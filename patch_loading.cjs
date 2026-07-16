const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Replace isGenerating block
const targetIsGenerating = `{isGenerating && (
          <div className="fixed left-[340px] right-0 bottom-12 z-50 flex justify-center pointer-events-none">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-5 shadow-2xl pointer-events-auto">
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 border-[3px] border-slate-100 dark:border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-[3px] border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-500"><Zap size={16} /></div>
              </div>
              <div className="flex flex-col min-w-[200px]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{LOADING_STEPS[loadingStepIdx]}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Architect is processing...</p>
              </div>
            </div>
          </div>
        )}`;

const replaceIsGenerating = `{isGenerating && (
          <div className={\`fixed \${isSidebarOpen ? 'left-[340px]' : 'left-0'} right-0 bottom-12 z-[9999] flex justify-center pointer-events-none transition-all duration-300\`}>
            <div className="bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/40 rounded-xl p-4 shadow-[0_0_40px_rgba(59,130,246,0.15)] font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300 pointer-events-auto min-w-[320px] relative">
              <div className="absolute inset-0 bg-blue-500/5 pointer-events-none animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70 animate-pulse"></div>
              
              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-blue-900/50 relative z-10">
                <div className="relative w-8 h-8 shrink-0">
                  <div className="absolute inset-0 border-[2px] border-blue-900/50 rounded-full"></div>
                  <div className="absolute inset-0 border-[2px] border-transparent border-t-blue-400 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-blue-400"><Zap size={14} /></div>
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="text-xs font-bold text-white tracking-tight">{LOADING_STEPS[loadingStepIdx]}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                    <p className="text-[9px] text-blue-400 uppercase tracking-widest">SYS.NET • {apiTrackerState.currentProvider || 'PROCESSING'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 relative z-10">
                <div className="flex justify-between items-center text-slate-300 text-[10px]">
                  <span>NODE:</span>
                  <span className="uppercase text-emerald-400">{apiTrackerState.currentProvider || 'STANDBY'}</span>
                </div>
                {apiTrackerState.failedKeys.length > 0 && (
                  <div className="flex justify-between items-center text-slate-300 text-[10px]">
                    <span>ERRORS:</span>
                    <span className="text-orange-400">{apiTrackerState.failedKeys.length}/{apiTrackerState.totalKeys}</span>
                  </div>
                )}
                {apiTrackerState.attempt > 1 && (
                   <div className="flex justify-between items-center text-slate-300 text-[10px]">
                    <span>CYCLE:</span>
                    <span className="text-blue-300">{apiTrackerState.attempt}/3</span>
                  </div>
                )}
              </div>
              
              <div className="mt-2 text-[9px] text-blue-300/70 border-t border-blue-900/50 pt-2 break-words relative z-10">
                &gt; {apiTrackerState.statusMessage || 'ESTABLISHING SECURE HANDSHAKE...'}
                <span className="inline-block w-1 h-2.5 ml-1 align-middle bg-blue-400 animate-pulse"></span>
              </div>
            </div>
          </div>
        )}`;

code = code.replace(targetIsGenerating, replaceIsGenerating);

// Remove apiTrackerState block
// Since the block spans multiple lines and might have been partially modified earlier, let's use regex
const startApiTracker = code.indexOf('{/* API Tech Tracker */}');
if (startApiTracker !== -1) {
  // Find the closing brace of the `apiTrackerState.visible && (` block
  // We can just find the end of the file since it's near the end, or search for the matching tag
  const endApiTrackerStr = `  </div>
        </div>
      )}
    </div>
  );
}`;
  const endTrackerIdx = code.indexOf(endApiTrackerStr, startApiTracker);
  if (endTrackerIdx !== -1) {
    code = code.substring(0, startApiTracker) + `    </div>
  );
}`;
  }
}

fs.writeFileSync('App.tsx', code);
console.log("Patched unified loader");
