const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Icon for toggle
code = code.replace(
  /import \{ (.*) \} from 'lucide-react';/,
  "import { PanelLeftClose, PanelLeftOpen, $1 } from 'lucide-react';"
);

// Toggle button in header
const headerLogo = `<div className="w-10 h-10 bg-white dark:bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <Command size={22} strokeWidth={2.5} />
          </div>`;

const headerLogoReplacement = `<button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 bg-white dark:bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-md hover:bg-slate-200 transition-colors">
            {isSidebarOpen ? <PanelLeftClose size={22} strokeWidth={2.5} /> : <PanelLeftOpen size={22} strokeWidth={2.5} />}
          </button>`;

code = code.replace(headerLogo, headerLogoReplacement);

// Aside width
const asideClass = `      <aside className="w-[340px] border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0b1120] flex flex-col shrink-0 relative z-40 h-full overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">`;

const newAsideClass = `      <aside className={\`\${isSidebarOpen ? 'w-[340px] border-r' : 'w-0 border-r-0'} transition-all duration-300 ease-in-out border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0b1120] flex flex-col shrink-0 relative z-40 h-full overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]\`}>`;

code = code.replace(asideClass, newAsideClass);

// Check if we need to adjust the main scroll container width? No, flex-1 should expand it.

fs.writeFileSync('App.tsx', code);
console.log("Patched sidebar toggle");
