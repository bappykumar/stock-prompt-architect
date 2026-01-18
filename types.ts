
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
  materialStyle: string; // New: Glossy, Metallic, etc.
  quantity: number;
  useExtraKeywords: boolean;
  extraKeywords: string;
  extraContext?: string;
  useCalendar: boolean;
  calendarMonth: string;
  calendarEvent: string;
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