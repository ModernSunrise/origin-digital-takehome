// POST /api/events  (create)   ·   GET /api/events  (list)
import { CreateEventSchema } from '@/lib/validation/schemas';
import { createEvent, listEvents } from '@/lib/domain/event-service';
import { ensureSeeded } from '@/lib/domain/seed';
import { mapDomainError, ok, readJson, validationError } from '../_lib/http';

export async function GET(): Promise<Response> {
  try {
    await ensureSeeded();
    return ok(await listEvents());
  } catch (error) {
    return mapDomainError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = CreateEventSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await ensureSeeded();
    return ok(await createEvent(parsed.data), 201);
  } catch (error) {
    return mapDomainError(error);
  }
}
