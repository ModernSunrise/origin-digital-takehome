import { EditTalk } from '@/app/_components/edit-talk';

export default async function EditTalkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <EditTalk id={id} />;
}
