export type OnlyOfficeEditorConfig = {
  documentId: string;
  documentKey: string;
  fileName: string;
  title: string;
  fileType: string;
  mode: 'edit' | 'view';
  editable: boolean;
  collaborativeEditing: boolean;
  readOnlyAfterComplete?: boolean;
  requireApproval?: boolean;
  templateDocumentId?: string;
  currentEditor?: string;
  editingStartedAt?: string;
  onlyOfficeReady: boolean;
  message?: string;
  documentServerUrl: string;
  callbackUrl: string;
  token?: string;
  docsApiConfig: Record<string, unknown>;
};

export type OnlyOfficeEditingSession = {
  documentId: string;
  documentKey: string;
  editing: boolean;
  currentEditor?: string;
  editingStartedAt?: string;
  message?: string;
};
