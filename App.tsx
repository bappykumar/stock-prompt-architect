import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, Check, Copy, ChevronDown, Loader2, 
  ShieldCheck, Command, Trash2, 
  ExternalLink, Zap, Clock, 
  Globe, Shield, Terminal, Calendar, 
  Layers, Camera, Box, Maximize, User, Moon, Sun,
  Layout, Fingerprint, Focus, Settings2, Download, MessageSquareCode, Send, AlertCircle, X, Cpu, Paintbrush,
  ChevronUp, Key, Lock, Info, Settings, ToggleLeft, ToggleRight, Activity, Power, Video, Target, Lightbulb, Search, Shuffle, Image, Type, RefreshCw
} from 'lucide-react';
import { PromptOptions, GeneratedPrompt, PromptBatch, HistoricalPrompt, ApiKeyRecord } from './types';
import { generateStockPrompts, testApiKey, analyzeReferenceAndSuggestSettings } from './services/geminiService';
import { QUICK_START_PRESETS } from './presets';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Extract just the base64 part, removing the data URL prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

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
  conceptFocus: 'Default / Auto',
  authenticity: 'Default / Auto',
  interaction: 'Default / Auto',
  targetMarket: 'Default / Auto',
  imageMedium: 'Default / Auto',
  ageRange: 'Default / Auto',
  colorMood: 'Default / Auto',
  qualityCamera: 'Default / Auto',
  quantity: 3,
  smartRefinementText: '',
  extraContext: '',
  useCalendar: false,
  calendarMonth: MONTHS[new Date().getMonth()],
  calendarEvent: 'None',
  model: 'gemini-2.5-flash',
  activeFields: {
    subject: true,
    characterBackground: true,
    visualType: true,
    imageMedium: true,
    environment: true,
    lighting: true,
    framing: true,
    cameraAngle: true,
    subjectPosition: true,
    shadowStyle: true,
    materialStyle: true,
    visual3DStyle: true,
    qualityCamera: true,
    conceptFocus: true,
    authenticity: true,
    interaction: true,
    targetMarket: true,
    ageRange: true,
    colorMood: true,
    smartRefinement: false
  }
});

const DEFAULT_OPTIONS = getFreshDefaultOptions();

