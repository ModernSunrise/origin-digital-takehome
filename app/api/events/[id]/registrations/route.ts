// POST /api/events/:id/registrations  (register)   ·   GET  (list registrations)
import { RegisterSchema } from '@/lib/validation/schemas';
import { listRegistrationsForEvent, register } from '@/lib/domain/registration-service';
import { ensureSeeded } from '@/lib/domain/seed';
import { mapDomainError, ok, readJson, validationError } from '../../../_lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  try {
    await ensureSeeded();
    return ok(await listRegistrationsForEvent(id));
  } catch (error) {
    return mapDomainError(error);
  }
}

export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const parsed = RegisterSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await ensureSeeded();
    return ok(await register(id, parsed.data.userId), 201);
  } catch (error) {
    return mapDomainError(error);
  }
}
