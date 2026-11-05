export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const createTask = (body: any) => api("/api/tasks", { method: "POST", body: JSON.stringify(body) });
export const patchTask = (id: string, body: any) => api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteTask = (id: string) => api(`/api/tasks/${id}`, { method: "DELETE" });
