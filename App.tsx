
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Sparkles, Check, Copy, ChevronDown, Loader2, 
  ShieldCheck, Command, Trash2, 
  ExternalLink, Zap, Clock, 
  Globe, Shield, Terminal, Calendar, 
  Layers, Camera, Box, Maximize, User, Moon,
  Layout, Fingerprint, Focus, Settings2, Download, MessageSquareCode, Send, AlertCircle, X, Cpu, Paintbrush,
  ChevronUp
} from 'lucide-react';
import { PromptOptions, GeneratedPrompt, PromptBatch, HistoricalPrompt } from './types';
import { generateStockPrompts, ACTIVE_MODEL } from './services/geminiService';

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
  environment: 'White Background',
  lighting: 'Natural daylight',
  framing: 'Portrait',
  cameraAngle: 'Eye Level',
  subjectPosition: 'Centered',
  shadowStyle: 'Natural Shadow',
  mockup: 'No mockup',
  visual3DStyle: 'Smooth & rounded',
  materialStyle: 'Glossy / Shiny',
  quantity: 3,
  useExtraKeywords: false,
  extraKeywords: '',
  extraContext: '',
  useCalendar: false,
  calendarMonth: MONTHS[new Date().getMonth()],
  calendarEvent: 'None'
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
    { value: 'No person (product)', label: 'Product / Object Only' }
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
  quantity: [
    { value: 3, label: '3 Prompts' },
    { value: 5, label: '5 Prompts' }
  ]
};

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
    <div className={`w-full relative ${disabled ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'} ${isOpen ? 'z-[50]' : 'z-10'}`} ref={dropdownRef}>
      <div className="flex items-center gap-1.5 mb-2 ml-1">
        {Icon && <Icon size={12} className="text-slate-400" />}
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{label}</label>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-white border ${isOpen ? 'border-slate-900 ring-2 ring-slate-100 shadow-sm' : 'border-slate-200'} px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-slate-800 text-left hover:border-slate-300 active:scale-[0.99] transition-all`}
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-slate-900' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 bg-white opacity-100 border border-slate-200 rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.2)] overflow-hidden animate-in">
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAllCopied, setIsAllCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    sessionStorage.setItem('prompt_options', JSON.stringify(options));
  }, [options]);

  useEffect(() => {
    sessionStorage.setItem('prompt_session_history', JSON.stringify(batches));
  }, [batches]);

  // Scroll to top visibility logic
  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setShowScrollTop(scrollContainer.scrollTop > 400);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const history: HistoricalPrompt[] = batches.flatMap(batch => 
        batch.prompts.map(p => ({ text: p.text, score: p.qualityScore }))
      );

      const results = await generateStockPrompts(options, history);
      const newPrompts: GeneratedPrompt[] = results.map(r => ({
        id: crypto.randomUUID(),
        text: r.text,
        qualityScore: r.score,
        copied: false
      }));

      const newBatch: PromptBatch = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        prompts: newPrompts
      };

      setBatches(prev => [newBatch, ...prev]);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An unexpected error occurred while generating prompts.");
    } finally {
      setIsGenerating(false);
    }
  }, [options, batches]);

  const copyIndividual = (batchId: string, promptId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        return {
          ...b,
          prompts: b.prompts.map(p => p.id === promptId ? { ...p, copied: true } : p)
        };
      }
      return b;
    }));
  };

  const copyAllWorkspacePrompts = () => {
    if (batches.length === 0) return;
    
    const allPrompts = batches
      .flatMap(batch => batch.prompts.map(p => p.text))
      .join('\n\n');
      
    navigator.clipboard.writeText(allPrompts);
    setIsAllCopied(true);
    
    setBatches(prev => prev.map(batch => ({
      ...batch,
      prompts: batch.prompts.map(p => ({ ...p, copied: true }))
    })));
    
    setTimeout(() => setIsAllCopied(false), 2000);
  };

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
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">v3.0 Production</span>
              <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase tracking-tighter border border-slate-200">
                <Cpu size={8} />
                <span>{ACTIVE_MODEL.replace('-preview', '').toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {batches.length > 0 && (
            <button 
              onClick={copyAllWorkspacePrompts}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 ${isAllCopied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {isAllCopied ? <Check size={14} /> : <Download size={14} />}
              <span>{isAllCopied ? 'All Copied' : 'Export All'}</span>
            </button>
          )}
          
          <div className="h-5 w-[1px] bg-slate-200"></div>
          
          <div className="flex items-center gap-2 text-slate-400">
            <Layers size={14} />
            <span className="text-[11px] font-bold tracking-tight text-slate-600 uppercase">{batches.length} Batches</span>
          </div>
        </div>
      </header>

      {/* Sidebar - Fixed Container */}
      <aside className="w-[340px] border-r border-slate-200/80 bg-white flex flex-col shrink-0 relative z-40 h-full overflow-hidden">
        {/* Scrollable Part */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 px-8">
          <div className="py-8 flex flex-col gap-8 pb-40"> {/* pb-40 ensures we can scroll high enough for bottom dropdowns */}
            
            {/* Section: Custom Architect Input */}
            <section className="bg-slate-50/50 p-5 rounded-[20px] border border-slate-200/60 flex flex-col gap-4 shadow-sm relative z-[100]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <MessageSquareCode size={14} strokeWidth={2.5} />
                  <span className="text-[11px] font-bold uppercase tracking-tight">Architect Refinement</span>
                </div>
                <button 
                  onClick={() => setOptions({...options, useExtraKeywords: !options.useExtraKeywords})}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-[1.5px] transition-all duration-300 ease-in-out focus:outline-none shadow-inner ${options.useExtraKeywords ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out mt-[1.5px] ml-[1.5px] border border-slate-100 ${options.useExtraKeywords ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
              
              {options.useExtraKeywords && (
                <div className="pt-2 animate-in">
                  <textarea
                    value={options.extraKeywords}
                    onChange={(e) => setOptions({...options, extraKeywords: e.target.value})}
                    placeholder="Add specific keywords or custom instructions..."
                    className="w-full h-24 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-100 outline-none resize-none transition-all custom-scrollbar"
                  />
                </div>
              )}
            </section>

            {/* Section: Seasonality (Calendar) */}
            <section className="bg-slate-50/50 p-5 rounded-[20px] border border-slate-200/60 flex flex-col gap-4 shadow-sm relative z-[90]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar size={14} strokeWidth={2.5} />
                  <span className="text-[11px] font-bold uppercase tracking-tight">Seasonality</span>
                </div>
                <button 
                  onClick={() => setOptions({...options, useCalendar: !options.useCalendar})}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-[1.5px] transition-all duration-300 ease-in-out focus:outline-none shadow-inner ${options.useCalendar ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out mt-[1.5px] ml-[1.5px] border border-slate-100 ${options.useCalendar ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {options.useCalendar && (
                <div className="grid gap-4 pt-4 border-t border-slate-200/60 animate-in">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Timeline</label>
                    <div className="relative group">
                      <select 
                        value={options.calendarMonth} 
                        onChange={e => {
                          const newMonth = e.target.value;
                          setOptions({
                            ...options, 
                            calendarMonth: newMonth,
                            calendarEvent: EVENTS_BY_MONTH[newMonth][0]
                          });
                        }} 
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-800 appearance-none focus:ring-2 focus:ring-slate-100 outline-none hover:border-slate-300 transition-all cursor-pointer"
                      >
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Event Hook</label>
                    <div className="relative group">
                      <select 
                        value={options.calendarEvent} 
                        onChange={e => setOptions({...options, calendarEvent: e.target.value})} 
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-800 appearance-none focus:ring-2 focus:ring-slate-100 outline-none hover:border-slate-300 transition-all cursor-pointer"
                      >
                        {(EVENTS_BY_MONTH[options.calendarMonth] || ["None"]).map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors" />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Section: Identity */}
            <section className="flex flex-col gap-6 relative z-[80]">
              <div className="flex items-center gap-2 px-1">
                <User size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Identity</h3>
              </div>
              <CustomDropdown label="Primary Actor" value={options.subject} options={OPTIONS.subject} onChange={(val) => setOptions({...options, subject: val})} />
              <CustomDropdown label="Cultural Heritage" value={options.characterBackground} options={OPTIONS.characterBackground} onChange={(val) => setOptions({...options, characterBackground: val})} disabled={options.subject.includes('No person')} />
            </section>

            {/* Section: Environment */}
            <section className="flex flex-col gap-6 relative z-[70]">
              <div className="flex items-center gap-2 px-1">
                <Box size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Environment</h3>
              </div>
              <CustomDropdown label="Rendering Style" value={options.visualType} options={OPTIONS.visualType} onChange={(val) => setOptions({...options, visualType: val})} />
              <CustomDropdown label="Scene Location" value={options.environment} options={OPTIONS.environment} onChange={(val) => setOptions({...options, environment: val})} />
            </section>

            {/* Section: Material & Finish */}
            <section className="flex flex-col gap-6 animate-in relative z-[60]">
              <div className="flex items-center gap-2 px-1">
                <Paintbrush size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Material & Finish</h3>
              </div>
              <CustomDropdown 
                label="Texture Finish" 
                value={options.materialStyle} 
                options={OPTIONS.materialStyle} 
                onChange={(val) => setOptions({...options, materialStyle: val})} 
                disabled={options.visualType !== '3D icon'}
              />
            </section>

            {/* Section: Optics */}
            <section className="flex flex-col gap-6 relative z-[50]">
              <div className="flex items-center gap-2 px-1">
                <Camera size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Optics</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <CustomDropdown 
                  label="Framing / Shot" 
                  value={options.framing} 
                  options={OPTIONS.framing} 
                  onChange={(val) => setOptions({...options, framing: val})} 
                  disabled={options.visualType === '3D icon'}
                />
                <CustomDropdown label="Camera Angle" value={options.cameraAngle} options={OPTIONS.cameraAngle} onChange={(val) => setOptions({...options, cameraAngle: val})} />
                <CustomDropdown label="Positioning" value={options.subjectPosition} options={OPTIONS.subjectPosition} onChange={(val) => setOptions({...options, subjectPosition: val})} />
                <CustomDropdown label="Light Atmosphere" value={options.lighting} options={OPTIONS.lighting} onChange={(val) => setOptions({...options, lighting: val})} />
                <CustomDropdown label="Shadow Treatment" value={options.shadowStyle} options={OPTIONS.shadowStyle} onChange={(val) => setOptions({...options, shadowStyle: val})} />
              </div>
            </section>

            <div className="h-px bg-slate-100/80 mx-1"></div>

            <section className="flex flex-col gap-6 relative z-[40]">
               <div className="flex items-center gap-2 px-1">
                <Settings2 size={12} strokeWidth={2.5} className="text-slate-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Settings</h3>
              </div>
              <CustomDropdown label="Batch Quantity" value={options.quantity} options={OPTIONS.quantity} onChange={(val) => setOptions({...options, quantity: val})} />
            </section>
          </div>
        </div>

        {/* FIXED FOOTER - Always on bottom */}
        <div className="shrink-0 bg-white border-t border-slate-100 p-8 z-[150] shadow-[0_-15px_40px_rgba(255,255,255,0.9)]">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-slate-900 text-white rounded-xl text-[12px] font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-30 transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2.5 relative"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Architecting...</span>
              </div>
            ) : (
              <>
                <Sparkles size={14} className="fill-white" />
                <span>Run Architect</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col pt-16">
        {/* Loading Strip */}
        {isGenerating && (
          <div className="fixed top-16 left-[340px] right-0 h-[2px] z-[110] overflow-hidden">
            <div className="h-full bg-slate-900 animate-[loading_1s_linear_infinite]"></div>
          </div>
        )}

        {/* Scroll to Top Button */}
        <button 
          onClick={scrollToTop}
          className={`fixed bottom-12 right-12 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all z-[200] ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        >
          <ChevronUp size={24} strokeWidth={2.5} />
        </button>

        {/* Error Notification */}
        {errorMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-lg bg-white border border-red-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-4 animate-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-tight mb-1">Architecture Failed</h4>
                <p className="text-[12px] text-slate-500 font-medium leading-relaxed">{errorMessage}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={handleGenerate} className="text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:underline">Retry Now</button>
                  <span className="text-slate-200">|</span>
                  <button onClick={() => setErrorMessage(null)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600">Dismiss</button>
                </div>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-slate-300 hover:text-slate-500">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 max-w-4xl w-full mx-auto px-8 py-12 transition-all duration-500 ${isGenerating ? 'opacity-40' : 'opacity-100'}`}>
          {batches.length > 0 ? (
            <div className="flex flex-col gap-16">
              {batches.map((batch, batchIdx) => (
                <section key={batch.id} className="animate-in" style={{ animationDelay: `${batchIdx * 80}ms` }}>
                  {/* BATCH HEADER */}
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm">
                        <Clock size={20} strokeWidth={2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BATCH_{batch.id.split('-')[0].toUpperCase()}</span>
                          <span className="text-[11px] font-medium text-slate-300">|</span>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">{new Date(batch.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[15px] font-bold text-slate-900 tracking-tight">
                          {new Date(batch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PROMPT CARDS */}
                  <div className="grid gap-6">
                    {batch.prompts.map((p, pIdx) => (
                      <div key={p.id} className="group relative bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
                              <Zap size={13} className="fill-slate-600" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Score: {p.qualityScore}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100">
                              <ShieldCheck size={13} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Verified</span>
                            </div>
                          </div>
                          <span className="text-[20px] font-black text-slate-50 group-hover:text-slate-100 transition-colors">#{pIdx + 1}</span>
                        </div>
                        <p className="text-[15px] font-medium leading-[1.7] text-slate-700 group-hover:text-slate-900 transition-colors">{p.text}</p>
                        <div className="flex items-center justify-end pt-4 border-t border-slate-50">
                          <button onClick={() => copyIndividual(batch.id, p.id, p.text)} className={`px-8 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2.5 ${p.copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
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
              <div className="w-20 h-20 bg-white rounded-[24px] border border-slate-100 flex items-center justify-center mb-8 text-slate-200 shadow-sm">
                <Terminal size={32} />
              </div>
              <h2 className="text-[24px] font-bold text-slate-900 mb-4 tracking-tight">Architect Workspace Ready</h2>
              <p className="text-[14px] font-medium text-slate-400 max-w-sm leading-relaxed mb-12">Configure your vision in the control panel to generate high-performance stock prompts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl w-full">
                 <div className="p-6 bg-white border border-slate-100 rounded-3xl text-left shadow-sm">
                    <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center mb-3"><Zap size={16} className="text-amber-500" /></div>
                    <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-900 mb-1.5">Market Fit</h3>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed">Prompts pre-loaded with high-conversion stock terminology.</p>
                 </div>
                 <div className="p-6 bg-white border border-slate-100 rounded-3xl text-left shadow-sm">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3"><Layout size={16} className="text-blue-500" /></div>
                    <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-900 mb-1.5">Uniqueness</h3>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed">Advanced history tracking prevents thematic repetition.</p>
                 </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-auto border-t border-slate-200/60 bg-white px-8 py-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3 opacity-50">
              <Shield size={14} className="text-slate-900" />
              <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] leading-none">© 2026 PROMPT MASTER . ARCHITECT SERIES</p>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center">
                 <a href="https://t.me/designbd2" target="_blank" className="group text-[10px] font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-[0.2em] flex items-center gap-2">
                   <Send size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   Telegram
                 </a>
              </div>
              <div className="h-4 w-[1px] bg-slate-200 hidden md:block"></div>
              <div className="flex items-center gap-2 opacity-30">
                 <Globe size={14} className="text-slate-900" />
                 <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">v3.0</span>
              </div>
            </div>
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
