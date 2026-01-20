
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Sparkles, Check, Copy, ChevronDown, Loader2, 
  ShieldCheck, Command, Trash2, 
  ExternalLink, Zap, Clock, 
  Globe, Shield, Terminal, Calendar, 
  Layers, Camera, Box, Maximize, User, Moon,
  Layout, Fingerprint, Focus, Settings2, Download, MessageSquareCode, Send, AlertCircle, X, Cpu, Paintbrush,
  ChevronUp, Key, Lock, Info, Settings, ToggleLeft, ToggleRight, Activity
} from 'lucide-react';
import { PromptOptions, GeneratedPrompt, PromptBatch, HistoricalPrompt } from './types';
import { generateStockPrompts } from './services/geminiService';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENTS_BY_MONTH: Record<string, string[]> = {
  "January": ["New Year", "Chinese New Year", "Fitness & Goals", "Winter Season", "None"],
  "February": ["Valentine’s Day", "Leadership & Career", "Black History Month", "None"],
  "March": ["Ramadan", "International Women’s Day", "Spring Season", "Holi Festival", "None"],
  "April": ["Eid-ul-Fitr", "Easter", "Earth Day", "Spring Blooms", "None"],
  "May": ["Mother’s Day", "Mental Health Awareness", "Wellness & Yoga", "None"],
  "June": ["Eid-ul-Adha", "Pride Month", "Summer Solstice", "Father’s Day", "None"],
  "July": ["Summer Vacation", "Beach & Tropical", "Independence Day", "None"],
  "August": ["Back to School", "Adventure & Travel", "International Youth Day", "None"],
  "September": ["Autumn / Fall", "Fashion & Lifestyle", "Education & Tech", "None"],
  "October": ["Diwali", "Halloween", "Breast Cancer Awareness", "Cyber Security", "None"],
  "November": ["Black Friday / Sales", "Thanksgiving", "Cyber Monday", "Winter Prep", "None"],
  "December": ["Christmas", "Hanukkah", "New Year’s Eve", "Winter Holidays", "None"]
};

const DEFAULT_OPTIONS: PromptOptions = {
  subject: 'Business professional',
  characterBackground: 'Global / Neutral',
  useCase: 'Stock image',
  visualType: 'Standard photo',
  format: 'Realistic photo',
  environment: 'Default / Auto',
  lighting: 'Natural daylight',
  framing: 'Portrait',
  cameraAngle: 'Eye Level',
  subjectPosition: 'Centered',
  shadowStyle: 'Natural Shadow',
  mockup: 'No mockup',
  visual3DStyle: 'Smooth & rounded',
  materialStyle: 'Realistic',
  quantity: 3,
  useExtraKeywords: false,
  extraKeywords: '',
  extraContext: '',
  useCalendar: false,
  calendarMonth: MONTHS[new Date().getMonth()],
  calendarEvent: 'None',
  model: 'gemini-3-flash-preview'
};

