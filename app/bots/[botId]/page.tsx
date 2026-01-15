import { BotDetail } from "@/components/BotDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface BotPageProps {
  params: Promise<{ botId: string }>;
}

export default async function BotPage({ params }: BotPageProps) {
  const { botId } = await params;

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-hidden">
        <BotDetail botId={botId} />
      </div>
    </ErrorBoundary>
  );
}
