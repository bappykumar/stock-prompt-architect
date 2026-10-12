import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Download, Upload, Trash2, Check, Copy, AlertTriangle, 
  FileText, ShieldAlert, Sparkles, Zap, Command, Globe, 
  CheckCircle2, XCircle, ArrowRight, RefreshCw, Key, Filter,
  FileDown, FileUp, Database, AlertCircle, Eye, EyeOff, X,
  ClipboardPaste, RotateCcw
} from 'lucide-react';
import { ApiKeyRecord } from '../types';

export interface ApiKeyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeyRecord[];
  activeProvider: 'gemini' | 'groq' | 'mistral' | 'openrouter';
  onImportKeys: (newKeys: ApiKeyRecord[], autoTest: boolean) => Promise<void> | void;
  onCleanKeys: (scope: 'all' | 'gemini' | 'groq' | 'mistral' | 'openrouter') => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error' | 'retry', duration?: number) => string;
  initialTab?: 'import' | 'export' | 'clean';
}

interface ParsedCandidate {
  id: string;
  rawKey: string;
  refinedKey: string;
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter';
  status: 'valid_new' | 'duplicate_existing' | 'duplicate_batch' | 'invalid_format';
  duplicateWithId?: string;
  reason?: string;
  selected: boolean;
}

const PROVIDER_NAMES: Record<string, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq Cloud',
  mistral: 'Mistral AI',
  openrouter: 'OpenRouter'
};

const PROVIDER_ICONS: Record<string, any> = {
  gemini: Sparkles,
  groq: Zap,
  mistral: Command,
  openrouter: Globe
};

const PROVIDER_ENV_NAMES: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openrouter: 'OPENROUTER_API_KEY'
};

