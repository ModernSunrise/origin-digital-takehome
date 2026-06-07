// Typed browser client for the DevHub REST API. The frontend consumes the SAME HTTP API
// documented in domain-model.md (it does not reach into the domain layer directly).
// Error bodies ({ error: { code, message } }) become a typed ApiError the UI can branch on.

import type { EventView, Registration } from '@/lib/domain/types';
import type { CreateEventInput, UpdateEventInput } from '@/lib/validation/schemas';

type ApiErrorBody = {
  error: { code: string; message: string; issues?: { path: string; message: string }[] };
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues: { path: string; message: string }[];

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error?.message ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code ?? 'UNKNOWN';
    this.issues = body?.error?.issues ?? [];
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body as ApiErrorBody | null);
  return body as T;
}

export const api = {
  listEvents: (): Promise<EventView[]> => request('/events'),
  getEvent: (id: string): Promise<EventView> => request(`/events/${id}`),
  createEvent: (input: CreateEventInput): Promise<EventView> =>
    request('/events', { method: 'POST', body: JSON.stringify(input) }),
  updateEvent: (id: string, patch: UpdateEventInput): Promise<EventView> =>
    request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  listRegistrations: (id: string): Promise<Registration[]> => request(`/events/${id}/registrations`),
  register: (id: string, userId: string): Promise<Registration> =>
    request(`/events/${id}/registrations`, { method: 'POST', body: JSON.stringify({ userId }) }),
  unregister: (id: string, userId: string): Promise<void> =>
    request(`/events/${id}/registrations/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
};
