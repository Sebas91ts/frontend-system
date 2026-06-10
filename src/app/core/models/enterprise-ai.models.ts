export interface AiBusinessContextRequest {
  message: string;
  taskId?: string | null;
  processInstanceId?: string | null;
  processKey?: string | null;
  documentId?: string | null;
  formId?: string | null;
  currentFormValues?: Record<string, unknown>;
}

export interface AiAssistResponse {
  response: string;
  intent?: string | null;
  confidence?: number | null;
  suggestedActions: string[];
  structuredData: Record<string, unknown>;
}

export interface AiProcessRecommendationResponse {
  intent: string;
  processKey?: string | null;
  confidence: number;
  reason: string;
  requiredDocuments: string[];
  requiredForms: string[];
  alternatives: string[];
}

export interface AiReportPlanResponse {
  reportType: string;
  filters: Record<string, unknown>;
  groupBy?: string | null;
  format: string;
  columns?: string[];
  confidence: number;
  reason: string;
}

export interface AiDocumentAnalysisRequest {
  text: string;
  documentId?: string | null;
  analysisType?: string | null;
  context?: Record<string, unknown>;
}

export interface AiDocumentAnalysisResponse {
  documentType: string;
  confidence: number;
  executiveSummary: string;
  shortSummary: string;
  detailedSummary: string;
  keywords: string[];
  suggestedTags: string[];
  entities: Record<string, unknown>;
}

export interface AiVoiceRequest {
  transcript: string;
  taskId?: string | null;
  processInstanceId?: string | null;
  processKey?: string | null;
  documentId?: string | null;
  formId?: string | null;
}
