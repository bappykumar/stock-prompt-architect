const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `<div className="fixed bottom-6 right-6 z-[9999] w-72 bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 shadow-2xl shadow-blue-900/20 font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none animate-pulse"></div>`;

const replaceStr = `<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-80 bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/40 rounded-xl p-4 shadow-[0_0_40px_rgba(59,130,246,0.15)] font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70 animate-pulse"></div>`;

code = code.replace(targetStr, replaceStr);

const targetText = `&gt; {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}`;
const replaceText = `&gt; {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}
            <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-blue-400 animate-pulse"></span>`;

code = code.replace(targetText, replaceText);

fs.writeFileSync('App.tsx', code);
