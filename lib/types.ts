export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Status = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

export interface Category {
  id: string; name: string; color: string; icon: string; createdAt: string;
  _count?: { tasks: number };
}
export interface Subtask { id: string; taskId: string; title: string; completed: boolean; createdAt: string; }
export interface Task {
  id: string; title: string; description: string | null; dueDate: string | null; dueTime: string | null;
  priority: Priority; status: Status; categoryId: string | null; category?: Category | null;
  estimatedDuration: number | null; notes: string | null; recurrence: Recurrence;
  sortOrder: number; completedAt: string | null; archivedAt: string | null;
  createdAt: string; updatedAt: string; subtasks?: Subtask[];
}

export const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#EF4444", HIGH: "#F97316", MEDIUM: "#FACC15", LOW: "#71717A",
};
export const ICONS = ["briefcase", "graduation-cap", "user", "code", "rocket", "calendar", "heart-pulse", "folder", "star", "book", "dumbbell", "wallet"];
