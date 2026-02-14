import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Sparkles, Check, Copy, ChevronDown, Loader2, 
  ShieldCheck, Command, Trash2, 
  ExternalLink, Zap, Clock, 
  Globe, Shield, Terminal, Calendar, 
  Layers, Camera, Box, Maximize, User, Moon, Sun,
  Layout, Fingerprint, Focus, Settings2, Download, MessageSquareCode, Send, AlertCircle, X, Cpu, Paintbrush,
  ChevronUp, Key, Lock, Info, Settings, ToggleLeft, ToggleRight, Activity, Power, Video
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

// Function to return a guaranteed fresh copy of default settings
const getFreshDefaultOptions = (): PromptOptions => ({
  subject: 'Default / Auto',
  characterBackground: 'Default / Auto',
  useCase: 'Stock image',
  visualType: 'Default / Auto',
  format: 'Realistic photo',
  environment: 'Default / Auto',
  lighting: 'Default / Auto',
  framing: 'Default / Auto',
  cameraAngle: 'Default / Auto',
  subjectPosition: 'Default / Auto',
  shadowStyle: 'Default / Auto',
  mockup: 'No mockup',
  visual3DStyle: 'Smooth & rounded',
  materialStyle: 'Default / Auto',
  qualityCamera: 'Default / Auto',
  quantity: 3,
  useExtraKeywords: false,
  extraKeywords: '',
  extraContext: '',
  useCalendar: false,
  calendarMonth: MONTHS[new Date().getMonth()],
  calendarEvent: 'None',
  model: 'gemini-3-flash-preview',
  activeFields: {
    subject: true,
    characterBackground: true,
    visualType: true,
    environment: true,
    lighting: true,
    framing: true,
    cameraAngle: true,
    subjectPosition: true,
    shadowStyle: true,
    materialStyle: true,
    visual3DStyle: true,
    qualityCamera: true
  }
});

const DEFAULT_OPTIONS = getFreshDefaultOptions();

