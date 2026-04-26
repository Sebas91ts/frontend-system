export interface NotificationItem {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt?: string | null;
  relatedProcessInstanceId?: string | null;
  relatedTaskId?: string | null;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}
