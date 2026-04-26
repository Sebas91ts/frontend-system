export interface RealtimeEvent {
  type: string;
  title?: string | null;
  message?: string | null;
  createdAt?: string | null;
  relatedProcessInstanceId?: string | null;
  relatedTaskId?: string | null;
  areaId?: string | null;
  userId?: string | null;
  payload?: Record<string, unknown> | null;
}
