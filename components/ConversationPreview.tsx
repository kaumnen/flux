"use client";

import { Bot, MessageSquare, User } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TestConversation, TestTurn } from "./test-builder-types";

interface ConversationPreviewProps {
  conversations: TestConversation[];
  selectedConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export function ConversationPreview({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationPreviewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null
  );

  useEffect(() => {
    if (selectedConversationId) {
      return;
    }
    if (conversations.length === 0) {
      setInternalSelectedId(null);
      return;
    }
    if (!internalSelectedId) {
      setInternalSelectedId(conversations[0]?.id ?? null);
      return;
    }
    const stillExists = conversations.some((c) => c.id === internalSelectedId);
    if (!stillExists) {
      setInternalSelectedId(conversations[0]?.id ?? null);
    }
  }, [conversations, internalSelectedId, selectedConversationId]);

  const activeId = selectedConversationId ?? internalSelectedId;
  const activeConversation = conversations.find((c) => c.id === activeId);

  const handleSelect = (id: string) => {
    setInternalSelectedId(id);
    onSelectConversation?.(id);
  };

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground/80">
            Preview
          </span>
        </div>

        {/* Conversation Tabs */}
        {conversations.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {conversations.map((conv, index) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => handleSelect(conv.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                  "hover:bg-muted/80",
                  activeId === conv.id
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-muted-foreground"
                )}
              >
                Conv {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeConversation ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-border via-primary/30 to-border -translate-x-1/2" />

              {/* Turns */}
              <div className="space-y-4">
                {activeConversation.turns.map((turn, index) => (
                  <TurnBubble key={turn.id} turn={turn} index={index} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TurnBubbleProps {
  turn: TestTurn;
  index: number;
}

function TurnBubble({ turn, index }: TurnBubbleProps) {
  const isUser = turn.type === "user";
  const isEmpty = isUser
    ? !turn.utterance.trim()
    : !turn.expectedResponse.trim();
  const hasIntentOrSlots =
    isUser &&
    (Boolean(turn.expectedIntent) ||
      (turn.expectedSlots && Object.keys(turn.expectedSlots).length > 0));

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Turn indicator on timeline */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ring-2 ring-background z-10",
          isUser ? "bg-primary" : "bg-muted-foreground/50"
        )}
        style={{ top: "12px" }}
      />

      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary/10" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Bubble content */}
      <div
        className={cn(
          "max-w-[calc(50%_-_3rem)] min-w-0 overflow-hidden",
          isUser ? "text-right" : "text-left"
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            "inline-block px-3 py-2 rounded-xl text-sm transition-all break-words break-all whitespace-pre-wrap text-left",
            isUser
              ? "bg-gradient-to-br from-primary/10 to-primary/5 text-foreground rounded-tr-sm"
              : "bg-muted/80 text-foreground/90 rounded-tl-sm",
            isEmpty && "opacity-50 italic"
          )}
        >
          {isEmpty ? (
            <span className="text-muted-foreground">
              {isUser ? "Enter utterance..." : "Enter response..."}
            </span>
          ) : isUser ? (
            turn.utterance
          ) : (
            turn.expectedResponse
          )}
        </div>

        {/* Intent + slots for user turns */}
        {hasIntentOrSlots && (
          <div
            className={cn(
              "mt-1.5 space-y-1",
              isUser ? "text-right" : "text-left"
            )}
          >
            {turn.expectedIntent && (
              <div
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                  Intent: {turn.expectedIntent}
                </span>
              </div>
            )}
            {turn.expectedSlots &&
              Object.keys(turn.expectedSlots).length > 0 && (
                <div
                  className={cn(
                    "flex flex-wrap gap-1",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted text-muted-foreground">
                    Slots
                  </span>
                  {Object.entries(turn.expectedSlots).map(([name, value]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded-full border border-primary/20 bg-primary/5 text-primary/80"
                    >
                      <span className="text-primary">{name}</span>
                      <span className="text-primary/40">=</span>
                      <span className="text-primary">{value || "?"}</span>
                    </span>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Turn number */}
        <div
          className={cn(
            "mt-1 text-[10px] text-muted-foreground/60",
            isUser ? "text-right" : "text-left"
          )}
        >
          Turn {index + 1}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center">
      <div className="relative mb-4">
        {/* Animated rings */}
        <div
          className="absolute inset-0 rounded-full bg-primary/10 animate-ping"
          style={{ animationDuration: "2s" }}
        />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
          <MessageSquare className="w-7 h-7 text-primary" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-foreground/80 mb-1">
        No conversations yet
      </h3>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        Add a conversation to see a live preview of your test flow
      </p>
    </div>
  );
}
