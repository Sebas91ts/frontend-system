export type Tag = {
  id: string;
  tenantId: string;
  name: string;
  color?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

export type TagCreateRequest = {
  name: string;
  color?: string;
  description?: string;
};

export type TagUpdateRequest = {
  name: string;
  color?: string;
  description?: string;
};
