"use client";

import { useState } from "react";
import { BotChat } from "@/components/BotChat";
import { BotDebugInfo } from "@/components/BotDebugInfo";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ChatMessage } from "@/components/bot-types";

interface BotChatViewProps {
  botId: string;
}

export function BotChatView({ botId }: BotChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const selectedMessage =
    messages.find((m) => m.id === selectedMessageId) || null;

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={40} minSize={25}>
        <BotDebugInfo
          selectedMessage={selectedMessage}
          messages={messages}
          onSelectMessage={setSelectedMessageId}
          onHoverMessage={setHoveredMessageId}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60} minSize={30}>
        <BotChat
          botId={botId}
          messages={messages}
          setMessages={setMessages}
          selectedMessageId={selectedMessageId}
          onSelectMessage={setSelectedMessageId}
          hoveredMessageId={hoveredMessageId}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
