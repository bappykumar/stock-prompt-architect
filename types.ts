
export interface PromptOptions {
  subject: string;
  characterBackground: string;
  useCase: string;
  visualType: string;
  format: string;
  environment: string;
  lighting: string;
  framing: string;
  cameraAngle: string;
  subjectPosition: string;
  shadowStyle: string;
  mockup: string;
  visual3DStyle: string;
  materialStyle: string;
  qualityCamera: string;
  quantity: number;
  smartRefinementText: string;
  extraContext?: string;
  useCalendar: boolean;
  calendarMonth: string;
  calendarEvent: string;
  conceptFocus?: string;
  authenticity?: string;
  interaction?: string;
  targetMarket?: string;
  imageMedium?: string;
  ageRange?: string;
  colorMood?: string;
  model: string;
  activeFields: Record<string, boolean>;
}

export interface GeneratedPrompt {
  id: string;
  text: string;
  copied: boolean;
}

export interface PromptBatch {
  id: string;
  timestamp: number;
  prompts: GeneratedPrompt[];
}

export interface HistoricalPrompt {
  text: string;
}

export interface ApiKeyRecord {
  id: string;
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter';
  key: string;
  status: 'untested' | 'valid' | 'invalid' | 'testing';
  addedAt: number;
}