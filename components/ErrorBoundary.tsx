import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Download, Terminal, ChevronRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (confirm("Are you sure you want to completely reset the workspace? This will clear all API keys, settings, and generated batches.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  private handleBackup = () => {
    try {
      const history = localStorage.getItem('prompt_session_history') || '[]';
      const blob = new Blob([history], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-master-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export backup: " + e);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
          {/* Ambient background glow */}
          <div className="absolute inset-0 bg-radial-gradient from-blue-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="w-full max-w-lg bg-[#0e172a] border border-slate-800/80 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Warning Icon */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center animate-pulse">
                <AlertTriangle size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase">SYSTEM EXCEPTION</span>
                <h1 className="text-xl font-black text-white uppercase tracking-tight mt-0.5">Interface Suspended</h1>
              </div>
            </div>

            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              A critical error was intercepted by the system runtime. This usually occurs due to an unstable API connection or corrupted session states.
            </p>

            {/* Error Details */}
            {this.state.error && (
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-red-400/90 leading-normal max-h-[120px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 text-slate-500 mb-1.5 border-b border-slate-900 pb-1.5">
                  <Terminal size={12} />
                  <span>CRASH_LOG_DUMP:</span>
                </div>
                <div className="break-all whitespace-pre-wrap font-semibold">
                  {this.state.error.stack || this.state.error.message}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleReload}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 transition-all active:scale-[0.98]"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Reload Application</span>
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={this.handleBackup}
                  className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Download size={12} />
                  <span>Backup History</span>
                </button>
                <button 
                  onClick={this.handleReset}
                  className="py-3 px-4 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Trash2 size={12} />
                  <span>Reset Workspace</span>
                </button>
              </div>
            </div>

            {/* Support link */}
            <div className="pt-4 border-t border-slate-900/40 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>PROMPT MASTER V1.5</span>
              <a href="https://t.me/designbd2" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 flex items-center gap-1">
                <span>Developer Support</span>
                <ChevronRight size={10} />
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
