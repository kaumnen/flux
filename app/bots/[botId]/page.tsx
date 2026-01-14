import { BotDetail } from "@/components/BotDetail";

interface BotPageProps {
  params: Promise<{ botId: string }>;
}

export default async function BotPage({ params }: BotPageProps) {
  const { botId } = await params;

  return <BotDetail botId={botId} />;
}
