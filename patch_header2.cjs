const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `<div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest max-w-[180px]">
                {activeProvider === 'gemini' ? <Sparkles size={10} className="shrink-0" /> : <Cpu size={10} className="shrink-0" />}
                <span className="truncate" title={activeModelLabel}>{activeModelLabel}</span>
              </div>`;

const replaceStr = `<span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest max-w-[180px] truncate" title={activeModelLabel}>
                {activeModelLabel}
              </span>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('App.tsx', code);
