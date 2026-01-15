"use client";

import { MessageSquare, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";

import type { ChatMessage } from "./bot-types";

interface BotChatProps {
  botId: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  selectedMessageId: string | null;
  onSelectMessage: (id: string | null) => void;
}

function generateSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

export function BotChat({
  botId,
  messages,
  setMessages,
  selectedMessageId,
  onSelectMessage,
}: BotChatProps) {
  const { isAuthenticated } = useAuthStore();
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [selectedAliasId, setSelectedAliasId] = useState<string>("");
  const [selectedLocale, setSelectedLocale] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const aliasesQuery = trpc.aws.listBotAliases.useQuery(
    { botId },
    { enabled: isAuthenticated }
  );

  const aliasDetailQuery = trpc.aws.describeBotAlias.useQuery(
    { botId, botAliasId: selectedAliasId },
    { enabled: isAuthenticated && !!selectedAliasId }
  );

  const recognizeTextMutation = trpc.aws.recognizeText.useMutation();

  // Auto-select first alias
  useEffect(() => {
    if (!aliasesQuery.data?.length) {
      if (selectedAliasId) {
        setSelectedAliasId("");
      }
      return;
    }

    const hasSelectedAlias = aliasesQuery.data.some(
      (alias) => alias.botAliasId === selectedAliasId
    );
    if (!selectedAliasId || !hasSelectedAlias) {
      const firstAlias = aliasesQuery.data[0];
      if (firstAlias.botAliasId) {
        setSelectedAliasId(firstAlias.botAliasId);
      }
    }
  }, [aliasesQuery.data, selectedAliasId]);

  // Get available locales from alias
  const availableLocales = aliasDetailQuery.data?.locales ?? [];

  // Auto-select first locale
  useEffect(() => {
    if (!availableLocales.length) {
      if (selectedLocale) {
        setSelectedLocale("");
      }
      return;
    }
    if (!selectedLocale || !availableLocales.includes(selectedLocale)) {
      setSelectedLocale(availableLocales[0]);
    }
  }, [availableLocales, selectedLocale]);

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally trigger on messages change
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !selectedAliasId || !selectedLocale) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    try {
      const response = await recognizeTextMutation.mutateAsync({
        botId,
        botAliasId: selectedAliasId,
        localeId: selectedLocale,
        sessionId,
        text: userMessage.content,
      });

      const botContent =
        response.messages?.map((m) => m.content).join("\n") ||
        (response.sessionState?.intent
          ? `[${response.sessionState.intent.name}: ${response.sessionState.intent.state}]`
          : "No response from bot");

      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        content: botContent,
        timestamp: new Date(),
        rawRequest: response.rawRequest,
        rawResponse: response.rawResponse,
        sessionState: response.sessionState,
        interpretations: response.interpretations,
      };

      setMessages((prev) => [...prev, botMessage]);
      onSelectMessage(botMessage.id);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        content: `Error: ${
          error instanceof Error
            ? error.message
            : "Failed to get response from bot"
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [
    inputValue,
    selectedAliasId,
    selectedLocale,
    sessionId,
    botId,
    recognizeTextMutation,
    onSelectMessage,
    setMessages,
  ]);

  const handleResetSession = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    onSelectMessage(null);
  }, [setMessages, onSelectMessage]);

  if (aliasesQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 h-full">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aliasesQuery.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-4">
        <MessageSquare className="size-12" />
        <p>No aliases available for chat</p>
        <p className="text-sm">Create a bot alias to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          <span className="font-semibold text-sm">Chat Preview</span>
        </div>

        <Button variant="ghost" size="sm" onClick={handleResetSession}>
          <RefreshCw className="size-4 mr-1" />
          Reset Session
        </Button>
      </div>

      <div className="flex items-center gap-2 p-4 border-b bg-muted/20">
        <Select value={selectedAliasId} onValueChange={setSelectedAliasId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select alias" />
          </SelectTrigger>
          <SelectContent>
            {aliasesQuery.data?.map((alias) => (
              <SelectItem key={alias.botAliasId} value={alias.botAliasId ?? ""}>
                {alias.botAliasName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocale} onValueChange={setSelectedLocale}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Locale" />
          </SelectTrigger>
          <SelectContent>
            {availableLocales.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {locale}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageSquare className="size-8 mb-2" />
              <p className="text-sm">Send a message to start chatting</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    message.role === "bot" && onSelectMessage(message.id)
                  }
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : `bg-muted cursor-pointer hover:bg-muted/80 ${selectedMessageId === message.id ? "ring-2 ring-primary" : ""}`
                  }`}
                >
                  {message.content}
                </button>
              </div>
            ))
          )}
          {recognizeTextMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={
              !selectedAliasId ||
              !selectedLocale ||
              recognizeTextMutation.isPending
            }
          />
          <Button
            type="submit"
            disabled={
              !inputValue.trim() ||
              !selectedAliasId ||
              !selectedLocale ||
              recognizeTextMutation.isPending
            }
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Removed unused helper components as they are now in BotDebugInfo.tsx
