import { DocumentMetadata } from './document-lifecycle.models';

export type Folder = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentFolderId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  active?: boolean;
};

export type FolderTreeNode = Folder & {
  children: FolderTreeNode[];
};

export type FolderCreateRequest = {
  name: string;
  description?: string;
  parentFolderId?: string;
};

export type FolderUpdateRequest = {
  name: string;
  description?: string;
  parentFolderId?: string;
};

export type FolderDocumentsResponse = DocumentMetadata[];
