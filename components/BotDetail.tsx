"use client";

import { useSearchParams } from "next/navigation";
import { BotChatView } from "@/components/BotChatView";
import { BotOverview } from "@/components/BotOverview";

interface BotDetailProps {
  botId: string;
}

export function BotDetail({ botId }: BotDetailProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const isChat = tab === "chat";

  if (isChat) {
    return <BotChatView botId={botId} />;
  }

  return <BotOverview botId={botId} />;
}