const OPTIONS = {
  subject: [
    { value: 'Default / Auto', label: 'Default / Auto' },

    // --- Human – Single Person ---
    { value: 'Business professional', label: 'Business Professional' },
    { value: 'Casual person', label: 'Casual Person' },
    { value: 'Creative person', label: 'Creative Person' },
    { value: 'Student / Academic', label: 'Student / Academic' },
    { value: 'Senior citizen', label: 'Senior Citizen' },
    { value: 'Fitness enthusiast', label: 'Fitness Enthusiast' },
    { value: 'Tech developer', label: 'Tech Developer' },
    { value: 'Content Creator / Influencer', label: 'Content Creator / Influencer' },
    { value: 'Teenager / Gen Z', label: 'Young Person / Gen Z' },
    { value: 'Baby / Toddler', label: 'Baby / Toddler' },
    { value: 'E-commerce Fashion Model', label: 'E-commerce Fashion Model' },

    // --- Human – Multiple People ---
    { value: 'Romantic Couple', label: 'Romantic Couple' },
    { value: 'Group of Friends', label: 'Group of Friends' },
    { value: 'Business Team', label: 'Business Team' },
    { value: 'Parent & Child', label: 'Parent & Child' },
    { value: 'Family group', label: 'Family Group' },
    { value: 'Doctor / Medical Team', label: 'Doctor / Medical Team' },

    // --- Profession / Role-Based Humans ---
    { value: 'Healthcare professional', label: 'Healthcare Professional' },
    { value: 'Caregiver / Home Nurse', label: 'Caregiver / Home Nurse' },
    { value: 'Chef / Kitchen Staff', label: 'Chef / Kitchen Staff' },
    { value: 'Teacher / Educator', label: 'Teacher / Educator' },
    { value: 'Scientist / Researcher', label: 'Scientist / Researcher' },
    { value: 'Construction Worker', label: 'Construction Worker' },
    { value: 'Delivery Person / Logistics', label: 'Delivery Person / Logistics' },
    { value: 'Retail Worker / Shop Staff', label: 'Retail Worker / Shop Staff' },
    { value: 'Manual Laborer / Factory Worker', label: 'Manual Laborer / Factory Worker' },

    // --- Animals & Wildlife ---
    { value: 'Domestic Pet (Cat, Dog, etc.)', label: 'Domestic Pet (Cat, Dog)' },
    // --- Non-Human Content ---
    { value: 'Still life / Food & Drink', label: 'Still life / Food & Drink' },
    { value: 'No person (product)', label: 'Product / Object Only' },
    { value: 'Abstract Shape / Graphic Element', label: 'Abstract Shape / Graphic Element' },
    { value: 'Icon / Logo Concept', label: 'Icon / Logo Concept' },
    { value: 'Background / Landscape only', label: 'Background / Landscape Only' }
  ],
  ageRange: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Young Adult (20s-30s)', label: 'Young Adult (20s–30s)' },
    { value: 'Middle-Aged (40s-50s)', label: 'Middle-Aged (40s–50s)' },
    { value: 'Senior (60s+)', label: 'Senior (60+)' },
    { value: 'Young Teen (13-17, school context only)', label: 'Teen / School Age' }
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
    { value: 'Latin American', label: 'Latin American' },
    { value: 'Multiracial / Mixed', label: 'Multiracial / Mixed' }
  ],
  conceptFocus: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Emotional Concept', label: 'Emotional Concept' },
    { value: 'Functional / Activity Concept', label: 'Functional / Activity' },
    { value: 'Problem-Solution Concept', label: 'Problem-Solution' },
    { value: 'Aspirational Concept', label: 'Aspirational' },
    { value: 'Wellness / Self-Care Concept', label: 'Wellness / Self-Care' },
    { value: 'Connection / Relationship Concept', label: 'Connection / Relationship' }
  ],
  authenticity: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Candid / Natural', label: 'Candid / Natural' },
    { value: 'Posed / Commercial', label: 'Posed / Commercial' },
    { value: 'Documentary Style', label: 'Documentary Style' }
  ],
  interaction: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Eye Contact', label: 'Eye Contact' },
    { value: 'Side by Side', label: 'Side by Side' },
    { value: 'Support Gesture', label: 'Support Gesture' },
    { value: 'Caring / Comforting', label: 'Caring / Comforting' },
    { value: 'Examining / Consulting', label: 'Examining / Consulting' },
    { value: 'Independent / Reflective', label: 'Independent / Reflective' }
  ],
  targetMarket: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Corporate', label: 'Corporate' },
    { value: 'Startup / Modern', label: 'Startup / Modern' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Education', label: 'Education' },
    { value: 'Social Awareness', label: 'Social Awareness' },
    { value: 'Wellness / Beauty', label: 'Wellness / Beauty' },
    { value: 'Retail / E-commerce', label: 'Retail / E-commerce' },
    { value: 'Food & Restaurant', label: 'Food & Restaurant' },
    { value: 'Travel / Tourism', label: 'Travel / Tourism' },
    { value: 'Finance / Banking', label: 'Finance / Banking' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'Non-profit / NGO', label: 'Non-profit / NGO' }
  ],
  colorMood: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Warm & Golden', label: 'Warm & Golden' },
    { value: 'Cool & Clinical', label: 'Cool & Clinical' },
    { value: 'Soft Pastel', label: 'Soft Pastel' },
    { value: 'Neutral & Earthy', label: 'Neutral & Earthy' },
    { value: 'Vibrant & Bold', label: 'Vibrant & Bold' },
    { value: 'Moody & Dark', label: 'Moody & Dark' },
    { value: 'Monochromatic', label: 'Monochromatic' }
  ],
  imageMedium: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Photography', label: 'Photography' },
    { value: '3D & CGI', label: '3D & CGI' },
    { value: 'Art & Illustration', label: 'Art & Illustration' }
  ],
  visualType: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    
    { value: 'header_photography', label: '--- Photography ---' },
    { value: 'Standard photo', label: 'Standard Photo' },
    { value: 'Ultra Realistic', label: 'Ultra Realistic' },
    { value: 'Cinematic', label: 'Cinematic' },
    { value: 'Cinematic Film (Kodak Portra)', label: 'Film Photography Style' },
    { value: 'Minimalist Studio Photo', label: 'Minimalist Studio Photo' },
    { value: 'Hyper Detailed', label: 'Hyper Detailed' },
    { value: 'Documentary / Editorial', label: 'Documentary / Editorial' },
    
    { value: 'header_3d', label: '--- 3D & CGI ---' },
    { value: 'Premium 3D Icon', label: 'Premium 3D Icon' },
    { value: '3D Render', label: '3D Render (General)' },
    { value: '3D illustration', label: '3D Illustration' },
    { value: 'Isometric 3D', label: 'Isometric 3D' },
    { value: 'Claymorphism', label: 'Claymorphism' },
    
    { value: 'header_art', label: '--- Art & Illustration ---' },
    { value: 'Anime Style', label: 'Anime Style' },
    { value: 'Oil Painting', label: 'Oil Painting' },
    { value: 'Minimalist Vector', label: 'Minimalist Vector' },
    { value: 'Flat Illustration', label: 'Flat Illustration' },
    { value: 'Paper Cut Art', label: 'Paper Cut Art' },
    { value: 'Line Art', label: 'Line Art / Sketch' }
  ],
  materialStyle: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Realistic', label: 'Realistic' },
    { value: 'Glossy / Shiny', label: 'Glossy / Shiny' },
    { value: 'Metallic / Chrome', label: 'Metallic / Chrome' },
    { value: 'Matte / Soft', label: 'Matte / Soft' },
    { value: 'Clay / Pastel', label: 'Clay / Pastel' }
  ],
  environment: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'White Background', label: 'White Background' },
    { value: 'Solid Color / Studio', label: 'Solid Color / Studio' },
    { value: 'Pitch Black / Void', label: 'Pitch Black / Void' },
    { value: 'Modern Office', label: 'Modern Office' },
    { value: 'Home Interior', label: 'Home Interior' },
    { value: 'Zen Minimalist Room', label: 'Zen Minimalist Room' },
    { value: 'Nature / Outdoor', label: 'Nature / Outdoor' },
    { value: 'City Street', label: 'City Street' },
    { value: 'Hospital / Clinic', label: 'Hospital / Clinic' },
    { value: 'Home Care / Living Room', label: 'Home Care / Living Room' },
    { value: 'Pharmacy / Drugstore', label: 'Pharmacy / Drugstore' },
    { value: 'Cafe / Restaurant', label: 'Cafe / Restaurant' },
    { value: 'Scientific Research Lab', label: 'Scientific Research Lab' },
    { value: 'Classroom / University', label: 'Classroom / University' },
    { value: 'Gym / Fitness Center', label: 'Gym / Fitness Center' },
    { value: 'Retail Store / Shopping Mall', label: 'Retail Store / Shopping Mall' },
    { value: 'Airport / Transit Hub', label: 'Airport / Transit Hub' },
    { value: 'Academic Library / Archive', label: 'Academic Library / Archive' },
    { value: 'Industrial / Factory Floor', label: 'Industrial / Factory Floor' },
    { value: 'Outdoor Market / Bazaar', label: 'Outdoor Market / Bazaar' }
  ],
  qualityCamera: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Ultra Detailed Texture', label: 'Ultra Detailed' },
    { value: 'Natural Background Separation', label: 'Natural Background Separation' },
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
    { value: 'Cinematic Lighting', label: 'Cinematic Lighting' },
    { value: 'Professional Studio Lighting', label: 'Studio Lighting' },
    { value: 'Warm indoor', label: 'Warm Indoor' },
    { value: 'Golden hour', label: 'Golden Hour' },
    { value: 'Overcast / Diffused', label: 'Overcast / Diffused' }
  ],
  shadowStyle: [
    { value: 'Default / Auto', label: 'Default / Auto' },
    { value: 'Natural Shadow', label: 'Natural Shadow' },
    { value: 'No Shadow / Flat', label: 'No Shadow / Flat' },
    { value: 'Soft Studio Shadow', label: 'Soft Studio Shadow' },
    { value: 'Strong / Bold Shadow', label: 'Bold Shadow' },
    { value: 'Minimal Base Shadow', label: 'Minimal Base' }
  ],
  model: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast & efficient. Best for Free Tier limits.', provider: 'gemini' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Complex reasoning. Recommended for Pro/Paid limits.', provider: 'gemini' },
    { value: 'llama3-70b-8192', label: 'Llama 3 70B', desc: 'Lightning fast generation via Groq.', provider: 'groq' },
    { value: 'llama3-8b-8192', label: 'Llama 3 8B', desc: 'Faster and free tier optimized.', provider: 'groq' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', desc: 'Excellent open-source model.', provider: 'groq' },
    { value: 'mistral-large-latest', label: 'Mistral Large', desc: 'Top-tier reasoning by Mistral AI.', provider: 'mistral' },
    { value: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)', desc: 'Free via OpenRouter', provider: 'openrouter' },
    { value: 'meta-llama/llama-3-8b-instruct:free', label: 'Llama 3 8B (Free)', desc: 'Free via OpenRouter', provider: 'openrouter' },
    { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)', desc: 'Free via OpenRouter', provider: 'openrouter' }
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
    onToggle,
    helperText,
    highlight,
    deemphasize3DMaterials
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
    helperText?: string;
    highlight?: boolean;
    deemphasize3DMaterials?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    const safeOptions = Array.isArray(options) ? options : [];
    const selectedOption = safeOptions.find(opt => opt.value === value) || safeOptions[0] || { label: 'Select...', value: '' };
    
    const isInputDisabled = disabled || (canToggle && !isActive);
    const isDefault = value === 'Default / Auto';
    const hasGroups = safeOptions.some(opt => opt.label.startsWith('---'));
    const showSearch = safeOptions.length > 10;
  
    // Visual Style Badge Logic
    const getVisualStyleBadge = (val: string | number) => {
      if (label !== "Visual Style") return null;
      const opt = safeOptions.find(o => o.value === val);
      if (!opt) return null;
      
      // Find the group this option belongs to
      let currentGroup = "";
      for (const o of safeOptions) {
        if (o.label.startsWith('---')) {
          currentGroup = o.label;
        }
        if (o.value === val) break;
      }
  
      if (currentGroup.includes("Photography")) return <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2">Photography</span>;
      if (currentGroup.includes("3D & CGI")) return <span className="text-[9px] font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded ml-2">3D Render</span>;
      if (currentGroup.includes("Art & Illustration")) return <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">Illustration</span>;
      return null;
    };
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    useEffect(() => {
      if (!isOpen) {
        setSearchQuery("");
      } else if (showSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }, [isOpen, showSearch]);
  
    const filteredOptions = safeOptions.filter(opt => {
      if (!searchQuery) return true;
      return opt.label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  
    return (
      <div className={`w-full relative group ${isOpen ? 'z-[100]' : 'z-auto'}`} ref={dropdownRef}>
        <div className="flex items-center justify-between mb-2 ml-1">
          <div className={`flex items-center gap-2 transition-opacity duration-300 ${isInputDisabled ? 'opacity-50' : 'opacity-100'}`}>
            {Icon && <Icon size={12} className="text-slate-400 dark:text-slate-500" />}
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
            {!isDefault && !isInputDisabled && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)] animate-in fade-in zoom-in duration-300" />
            )}
            {!isOpen && !isDefault && getVisualStyleBadge(value)}
          </div>
          {canToggle && onToggle && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(!isActive);
              }}
              className="focus:outline-none transition-transform active:scale-95"
            >
              {isActive ? (
                <ToggleRight size={18} className="text-blue-500 dark:text-blue-400 drop-shadow-sm" />
              ) : (
                <ToggleLeft size={18} className="text-slate-300 dark:text-slate-700" />
              )}
            </button>
          )}
        </div>
        <div className={`relative transition-all duration-300 ${isInputDisabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
          <button
            type="button"
            disabled={isInputDisabled}
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between bg-white dark:bg-slate-900/40 border px-4 py-3 rounded-xl text-[13px] font-medium text-left transition-all duration-200 outline-none
              ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : highlight ? 'border-purple-500/50 ring-1 ring-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'}
              ${isDefault ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}
              disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedOption.label}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </button>
  
          {helperText && (
            <p className="mt-1.5 ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium animate-in fade-in slide-in-from-top-1">{helperText}</p>
          )}
  
          {isOpen && (
            <div className="absolute z-[200] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
              {showSearch && (
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-[12px] outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto custom-scrollbar py-1.5">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isHeader = opt.label.startsWith('---');
                    if (isHeader) {
                      return (
                        <div key={opt.value} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 mt-1 first:mt-0 border-y border-slate-100 dark:border-slate-800/50 first:border-t-0 select-none sticky top-0 z-10 backdrop-blur-sm">
                          {opt.label.replace(/---/g, '').trim()}
                        </div>
                      );
                    }
                    const isSelected = opt.value === value;
                    const isDefaultOption = opt.value === 'Default / Auto';
                    
                    // Contextual opacity for Material Finish
                    let opacityClass = "opacity-100";
                    if (label === "Material Finish" && !highlight && deemphasize3DMaterials) {
                       const is3DMaterial = ["Glassmorphism", "Metallic", "Clay", "Frosted"].some(k => opt.label.includes(k));
                       if (is3DMaterial) opacityClass = "opacity-50 group-hover:opacity-100 transition-opacity";
                    }
  
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center justify-between group transition-all duration-150
                          ${isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                          ${hasGroups && !isDefaultOption ? 'pl-8' : ''}
                        `}
                      >
                        <span className={`truncate ${opacityClass}`}>{opt.label}</span>
                        {isSelected && <Check size={14} className="shrink-0 text-blue-500" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center text-[12px] text-slate-400">
                    No options found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

function getRandomPresets(count: number) {
  const shuffled = [...QUICK_START_PRESETS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const PROVIDERS = [
  { id: 'gemini', name: 'Gemini', icon: Sparkles },
  { id: 'mistral', name: 'Mistral', icon: Command },
  { id: 'groq', name: 'Groq', icon: Zap },
  { id: 'openrouter', name: 'OpenRouter', icon: Globe },
];

const PROVIDER_LINKS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  mistral: 'https://console.mistral.ai/api-keys/',
  groq: 'https://console.groq.com/keys',
  openrouter: 'https://openrouter.ai/keys'
};

export default function App() {
  const [options, setOptions] = useState<PromptOptions>(() => {
    const saved = localStorage.getItem('prompt_options');
    const parsed = saved ? JSON.parse(saved) : getFreshDefaultOptions();
    
    // Ensure activeFields exists and merge with defaults to catch new fields
    const defaults = getFreshDefaultOptions();
    if (!parsed.activeFields) {
      parsed.activeFields = defaults.activeFields;
    } else {
      // Merge saved activeFields with defaults to ensure new fields are present
      parsed.activeFields = { ...defaults.activeFields, ...parsed.activeFields };
      
      // Explicitly ensure new fields are enabled if they were missing in saved state
      if (parsed.activeFields.imageMedium === undefined) {
        parsed.activeFields.imageMedium = true;
      }
    }
    
    // Ensure new top-level fields exist
    if (!parsed.imageMedium) {
      parsed.imageMedium = 'Default / Auto';
    }

    // Ensure model is valid
    const validModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    if (!validModels.includes(parsed.model)) {
      parsed.model = 'gemini-2.5-flash';
    }

    return parsed;
  });

  // Image Medium Filtering Logic
  const getFilteredVisualStyles = () => {
    const medium = options.imageMedium;
    if (!medium || medium === 'Default / Auto') return OPTIONS.visualType;

    if (medium === 'Photography') {
      return OPTIONS.visualType.filter(opt => 
        opt.value === 'Default / Auto' || 
        opt.value === 'header_photography' ||
        ['Standard photo', 'Ultra Realistic', 'Cinematic', 'Cinematic Film (Kodak Portra)', 'Minimalist Studio Photo', 'Hyper Detailed', 'Documentary / Editorial'].includes(opt.value as string)
      );
    }
    
    if (medium === '3D & CGI') {
      return OPTIONS.visualType.filter(opt => 
        opt.value === 'Default / Auto' || 
        opt.value === 'header_3d' ||
        ['Premium 3D Icon', '3D Render', '3D illustration', 'Isometric 3D', 'Claymorphism'].includes(opt.value as string)
      );
    }

    if (medium === 'Art & Illustration') {
      return OPTIONS.visualType.filter(opt => 
        opt.value === 'Default / Auto' || 
        opt.value === 'header_art' ||
        ['Anime Style', 'Oil Painting', 'Minimalist Vector', 'Flat Illustration', 'Paper Cut Art', 'Line Art'].includes(opt.value as string)
      );
    }

    return OPTIONS.visualType;
  };

  // Handle Image Medium Change
  const handleImageMediumChange = (val: string) => {
    setOptions(prev => {
      const newOptions = { ...prev, imageMedium: val };
      
      // Reset Visual Style if incompatible with new medium
      const currentVisual = prev.visualType;
      if (currentVisual !== 'Default / Auto') {
        let isCompatible = true;
        
        if (val === 'Photography') {
          isCompatible = ['Standard photo', 'Ultra Realistic', 'Cinematic', 'Cinematic Film (Kodak Portra)', 'Minimalist Studio Photo', 'Hyper Detailed', 'Documentary / Editorial'].includes(currentVisual);
        } else if (val === '3D & CGI') {
          isCompatible = ['Premium 3D Icon', '3D Render', '3D illustration', 'Isometric 3D', 'Claymorphism'].includes(currentVisual);
        } else if (val === 'Art & Illustration') {
          isCompatible = ['Anime Style', 'Oil Painting', 'Minimalist Vector', 'Flat Illustration', 'Paper Cut Art', 'Line Art'].includes(currentVisual);
        }

        if (!isCompatible) {
          newOptions.visualType = 'Default / Auto';
        }
      }
      
      return newOptions;
    });
  };

  const filteredVisualStyles = getFilteredVisualStyles();

  // Material Finish Context Logic
  const isMaterialHighlighted = options.imageMedium === '3D & CGI' || options.visualType?.includes("3D") || options.visualType?.includes("CGI") || options.visualType?.includes("Render");
  const materialHelperText = isMaterialHighlighted ? "Primarily impactful for 3D & render-based styles" : undefined;

  const [displayedPresets, setDisplayedPresets] = useState(() => getRandomPresets(4));

  const [batches, setBatches] = useState<PromptBatch[]>(() => {
    const saved = localStorage.getItem('prompt_session_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(() => {
    const saved = localStorage.getItem('user_api_keys');
    if (saved) return JSON.parse(saved);
    
    // Migration from old single key
    const oldKey = localStorage.getItem('user_gemini_api_key');
    if (oldKey) {
      const migrated: ApiKeyRecord[] = [{ id: crypto.randomUUID(), key: oldKey, status: 'untested', addedAt: Date.now() }];
      localStorage.setItem('user_api_keys', JSON.stringify(migrated));
      localStorage.removeItem('user_gemini_api_key');
      return migrated;
    }
    return [];
  });

  const [activeKeyId, setActiveKeyId] = useState<string>(() => {
    return localStorage.getItem('active_api_key_id') || '';
  });

  const [newKeyInput, setNewKeyInput] = useState("");
  const [activeProviderTab, setActiveProviderTab] = useState<'gemini' | 'groq' | 'mistral' | 'openrouter'>('gemini');

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
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [testAllSummary, setTestAllSummary] = useState<{valid: number, invalid: number, total: number} | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);

  const [autoFillMode, setAutoFillMode] = useState<'image'|'text'>('text');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoFillSuccessMsg, setAutoFillSuccessMsg] = useState<string | null>(null);
  const [autoFillOptionsHash, setAutoFillOptionsHash] = useState<string | null>(null);

  const [isAdvanced, setIsAdvanced] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('prompt_mode');
    return savedMode === 'advanced';
  });

  const mainScrollRef = useRef<HTMLElement>(null);
  const loadingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setReferenceImage(file);
            setAutoFillMode('image');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, []);

  useEffect(() => {
    localStorage.setItem('prompt_mode', isAdvanced ? 'advanced' : 'basic');
  }, [isAdvanced]);

  useEffect(() => {
    localStorage.setItem('prompt_options', JSON.stringify(options));
  }, [options]);

  useEffect(() => {
    localStorage.setItem('prompt_session_history', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('theme_preference', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('user_api_keys', JSON.stringify(apiKeys));
    if (apiKeys.length > 0 && !apiKeys.find(k => k.id === activeKeyId)) {
      setActiveKeyId(apiKeys[0].id);
    } else if (apiKeys.length === 0) {
      setActiveKeyId('');
    }
  }, [apiKeys, activeKeyId]);

  useEffect(() => {
    localStorage.setItem('active_api_key_id', activeKeyId);
  }, [activeKeyId]);

  const handleAddKey = () => {
    if (!newKeyInput.trim()) return;
    const newKey: ApiKeyRecord = {
      id: crypto.randomUUID(),
      provider: activeProviderTab,
      key: newKeyInput.trim(),
      status: 'untested',
      addedAt: Date.now()
    };
    setApiKeys(prev => [...prev, newKey]);
    if (!activeKeyId) setActiveKeyId(newKey.id);
    setNewKeyInput("");
    
    // Automatically test the key right after it is added
    setTimeout(() => {
      handleTestKey(newKey.id);
    }, 100);
  };

  const handleRemoveKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const handleTestKey = async (id: string) => {
    const keyRecord = apiKeys.find(k => k.id === id);
    if (!keyRecord) return;
    
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'testing' } : k));
    
    try {
      await testApiKey(keyRecord.key, keyRecord.provider);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'valid' } : k));
    } catch (error) {
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'invalid' } : k));
    }
  };

  const handleTestAllKeys = async () => {
    if (apiKeys.length === 0) return;
    setIsTestingAll(true);
    setTestAllSummary(null);
    
    setApiKeys(prev => prev.map(k => ({ ...k, status: 'testing' })));

    let validCount = 0;
    let invalidCount = 0;

    const newKeys = await Promise.all(apiKeys.map(async (k) => {
      try {
        await testApiKey(k.key, k.provider);
        validCount++;
        return { ...k, status: 'valid' as const };
      } catch (e) {
        invalidCount++;
        return { ...k, status: 'invalid' as const };
      }
    }));

    setApiKeys(newKeys);
    setTestAllSummary({ valid: validCount, invalid: invalidCount, total: apiKeys.length });
    setIsTestingAll(false);
    
    setTimeout(() => setTestAllSummary(null), 5000);
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

  const resetWorkspace = useCallback(() => {
    setIsResetConfirmOpen(true);
  }, []);

  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => setShowScrollTop(scrollContainer.scrollTop > 400);
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const executeWithKeyRotation = async <T,>(
    operation: (key: string) => Promise<T>,
    providerOverride?: 'gemini' | 'groq' | 'mistral'
  ): Promise<T> => {
    const activeModelObj = OPTIONS.model.find(m => m.value === options.model);
    const requiredProvider = providerOverride || (activeModelObj ? activeModelObj.provider : 'gemini');

    let keysToTry: { id: string, key: string }[] = [];
    
    if (apiKeys.length > 0) {
      const compatibleKeys = apiKeys.filter(k => k.provider === requiredProvider);
      const currentIdx = compatibleKeys.findIndex(k => k.id === activeKeyId);
      if (currentIdx !== -1) {
        keysToTry = [...compatibleKeys.slice(currentIdx), ...compatibleKeys.slice(0, currentIdx)];
      } else {
        keysToTry = [...compatibleKeys];
      }
    }

    if (keysToTry.length === 0) {
      setIsModalOpen(true);
      throw new Error(`No API key configured for provider: ${requiredProvider}. Please add one.`);
    }

    let lastError: any = null;

    for (const keyRecord of keysToTry) {
      try {
        const result = await operation(keyRecord.key);
        if (keyRecord.id !== 'system' && keyRecord.id !== activeKeyId) {
          setActiveKeyId(keyRecord.id);
        }
        return result;
      } catch (err: any) {
        const isQuotaError = err.message?.toLowerCase().includes('quota') || err.message?.includes('429');
        if (isQuotaError) {
          lastError = err;
          continue;
        } else {
          throw err;
        }
      }
    }

    setIsModalOpen(true);
    throw new Error(apiKeys.length > 1 
      ? "All available API keys have exceeded their quota. Please add a new API key."
      : "Your API key has exceeded its quota. Please add a new API key.");
  };

  const handleAutoFill = async () => {
    setIsAnalyzing(true);
    setAutoFillSuccessMsg(null);
    try {
      let input: any;
      if (autoFillMode === 'image' && referenceImage) {
        const base64 = await fileToBase64(referenceImage);
        input = { type: 'image' as const, data: base64, mimeType: referenceImage.type };
      } else {
        input = { type: 'text' as const, description: options.smartRefinementText };
      }
      
      const activeModelObj = OPTIONS.model.find(m => m.value === options.model);
      let providerToUse = activeModelObj ? activeModelObj.provider as 'gemini'|'groq'|'mistral' : 'gemini';
      
      if (input.type === 'image' && providerToUse !== 'gemini') {
        providerToUse = 'gemini'; // Force Gemini for image processing
      }

      const result = await executeWithKeyRotation((key) => 
        analyzeReferenceAndSuggestSettings(input, OPTIONS, key, providerToUse)
      , providerToUse);
      
      let newOptions: any;
      setOptions(prev => {
        const resetActiveFields = Object.keys(prev.activeFields).reduce((acc, key) => ({...acc, [key]: false}), {});
        
        newOptions = {
          ...prev,
          ...result.settings,
          smartRefinementText: result.smartRefinement || prev.smartRefinementText,
          activeFields: {
            ...resetActiveFields,
            ...(result.activeFields || {}),
            smartRefinement: true
          }
        };
        return newOptions;
      });
      
      setAutoFillOptionsHash(JSON.stringify(newOptions));
      
      if (autoFillMode === 'image') {
        setAutoFillSuccessMsg("Settings and scene description auto-filled from your image — review before running.");
      } else {
        setAutoFillSuccessMsg("Settings auto-filled from your reference — review and adjust as needed before running.");
      }
    } catch (err: any) {
      console.warn('Auto-fill failed:', err);
      setErrorMessage(err.message || 'Auto-fill failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (apiKeys.length === 0) {
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
        batch.prompts.map(p => ({ text: p.text }))
      );
      
      const results = await executeWithKeyRotation((key) => 
        generateStockPrompts(options, key, history)
      );

      const newPrompts: GeneratedPrompt[] = results.map(r => ({
        id: crypto.randomUUID(),
        text: r.text,
        copied: false
      }));
      const newBatch: PromptBatch = { id: crypto.randomUUID(), timestamp: Date.now(), prompts: newPrompts };
      setBatches(prev => [newBatch, ...prev]);
      setDisplayedPresets(getRandomPresets(4));
    } catch (error: any) {
      console.warn('Generation failed:', error);
      setErrorMessage(error.message || "An unexpected error occurred while generating prompts.");
    } finally {
      setIsGenerating(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
  }, [options, batches, apiKeys, activeKeyId]);

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

  const isMaterialFinishVisible = true;
  const isCulturalHeritageVisible = !['Domestic Pet', 'Wild Animal', 'Bird', 'Marine', 'Macro', 'Still life', 'No person', 'Background'].some(key => options.subject?.includes(key));
  const currentQuantityOptions = PERSONAL_QUANTITY_OPTIONS;

  const stats = useMemo(() => {
    const total = batches.reduce((acc, batch) => acc + batch.prompts.length, 0);
    const copied = batches.flatMap(b => b.prompts).filter(p => p.copied).length;
    return { total, copied, pending: total - copied };
  }, [batches]);

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${isDarkMode ? 'dark bg-[#0b1120] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800/60 z-[100] flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <Command size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[13px] font-black uppercase tracking-tighter leading-none">PROMPT MASTER</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">SYS v1.5</span>
                <span className="w-px h-2 bg-slate-300 dark:bg-slate-700"></span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">PROD V3.1</span>
              </div>
              <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border flex items-center gap-1 ${options.model?.includes('pro') ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                {options.model?.includes('pro') ? <Zap size={8} /> : <Cpu size={8} />}
                <span>{options.model?.includes('pro') ? 'PRO-ENGINE' : 'FLASH-ENGINE'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {batches.length > 0 && (
            <div className="hidden md:flex items-center mr-4">
              <div className="flex items-center h-9 px-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                
                {/* Total Segment */}
                <div className="flex items-center gap-2 px-3 h-full">
                  <Layers size={13} className="text-slate-400" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-black text-slate-900 dark:text-white font-mono">{stats.total}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Generated</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />

                {/* Pending Segment */}
                <div className="flex items-center gap-2 px-3 h-full">
                  <div className={`w-1.5 h-1.5 rounded-full ${stats.pending > 0 ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'}`} />
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-[13px] font-black font-mono ${stats.pending > 0 ? 'text-slate-900 dark:text-white' : 'text-emerald-500'}`}>{stats.pending}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending</span>
                  </div>
                </div>

              </div>
            </div>
          )}

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

      <aside className="w-[340px] border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0b1120] flex flex-col shrink-0 relative z-40 h-full overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 px-6">
          <div className="py-8 flex flex-col gap-10 pb-32">
            
            {/* Quick Start Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quick Start</h3>
                <button 
                  onClick={() => setDisplayedPresets(getRandomPresets(4))}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Shuffle className="w-3 h-3" />
                  Shuffle
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {displayedPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const defaults = getFreshDefaultOptions();
                      setOptions({
                        ...defaults, // Reset all visual fields
                        quantity: options.quantity, // Preserve user config
                        smartRefinementText: options.smartRefinementText,
                        useCalendar: options.useCalendar,
                        calendarMonth: options.calendarMonth,
                        calendarEvent: options.calendarEvent,
                        model: options.model,
                        ...preset.settings // Apply the preset over the defaults
                      });
                    }}
                    className="py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors text-left truncate"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setIsAdvanced(false)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!isAdvanced 
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                Basic
              </button>
              <button
                onClick={() => setIsAdvanced(true)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${isAdvanced 
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                Advanced
              </button>
            </div>

            {/* Feature Cards */}
            <div className="space-y-5">
              <div className={`p-5 rounded-[24px] relative transition-all duration-300 border group
                ${options.activeFields?.smartRefinement 
                  ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 shadow-md' 
                  : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/40 dark:to-slate-900/20 border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-md'
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300
                      ${options.activeFields?.smartRefinement ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className={`text-[12px] font-bold transition-colors ${options.activeFields?.smartRefinement ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-200'}`}>Smart Refinement</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Extract settings and refine prompt</p>
                    </div>
                  </div>
                  <button onClick={() => setOptions({...options, activeFields: {...options.activeFields, smartRefinement: !options.activeFields?.smartRefinement}})} className={`w-11 h-6 rounded-full relative transition-colors duration-300 ease-out focus:outline-none ${options.activeFields?.smartRefinement ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${options.activeFields?.smartRefinement ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {options.activeFields?.smartRefinement && (
                  <>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 mb-4">
                      <button onClick={() => setAutoFillMode('image')} className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${autoFillMode === 'image' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Image size={12} /> Image
                      </button>
                      <button onClick={() => setAutoFillMode('text')} className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${autoFillMode === 'text' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Type size={12} /> Text
                      </button>
                    </div>

                    {autoFillMode === 'image' ? (
                      <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center min-h-[8rem]">
                        <input type="file" accept="image/jpeg, image/png" onChange={(e) => setReferenceImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                        {referenceImage ? (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-900/5 dark:bg-slate-900/50">
                            <img src={URL.createObjectURL(referenceImage)} alt="Preview Background" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm pointer-events-none" />
                            <img src={URL.createObjectURL(referenceImage)} alt="Preview" className="relative z-10 w-full h-full object-contain pointer-events-none" />
                            
                            {/* Scanning Animation */}
                            {isAnalyzing && (
                              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                <div className="w-full h-0.5 bg-blue-500 shadow-[0_0_20px_4px_rgba(59,130,246,0.8)] absolute animate-[scan_1.5s_ease-in-out_infinite]" />
                              </div>
                            )}
                            
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/10 max-w-[90%] pointer-events-none">
                              <Check size={12} className="text-green-400 shrink-0" />
                              <span className="truncate">{referenceImage.name}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium text-slate-500 flex flex-col items-center gap-1 p-6 relative z-10">
                            <Image size={18} className="text-slate-400 mb-1" />
                            <span>Drop, click, or paste (Ctrl+V) image anywhere</span>
                            <span className="text-[9px] text-slate-400">JPG, PNG up to 10MB</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea value={options.smartRefinementText} onChange={(e) => setOptions({...options, smartRefinementText: e.target.value})} placeholder="Describe your concept (e.g. 'a moody cinematic shot of a businessman in rain')..." className="w-full h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none custom-scrollbar" />
                    )}

                    <button 
                      onClick={handleAutoFill} 
                      disabled={isAnalyzing || (autoFillMode === 'image' && !referenceImage) || (autoFillMode === 'text' && !options.smartRefinementText)} 
                      className={`w-full mt-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50
                        ${(autoFillSuccessMsg && autoFillOptionsHash === JSON.stringify(options)) 
                          ? 'bg-green-500 text-white hover:bg-green-600 disabled:hover:bg-green-500' 
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white disabled:hover:bg-slate-900 dark:disabled:hover:bg-white dark:disabled:hover:text-slate-900'}`}
                    >
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {autoFillMode === 'image' ? 'Analyze Image & Auto-Fill' : 'Auto-Fill Settings from Text'}
                    </button>
                    {autoFillSuccessMsg && (
                      <div className="mt-3 text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5 leading-tight">
                        <Check size={12} className="shrink-0" /> {autoFillSuccessMsg}
                      </div>
                    )}
                  </>
                )}
              </div>

              {isAdvanced && (
                <div className={`p-5 rounded-[24px] relative transition-all duration-300 border group
                  ${options.useCalendar 
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 shadow-md' 
                    : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/40 dark:to-slate-900/20 border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-md'
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300
                      ${options.useCalendar ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                      <Calendar size={16} />
                    </div>
                    <button onClick={() => setOptions({...options, useCalendar: !options.useCalendar})} className={`w-11 h-6 rounded-full relative transition-colors duration-300 ease-out focus:outline-none ${options.useCalendar ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${options.useCalendar ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <h4 className={`text-[12px] font-bold transition-colors ${options.useCalendar ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-200'}`}>Dynamic Seasonality</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 leading-relaxed font-medium">Add month and holiday specific context.</p>
                  {options.useCalendar && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <select value={options.calendarMonth} onChange={e => setOptions({...options, calendarMonth: e.target.value, calendarEvent: EVENTS_BY_MONTH[e.target.value][0]})} className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-[12px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <select value={options.calendarEvent} onChange={e => setOptions({...options, calendarEvent: e.target.value})} className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-[12px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                          {EVENTS_BY_MONTH[options.calendarMonth].map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Config Sections */}
            <div className="space-y-10">
              <section className="space-y-6">
                <header className="flex items-center gap-3 px-1">
                  <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Identity & Character</h3>
                </header>
                <div className="space-y-5">
                   <CustomDropdown label="Primary Actor" value={options.subject} options={OPTIONS.subject} onChange={(val) => setOptions({...options, subject: val})} icon={User} canToggle={true} isActive={options.activeFields?.subject} onToggle={(val) => toggleField('subject', val)} />
                   {isAdvanced && isCulturalHeritageVisible && (
                      <CustomDropdown label="Cultural Context" value={options.characterBackground} options={OPTIONS.characterBackground} onChange={(val) => setOptions({...options, characterBackground: val})} icon={Globe} canToggle={true} isActive={options.activeFields?.characterBackground} onToggle={(val) => toggleField('characterBackground', val)} />
                   )}
                   {isAdvanced && <CustomDropdown label="Age Range" value={options.ageRange || 'Default / Auto'} options={OPTIONS.ageRange} onChange={(val) => setOptions({...options, ageRange: val})} icon={User} canToggle={true} isActive={options.activeFields?.ageRange} onToggle={(val) => toggleField('ageRange', val)} />}
                   {isAdvanced && <CustomDropdown label="Interaction" value={options.interaction || 'Default / Auto'} options={OPTIONS.interaction} onChange={(val) => setOptions({...options, interaction: val})} icon={User} canToggle={true} isActive={options.activeFields?.interaction} onToggle={(val) => toggleField('interaction', val)} />}
                   {isAdvanced && <CustomDropdown label="Target Market" value={options.targetMarket || 'Default / Auto'} options={OPTIONS.targetMarket} onChange={(val) => setOptions({...options, targetMarket: val})} icon={Target} canToggle={true} isActive={options.activeFields?.targetMarket} onToggle={(val) => toggleField('targetMarket', val)} />}
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent opacity-60" />

              <section className="space-y-6">
                <header className="flex items-center gap-3 px-1">
                  <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">World & Style</h3>
                </header>
                <div className="space-y-5">
                   <div className="pb-5 border-b border-dashed border-slate-200 dark:border-slate-800/60 mb-2">
                      <CustomDropdown label="Image Medium" value={options.imageMedium || 'Default / Auto'} options={OPTIONS.imageMedium} onChange={handleImageMediumChange} icon={Layers} canToggle={true} isActive={options.activeFields?.imageMedium} onToggle={(val) => toggleField('imageMedium', val)} />
                   </div>
                   <CustomDropdown label="Visual Style" value={options.visualType} options={filteredVisualStyles} onChange={(val) => setOptions({...options, visualType: val})} icon={Layers} canToggle={true} isActive={options.activeFields?.visualType} onToggle={(val) => toggleField('visualType', val)} />
                   {isAdvanced && isMaterialFinishVisible && (
                      <CustomDropdown 
                        label="Material Finish" 
                        value={options.materialStyle} 
                        options={OPTIONS.materialStyle} 
                        onChange={(val) => setOptions({...options, materialStyle: val})} 
                        icon={Paintbrush} 
                        canToggle={true} 
                        isActive={options.activeFields?.materialStyle} 
                        onToggle={(val) => toggleField('materialStyle', val)}
                        highlight={isMaterialHighlighted}
                        helperText={materialHelperText}
                        deemphasize3DMaterials={options.imageMedium === 'Photography' || options.imageMedium === 'Art & Illustration'}
                      />
                   )}
                   {isAdvanced && <CustomDropdown label="Concept Focus" value={options.conceptFocus || 'Default / Auto'} options={OPTIONS.conceptFocus} onChange={(val) => setOptions({...options, conceptFocus: val})} icon={Lightbulb} canToggle={true} isActive={options.activeFields?.conceptFocus} onToggle={(val) => toggleField('conceptFocus', val)} />}
                   {isAdvanced && <CustomDropdown label="Authenticity" value={options.authenticity || 'Default / Auto'} options={OPTIONS.authenticity} onChange={(val) => setOptions({...options, authenticity: val})} icon={Camera} canToggle={true} isActive={options.activeFields?.authenticity} onToggle={(val) => toggleField('authenticity', val)} />}
                   <CustomDropdown label="Environment" value={options.environment} options={OPTIONS.environment} onChange={(val) => setOptions({...options, environment: val})} icon={Box} canToggle={true} isActive={options.activeFields?.environment} onToggle={(val) => toggleField('environment', val)} />
                   <CustomDropdown label="Color Mood" value={options.colorMood || 'Default / Auto'} options={OPTIONS.colorMood} onChange={(val) => setOptions({...options, colorMood: val})} icon={Paintbrush} canToggle={true} isActive={options.activeFields?.colorMood} onToggle={(val) => toggleField('colorMood', val)} helperText="Overall color temperature of the image" />
                </div>
              </section>

              {isAdvanced && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent opacity-60" />
                  <section className="space-y-6">
                    <header className="flex items-center gap-3 px-1">
                      <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Optics & Technicals</h3>
                    </header>
                    <div className="space-y-5">
                       <CustomDropdown label="Quality & Camera" value={options.qualityCamera} options={OPTIONS.qualityCamera} onChange={(val) => setOptions({...options, qualityCamera: val})} icon={Video} canToggle={true} isActive={options.activeFields?.qualityCamera} onToggle={(val) => toggleField('qualityCamera', val)} />
                       <CustomDropdown label="Shot Framing" value={options.framing} options={OPTIONS.framing} onChange={(val) => setOptions({...options, framing: val})} icon={Maximize} canToggle={true} isActive={options.activeFields?.framing} onToggle={(val) => toggleField('framing', val)} />
                       <CustomDropdown label="Camera Elevation" value={options.cameraAngle} options={OPTIONS.cameraAngle} onChange={(val) => setOptions({...options, cameraAngle: val})} icon={Camera} canToggle={true} isActive={options.activeFields?.cameraAngle} onToggle={(val) => toggleField('cameraAngle', val)} />
                       <CustomDropdown label="Atmosphere" value={options.lighting} options={OPTIONS.lighting} onChange={(val) => setOptions({...options, lighting: val})} icon={Sparkles} canToggle={true} isActive={options.activeFields?.lighting} onToggle={(val) => toggleField('lighting', val)} />
                       <CustomDropdown label="Shadows" value={options.shadowStyle} options={OPTIONS.shadowStyle} onChange={(val) => setOptions({...options, shadowStyle: val})} icon={Moon} canToggle={true} isActive={options.activeFields?.shadowStyle} onToggle={(val) => toggleField('shadowStyle', val)} />
                    </div>
                  </section>
                </>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent opacity-60" />

              <section className="space-y-6">
                <header className="flex items-center gap-3 px-1">
                  <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Output Parameters</h3>
                </header>
                <div className="space-y-5">
                   <CustomDropdown label="Batch Quantity" value={options.quantity} options={currentQuantityOptions} onChange={(val) => setOptions({...options, quantity: val})} icon={Settings2} />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 p-6 bg-white dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800/60 z-50 flex flex-col gap-3">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-[11px] flex items-start gap-2 shadow-sm">
               <div className="mt-0.5"><X size={14} className="shrink-0" /></div>
               <div className="flex-1 font-medium leading-tight">{errorMessage}</div>
               <button onClick={() => setErrorMessage(null)} className="opacity-50 hover:opacity-100 shrink-0"><X size={14} /></button>
            </div>
          )}
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group">
             {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="fill-current group-hover:scale-110 transition-transform" />}
             <span>Run Architect</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50 dark:bg-[#020617] pt-16" style={{ backgroundImage: isDarkMode ? 'radial-gradient(circle, #1e293b 1px, transparent 1px)' : 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        {isGenerating && (
          <div className="fixed left-[340px] right-0 bottom-12 z-50 flex justify-center pointer-events-none">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-5 shadow-2xl pointer-events-auto">
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 border-[3px] border-slate-100 dark:border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-[3px] border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-500"><Zap size={16} /></div>
              </div>
              <div className="flex flex-col min-w-[200px]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{LOADING_STEPS[loadingStepIdx]}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Architect is processing...</p>
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
                          <div className="flex justify-end">
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
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-[36px] flex items-center justify-center text-slate-400 mb-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
                <Terminal size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tightest leading-tight mb-4 bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-500 bg-clip-text text-transparent">Ready to Architect</h2>
              <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-16 opacity-60">Configure your parameters in the sidebar to build high-performance commercial stock prompts.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-[28px] text-left space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-300"><Zap size={20} className="fill-current" /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Production Grade</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">Prompts are algorithmically optimized for Adobe Stock and Freepik guidelines.</p>
                </div>
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-[28px] text-left space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300"><Shield size={20} className="fill-current" /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Dual Intelligence</h3>
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

      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 space-y-6 shadow-2xl relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center"><Trash2 size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Reset Workspace</h3>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Are you sure you want to clear all history and restore default settings? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl text-[12px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsResetConfirmOpen(false);
                    localStorage.removeItem('prompt_options');
                    localStorage.removeItem('prompt_session_history');
                    localStorage.setItem('use_system_api_key', 'false');
                    setOptions(getFreshDefaultOptions());
                    setBatches([]);
                    setDisplayedPresets(getRandomPresets(4));
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl text-[12px] font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirm Reset
                </button>
              </div>
           </div>
        </div>
      )}
      
      {isModalOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[32px] p-0 shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl flex items-center justify-center"><Settings size={24} /></div>
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white">API Secrets Management</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Configure models and connectivity</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {errorMessage && (
              <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-start gap-3 shadow-sm">
                 <div className="mt-0.5"><AlertCircle size={16} className="shrink-0" /></div>
                 <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <div className="p-8">
              {/* Provider Tabs */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-2 rounded-2xl mb-8">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProviderTab(p.id as any)}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeProviderTab === p.id ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                     <p.icon size={16} />
                     {p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Left Column: Configuration */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-4">Configuration</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Model Selection</label>
                        <select 
                          value={options.model} 
                          onChange={e => setOptions(prev => ({...prev, model: e.target.value as any}))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer appearance-none font-medium"
                        >
                          {OPTIONS.model.filter(m => m.provider === activeProviderTab).map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Add New API Key</label>
                        <div className="flex gap-2">
                          <input 
                            type="password"
                            value={newKeyInput}
                            onChange={e => setNewKeyInput(e.target.value)}
                            placeholder={`sk-...`}
                            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 font-medium"
                          />
                          <button 
                            onClick={handleAddKey}
                            disabled={!newKeyInput.trim()}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <a 
                        href={PROVIDER_LINKS[activeProviderTab]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-bold text-sm transition-colors mt-2"
                      >
                        <Key size={16} />
                        Get API Key from {PROVIDERS.find(p => p.id === activeProviderTab)?.name}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right Column: Stored Keys */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Stored Keys</h3>
                    {apiKeys.filter(k => k.provider === activeProviderTab).length > 0 && (
                      <button 
                        onClick={handleTestAllKeys}
                        disabled={isTestingAll}
                        className="text-xs font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                         {isTestingAll ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                         Test All
                      </button>
                    )}
                  </div>
                  
                  {testAllSummary && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between shadow-sm">
                       <span className="font-medium">Checked {testAllSummary.total} keys</span>
                       <div className="flex gap-3 font-bold text-[11px]">
                         <span className="text-emerald-600 dark:text-emerald-400">{testAllSummary.valid} Valid</span>
                         <span className="text-red-600 dark:text-red-400">{testAllSummary.invalid} Invalid</span>
                       </div>
                    </div>
                  )}

                  <div className="flex-1 min-h-[250px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                    {apiKeys.filter(k => k.provider === activeProviderTab).length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3 mt-10">
                        <Key size={32} className="opacity-50" />
                        <p className="text-sm font-medium">No keys found</p>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
                        {apiKeys.filter(k => k.provider === activeProviderTab).map(k => (
                          <div key={k.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${activeKeyId === k.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                               <div className="flex items-center gap-3 overflow-hidden">
                                 <div 
                                   onClick={() => setActiveKeyId(k.id)}
                                   className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${activeKeyId === k.id ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}
                                 >
                                   {activeKeyId === k.id && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                 </div>
                                 <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                                   {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 4)}
                                 </span>
                                 <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-full ${k.status === 'valid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : k.status === 'invalid' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : k.status === 'testing' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {k.status}
                                 </span>
                               </div>
                               <div className="flex items-center gap-2 shrink-0">
                                 <button 
                                   onClick={() => handleTestKey(k.id)} 
                                   disabled={k.status === 'testing'} 
                                   className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
                                 >
                                   {k.status === 'testing' ? 'Testing...' : 'Test'}
                                 </button>
                                 <button onClick={() => handleRemoveKey(k.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-8 pt-0 mt-2">
               <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-full font-black uppercase tracking-widest text-xs shadow-lg active:scale-[0.98] transition-all">Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}