const OPTIONS = {
  subject: [
    { value: 'Business professional', label: 'Business Professional' },
    { value: 'Casual person', label: 'Casual Person' },
    { value: 'Creative person', label: 'Creative Person' },
    { value: 'Healthcare professional', label: 'Healthcare Professional' },
    { value: 'Student / Academic', label: 'Student / Academic' },
    { value: 'Senior citizen', label: 'Senior Citizen' },
    { value: 'Fitness enthusiast', label: 'Fitness Enthusiast' },
    { value: 'Tech developer', label: 'Tech Developer' },
    { value: 'Family group', label: 'Family Group' },
    { value: 'Manual laborer', label: 'Manual Laborer' },
    { value: 'No person (product)', label: 'Product / Object Only' },
    { value: 'Background / Landscape only', label: 'Background / Landscape Only' }
  ],
  characterBackground: [
    { value: 'Global / Neutral', label: 'Global / Neutral' },
    { value: 'South Asian', label: 'South Asian' },
    { value: 'East Asian', label: 'East Asian' },
    { value: 'Middle Eastern', label: 'Middle Eastern' },
    { value: 'African', label: 'African' },
    { value: 'European', label: 'European' },
    { value: 'North American', label: 'North American' },
    { value: 'Latin American', label: 'Latin American' }
  ],
  visualType: [
    { value: 'Standard photo', label: 'Standard Photo' },
    { value: '3D illustration', label: '3D Illustration' },
    { value: '3D icon', label: '3D Icon' },
    { value: 'Minimalist Vector', label: 'Minimalist Vector' }
  ],
  materialStyle: [
    { value: 'Realistic', label: 'Realistic' },
    { value: 'Glossy / Shiny', label: 'Glossy / Shiny' },
    { value: 'Glassmorphism', label: 'Glassmorphism (Glassy)' },
    { value: 'Metallic / Chrome', label: 'Metallic / Chrome' },
    { value: 'Matte / Soft', label: 'Matte / Soft' },
    { value: 'Clay / Pastel', label: 'Clay / Plastic' },
    { value: 'Frosted Glass', label: 'Frosted Glass' },
    { value: 'Random / Auto', label: 'Random / Auto' }
  ],
  environment: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'White Background', label: 'White Background' },
    { value: 'Solid Color / Studio', label: 'Solid Color / Studio' },
    { value: 'Modern Office', label: 'Modern Office' },
    { value: 'Home Interior', label: 'Home Interior' },
    { value: 'Nature / Outdoor', label: 'Nature / Outdoor' },
    { value: 'City Street', label: 'City Street' },
    { value: 'Hospital / Clinic', label: 'Hospital / Clinic' },
    { value: 'Cafe / Restaurant', label: 'Cafe / Restaurant' },
    { value: 'Industrial / Lab', label: 'Industrial / Lab' }
  ],
  framing: [
    { value: 'Portrait', label: 'Portrait' },
    { value: 'Mid shot (waist-up)', label: 'Mid Shot (waist-up)' },
    { value: 'Full shot (full body)', label: 'Full Shot (full body)' },
    { value: 'None / Not needed', label: 'Default / Auto' }
  ],
  cameraAngle: [
    { value: 'Eye Level', label: 'Eye Level' },
    { value: 'Top View / Flat Lay', label: 'Top View / Flat Lay' },
    { value: 'High Angle', label: 'High Angle' },
    { value: 'Low Angle', label: 'Low Angle' },
    { value: 'Bird\'s Eye View', label: 'Bird\'s Eye View' },
    { value: 'Side View', label: 'Side View' },
    { value: 'None / Auto', label: 'Default / Auto' }
  ],
  subjectPosition: [
    { value: 'Centered', label: 'Centered' },
    { value: 'Left aligned', label: 'Left Aligned' },
    { value: 'Right aligned', label: 'Right Aligned' },
    { value: 'None / Not needed', label: 'Default / Auto' }
  ],
  lighting: [
    { value: 'Natural daylight', label: 'Natural Daylight' },
    { value: 'Soft studio', label: 'Soft Studio' },
    { value: 'Warm indoor', label: 'Warm Indoor' },
    { value: 'Golden hour', label: 'Golden Hour' }
  ],
  shadowStyle: [
    { value: 'Natural Shadow', label: 'Natural Shadow' },
    { value: 'No Shadow / Flat', label: 'Flat / No Shadow' },
    { value: 'Soft Studio Shadow', label: 'Soft Studio Shadow' },
    { value: 'Strong / Bold Shadow', label: 'Bold Shadow' },
    { value: 'Minimal Base Shadow', label: 'Minimal Base' }
  ],
  model: [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (High Efficiency)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Complex Reasoning)' }
  ]
};

const SYSTEM_QUANTITY_OPTIONS = [
  { value: 3, label: '3 Prompts' },
  { value: 5, label: '5 Prompts' }
];

const PERSONAL_QUANTITY_OPTIONS = [
  { value: 5, label: '5 Prompts' },
  { value: 10, label: '10 Prompts' },
  { value: 20, label: '20 Prompts' },
  { value: 30, label: '30 Prompts' },
  { value: 40, label: '40 Prompts' },
  { value: 50, label: '50 Prompts' },
  { value: 60, label: '60 Prompts' },
  { value: 70, label: '70 Prompts' },
  { value: 80, label: '80 Prompts' },
  { value: 90, label: '90 Prompts' },
  { value: 100, label: '100 Prompts' }
];

