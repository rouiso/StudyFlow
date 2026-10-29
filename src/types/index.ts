export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type TaskPriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  slug: string;
  ownerId: string;
  inviteToken: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string;
  color: string;
  startDate: string;
  endDate: string;
  archivedAt?: string | null;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  position: number;
  wipLimit?: number | null;
  isDone: boolean;
  color?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  position: number;
  priority: TaskPriority;
  dueDate: string; // ISO string YYYY-MM-DD
  createdById: string;
  createdAt: string;
  completedAt?: string | null;
  archivedAt?: string | null;
  assigneeIds: string[];
  labelIds: string[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  date: string;
  description: string;
  completed: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  replyToId?: string | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ASSIGNMENT' | 'COMMENT' | 'DUE_SOON' | 'MILESTONE' | 'AI_ALERT';
  readAt?: string | null;
  createdAt: string;
  link?: string;
}

export interface FileItem {
  id: string;
  projectId: string;
  taskId?: string | null;
  uploaderId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url?: string;
}

export interface Activity {
  id: string;
  projectId: string;
  taskId?: string | null;
  userId: string;
  type: 'TASK_CREATED' | 'TASK_MOVED' | 'TASK_COMPLETED' | 'TASK_EDITED' | 'FILE_UPLOADED' | 'MESSAGE_SENT' | 'MILESTONE_CREATED';
  payload: Record<string, any>;
  createdAt: string;
}

export interface ProjectReport {
  id: string;
  projectId: string;
  createdById: string;
  generatedAt: string;
  title: string;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  summary: string;
  recommendations: string[];
}
