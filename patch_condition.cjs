const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `{isGenerating && (
          <div className={\`fixed \${isSidebarOpen ? 'left-[340px]' : 'left-0'} right-0 bottom-12 z-[9999] flex justify-center pointer-events-none transition-all duration-300\`}>`;

const replaceStr = `{(isGenerating || apiTrackerState.visible) && (
          <div className={\`fixed \${isSidebarOpen ? 'left-[340px]' : 'left-0'} right-0 bottom-12 z-[9999] flex justify-center pointer-events-none transition-all duration-300\`}>`;

code = code.replace(targetStr, replaceStr);

const targetTitle = `<h3 className="text-xs font-bold text-white tracking-tight">{LOADING_STEPS[loadingStepIdx]}</h3>`;
const replaceTitle = `<h3 className="text-xs font-bold text-white tracking-tight">{isGenerating ? LOADING_STEPS[loadingStepIdx] : 'System Diagnostic'}</h3>`;

code = code.replace(targetTitle, replaceTitle);

fs.writeFileSync('App.tsx', code);
console.log("Patched condition");
