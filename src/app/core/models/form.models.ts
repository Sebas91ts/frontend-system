export interface FormFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  order: number;
  options?: string[] | null;
}

export interface UploadedFileMetadata {
  publicId: string;
  fileName: string;
  secureUrl: string;
  mimeType?: string | null;
  size?: number | null;
  resourceType?: string | null;
}

export interface FormFieldValue {
  value?: string | number | boolean | UploadedFileMetadata | null;
  file?: UploadedFileMetadata | null;
}

export interface FormDefinition {
  id: string;
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  title: string;
  fields: FormFieldDefinition[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormDefinitionCreateRequest {
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  title: string;
  fields: FormFieldDefinition[];
  active?: boolean;
}

export interface FormDefinitionUpdateRequest extends FormDefinitionCreateRequest {}
