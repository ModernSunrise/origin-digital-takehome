import { redirect } from 'next/navigation';

// Edit is now an in-app modal (opened from the talk detail). Keep this URL working for
// deep links by sending it to the talk, where "Edit talk" lives.
export default async function EditTalkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<never> {
  const { id } = await params;
  redirect(`/events/${id}`);
}