export const ApiKeyVaultModal: React.FC<ApiKeyVaultModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  activeProvider,
  onImportKeys,
  onCleanKeys,
  addToast,
  initialTab = 'import'
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'clean'>(initialTab);
  
  // --- Export State ---
  const [exportScope, setExportScope] = useState<'all' | 'gemini' | 'groq' | 'mistral' | 'openrouter'>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'env'>('json');
  const [exportCopied, setExportCopied] = useState(false);
  const [showExportMasked, setShowExportMasked] = useState(true);

  // --- Import State ---
  const [importInputText, setImportInputText] = useState('');
  const [importFallbackProvider, setImportFallbackProvider] = useState<'gemini' | 'groq' | 'mistral' | 'openrouter'>(activeProvider);
  const [autoTestImported, setAutoTestImported] = useState(true);
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isExecutingImport, setIsExecutingImport] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Clean State ---
  const [cleanScope, setCleanScope] = useState<'all' | 'current'>('all');

  // Sync tab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Keyboard navigation (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Keys to be exported
  const keysToExport = useMemo(() => {
    if (exportScope === 'all') {
      return apiKeys;
    }
    return apiKeys.filter(k => k.provider === exportScope);
  }, [apiKeys, exportScope]);

  // Generated JSON export string
  const exportJsonString = useMemo(() => {
    const payload = {
      app: 'PromptArchitect',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      scope: exportScope,
      totalKeys: keysToExport.length,
      keys: keysToExport.map(k => ({
        provider: k.provider,
        key: k.key,
        status: k.status,
        addedAt: k.addedAt
      }))
    };
    return JSON.stringify(payload, null, 2);
  }, [keysToExport, exportScope]);

  // Generated ENV / Plain text export string
  const exportEnvString = useMemo(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    const header = `# PromptArchitect API Keys Export\n# Exported on: ${dateStr}\n# Scope: ${exportScope} (${keysToExport.length} keys)\n\n`;
    const lines = keysToExport.map(k => `${PROVIDER_ENV_NAMES[k.provider] || 'API_KEY'}=${k.key}`);
    return header + lines.join('\n');
  }, [keysToExport, exportScope]);

  // Helper to infer provider from key pattern or env prefix
  const inferProviderFromRaw = (raw: string, defaultProvider: 'gemini' | 'groq' | 'mistral' | 'openrouter'): 'gemini' | 'groq' | 'mistral' | 'openrouter' => {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();

    if (upper.includes('GEMINI') || upper.includes('GOOGLE')) return 'gemini';
    if (upper.includes('GROQ')) return 'groq';
    if (upper.includes('MISTRAL')) return 'mistral';
    if (upper.includes('OPENROUTER') || upper.includes('OR_KEY')) return 'openrouter';

    // Key prefix heuristics
    if (trimmed.startsWith('AIzaSy')) return 'gemini';
    if (trimmed.startsWith('gsk_')) return 'groq';
    if (trimmed.startsWith('sk-or-')) return 'openrouter';

    return defaultProvider;
  };

  // Helper to refine raw string into clean API key
  const sanitizeKey = (raw: string): string => {
    let clean = raw.trim();
    // Strip comments (# ...)
    if (clean.includes('#')) {
      clean = clean.split('#')[0].trim();
    }
    // Strip bash "export " prefix
    if (clean.toLowerCase().startsWith('export ')) {
      clean = clean.substring(7).trim();
    }
    // Strip env assignment prefix like GEMINI_API_KEY= or "API_KEY:"
    const eqIdx = clean.indexOf('=');
    if (eqIdx !== -1) {
      clean = clean.substring(eqIdx + 1).trim();
    }
    const colonIdx = clean.indexOf(':');
    if (colonIdx !== -1 && !clean.startsWith('http')) {
      const left = clean.substring(0, colonIdx).trim().toLowerCase();
      if (['key', 'apikey', 'api_key', 'token', 'secret', 'gemini', 'groq', 'mistral', 'openrouter'].includes(left)) {
        clean = clean.substring(colonIdx + 1).trim();
      }
    }

    // Strip "Bearer "
    if (clean.toLowerCase().startsWith('bearer ')) {
      clean = clean.substring(7).trim();
    }

    // Strip quotes or commas/semicolons
    clean = clean.replace(/^['"`\s]+|['"`\s,;]+$/g, '');
    return clean;
  };

  // Smart line extractor for mixed TXT, CSV, ENV, and raw formats
  const extractLineProviderAndKey = (
    line: string, 
    fallbackProvider: 'gemini' | 'groq' | 'mistral' | 'openrouter'
  ): { provider: 'gemini' | 'groq' | 'mistral' | 'openrouter'; key: string } => {
    let cleanLine = line.trim();
    if (cleanLine.includes('#')) cleanLine = cleanLine.split('#')[0].trim();
    if (cleanLine.toLowerCase().startsWith('export ')) cleanLine = cleanLine.substring(7).trim();

    let detectedProvider = inferProviderFromRaw(cleanLine, fallbackProvider);
    let rawKey = cleanLine;

    // Handle CSV comma separation (e.g. gemini,AIzaSy... or AIzaSy...,gemini)
    if (cleanLine.includes(',')) {
      const parts = cleanLine.split(',').map(p => p.trim());
      for (const part of parts) {
        const lower = part.toLowerCase();
        if (['gemini', 'groq', 'mistral', 'openrouter'].includes(lower)) {
          detectedProvider = lower as any;
        } else if (part.length > 8 && !part.includes(' ')) {
          rawKey = part;
        }
      }
    } else if (cleanLine.includes('=')) {
      const eqIdx = cleanLine.indexOf('=');
      const left = cleanLine.substring(0, eqIdx).trim().toLowerCase();
      const right = cleanLine.substring(eqIdx + 1).trim();
      if (left.includes('gemini') || left.includes('google')) detectedProvider = 'gemini';
      else if (left.includes('groq')) detectedProvider = 'groq';
      else if (left.includes('mistral')) detectedProvider = 'mistral';
      else if (left.includes('openrouter')) detectedProvider = 'openrouter';
      rawKey = right;
    } else if (cleanLine.includes(':') && !cleanLine.startsWith('http')) {
      const colonIdx = cleanLine.indexOf(':');
      const left = cleanLine.substring(0, colonIdx).trim().toLowerCase();
      const right = cleanLine.substring(colonIdx + 1).trim();
      if (['gemini', 'groq', 'mistral', 'openrouter'].includes(left)) {
        detectedProvider = left as any;
        rawKey = right;
      } else if (['key', 'apikey', 'api_key', 'token', 'secret'].includes(left)) {
        rawKey = right;
      }
    }

    const refined = sanitizeKey(rawKey);
    // Explicit prefix re-check
    if (refined.startsWith('AIzaSy')) detectedProvider = 'gemini';
    else if (refined.startsWith('gsk_')) detectedProvider = 'groq';
    else if (refined.startsWith('sk-or-')) detectedProvider = 'openrouter';

    return { provider: detectedProvider, key: refined };
  };

  // Parse text into candidates
  const parseAndAnalyzeText = (text: string) => {
    if (!text.trim()) {
      setCandidates([]);
      return;
    }

    const seenInBatch = new Set<string>();
    const existingKeysSet = new Set(apiKeys.map(k => k.key.trim()));
    const result: ParsedCandidate[] = [];

    // Attempt 1: Parse as JSON export
    let handledAsJson = false;
    try {
      const parsed = JSON.parse(text);
      let list: any[] = [];
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && Array.isArray(parsed.keys)) {
        list = parsed.keys;
      } else if (parsed && typeof parsed === 'object') {
        list = Object.entries(parsed).map(([k, v]) => {
          if (typeof v === 'string') return { provider: inferProviderFromRaw(k, importFallbackProvider), key: v };
          if (typeof v === 'object' && v !== null && (v as any).key) return v;
          return null;
        }).filter(Boolean);
      }

      if (list.length > 0) {
        handledAsJson = true;
        for (const item of list) {
          let rawKey = '';
          let provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = importFallbackProvider;

          if (typeof item === 'string') {
            rawKey = item;
            provider = inferProviderFromRaw(item, importFallbackProvider);
          } else if (typeof item === 'object' && item !== null) {
            rawKey = String(item.key || item.apiKey || item.token || '');
            const rawProv = String(item.provider || item.type || '');
            if (['gemini', 'groq', 'mistral', 'openrouter'].includes(rawProv)) {
              provider = rawProv as any;
            } else {
              provider = inferProviderFromRaw(rawKey, importFallbackProvider);
            }
          }

          const refined = sanitizeKey(rawKey);
          if (!refined) continue;

          let status: ParsedCandidate['status'] = 'valid_new';
          let reason: string | undefined = undefined;

          if (refined.length < 8) {
            status = 'invalid_format';
            reason = 'Key too short (< 8 characters)';
          } else if (existingKeysSet.has(refined)) {
            status = 'duplicate_existing';
            reason = 'Already saved in your local vault';
          } else if (seenInBatch.has(refined)) {
            status = 'duplicate_batch';
            reason = 'Repeated inside this import payload';
          } else {
            seenInBatch.add(refined);
          }

          result.push({
            id: crypto.randomUUID(),
            rawKey,
            refinedKey: refined,
            provider,
            status,
            reason,
            selected: status === 'valid_new'
          });
        }
      }
    } catch (e) {
      handledAsJson = false;
    }

    if (!handledAsJson) {
      // Split by line breaks
      const lines = text.split(/[\r\n]+/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const { provider, key: refined } = extractLineProviderAndKey(trimmedLine, importFallbackProvider);
        if (!refined) continue;

        let status: ParsedCandidate['status'] = 'valid_new';
        let reason: string | undefined = undefined;

        if (refined.length < 8) {
          status = 'invalid_format';
          reason = 'Key too short (< 8 characters)';
        } else if (existingKeysSet.has(refined)) {
          status = 'duplicate_existing';
          reason = 'Already exists in your saved keys';
        } else if (seenInBatch.has(refined)) {
          status = 'duplicate_batch';
          reason = 'Repeated inside this batch';
        } else {
          seenInBatch.add(refined);
        }

        result.push({
          id: crypto.randomUUID(),
          rawKey: line,
          refinedKey: refined,
          provider,
          status,
          reason,
          selected: status === 'valid_new'
        });
      }
    }

    setCandidates(result);
  };

  // Re-run parse when text changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setImportInputText(val);
    parseAndAnalyzeText(val);
  };

  // Clipboard paste helper
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        addToast('Clipboard is empty or contains no readable text.', 'warning', 3000);
        return;
      }
      setImportInputText(text);
      parseAndAnalyzeText(text);
      addToast('Pasted & analyzed keys from clipboard!', 'success', 3000);
    } catch (e) {
      addToast('Clipboard access was blocked. Please paste into the box.', 'info', 3000);
    }
  };

  // File import helper
  const processFileContent = (content: string, fileName: string) => {
    setImportInputText(content);
    parseAndAnalyzeText(content);
    setIsProcessingFile(false);
    addToast(`Loaded "${fileName}" with candidate keys.`, 'info', 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content, file.name);
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      addToast('Failed to read selected file.', 'error', 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop file handling
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content, file.name);
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      addToast('Failed to read dropped file.', 'error', 4000);
    };
    reader.readAsText(file);
  };

  // Candidate action helpers
  const toggleCandidateSelection = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const updateCandidateProvider = (id: string, newProvider: 'gemini' | 'groq' | 'mistral' | 'openrouter') => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, provider: newProvider } : c));
  };

  // Candidate metrics
  const newValidCandidates = useMemo(() => candidates.filter(c => c.status === 'valid_new'), [candidates]);
  const duplicateCandidates = useMemo(() => candidates.filter(c => c.status.startsWith('duplicate')), [candidates]);
  const invalidCandidates = useMemo(() => candidates.filter(c => c.status === 'invalid_format'), [candidates]);
  const selectedCandidates = useMemo(() => candidates.filter(c => c.selected && c.status === 'valid_new'), [candidates]);

  // Execute Import
  const handleExecuteImport = async () => {
    if (selectedCandidates.length === 0) {
      addToast('No new valid keys selected for import.', 'warning', 3000);
      return;
    }

    setIsExecutingImport(true);
    try {
      const recordsToImport: ApiKeyRecord[] = selectedCandidates.map(c => ({
        id: crypto.randomUUID(),
        provider: c.provider,
        key: c.refinedKey,
        status: 'untested',
        addedAt: Date.now()
      }));

      await onImportKeys(recordsToImport, autoTestImported);
      addToast(
        `Imported ${recordsToImport.length} new API key${recordsToImport.length > 1 ? 's' : ''}! (${duplicateCandidates.length} duplicate${duplicateCandidates.length === 1 ? '' : 's'} skipped)`,
        'success',
        5000
      );
      setImportInputText('');
      setCandidates([]);
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Failed to complete API key import.', 'error', 4000);
    } finally {
      setIsExecutingImport(false);
    }
  };

  // Export handlers
  const activeExportContent = exportFormat === 'json' ? exportJsonString : exportEnvString;

  const handleDownloadExport = () => {
    if (keysToExport.length === 0) {
      addToast('No keys available to export for this scope.', 'warning', 3000);
      return;
    }
    const mime = exportFormat === 'json' ? 'application/json' : 'text/plain';
    const ext = exportFormat === 'json' ? 'json' : 'env';
    const blob = new Blob([activeExportContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `prompt-architect-api-keys-${exportScope}-${dateStr}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Exported ${keysToExport.length} keys as .${ext} file.`, 'success', 4000);
  };

  const handleCopyExport = () => {
    if (keysToExport.length === 0) {
      addToast('No keys to copy.', 'warning', 3000);
      return;
    }
    navigator.clipboard.writeText(activeExportContent).then(() => {
      setExportCopied(true);
      addToast(`Copied ${keysToExport.length} keys to clipboard as ${exportFormat.toUpperCase()}.`, 'success', 3000);
      setTimeout(() => setExportCopied(false), 2500);
    }).catch(() => {
      addToast('Could not copy to clipboard.', 'error', 3000);
    });
  };

  // Clean handlers
  const currentProviderCount = useMemo(() => apiKeys.filter(k => k.provider === activeProvider).length, [apiKeys, activeProvider]);
  const totalKeysCount = apiKeys.length;

  const handleExecuteClean = () => {
    const count = cleanScope === 'all' ? totalKeysCount : currentProviderCount;
    if (count === 0) {
      addToast('No stored API keys found to delete for this selection.', 'info', 3000);
      onClose();
      return;
    }
    if (cleanScope === 'all') {
      onCleanKeys('all');
      addToast(`Permanently deleted all ${totalKeysCount} API keys from vault.`, 'success', 4000);
    } else {
      onCleanKeys(activeProvider);
      addToast(`Deleted ${currentProviderCount} keys for ${PROVIDER_NAMES[activeProvider]}.`, 'success', 4000);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleFileDrop}
      className="fixed inset-0 z-[3500] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-vault-title"
      >
        {/* Apple Specular Top Rim Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 dark:via-blue-400/30 to-transparent pointer-events-none z-30" />

        {/* Drag Overlay Feedback */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
            <Upload size={48} className="animate-bounce mb-3" />
            <h3 className="text-lg font-bold">Drop File to Import Keys</h3>
            <p className="text-xs text-blue-100 mt-1">Accepts JSON, TXT, ENV, CSV files</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 sm:py-4.5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Database size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="api-vault-title" className="text-base sm:text-lg font-black tracking-wide uppercase truncate">
                  API Key Vault Manager
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider shrink-0">
                  Sync & Backup
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Seamlessly transfer keys between PC & laptop, detect duplicates, and manage storage
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/20 dark:bg-slate-950/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-1 ring-blue-500'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <FileUp size={15} />
            <span>Import & Sync</span>
            {selectedCandidates.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-md font-mono">
                {selectedCandidates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-1 ring-blue-500'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <FileDown size={15} />
            <span>Export & Backup</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 font-mono">
              {apiKeys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('clean')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto shrink-0 cursor-pointer ${
              activeTab === 'clean'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25 ring-1 ring-red-500'
                : 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
            }`}
          >
            <Trash2 size={15} />
            <span>Clean & Reset</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">

          {/* ========================================================
              TAB 1: IMPORT & SMART SYNC
              ======================================================== */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Instructions banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-cyan-500/10 border border-blue-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Import from Laptop, PC or File</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Drag & drop backup files, upload JSON/TXT/ENV, or paste keys directly. Duplicates are auto-filtered!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-xs cursor-pointer active:scale-95"
                    title="Paste keys directly from clipboard"
                  >
                    <ClipboardPaste size={14} className="text-blue-500" />
                    <span>Paste Clipboard</span>
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".json,.txt,.env,.csv"
                    onChange={handleFileUpload}
                    className="hidden" 
                    id="vault-file-input"
                  />
                  <label
                    htmlFor="vault-file-input"
                    className="cursor-pointer flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/25 active:scale-95"
                  >
                    <Upload size={14} />
                    <span>Browse File</span>
                  </label>
                </div>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText size={14} className="text-blue-500" />
                    <span>Paste Raw Keys, JSON, .ENV, or CSV:</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Default Provider:</span>
                    <select
                      value={importFallbackProvider}
                      onChange={e => {
                        const prov = e.target.value as any;
                        setImportFallbackProvider(prov);
                        if (importInputText) parseAndAnalyzeText(importInputText);
                      }}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq</option>
                      <option value="mistral">Mistral</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={importInputText}
                    onChange={handleTextChange}
                    placeholder={`Paste exported JSON, .env, or keys here...\nExamples:\n• {"keys": [{"provider": "gemini", "key": "AIzaSy..."}]}\n• GEMINI_API_KEY=AIzaSy...\n• gsk_yourGroqKeyHere (one per line)\n• gemini,AIzaSy...`}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 pr-20 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 custom-scrollbar resize-y"
                  />
                  {importInputText && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportInputText('');
                        setCandidates([]);
                      }}
                      className="absolute top-3 right-3 text-[11px] font-bold text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 cursor-pointer"
                      title="Clear textarea"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Duplicate & Refinement Analytics Header */}
              {candidates.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Total parsed */}
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detected Keys</div>
                      <div className="text-lg font-black mt-0.5 text-slate-800 dark:text-slate-200">{candidates.length}</div>
                    </div>

                    {/* New & Unique */}
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>New & Unique</span>
                      </div>
                      <div className="text-lg font-black mt-0.5 text-emerald-700 dark:text-emerald-300">
                        {newValidCandidates.length}
                      </div>
                    </div>

                    {/* Duplicates */}
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={12} />
                        <span>Duplicates</span>
                      </div>
                      <div className="text-lg font-black mt-0.5 text-amber-700 dark:text-amber-300">
                        {duplicateCandidates.length}
                      </div>
                    </div>

                    {/* Invalid / Malformed */}
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <XCircle size={12} />
                        <span>Invalid</span>
                      </div>
                      <div className="text-lg font-black mt-0.5 text-slate-500">
                        {invalidCandidates.length}
                      </div>
                    </div>
                  </div>

                  {/* Refinement Inspection List */}
                  <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="px-4 py-2.5 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>Refined Keys Preview ({candidates.length})</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCandidates(prev => prev.map(c => c.status === 'valid_new' ? { ...c, selected: true } : c))}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                        >
                          Select All New
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => setCandidates(prev => prev.map(c => ({ ...c, selected: false })))}
                          className="text-[11px] text-slate-500 hover:underline cursor-pointer font-bold"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-white/[0.05] max-h-56 overflow-y-auto custom-scrollbar">
                      {candidates.map((cand) => {
                        const ProviderIcon = PROVIDER_ICONS[cand.provider] || Key;
                        const isDup = cand.status.startsWith('duplicate');
                        const isInvalid = cand.status === 'invalid_format';

                        return (
                          <div 
                            key={cand.id}
                            className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                              isDup ? 'bg-amber-500/[0.03] opacity-75' : isInvalid ? 'bg-red-500/[0.03] opacity-60' : 'hover:bg-blue-500/[0.03]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input 
                                type="checkbox"
                                checked={cand.selected}
                                disabled={isDup || isInvalid}
                                onChange={() => toggleCandidateSelection(cand.id)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30 cursor-pointer"
                              />

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {cand.refinedKey.substring(0, 10)}...{cand.refinedKey.substring(cand.refinedKey.length - 4)}
                                  </span>

                                  {/* Status badge */}
                                  {cand.status === 'valid_new' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      New Unique
                                    </span>
                                  )}
                                  {cand.status === 'duplicate_existing' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                                      <AlertTriangle size={10} /> Duplicate (In Vault)
                                    </span>
                                  )}
                                  {cand.status === 'duplicate_batch' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                                      <AlertTriangle size={10} /> Duplicate in File
                                    </span>
                                  )}
                                  {cand.status === 'invalid_format' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                      Malformed
                                    </span>
                                  )}
                                </div>

                                {cand.reason && (
                                  <div className="text-[11px] text-slate-400 mt-0.5">{cand.reason}</div>
                                )}
                              </div>
                            </div>

                            {/* Provider picker for each item & remove button */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <div className="flex items-center gap-1 text-xs">
                                <ProviderIcon size={13} className="text-slate-400" />
                                <select
                                  value={cand.provider}
                                  disabled={isDup || isInvalid}
                                  onChange={e => updateCandidateProvider(cand.id, e.target.value as any)}
                                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-semibold outline-none disabled:opacity-50 cursor-pointer"
                                >
                                  <option value="gemini">Gemini</option>
                                  <option value="groq">Groq</option>
                                  <option value="mistral">Mistral</option>
                                  <option value="openrouter">OpenRouter</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCandidate(cand.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Discard this key from import"
                                aria-label="Discard key"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions & Auto-test option */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                      <input 
                        type="checkbox"
                        checked={autoTestImported}
                        onChange={e => setAutoTestImported(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Automatically test new keys for validity upon import</span>
                    </label>

                    <button
                      onClick={handleExecuteImport}
                      disabled={selectedCandidates.length === 0 || isExecutingImport}
                      className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      {isExecutingImport ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Importing Keys...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Import {selectedCandidates.length} Refined Key{selectedCandidates.length === 1 ? '' : 's'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: EXPORT KEYS
              ======================================================== */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                    <Download size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Export Keys to Transfer to Other Computers</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Export your configured API keys into a JSON or .ENV format. You can import this file on your laptop or another device.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  Vault Keys: {apiKeys.length}
                </div>
              </div>

              {/* Format Switcher */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Filter size={14} className="text-blue-500" />
                    <span>Choose Export Scope:</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      onClick={() => setExportScope('all')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        exportScope === 'all'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      All Providers ({apiKeys.length})
                    </button>

                    {(['gemini', 'groq', 'mistral', 'openrouter'] as const).map(p => {
                      const count = apiKeys.filter(k => k.provider === p).length;
                      const Icon = PROVIDER_ICONS[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setExportScope(p)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            exportScope === p
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <Icon size={13} />
                          <span>{PROVIDER_NAMES[p].split(' ')[0]} ({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Format selection */}
                <div className="space-y-1.5 shrink-0">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Export Format:</label>
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setExportFormat('json')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        exportFormat === 'json'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      JSON File
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('env')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        exportFormat === 'env'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      .ENV / Text
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {exportFormat.toUpperCase()} Preview ({keysToExport.length} keys ready):
                  </span>
                  <button
                    onClick={() => setShowExportMasked(prev => !prev)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {showExportMasked ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{showExportMasked ? 'Reveal raw keys' : 'Mask preview keys'}</span>
                  </button>
                </div>

                <div className="relative border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-900 text-slate-100 p-4 font-mono text-[11px] max-h-56 overflow-y-auto custom-scrollbar">
                  {keysToExport.length === 0 ? (
                    <div className="text-slate-400 text-center py-6">
                      No keys found for the selected scope ({exportScope}).
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-all leading-relaxed">
                      {exportFormat === 'json' ? (
                        showExportMasked
                          ? JSON.stringify({
                              app: "PromptArchitect",
                              version: "2.0",
                              exportedAt: new Date().toISOString(),
                              scope: exportScope,
                              totalKeys: keysToExport.length,
                              keys: keysToExport.map(k => ({
                                provider: k.provider,
                                key: `${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}`,
                                status: k.status,
                                addedAt: k.addedAt
                              }))
                            }, null, 2)
                          : exportJsonString
                      ) : (
                        showExportMasked
                          ? `# PromptArchitect API Keys (.env)\n# Scope: ${exportScope}\n\n` +
                            keysToExport.map(k => `${PROVIDER_ENV_NAMES[k.provider]}=${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}`).join('\n')
                          : exportEnvString
                      )}
                    </pre>
                  )}
                </div>
              </div>

              {/* Export actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleCopyExport}
                  disabled={keysToExport.length === 0}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95"
                >
                  {exportCopied ? (
                    <>
                      <Check size={15} className="text-emerald-500" />
                      <span>Copied {exportFormat.toUpperCase()}!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Copy {exportFormat.toUpperCase()} to Clipboard</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadExport}
                  disabled={keysToExport.length === 0}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Download size={16} />
                  <span>Download .{exportFormat === 'json' ? 'json' : 'env'} File</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: FULL CLEAN & RESET
              ======================================================== */}
          {activeTab === 'clean' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs flex items-start gap-3 text-red-700 dark:text-red-400">
                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Full Clean & Safe Reset</h4>
                  <p className="mt-1 leading-relaxed text-[11px] opacity-90">
                    This option permanently wipes API keys stored on this device. You can choose to clear all keys across all providers or clear keys for a specific provider only.
                  </p>
                </div>
              </div>

              {/* Clean Scope selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select What to Delete:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setCleanScope('all')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      cleanScope === 'all'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-2 ring-red-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Clean Entire Vault</span>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                        {totalKeysCount} keys
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Wipes all Gemini, Groq, Mistral, and OpenRouter API keys from this device.
                    </p>
                  </button>

                  <button
                    onClick={() => setCleanScope('current')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      cleanScope === 'current'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-2 ring-red-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Clean {PROVIDER_NAMES[activeProvider]} Only
                      </span>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                        {currentProviderCount} keys
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Removes only the keys for the active provider tab, keeping others intact.
                    </p>
                  </button>
                </div>
              </div>

              {/* Action Box */}
              <div className="p-5 border border-red-200 dark:border-red-900/40 rounded-2xl bg-white dark:bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <AlertCircle size={16} className="text-red-500" />
                    <span>
                      Target: {cleanScope === 'all' ? `All ${totalKeysCount} Keys across All Providers` : `${currentProviderCount} ${PROVIDER_NAMES[activeProvider]} Keys`}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    (cleanScope === 'all' ? totalKeysCount : currentProviderCount) > 0 
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {(cleanScope === 'all' ? totalKeysCount : currentProviderCount)} key(s) to remove
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {(cleanScope === 'all' ? totalKeysCount : currentProviderCount) > 0
                    ? `Clicking "Clear Keys Now" will permanently erase ${cleanScope === 'all' ? 'all' : `all ${PROVIDER_NAMES[activeProvider]}`} keys from this device.`
                    : 'There are currently no stored keys under this selection.'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteClean}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>
                      {(cleanScope === 'all' ? totalKeysCount : currentProviderCount) > 0
                        ? `Clear ${cleanScope === 'all' ? `All (${totalKeysCount})` : `${currentProviderCount}`} Keys Now`
                        : 'Clear Keys'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 text-[11px]">
            <Key size={13} className="text-slate-400" />
            <span>Secure Client-Side Storage (AES localStorage)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-xs text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
