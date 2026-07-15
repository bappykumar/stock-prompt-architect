const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Remove the state hooks
code = code.replace(/  const \[autoFillSuccessMsg, setAutoFillSuccessMsg\] = useState<string \| null>\(null\);\n  const \[autoFillOptionsHash, setAutoFillOptionsHash\] = useState<string \| null>\(null\);\n/, '');

// 2. Remove the useEffects for them
const useEffect1 = `  useEffect(() => {
    if (autoFillSuccessMsg && autoFillOptionsHash) {
      if (JSON.stringify(options) !== autoFillOptionsHash) {
        setAutoFillSuccessMsg(null);
        setAutoFillOptionsHash(null);
      }
    }
  }, [options, autoFillSuccessMsg, autoFillOptionsHash]);

`;
code = code.replace(useEffect1, '');

const useEffect2 = `  useEffect(() => {
    let timeoutId: number;
    if (autoFillSuccessMsg) {
      timeoutId = window.setTimeout(() => {
        setAutoFillSuccessMsg(null);
      }, 5000);
    }
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [autoFillSuccessMsg]);

`;
code = code.replace(useEffect2, '');

// 3. Update handleAutoFill
code = code.replace(/    setAutoFillSuccessMsg\(null\);\n/, '');
code = code.replace(/      setAutoFillOptionsHash\(JSON.stringify\(newOptions\)\);\n/g, '');
code = code.replace(/        setAutoFillSuccessMsg\("Settings and scene description auto-filled from your image — review before running."\);/g, '        addToast("Settings and scene description auto-filled from your image — review before running.", "success");');
code = code.replace(/        setAutoFillSuccessMsg\("Settings auto-filled from your reference — review and adjust as needed before running."\);/g, '        addToast("Settings auto-filled from your reference — review and adjust as needed before running.", "success");');

// 4. Update the JSX rendering
// Need to find the exact chunk of JSX
const targetJSX = `                    {autoFillSuccessMsg && (
                      <div className="mt-3 text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5 leading-tight">
                        <Check size={12} className="shrink-0" /> {autoFillSuccessMsg}
                      </div>
                    )}`;
code = code.replace(targetJSX, '');

fs.writeFileSync('App.tsx', code);
console.log("Patched successfully");