const CustomDropdown = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon,
  disabled = false 
}: { 
  label: string; 
  value: string | number; 
  options: { value: string | number; label: string }[]; 
  onChange: (val: any) => void; 
  icon?: any;
  disabled?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(opt => opt.value === value) || safeOptions[0] || { label: 'Select...', value: '' };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`w-full relative ${disabled ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'} ${isOpen ? 'z-[100]' : 'z-auto'}`} ref={dropdownRef}>
      <div className="flex items-center gap-1.5 mb-2 ml-1">
        {Icon && <Icon size={12} className="text-slate-400" />}
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{label}</label>
      </div>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-white border ${isOpen ? 'border-slate-900 ring-2 ring-slate-100 shadow-sm' : 'border-slate-200'} px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-slate-800 text-left hover:border-slate-300 active:scale-[0.99] transition-all disabled:cursor-not-allowed`}
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-slate-900' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[200] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden animate-in">
            <div className="max-h-64 overflow-y-auto custom-scrollbar py-1.5 bg-white">
              {safeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-[13px] flex items-center justify-between group transition-colors ${opt.value === value ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check size={14} className="shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [options, setOptions] = useState<PromptOptions>(() => {
    const saved = sessionStorage.getItem('prompt_options');
    return saved ? JSON.parse(saved) : DEFAULT_OPTIONS;
  });

  const [batches, setBatches] = useState<PromptBatch[]>(() => {
    const saved = sessionStorage.getItem('prompt_session_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });

  const [useSystemKey, setUseSystemKey] = useState<boolean>(() => {
    const saved = localStorage.getItem('use_system_api_key');
    return saved === 'true';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAllCopied, setIsAllCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    sessionStorage.setItem('prompt_options', JSON.stringify(options));
  }, [options]);

  useEffect(() => {
    sessionStorage.setItem('prompt_session_history', JSON.stringify(batches));
  }, [batches]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('user_gemini_api_key', key);
  };

  const toggleSystemKey = (val: boolean) => {
    setUseSystemKey(val);
    localStorage.setItem('use_system_api_key', String(val));
    
    // If switching TO system key and current quantity is invalid (above 5)
    // reset it to 5 to avoid API errors or UI glitches.
    if (val && options.quantity > 5) {
      setOptions(prev => ({ ...prev, quantity: 5 }));
    }
  };

  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => setShowScrollTop(scrollContainer.scrollTop > 400);
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleGenerate = useCallback(async () => {
    if (!apiKey && !useSystemKey) {
      setIsModalOpen(true);
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const history: HistoricalPrompt[] = batches.flatMap(batch => 
        batch.prompts.map(p => ({ text: p.text, score: p.qualityScore }))
      );
      const results = await generateStockPrompts(options, useSystemKey ? "" : apiKey, history);
      const newPrompts: GeneratedPrompt[] = results.map(r => ({
        id: crypto.randomUUID(),
        text: r.text,
        qualityScore: r.score,
        copied: false
      }));
      const newBatch: PromptBatch = { id: crypto.randomUUID(), timestamp: Date.now(), prompts: newPrompts };
      setBatches(prev => [newBatch, ...prev]);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An unexpected error occurred while generating prompts.");
    } finally {
      setIsGenerating(false);
    }
  }, [options, batches, apiKey, useSystemKey]);

  const copyIndividual = (batchId: string, promptId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        return { ...b, prompts: b.prompts.map(p => p.id === promptId ? { ...p, copied: true } : p) };
      }
      return b;
    }));
  };

  const copyAllWorkspacePrompts = () => {
    if (batches.length === 0) return;
    const allPrompts = batches.flatMap(batch => batch.prompts.map(p => p.text)).join('\n\n');
    navigator.clipboard.writeText(allPrompts);
    setIsAllCopied(true);
    setBatches(prev => prev.map(batch => ({...batch, prompts: batch.prompts.map(p => ({ ...p, copied: true }))})));
    setTimeout(() => setIsAllCopied(false), 2000);
  };

  // Visibility Logic: 
  // Material & Finish appears for Products OR 3D Styles.
  const isMaterialFinishVisible = options.subject === 'No person (product)' || options.visualType.toLowerCase().includes('3d');
  
  // Cultural Heritage is only for human subjects.
  const isCulturalHeritageVisible = options.subject !== 'No person (product)' && options.subject !== 'Background / Landscape only';

  // Dynamic Quantity Options:
  // Restricted for system key, expanded for personal key.
  const currentQuantityOptions = useSystemKey ? SYSTEM_QUANTITY_OPTIONS : PERSONAL_QUANTITY_OPTIONS;

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-dot-pattern">
      
      {/* GLOBAL HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200/80 z-[100] flex items-center justify-between px-8">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-slate-900 rounded-[10px] flex items-center justify-center text-white shadow-sm">
            <Command size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[13px] font-bold tracking-tight uppercase leading-none text-slate-900">PROMPT MASTER</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">V3.0 PRODUCTION</span>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${options.model.includes('pro') ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                {options.model.includes('pro') ? <Zap size={8} /> : <Cpu size={8} />}
                <span>{options.model.includes('pro') ? 'GEMINI-3-PRO' : 'GEMINI-3-FLASH'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border ${ (apiKey || useSystemKey) ? 'bg-white text-slate-900 border-slate-200 hover:border-slate-400' : 'bg-red-50 text-red-600 border-red-100 animate-pulse hover:bg-red-100'}`}
          >
            <Settings size={14} className={ (apiKey || useSystemKey) ? 'text-slate-400' : 'text-red-500'} />
            <span>Engine & Key</span>
            <div className={`w-1.5 h-1.5 rounded-full ${(apiKey || useSystemKey) ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-2"></div>

          {batches.length > 0 && (
            <button 
              onClick={copyAllWorkspacePrompts}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 ${isAllCopied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {isAllCopied ? <Check size={14} /> : <Download size={14} />}
              <span>{isAllCopied ? 'All Copied' : 'Export All'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Unified Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-0 shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-slate-100 relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Activity size={24} />
                </div>
                <div>
                  <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-tight">System Configuration</h2>
                  <p className="text-[12px] text-slate-500 font-medium">Manage your generation engine and connectivity</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Cpu size={14} className="text-slate-900" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Intelligence Engine</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {OPTIONS.model.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setOptions({...options, model: m.value as any})}
                      className={`p-4 rounded-2xl border text-left transition-all ${options.model === m.value ? 'bg-slate-900 border-slate-900 shadow-md' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                         <div className={`p-1.5 rounded-lg ${options.model === m.value ? 'bg-white/10 text-white' : 'bg-white text-slate-400'}`}>
                           {m.value.includes('pro') ? <Zap size={14} /> : <Cpu size={14} />}
                         </div>
                         {options.model === m.value && <Check size={14} className="text-emerald-400" />}
                      </div>
                      <p className={`text-[12px] font-bold leading-tight ${options.model === m.value ? 'text-white' : 'text-slate-900'}`}>{m.label}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Key size={14} className="text-slate-900" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">API Connectivity</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-900">System Key Mode</span>
                      <span className="text-[10px] text-slate-400 font-medium">Use project's global API key</span>
                    </div>
                    <button onClick={() => toggleSystemKey(!useSystemKey)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${useSystemKey ? 'bg-slate-900' : 'bg-slate-200'}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${useSystemKey ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {!useSystemKey && (
                    <div className="pt-2 space-y-3 animate-in">
                      <div className="h-px bg-slate-200/50"></div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Personal Gemini Key</label>
                        <div className="relative">
                          <input type="password" value={apiKey} onChange={(e) => saveApiKey(e.target.value)} placeholder="AIza..." className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-[14px] font-medium focus:border-slate-900 transition-all outline-none" />
                          <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
              <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]">Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - z-index hierarchy fixed by using descending values for sections */}
      <aside className="w-[340px] border-r border-slate-200/80 bg-white flex flex-col shrink-0 relative z-40 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 px-8">
          <div className="py-8 flex flex-col gap-8 pb-40">
            
            {/* TOP CARDS - Highest Priority (z-100) */}
            <div className="space-y-4 relative z-[100]">
              <div className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900">
                    <MessageSquareCode size={16} />
                  </div>
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Architect Refinement</span>
                </div>
                <button 
                  onClick={() => setOptions({...options, useExtraKeywords: !options.useExtraKeywords})}
                  className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 transition-all duration-300 ${options.useExtraKeywords ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 mt-[2px] ml-[2px] ${options.useExtraKeywords ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {options.useExtraKeywords && (
                <div className="px-2 animate-in">
                  <textarea
                    value={options.extraKeywords}
                    onChange={(e) => setOptions({...options, extraKeywords: e.target.value})}
                    placeholder="Add specific keywords..."
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[12px] text-slate-800 outline-none resize-none focus:border-slate-900 transition-all"
                  />
                </div>
              )}

              <div className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900">
                    <Calendar size={16} />
                  </div>
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Seasonality</span>
                </div>
                <button 
                  onClick={() => setOptions({...options, useCalendar: !options.useCalendar})}
                  className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 transition-all duration-300 ${options.useCalendar ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 mt-[2px] ml-[2px] ${options.useCalendar ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {options.useCalendar && (
                <div className="px-2 space-y-4 animate-in">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Month Selector</label>
                    <select 
                      value={options.calendarMonth} 
                      onChange={e => setOptions({...options, calendarMonth: e.target.value, calendarEvent: EVENTS_BY_MONTH[e.target.value][0]})} 
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-[13px] font-medium outline-none focus:border-slate-900"
                    >
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Event Context</label>
                    <select 
                      value={options.calendarEvent} 
                      onChange={e => setOptions({...options, calendarEvent: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-[13px] font-medium outline-none focus:border-slate-900"
                    >
                      {EVENTS_BY_MONTH[options.calendarMonth].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* IDENTITY SECTION - z-[90] */}
            <section className="flex flex-col gap-6 pt-4 relative z-[90]">
              <div className="flex items-center gap-2 px-1">
                <User size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity</h3>
              </div>
              <CustomDropdown label="Primary Actor" value={options.subject} options={OPTIONS.subject} onChange={(val) => setOptions({...options, subject: val})} />
              
              {isCulturalHeritageVisible && (
                <div className="animate-in">
                  <CustomDropdown 
                    label="Cultural Heritage" 
                    value={options.characterBackground} 
                    options={OPTIONS.characterBackground} 
                    onChange={(val) => setOptions({...options, characterBackground: val})} 
                  />
                </div>
              )}
            </section>

            {/* ENVIRONMENT SECTION - z-[80] */}
            <section className="flex flex-col gap-6 pt-4 relative z-[80]">
              <div className="flex items-center gap-2 px-1">
                <Box size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Environment</h3>
              </div>
              <CustomDropdown label="Rendering Style" value={options.visualType} options={OPTIONS.visualType} onChange={(val) => setOptions({...options, visualType: val})} />
              <CustomDropdown label="Scene Location" value={options.environment} options={OPTIONS.environment} onChange={(val) => setOptions({...options, environment: val})} />
            </section>

            {/* MATERIAL & FINISH SECTION - z-[70] - Condition: Product OR 3D Style */}
            {isMaterialFinishVisible && (
              <section className="flex flex-col gap-6 pt-4 relative z-[70] animate-in">
                <div className="flex items-center gap-2 px-1">
                  <Paintbrush size={12} strokeWidth={2.5} className="text-slate-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Material & Finish</h3>
                </div>
                <CustomDropdown 
                  label="Texture Finish" 
                  value={options.materialStyle} 
                  options={OPTIONS.materialStyle} 
                  onChange={(val) => setOptions({...options, materialStyle: val})} 
                />
              </section>
            )}

            {/* OPTICS SECTION - z-[60] */}
            <section className="flex flex-col gap-6 pt-4 relative z-[60]">
              <div className="flex items-center gap-2 px-1">
                <Camera size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Optics</h3>
              </div>
              <div className="space-y-6">
                <CustomDropdown label="Framing / Shot" value={options.framing} options={OPTIONS.framing} onChange={(val) => setOptions({...options, framing: val})} />
                <CustomDropdown label="Camera Angle" value={options.cameraAngle} options={OPTIONS.cameraAngle} onChange={(val) => setOptions({...options, cameraAngle: val})} />
                <CustomDropdown label="Positioning" value={options.subjectPosition} options={OPTIONS.subjectPosition} onChange={(val) => setOptions({...options, subjectPosition: val})} />
                <CustomDropdown label="Light Atmosphere" value={options.lighting} options={OPTIONS.lighting} onChange={(val) => setOptions({...options, lighting: val})} />
                <CustomDropdown label="Shadow Treatment" value={options.shadowStyle} options={OPTIONS.shadowStyle} onChange={(val) => setOptions({...options, shadowStyle: val})} />
              </div>
            </section>

            {/* SETTINGS SECTION - z-[50] */}
            <section className="flex flex-col gap-6 pt-4 relative z-[50]">
              <div className="flex items-center gap-2 px-1">
                <Settings2 size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Settings</h3>
              </div>
              {/* Batch Quantity: Conditionally uses restricted or expanded list based on API Key */}
              <CustomDropdown 
                label="Batch Quantity" 
                value={options.quantity} 
                options={currentQuantityOptions} 
                onChange={(val) => setOptions({...options, quantity: val})} 
              />
            </section>
          </div>
        </div>

        {/* Sidebar Fixed Button */}
        <div className="shrink-0 bg-white border-t border-slate-100 p-8 z-[150] shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl text-[14px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] ${isGenerating ? 'bg-slate-800 text-white' : 'bg-[#0f172a] text-white hover:bg-slate-800 disabled:opacity-50'}`}
          >
            {isGenerating ? (<><Loader2 size={16} className="animate-spin" /><span>Architecting...</span></>) : (<><Sparkles size={16} className="fill-white" /><span>Run Architect</span></>)}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col pt-16">
        {isGenerating && (
          <div className="fixed top-16 left-[340px] right-0 h-[2px] z-[110] overflow-hidden">
            <div className="h-full bg-slate-900 animate-[loading_1s_linear_infinite]"></div>
          </div>
        )}

        <button onClick={scrollToTop} className={`fixed bottom-12 right-12 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[200] ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
          <ChevronUp size={24} />
        </button>

        <div className={`flex-1 max-w-4xl w-full mx-auto px-8 py-12 transition-all ${isGenerating ? 'opacity-40' : 'opacity-100'}`}>
          {batches.length > 0 ? (
            <div className="flex flex-col gap-16">
              {batches.map((batch, idx) => (
                <section key={batch.id} className="animate-in" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm"><Clock size={20} /></div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BATCH {batches.length - idx}</span>
                        <p className="text-[15px] font-bold text-slate-900">{new Date(batch.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-6">
                    {batch.prompts.map((p, pIdx) => (
                      <div key={p.id} className="group relative bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
                              <Zap size={13} className="fill-slate-600" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Score: {p.qualityScore}</span>
                            </div>
                          </div>
                          <span className="text-[20px] font-black text-slate-50 group-hover:text-slate-100 transition-colors">#{pIdx + 1}</span>
                        </div>
                        <p className="text-[15px] font-medium leading-[1.7] text-slate-700">{p.text}</p>
                        <div className="flex justify-end pt-4 border-t border-slate-50">
                          <button onClick={() => copyIndividual(batch.id, p.id, p.text)} className={`px-8 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2.5 ${p.copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                            {p.copied ? (<><Check size={14} strokeWidth={3} /><span>Copied</span></>) : (<><Copy size={14} /><span>Copy Prompt</span></>)}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in min-h-[50vh]">
              <div className="w-20 h-20 bg-white rounded-[24px] border border-slate-100 flex items-center justify-center mb-8 text-slate-200 shadow-sm"><Terminal size={32} /></div>
              <h2 className="text-[24px] font-bold text-slate-900 mb-4 tracking-tight">Ready to Architect</h2>
              <p className="text-[14px] font-medium text-slate-400 max-w-sm leading-relaxed mb-12">Select your parameters and start generating professional commercial stock prompts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl w-full">
                 <div className="p-8 bg-white border border-slate-100 rounded-3xl text-left shadow-sm">
                    <Zap size={16} className="text-amber-500 mb-3" />
                    <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-900 mb-1.5">Commercial Ready</h3>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed">Prompts are optimized for stock platforms like Adobe Stock and Freepik.</p>
                 </div>
                 <div className="p-8 bg-white border border-slate-100 rounded-3xl text-left shadow-sm">
                    <ShieldCheck size={16} className="text-blue-500 mb-3" />
                    <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-900 mb-1.5">Intelligence Toggle</h3>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed">Switch between Flash for speed and Pro for creative complexity.</p>
                 </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-auto border-t border-slate-200/60 bg-white px-8 py-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3 opacity-50">
              <Shield size={14} className="text-slate-900" />
              <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">© 2026 PROMPT MASTER . ARCHITECT SERIES</p>
            </div>
            <a href="https://t.me/designbd2" target="_blank" className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-[0.2em] flex items-center gap-2"><Send size={12} />Telegram Community</a>
          </div>
        </footer>
      </main>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
