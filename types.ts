
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
  useExtraKeywords: boolean;
  extraKeywords: string;
  extraContext?: string;
  useCalendar: boolean;
  calendarMonth: string;
  calendarEvent: string;
  model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
  activeFields: Record<string, boolean>;
}

export interface GeneratedPrompt {
  id: string;
  text: string;
  copied: boolean;
  qualityScore: number;
}

export interface PromptBatch {
  id: string;
  timestamp: number;
  prompts: GeneratedPrompt[];
}

export interface HistoricalPrompt {
  text: string;
  score: number;
}