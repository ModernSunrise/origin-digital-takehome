import { TalkDetail } from '@/app/_components/talk-detail';

export default async function TalkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <TalkDetail id={id} />;
}
