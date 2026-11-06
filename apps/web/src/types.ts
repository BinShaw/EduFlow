export type UserRole = 'ADMIN' | 'TEACHER';
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
export interface Guardian {
  name: string;
  email?: string | null;
  phone?: string | null;
}
export interface Lead {
  id: string;
  stage: string;
  source: string | null;
  nextFollowUpAt: string | null;
  trials?: TrialBooking[];
  followUps?: FollowUp[];
}
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  yearLevel: number | null;
  status: string;
  ownerAdminId: string;
  createdAt?: string;
  updatedAt?: string;
  owner?: { id: string; name: string };
  guardians?: Array<{ guardian: Guardian; relationship: string; isPrimary: boolean }>;
  leads?: Lead[];
  followUps?: FollowUp[];
  canEdit?: boolean;
}
export interface Course {
  id: string;
  name: string;
  subject: string;
}
export interface LessonSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status?: string;
  teacher?: { id?: string; name: string };
  course?: Course;
  classGroup?: { course: Course; code?: string };
  trials?: TrialBooking[];
  attendance?: Array<{
    student: Pick<Student, 'firstName' | 'lastName' | 'yearLevel'>;
    status: string;
  }>;
  availableSeats?: number;
  bookable?: boolean;
  unavailableReason?: string | null;
  roster?: Array<
    Pick<Student, 'id' | 'firstName' | 'lastName' | 'yearLevel'> & { isTrial: boolean }
  >;
}
export interface TrialBooking {
  id: string;
  status: string;
  outcome?: string | null;
  notes?: string | null;
  lessonSession: LessonSession;
  lead?: { id?: string; student?: Student };
}
export interface FollowUp {
  id: string;
  action: string;
  dueAt: string;
  status: string;
  completionNote?: string | null;
  messageDraft?: string | null;
  student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'yearLevel' | 'ownerAdminId'>;
}
export interface DashboardData {
  counts: { students: number; overdue: number; dueToday: number; upcomingTrials: number };
  overdue: Array<{ id: string; action: string; dueAt: string; student: Student }>;
  dueToday: Array<{ id: string; action: string; dueAt: string; student: Student }>;
  upcoming: Array<
    Omit<LessonSession, 'trials'> & { trials: Array<TrialBooking & { lead: { student: Student } }> }
  >;
  recentTrials: Array<{
    id: string;
    status: string;
    lead: { student: Student };
    lessonSession: LessonSession;
  }>;
}

export interface StudentPage {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AiDraft {
  summary: string;
  nextAction: string;
  nextActionLabel: string;
  messageDraft: string;
}
