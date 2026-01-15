"use client";

import { Bot, MessageSquare, User } from "lucide-react";
import { useState } from "react";
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
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-teal-500/10 dark:bg-teal-400/10">
            <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
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
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/20"
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
              <div className="absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-border via-teal-500/30 to-border -translate-x-1/2" />

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
          isUser ? "bg-teal-500 dark:bg-teal-400" : "bg-muted-foreground/50"
        )}
        style={{ top: "12px" }}
      />

      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-teal-500/10 dark:bg-teal-400/15" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        ) : (
          <Bot className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Bubble content */}
      <div
        className={cn(
          "flex-1 max-w-[calc(50%-2rem)]",
          isUser ? "text-right" : "text-left"
        )}
      >
        {/* Intent badge for user turns */}
        {isUser && turn.expectedIntent && (
          <div
            className={cn(
              "inline-flex items-center mb-1.5",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/20">
              {turn.expectedIntent}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "inline-block px-3 py-2 rounded-xl text-sm transition-all",
            isUser
              ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 dark:from-teal-400/15 dark:to-teal-500/5 text-foreground rounded-tr-sm"
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

        {/* Slots for user turns */}
        {isUser &&
          turn.expectedSlots &&
          Object.keys(turn.expectedSlots).length > 0 && (
            <div
              className={cn(
                "flex flex-wrap gap-1 mt-1.5",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              {Object.entries(turn.expectedSlots).map(([name, value]) => (
                <span
                  key={name}
                  className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-border/60 bg-background/50 text-muted-foreground"
                >
                  <span className="text-foreground/70">{name}</span>
                  <span className="mx-0.5 text-muted-foreground/50">=</span>
                  <span className="text-teal-600 dark:text-teal-400">
                    {value || "?"}
                  </span>
                </span>
              ))}
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
          className="absolute inset-0 rounded-full bg-teal-500/10 animate-ping"
          style={{ animationDuration: "2s" }}
        />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-teal-500/20 to-teal-600/10 dark:from-teal-400/20 dark:to-teal-500/10">
          <MessageSquare className="w-7 h-7 text-teal-600 dark:text-teal-400" />
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
