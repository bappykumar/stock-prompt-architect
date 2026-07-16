const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `<aside className={\`\${isSidebarOpen ? 'w-[340px] border-r' : 'w-0 border-r-0'} transition-all duration-300 ease-in-out border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0b1120] flex flex-col shrink-0 relative z-40 h-full overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]\`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 px-6">`;

const replaceStr = `<aside className={\`\${isSidebarOpen ? 'w-[340px] border-r' : 'w-0 border-r-0'} transition-all duration-300 ease-in-out border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0b1120] flex flex-col shrink-0 relative z-40 h-full overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]\`}>
        <div className="w-[339px] flex flex-col h-full shrink-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 px-6">`;

code = code.replace(targetStr, replaceStr);

const endTarget = `          </button>
        </div>
      </aside>`;
const endReplace = `          </button>
        </div>
        </div>
      </aside>`;
      
code = code.replace(endTarget, endReplace);

fs.writeFileSync('App.tsx', code);
console.log("Patched inner sidebar");
