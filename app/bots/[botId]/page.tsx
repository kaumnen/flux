import { BotDetail } from "@/components/BotDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface BotPageProps {
  params: Promise<{ botId: string }>;
}

export default async function BotPage({ params }: BotPageProps) {
  const { botId } = await params;

  return (
    <ErrorBoundary>
      <BotDetail botId={botId} />
    </ErrorBoundary>
  );
}
