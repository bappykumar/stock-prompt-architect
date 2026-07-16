const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add apiTrackerState
const trackerState = `
  const [apiTrackerState, setApiTrackerState] = useState<{
    visible: boolean;
    totalKeys: number;
    currentKeyId: string | null;
    currentProvider: string | null;
    attempt: number;
    failedKeys: string[];
    statusMessage: string | null;
  }>({
    visible: false,
    totalKeys: 0,
    currentKeyId: null,
    currentProvider: null,
    attempt: 1,
    failedKeys: [],
    statusMessage: null
  });
`;

code = code.replace(
  /  const \[isGenerating, setIsGenerating\] = useState\(false\);\n/,
  `  const [isGenerating, setIsGenerating] = useState(false);\n${trackerState}`
);

// 2. Add ApiTracker Component
const trackerComponent = `
      {/* API Tech Tracker */}
      {apiTrackerState.visible && (
        <div className="fixed top-6 right-6 z-[9999] w-72 bg-[#0b1120]/95 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 shadow-2xl shadow-blue-900/20 font-mono text-xs overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <div className="flex items-center justify-between mb-3 border-b border-blue-900/50 pb-2">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
              <span className="text-blue-400 font-bold uppercase tracking-wider">SYS.NET</span>
            </div>
            <span className="text-slate-500">{apiTrackerState.failedKeys.length}/{apiTrackerState.totalKeys} ERR</span>
          </div>
          
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center text-slate-300">
              <span>TARGET NODE:</span>
              <span className="uppercase text-emerald-400">{apiTrackerState.currentProvider || 'STANDBY'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>CYCLE:</span>
              <span>{apiTrackerState.attempt}/3</span>
            </div>
          </div>
          
          <div className="mt-2 text-[10px] text-blue-300/70 border-t border-blue-900/50 pt-2 break-words">
            > {apiTrackerState.statusMessage || 'INITIALIZING SECURE HANDSHAKE...'}
          </div>
        </div>
      )}
`;

code = code.replace(
  /      \{\/\* Toast Notification Container \*\/\}/,
  `${trackerComponent}\n      {/* Toast Notification Container */}`
);

fs.writeFileSync('App.tsx', code);
console.log("Patched tracker state and UI");