const OPTIONS = {
  subject: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Business professional', label: 'Business Professional' },
    { value: 'E-commerce Fashion Model', label: 'E-commerce Fashion Model' },
    { value: 'Casual person', label: 'Casual Person' },
    { value: 'Creative person', label: 'Creative Person' },
    { value: 'Healthcare professional', label: 'Healthcare Professional' },
    { value: 'Student / Academic', label: 'Student / Academic' },
    { value: 'Senior citizen', label: 'Senior Citizen' },
    { value: 'Fitness enthusiast', label: 'Fitness Enthusiast' },
    { value: 'Tech developer', label: 'Tech Developer' },
    { value: 'Manual laborer', label: 'Manual Laborer' },
    { value: 'Futuristic Cyborg / Android', label: 'Futuristic Cyborg / Android' },
    { value: 'Content Creator / Influencer', label: 'Content Creator / Influencer' },
    { value: 'Romantic Couple', label: 'Romantic Couple' },
    { value: 'Group of Friends', label: 'Group of Friends' },
    { value: 'Business Team', label: 'Business Team' },
    { value: 'Parent & Child', label: 'Parent & Child' },
    { value: 'Family group', label: 'Family Group' },
    { value: 'Chef / Kitchen Staff', label: 'Chef / Kitchen Staff' },
    { value: 'Construction Worker', label: 'Construction Worker' },
    { value: 'Doctor / Medical Team', label: 'Doctor / Medical Team' },
    { value: 'Delivery Person', label: 'Delivery Person' },
    { value: 'Baby / Toddler', label: 'Baby / Toddler' },
    { value: 'Teenager / Gen Z', label: 'Teenager / Gen Z' },
    { value: 'Domestic Pet (Cat, Dog, etc.)', label: 'Domestic Pet (Cat, Dog)' },
    { value: 'Wild Animal (Tiger, Lion, etc.)', label: 'Wild Animal' },
    { value: 'Bird / Avian life', label: 'Bird / Avian Life' },
    { value: 'Marine / Underwater life', label: 'Marine / Underwater Life' },
    { value: 'Macro / Insect', label: 'Macro / Insect' },
    { value: 'Still life / Food & Drink', label: 'Still life / Food & Drink' },
    { value: 'No person (product)', label: 'Product / Object Only' },
    { value: 'Background / Landscape only', label: 'Background / Landscape Only' }
  ],
  characterBackground: [
    { value: 'Default / Auto', label: 'Default / Auto' },
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
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Standard photo', label: 'Standard Photo' },
    { value: 'Ultra Realistic', label: 'Ultra Realistic' },
    { value: 'Anime Style', label: 'Anime Style' },
    { value: 'Cinematic', label: 'Cinematic' },
    { value: 'Oil Painting', label: 'Oil Painting' },
    { value: '3D Render', label: '3D Render' },
    { value: 'Hyper Detailed', label: 'Hyper Detailed' },
    { value: 'Cinematic Film (Kodak Portra)', label: 'Cinematic Film (Kodak Style)' },
    { value: 'Minimalist Studio Photo', label: 'Minimalist Studio Photo' },
    { value: 'National Geographic Wildstyle', label: 'National Geographic Wildstyle' },
    { value: 'Unreal Engine 5 Render', label: 'Unreal Engine 5 Render' },
    { value: '3D illustration', label: '3D Illustration' },
    { value: 'Isometric 3D', label: 'Isometric 3D' },
    { value: 'Claymorphism', label: 'Claymorphism' },
    { value: 'High-Fashion Editorial', label: 'High-Fashion Editorial' },
    { value: 'Minimalist Vector', label: 'Minimalist Vector' },
    { value: 'Flat Illustration', label: 'Flat Illustration' },
    { value: 'Paper Cut Art', label: 'Paper Cut Art' },
    { value: 'Line Art', label: 'Line Art / Sketch' },
    { value: 'Pencil Sketch / Charcoal', label: 'Pencil Sketch / Charcoal' }
  ],
  materialStyle: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Realistic', label: 'Realistic' },
    { value: 'Glossy / Shiny', label: 'Glossy / Shiny' },
    { value: 'Glassmorphism', label: 'Glassmorphism (Glassy)' },
    { value: 'Metallic / Chrome', label: 'Metallic / Chrome' },
    { value: 'Matte / Soft', label: 'Matte / Soft' },
    { value: 'Clay / Pastel', label: 'Clay / Plastic' },
    { value: 'Frosted Glass', label: 'Frosted Glass' }
  ],
  environment: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'White Background', label: 'White Background' },
    { value: 'Solid Color / Studio', label: 'Solid Color / Studio' },
    { value: 'Pitch Black / Void', label: 'Pitch Black / Void' },
    { value: 'Modern Office', label: 'Modern Office' },
    { value: 'Home Interior', label: 'Home Interior' },
    { value: 'Luxury Modern Penthouse', label: 'Luxury Modern Penthouse' },
    { value: 'Hyper-futuristic Neon City', label: 'Hyper-futuristic Neon City' },
    { value: 'Zen Minimalist Room', label: 'Zen Minimalist Room' },
    { value: 'Nature / Outdoor', label: 'Nature / Outdoor' },
    { value: 'Tropical Island Paradise', label: 'Tropical Island Paradise' },
    { value: 'Misty Ancient Forest', label: 'Misty Ancient Forest' },
    { value: 'City Street', label: 'City Street' },
    { value: 'Hospital / Clinic', label: 'Hospital / Clinic' },
    { value: 'Cafe / Restaurant', label: 'Cafe / Restaurant' },
    { value: 'Industrial Loft Workshop', label: 'Industrial Loft Workshop' },
    { value: 'Academic Library / Archive', label: 'Academic Library / Archive' },
    { value: 'Scientific Research Lab', label: 'Scientific Research Lab' }
  ],
  qualityCamera: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: '4K Resolution Detail', label: '4K Detail' },
    { value: '8K Masterpiece', label: '8K Masterpiece' },
    { value: 'Ultra Detailed Texture', label: 'Ultra Detailed' },
    { value: 'Shallow Depth of Field (Bokeh)', label: 'Shallow Depth of Field' },
    { value: 'Professional DSLR Quality', label: 'DSLR Quality' },
    { value: 'Sharp Focus / Macro Detail', label: 'Sharp Focus' }
  ],
  framing: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Portrait', label: 'Portrait' },
    { value: 'Mid shot (waist-up)', label: 'Mid Shot (waist-up)' },
    { value: 'Full shot (full body)', label: 'Full Shot (full body)' }
  ],
  cameraAngle: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Eye Level', label: 'Eye Level' },
    { value: 'Top View / Flat Lay', label: 'Top View / Flat Lay' },
    { value: 'High Angle', label: 'High Angle' },
    { value: 'Low Angle', label: 'Low Angle' },
    { value: 'Bird\'s Eye View', label: 'Bird\'s Eye View' },
    { value: 'Side View', label: 'Side View' }
  ],
  subjectPosition: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Centered', label: 'Centered' },
    { value: 'Left aligned', label: 'Left Aligned' },
    { value: 'Right aligned', label: 'Right Aligned' }
  ],
  lighting: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Natural daylight', label: 'Natural Daylight' },
    { value: 'Soft studio', label: 'Soft Studio' },
    { value: 'Warm indoor', label: 'Warm Indoor' },
    { value: 'Golden hour', label: 'Golden Hour' },
    { value: 'Neon Glow', label: 'Neon / Cyber Glow' }
  ],
  shadowStyle: [
    { value: 'Default / Auto', label: 'Default / Auto' },
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
  { value: 1, label: '1 Prompt' },
  { value: 3, label: '3 Prompts' },
  { value: 5, label: '5 Prompts' },
  { value: 10, label: '10 Prompts' },
  { value: 15, label: '15 Prompts' },
  { value: 20, label: '20 Prompts' },
  { value: 25, label: '25 Prompts' },
  { value: 30, label: '30 Prompts' },
  { value: 35, label: '35 Prompts' },
  { value: 40, label: '40 Prompts' },
  { value: 45, label: '45 Prompts' },
  { value: 50, label: '50 Prompts' }
];

