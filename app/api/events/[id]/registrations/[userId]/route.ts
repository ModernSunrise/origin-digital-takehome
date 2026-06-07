// DELETE /api/events/:id/registrations/:userId  (unregister)
import { unregister } from '@/lib/domain/registration-service';
import { ensureSeeded } from '@/lib/domain/seed';
import { UserIdSchema } from '@/lib/validation/schemas';
import { mapDomainError, noContent, validationError } from '../../../../_lib/http';

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  const { id, userId } = await params;
  // Next delivers path params ALREADY URL-decoded — do not decode again. Re-validate userId
  // through the SAME shared schema the MCP tool uses (trim + non-empty) so both consumers
  // normalize input identically. `id` is opaque and guaranteed non-empty by routing; an
  // unknown id surfaces as 404 from the service, matching MCP.
  const parsed = UserIdSchema.safeParse({ userId });
  if (!parsed.success) return validationError(parsed.error);
  try {
    await ensureSeeded();
    await unregister(id, parsed.data.userId);
    return noContent();
  } catch (error) {
    return mapDomainError(error);
  }
}
