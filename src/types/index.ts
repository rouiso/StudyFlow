export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'COACH' | 'VIEWER';
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

export interface FileVersionItem {
  id: string;
  version: number;
  size: number;
  uploaderId: string;
  createdAt: string;
  url?: string;
  dataUrl?: string;
  note?: string;
}

export interface FolderItem {
  id: string;
  projectId: string;
  parentId?: string | null;
  name: string;
  color?: string;
  createdAt?: string;
}

export interface FileItem {
  id: string;
  projectId: string;
  taskId?: string | null;
  folderId?: string | null;
  uploaderId: string;
  name: string;
  mimeType: string;
  size: number;
  currentVersion?: number;
  versions?: FileVersionItem[];
  createdAt: string;
  url?: string;
  dataUrl?: string;
  description?: string;
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

// ==========================================
// MODULE 7 : FORMATIONS & COACHING (v1.1)
// ==========================================

export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type TrainingStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'DONE';
export type TrainingMode = 'ONLINE' | 'ONSITE';

export interface Training {
  id: string;
  teamId: string;
  title: string;
  description: string;
  skill: string;
  level: TrainingLevel;
  trainerId: string;
  startsAt: string; // ISO date string
  endsAt: string;
  capacity: number;
  mode: TrainingMode;
  location?: string | null;
  meetingUrl?: string | null;
  status: TrainingStatus;
  createdAt: string;
}

export type EnrollmentStatus = 'ENROLLED' | 'WAITLIST' | 'CANCELLED';

export interface TrainingEnrollment {
  id: string;
  trainingId: string;
  userId: string;
  status: EnrollmentStatus;
  attended: boolean;
  enrolledAt: string;
}

export interface TrainingResource {
  id: string;
  trainingId: string;
  title: string;
  url?: string | null;
  fileId?: string | null;
}

export type CoachingStatus = 'REQUESTED' | 'CONFIRMED' | 'RESCHEDULED' | 'DONE' | 'CANCELLED';

export interface CoachingSession {
  id: string;
  teamId: string;
  projectId?: string | null;
  coachId: string;
  coacheeId: string;
  topic: string;
  proposedSlots: string[]; // 1 à 3 créneaux
  scheduledAt?: string | null;
  durationMin: number; // 30, 45, 60
  mode: TrainingMode;
  location?: string | null;
  meetingUrl?: string | null;
  status: CoachingStatus;
  sharedReport?: string | null;
  privateNotes?: string | null; // Strictement confidentiel au coach !
  createdAt: string;
}

export type GoalStatus = 'OPEN' | 'ACHIEVED' | 'ABANDONED';

export interface CoachingGoal {
  id: string;
  userId: string;
  teamId: string;
  coachId?: string | null;
  title: string;
  skill: string;
  targetDate?: string | null;
  progress: number; // 0 à 100
  status: GoalStatus;
  createdAt: string;
}

export interface SkillLevel {
  id: string;
  userId: string;
  teamId: string;
  skill: string;
  level: number; // 0 à 5
  selfAssessed: boolean;
  assessedById?: string | null;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  targetType: 'TRAINING' | 'SESSION';
  targetId: string;
  authorId: string;
  rating: number; // 1 à 5
  comment?: string | null;
  createdAt: string;
}
