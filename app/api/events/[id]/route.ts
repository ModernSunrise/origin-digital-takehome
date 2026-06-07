// GET /api/events/:id  (read)   ·   PATCH /api/events/:id  (update)
import { UpdateEventSchema } from '@/lib/validation/schemas';
import { getEvent, updateEvent } from '@/lib/domain/event-service';
import { ensureSeeded } from '@/lib/domain/seed';
import { mapDomainError, ok, readJson, validationError } from '../../_lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  try {
    await ensureSeeded();
    return ok(await getEvent(id));
  } catch (error) {
    return mapDomainError(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const parsed = UpdateEventSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await ensureSeeded();
    return ok(await updateEvent(id, parsed.data));
  } catch (error) {
    return mapDomainError(error);
  }
}
