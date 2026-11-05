const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"];
const RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

export function validateTaskBody(b: any, partial = false): string[] {
  const errors: string[] = [];
  if (!partial && (!b.title || !String(b.title).trim())) errors.push("title is required");
  if (b.priority && !PRIORITIES.includes(b.priority)) errors.push("invalid priority");
  if (b.status && !STATUSES.includes(b.status)) errors.push("invalid status");
  if (b.recurrence && !RECURRENCES.includes(b.recurrence)) errors.push("invalid recurrence");
  if (b.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate)) errors.push("dueDate must be YYYY-MM-DD");
  if (b.dueTime && !/^\d{2}:\d{2}$/.test(b.dueTime)) errors.push("dueTime must be HH:mm");
  if (b.estimatedDuration != null && (isNaN(Number(b.estimatedDuration)) || Number(b.estimatedDuration) < 0)) errors.push("estimatedDuration must be >= 0");
  return errors;
}
