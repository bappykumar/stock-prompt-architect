const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `        <div className="fixed top-6 right-6 z-[9999] w-72 bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 shadow-2xl shadow-blue-900/20 font-mono text-xs overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300">`;
const replaceStr = `        <div className="fixed bottom-6 right-6 z-[9999] w-72 bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 shadow-2xl shadow-blue-900/20 font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none animate-pulse"></div>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('App.tsx', code);