const LOADING_STEPS = [
  "Analyzing Architectural Input...",
  "Applying Stock Style Filters...",
  "Generating Creative Concepts...",
  "Finalizing Prompt Architecture...",
  "Validating Quality Standards..."
];

const CustomDropdown = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon,
  disabled = false,
  canToggle = false,
  isActive = true,
  onToggle
}: { 
  label: string; 
  value: string | number; 
  options: { value: string | number; label: string }[]; 
  onChange: (val: any) => void; 
  icon?: any;
  disabled?: boolean;
  canToggle?: boolean;
  isActive?: boolean;
  onToggle?: (val: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(opt => opt.value === value) || safeOptions[0] || { label: 'Select...', value: '' };
  
  const isInputDisabled = disabled || (canToggle && !isActive);

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
    <div className={`w-full relative ${isOpen ? 'z-[100]' : 'z-auto'}`} ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1.5 ml-1">
        <div className={`flex items-center gap-1.5 ${isInputDisabled ? 'opacity-50' : 'opacity-100'}`}>
          {Icon && <Icon size={12} className="text-slate-400 dark:text-slate-500" />}
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
        </div>
        {canToggle && onToggle && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(!isActive);
            }}
            className="focus:outline-none transition-colors"
          >
            {isActive ? (
              <ToggleRight size={18} className="text-blue-500 dark:text-blue-400" />
            ) : (
              <ToggleLeft size={18} className="text-slate-300 dark:text-slate-700" />
            )}
          </button>
        )}
      </div>
      <div className={`relative ${isInputDisabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
        <button
          type="button"
          disabled={isInputDisabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-800 dark:text-slate-200 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:cursor-not-allowed`}
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[200] w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
              {safeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-[13px] flex items-center justify-between group transition-colors ${opt.value === value ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
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
  const [resetKey, setResetKey] = useState(0);

  const [options, setOptions] = useState<PromptOptions>(() => {
    const saved = sessionStorage.getItem('prompt_options');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_OPTIONS;
    if (!parsed.activeFields) {
      parsed.activeFields = DEFAULT_OPTIONS.activeFields;
    }
    return parsed;
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

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme_preference');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [isAllCopied, setIsAllCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);
  const loadingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    sessionStorage.setItem('prompt_options', JSON.stringify(options));
  }, [options]);

  useEffect(() => {
    sessionStorage.setItem('prompt_session_history', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('theme_preference', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('user_gemini_api_key', key);
  };

  const toggleSystemKey = (val: boolean) => {
    setUseSystemKey(val);
    localStorage.setItem('use_system_api_key', String(val));
    if (!val) {
      setOptions(prev => ({ ...prev, model: 'gemini-3-flash-preview' }));
    } else {
      setOptions(prev => ({ ...prev, model: 'gemini-3-pro-preview', quantity: prev.quantity > 5 ? 5 : prev.quantity }));
    }
  };

  const toggleField = (field: string, isActive: boolean) => {
    setOptions(prev => ({
      ...prev,
      activeFields: { ...prev.activeFields, [field]: isActive }
    }));
  };

  const scrollToTop = useCallback(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // DIRECT RESET ACTION
  const resetWorkspace = useCallback(() => {
    if (window.confirm("Are you sure you want to reset the entire workspace? All history and settings will be reverted to default.")) {
      // 1. CLEAR PERSISTENCE
      sessionStorage.removeItem('prompt_options');
      sessionStorage.removeItem('prompt_session_history');
      localStorage.setItem('use_system_api_key', 'false');
      
      // 2. TRIGGER RE-MOUNT OF APP
      // This forces the component tree to unmount and remount. 
      // Upon remounting, useState initializers will run again.
      // Since sessionStorage is cleared, they will pick up DEFAULT_OPTIONS.
      setResetKey(prev => prev + 1);
      
      // 3. UI FEEDBACK
      scrollToTop();
    }
  }, [scrollToTop]);

  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => setShowScrollTop(scrollContainer.scrollTop > 400);
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!apiKey && !useSystemKey) {
      setIsModalOpen(true);
      return;
    }
    setIsGenerating(true);
    setLoadingStepIdx(0);
    setErrorMessage(null);

    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingStepIdx(prev => (prev + 1) % LOADING_STEPS.length);
    }, 1600);

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
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
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

  const isMaterialFinishVisible = options.subject === 'No person (product)' || options.visualType.toLowerCase().includes('3d');
  const isCulturalHeritageVisible = !['Domestic Pet', 'Wild Animal', 'Bird', 'Marine', 'Macro', 'Still life', 'No person', 'Background'].some(key => options.subject.includes(key));
  const currentQuantityOptions = useSystemKey ? SYSTEM_QUANTITY_OPTIONS : PERSONAL_QUANTITY_OPTIONS;

  return (
    <div key={resetKey} className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${isDarkMode ? 'dark bg-[#0b1120] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800/60 z-[100] flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <Command size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[13px] font-black uppercase tracking-tighter leading-none">PROMPT MASTER</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">V3.0 PRODUCTION</span>
              <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border flex items-center gap-1 ${options.model.includes('pro') ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                {options.model.includes('pro') ? <Zap size={8} /> : <Cpu size={8} />}
                <span>{options.model.includes('pro') ? 'PRO-ENGINE' : 'FLASH-ENGINE'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button onClick={resetWorkspace} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-[0.95]">
             <Trash2 size={14} />
             <span>Reset</span>
          </button>
          
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
             <Settings size={14} />
             <span>Config</span>
          </button>
          
          {batches.length > 0 && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
              <button 
                onClick={copyAllWorkspacePrompts}
                className={`flex items-center gap-3 px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-[0.96] ${isAllCopied ? 'bg-emerald-500 text-white border border-emerald-500' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 border border-transparent'}`}
              >
                {isAllCopied ? <Check size={14} strokeWidth={3} /> : <Download size={14} />}
                <span>{isAllCopied ? 'Copied' : 'Export All'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      <aside className="w-[340px] border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0b1120] flex flex-col shrink-0 relative z-40 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 px-6">
          <div className="py-8 flex flex-col gap-10 pb-32">
            
            {/* Feature Cards */}
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[20px] relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                    <MessageSquareCode size={16} />
                  </div>
                  <button onClick={() => setOptions({...options, useExtraKeywords: !options.useExtraKeywords})} className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${options.useExtraKeywords ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${options.useExtraKeywords ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <h4 className="text-[12px] font-bold">Smart Refinement</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 leading-relaxed">Inject custom keywords into the architect logic.</p>
                {options.useExtraKeywords && (
                  <textarea value={options.extraKeywords} onChange={(e) => setOptions({...options, extraKeywords: e.target.value})} placeholder="Keywords..." className="w-full mt-3 h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[12px] outline-none" />
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[20px] relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <button onClick={() => setOptions({...options, useCalendar: !options.useCalendar})} className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${options.useCalendar ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${options.useCalendar ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <h4 className="text-[12px] font-bold">Dynamic Seasonality</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 leading-relaxed">Add month and holiday specific context.</p>
                {options.useCalendar && (
                  <div className="mt-4 space-y-3">
                    <select value={options.calendarMonth} onChange={e => setOptions({...options, calendarMonth: e.target.value, calendarEvent: EVENTS_BY_MONTH[e.target.value][0]})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-[12px] outline-none">
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={options.calendarEvent} onChange={e => setOptions({...options, calendarEvent: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-[12px] outline-none">
                      {EVENTS_BY_MONTH[options.calendarMonth].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Config Sections */}
            <div className="space-y-12">
              <section className="space-y-6">
                <header className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Identity & Character</h3>
                </header>
                <div className="space-y-5">
                   <CustomDropdown label="Primary Actor" value={options.subject} options={OPTIONS.subject} onChange={(val) => setOptions({...options, subject: val})} icon={User} canToggle={true} isActive={options.activeFields?.subject} onToggle={(val) => toggleField('subject', val)} />
                   {isCulturalHeritageVisible && (
                      <CustomDropdown label="Cultural Context" value={options.characterBackground} options={OPTIONS.characterBackground} onChange={(val) => setOptions({...options, characterBackground: val})} icon={Globe} canToggle={true} isActive={options.activeFields?.characterBackground} onToggle={(val) => toggleField('characterBackground', val)} />
                   )}
                </div>
              </section>

              <section className="space-y-6">
                <header className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">World & Style</h3>
                </header>
                <div className="space-y-5">
                   <CustomDropdown label="Visual Style" value={options.visualType} options={OPTIONS.visualType} onChange={(val) => setOptions({...options, visualType: val})} icon={Layers} canToggle={true} isActive={options.activeFields?.visualType} onToggle={(val) => toggleField('visualType', val)} />
                   <CustomDropdown label="Environment" value={options.environment} options={OPTIONS.environment} onChange={(val) => setOptions({...options, environment: val})} icon={Box} canToggle={true} isActive={options.activeFields?.environment} onToggle={(val) => toggleField('environment', val)} />
                   {isMaterialFinishVisible && (
                      <CustomDropdown label="Material Finish" value={options.materialStyle} options={OPTIONS.materialStyle} onChange={(val) => setOptions({...options, materialStyle: val})} icon={Paintbrush} canToggle={true} isActive={options.activeFields?.materialStyle} onToggle={(val) => toggleField('materialStyle', val)} />
                   )}
                </div>
              </section>

              <section className="space-y-6">
                <header className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Optics & Technicals</h3>
                </header>
                <div className="space-y-5">
                   <CustomDropdown label="Quality & Camera" value={options.qualityCamera} options={OPTIONS.qualityCamera} onChange={(val) => setOptions({...options, qualityCamera: val})} icon={Video} canToggle={true} isActive={options.activeFields?.qualityCamera} onToggle={(val) => toggleField('qualityCamera', val)} />
                   <CustomDropdown label="Shot Framing" value={options.framing} options={OPTIONS.framing} onChange={(val) => setOptions({...options, framing: val})} icon={Maximize} canToggle={true} isActive={options.activeFields?.framing} onToggle={(val) => toggleField('framing', val)} />
                   <CustomDropdown label="Camera Elevation" value={options.cameraAngle} options={OPTIONS.cameraAngle} onChange={(val) => setOptions({...options, cameraAngle: val})} icon={Camera} canToggle={true} isActive={options.activeFields?.cameraAngle} onToggle={(val) => toggleField('cameraAngle', val)} />
                   <CustomDropdown label="Subject Placement" value={options.subjectPosition} options={OPTIONS.subjectPosition} onChange={(val) => setOptions({...options, subjectPosition: val})} icon={Layout} canToggle={true} isActive={options.activeFields?.subjectPosition} onToggle={(val) => toggleField('subjectPosition', val)} />
                   <CustomDropdown label="Atmosphere" value={options.lighting} options={OPTIONS.lighting} onChange={(val) => setOptions({...options, lighting: val})} icon={Sparkles} canToggle={true} isActive={options.activeFields?.lighting} onToggle={(val) => toggleField('lighting', val)} />
                   <CustomDropdown label="Shadows" value={options.shadowStyle} options={OPTIONS.shadowStyle} onChange={(val) => setOptions({...options, shadowStyle: val})} icon={Moon} canToggle={true} isActive={options.activeFields?.shadowStyle} onToggle={(val) => toggleField('shadowStyle', val)} />
                </div>
              </section>

              <section className="space-y-6">
                <header className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Output Parameters</h3>
                </header>
                <div className="space-y-5">
                   <CustomDropdown label="Batch Quantity" value={options.quantity} options={currentQuantityOptions} onChange={(val) => setOptions({...options, quantity: val})} icon={Settings2} />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 p-6 bg-white dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800/60 z-50">
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3.5 rounded-full bg-white dark:bg-white text-slate-900 font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 shadow-lg hover:bg-slate-50 active:scale-[0.97] transition-all">
             {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="fill-current" />}
             <span>Run Architect</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50 dark:bg-[#020617] pt-16" style={{ backgroundImage: isDarkMode ? 'radial-gradient(circle, #1e293b 1px, transparent 1px)' : 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        {isGenerating && (
          <div className="fixed top-16 left-[340px] right-0 bottom-0 z-50 flex items-center justify-center bg-white/60 dark:bg-[#020617]/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-10 flex flex-col items-center gap-8 shadow-2xl">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-[3px] border-slate-100 dark:border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-[3px] border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-500"><Zap size={24} /></div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{LOADING_STEPS[loadingStepIdx]}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">Architect is processing...</p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-8 py-16 min-h-full flex flex-col">
          {batches.length > 0 ? (
            <div className="flex flex-col gap-12 flex-1">
               {batches.map((batch, idx) => (
                  <div key={batch.id} className="space-y-8">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm"><Clock size={18} /></div>
                        <span className="text-sm font-bold opacity-60">BATCH {batches.length - idx}</span>
                      </div>
                      <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{new Date(batch.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="grid gap-6">
                      {batch.prompts.map((p, pIdx) => (
                        <div key={p.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[24px] p-8 flex flex-col gap-6 hover:shadow-xl transition-all">
                          <div className="flex items-center justify-between">
                            <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest">Efficiency: {p.qualityScore}%</div>
                            <span className="text-2xl font-black opacity-10">#{pIdx+1}</span>
                          </div>
                          <p className="text-[15px] font-medium leading-relaxed">{p.text}</p>
                          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                             <button onClick={() => copyIndividual(batch.id, p.id, p.text)} className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${p.copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 shadow-md'}`}>
                               {p.copied ? <><Check size={14} className="inline mr-2" />Copied</> : 'Copy Prompt'}
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-welcome-reveal">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[30px] flex items-center justify-center text-slate-400 mb-8 border border-slate-200 dark:border-slate-800">
                <Terminal size={32} />
              </div>
              <h2 className="text-[32px] font-black uppercase tracking-tightest leading-tight mb-4">Ready to Architect</h2>
              <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-16">Configure your parameters in the sidebar to build high-performance commercial stock prompts.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-[28px] text-left space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500"><Zap size={20} className="fill-current" /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Production Grade</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">Prompts are algorithmically optimized for Adobe Stock and Freepik guidelines.</p>
                </div>
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-[28px] text-left space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><Shield size={20} className="fill-current" /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Dual Intelligence</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">Seamlessly transition between Gemini Flash and Pro engines based on complexity.</p>
                </div>
              </div>
            </div>
          )}
          
          <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-10">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <Shield size={12} />
              <span>© 2026 PROMPT MASTER . ARCHITECT SERIES</span>
            </div>
            <a href="https://t.me/designbd2" target="_blank" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 flex items-center gap-2 transition-opacity">
               <Send size={12} />
               <span>Telegram Community</span>
            </a>
          </footer>
        </div>
        <button onClick={scrollToTop} className={`fixed bottom-10 right-10 z-[90] p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl transition-all duration-500 ease-out transform ${showScrollTop ? 'translate-y-0 opacity-100 rotate-0' : 'translate-y-20 opacity-0 rotate-45 pointer-events-none'}`}>
          <ChevronUp size={24} strokeWidth={3} />
        </button>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] p-8 space-y-8 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={20} /></button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl flex items-center justify-center"><Settings size={24} /></div>
                <div>
                  <h2 className="text-lg font-black uppercase">Configuration</h2>
                  <p className="text-xs text-slate-500">System architecture & secrets</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest">Engine Mode (Locked by Key Type)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {OPTIONS.model.map(m => {
                      const isModelActive = options.model === m.value;
                      return (
                        <div key={m.value} className={`p-4 rounded-2xl border text-left transition-all ${isModelActive ? 'border-blue-500 bg-blue-500/10 opacity-100' : 'border-slate-100 dark:border-slate-800 opacity-40 grayscale'}`}>
                          <div className={`text-xs font-bold ${isModelActive ? 'text-blue-500' : ''}`}>{m.label}</div>
                          {isModelActive && <div className="text-[9px] mt-1 font-medium">{useSystemKey ? 'Auto-selected for System Key' : 'Auto-selected for Personal Key'}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest">Connectivity</label>
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[20px] space-y-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSystemKey(!useSystemKey)}>
                       <span className="text-xs font-bold">System Key Mode</span>
                       <button onClick={(e) => { e.stopPropagation(); toggleSystemKey(!useSystemKey); }} className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${useSystemKey ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                         <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${useSystemKey ? 'translate-x-5' : 'translate-x-0'}`} />
                       </button>
                    </div>
                    {!useSystemKey && (
                      <input type="password" value={apiKey} onChange={e => saveApiKey(e.target.value)} placeholder="API Key..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-xs outline-none focus:border-blue-500" onClick={(e) => e.stopPropagation()} />
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-full font-black uppercase tracking-widest text-xs shadow-lg active:scale-[0.98] transition-all">Save Settings</button>
           </div>
        </div>
      )}
    </div>
  );
}