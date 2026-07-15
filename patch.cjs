const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const target = `                    <button 
                      onClick={handleAutoFill} 
                      disabled={isAnalyzing || (autoFillMode === 'image' && !referenceImage) || (autoFillMode === 'text' && !options.smartRefinementText)} 
                      className={\`w-full mt-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        \${autoFillSuccessMsg 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20' 
                          : ((autoFillMode === 'image' && referenceImage) || (autoFillMode === 'text' && options.smartRefinementText))
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}\`}
                    >
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {autoFillMode === 'image' ? 'Analyze Image & Auto-Fill' : 'Auto-Fill Settings from Text'}
                    </button>`;

const replacement = `                    {(() => {
                      const hasSrContent = autoFillMode === 'image' ? !!referenceImage : !!options.smartRefinementText;
                      const currentSrValue = autoFillMode === 'image' ? (referenceImage?.name || null) : (options.smartRefinementText || null);
                      const isSrUsed = hasSrContent && lastUsedReference.mode === autoFillMode && lastUsedReference.value === currentSrValue;
                      
                      return (
                        <button 
                          onClick={handleAutoFill}
                          disabled={isAnalyzing || !hasSrContent}
                          className={\`w-full mt-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                            \${!hasSrContent
                               ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500' 
                               : isSrUsed 
                                 ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20' 
                                 : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'}\`}
                        >
                          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          {isSrUsed 
                            ? (autoFillMode === 'image' ? 'Image Analyzed & Used' : 'Text Auto-Fill Used') 
                            : (autoFillMode === 'image' ? 'Analyze Image & Auto-Fill' : 'Auto-Fill Settings from Text')}
                        </button>
                      );
                    })()}`;

if (code.includes(target)) {
  fs.writeFileSync('App.tsx', code.replace(target, replacement));
  console.log("Success");
} else {
  console.log("Failed to find target string. Check whitespace.");
}
