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

export interface AiRiskPredictionResponse {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskScore: number;
  expectedDelayHours: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  factors: string[];
  recommendations: string[];
  modelUsed: string;
}

export interface AiRoutingRecommendation {
  targetType: string;
  targetId?: string | null;
  targetName?: string | null;
  score: number;
  reason: string;
}

export interface AiAssignmentRecommendationResponse {
  priority: string;
  priorityScore: number;
  bestRoute?: AiRoutingRecommendation | null;
  alternatives: AiRoutingRecommendation[];
  factors: string[];
  modelUsed: string;
}

export interface AiRoutingAnomaly {
  type: string;
  severity: string;
  score: number;
  description: string;
  entityId?: string | null;
}

export interface AiRoutingDashboardResponse {
  modelStatus: string;
  highRiskTasks: Array<Record<string, unknown>>;
  highRiskInstances: Array<Record<string, unknown>>;
  anomalies: AiRoutingAnomaly[];
  recommendations: string[];
}
