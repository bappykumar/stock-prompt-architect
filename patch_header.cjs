const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `<button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 bg-white dark:bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-md hover:bg-slate-200 transition-colors">
            {isSidebarOpen ? <PanelLeftClose size={22} strokeWidth={2.5} /> : <PanelLeftOpen size={22} strokeWidth={2.5} />}
          </button>
          <div className="flex flex-col">
            <h1 className="text-[13px] font-black uppercase tracking-tighter leading-none">PROMPT MASTER</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">SYS V1.5</span>
              <span className="w-px h-2 bg-slate-300 dark:bg-slate-700"></span>
              <div className={\`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border flex items-center gap-1 max-w-[180px] \${
                activeProvider === 'gemini' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                activeProvider === 'groq' ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' :
                activeProvider === 'mistral' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }\`}>
                {activeProvider === 'gemini' ? <Sparkles size={8} className="shrink-0" /> : <Cpu size={8} className="shrink-0" />}
                <span className="truncate" title={activeModelLabel}>{activeModelLabel}</span>
              </div>
            </div>
          </div>`;

const replaceStr = `<div className="w-10 h-10 bg-white dark:bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <Command size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[13px] font-black uppercase tracking-tighter leading-none">PROMPT MASTER</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">SYS V1.5</span>
              <span className="w-px h-2 bg-slate-300 dark:bg-slate-700"></span>
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest max-w-[180px]">
                {activeProvider === 'gemini' ? <Sparkles size={10} className="shrink-0" /> : <Cpu size={10} className="shrink-0" />}
                <span className="truncate" title={activeModelLabel}>{activeModelLabel}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="ml-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Toggle Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('App.tsx', code);
console.log("Patched header section");
