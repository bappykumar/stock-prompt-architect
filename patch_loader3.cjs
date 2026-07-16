const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `        {(isGenerating || apiTrackerState.visible) && (
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
                  <h3 className="text-xs font-bold text-white tracking-tight">{isGenerating ? LOADING_STEPS[loadingStepIdx] : 'System Diagnostic'}</h3>
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

const replaceStr = `        {(isGenerating || apiTrackerState.visible) && (
          <div className={\`fixed \${isSidebarOpen ? 'left-[340px]' : 'left-0'} right-0 bottom-12 z-[9999] flex justify-center pointer-events-none transition-all duration-300\`}>
            <div className="bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/40 rounded-xl p-5 shadow-[0_0_40px_rgba(59,130,246,0.15)] font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300 pointer-events-auto min-w-[340px] relative">
              <div className="absolute inset-0 bg-blue-500/5 pointer-events-none animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70 animate-pulse"></div>
              
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-blue-900/50 relative z-10">
                <div className="relative w-10 h-10 shrink-0">
                  <div className="absolute inset-0 border-[2px] border-blue-900/50 rounded-full"></div>
                  <div className="absolute inset-0 border-[2px] border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: '1s' }}></div>
                  <div className="absolute inset-0 border-[2px] border-transparent border-b-blue-500 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center text-blue-400"><Cpu size={16} /></div>
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="text-[13px] font-black text-white tracking-tight uppercase">{isGenerating ? LOADING_STEPS[loadingStepIdx] : 'System Diagnostic'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">SYS.NET • ACTIVE</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4 relative z-10">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span className="opacity-70">TARGET NODE:</span>
                  <span className="uppercase text-emerald-400 font-bold">{apiTrackerState.currentProvider || activeProvider.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span className="opacity-70">AI MODEL:</span>
                  <span className="uppercase text-blue-300 font-bold truncate max-w-[180px] text-right" title={activeModelLabel}>{activeModelLabel}</span>
                </div>
                {apiTrackerState.failedKeys.length > 0 && (
                  <div className="flex justify-between items-center text-slate-300 text-[11px]">
                    <span className="opacity-70">ERRORS:</span>
                    <span className="text-orange-400 font-bold">{apiTrackerState.failedKeys.length}/{apiTrackerState.totalKeys}</span>
                  </div>
                )}
                {apiTrackerState.attempt > 1 && (
                   <div className="flex justify-between items-center text-slate-300 text-[11px]">
                    <span className="opacity-70">CYCLE:</span>
                    <span className="text-blue-300 font-bold">{apiTrackerState.attempt}/3</span>
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-[10px] text-emerald-400/90 border-t border-blue-900/50 pt-3 break-words relative z-10 flex items-start gap-2 font-bold leading-tight">
                <span className="text-blue-500 shrink-0 mt-0.5">&gt;</span> 
                <span className="flex-1">{isGenerating ? (apiTrackerState.statusMessage || 'ESTABLISHING SECURE CONNECTION...') : (apiTrackerState.statusMessage || 'ESTABLISHING SECURE HANDSHAKE...')}</span>
                <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse shrink-0 mt-0.5"></span>
              </div>
            </div>
          </div>
        )}`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('App.tsx', code);
console.log("Patched loader 3");
