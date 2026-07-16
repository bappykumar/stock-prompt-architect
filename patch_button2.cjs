const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group">
             {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="fill-current group-hover:scale-110 transition-transform" />}
             <span>Run Architect</span>
          </button>`;

const replaceStr = `          <RunArchitectButton onClick={handleGenerate} isGenerating={isGenerating} label="Run Architect" disabled={isGenerating} />`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('App.tsx', code);
console.log("Patched button 2");
