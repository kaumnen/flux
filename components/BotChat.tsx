"use client";

import { Code, MessageSquare, RefreshCw, Send, Settings2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";

interface BotChatProps {
  botId: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  rawRequest?: unknown;
  rawResponse?: unknown;
  sessionState?: unknown;
  interpretations?: unknown;
}

function generateSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

export function BotChat({ botId }: BotChatProps) {
  const { isAuthenticated } = useAuthStore();
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [selectedAliasId, setSelectedAliasId] = useState<string>("");
  const [selectedLocale, setSelectedLocale] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
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
    if (aliasesQuery.data?.length && !selectedAliasId) {
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
    if (availableLocales.length && !selectedLocale) {
      setSelectedLocale(availableLocales[0]);
    }
  }, [availableLocales, selectedLocale]);

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally trigger on messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
      setSelectedMessageId(botMessage.id);
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        content: "Error: Failed to get response from bot",
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
  ]);

  const handleResetSession = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    setSelectedMessageId(null);
  }, []);

  const selectedMessage = messages.find((m) => m.id === selectedMessageId);

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
    <div className="flex flex-col h-full">
      <Tabs defaultValue="chat" className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <TabsList>
            <TabsTrigger value="chat">
              <MessageSquare className="size-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="raw">
              <Code className="size-4 mr-1" />
              Raw JSON
            </TabsTrigger>
            <TabsTrigger value="parsed">
              <Settings2 className="size-4 mr-1" />
              Parsed
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={handleResetSession}>
            <RefreshCw className="size-4 mr-1" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2 p-4 border-b">
          <Select value={selectedAliasId} onValueChange={setSelectedAliasId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select alias" />
            </SelectTrigger>
            <SelectContent>
              {aliasesQuery.data?.map((alias) => (
                <SelectItem
                  key={alias.botAliasId}
                  value={alias.botAliasId ?? ""}
                >
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

        <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="flex flex-col gap-3">
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
                        message.role === "bot" &&
                        setSelectedMessageId(message.id)
                      }
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm text-left ${
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

          <div className="p-4 border-t">
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
        </TabsContent>

        <TabsContent
          value="raw"
          className="flex-1 m-0 p-4 min-h-0 overflow-auto"
        >
          {selectedMessage ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                    {JSON.stringify(selectedMessage.rawRequest, null, 2)}
                  </pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
                    {JSON.stringify(selectedMessage.rawResponse, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Code className="size-8 mb-2" />
              <p className="text-sm">Select a bot message to view raw JSON</p>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="parsed"
          className="flex-1 m-0 p-4 min-h-0 overflow-auto"
        >
          {selectedMessage?.sessionState ? (
            <div className="flex flex-col gap-4">
              <IntentSection
                sessionState={
                  selectedMessage.sessionState as {
                    intent?: {
                      name?: string;
                      state?: string;
                      confirmationState?: string;
                      slots?: Record<
                        string,
                        { value?: { interpretedValue?: string } } | null
                      >;
                    };
                    dialogAction?: { type?: string; slotToElicit?: string };
                  }
                }
              />
              <SlotsSection
                slots={
                  (
                    selectedMessage.sessionState as {
                      intent?: {
                        slots?: Record<
                          string,
                          { value?: { interpretedValue?: string } } | null
                        >;
                      };
                    }
                  )?.intent?.slots
                }
              />
              <SessionAttributesSection
                attributes={
                  (
                    selectedMessage.sessionState as {
                      sessionAttributes?: Record<string, string>;
                    }
                  )?.sessionAttributes
                }
              />
              <InterpretationsSection
                interpretations={
                  selectedMessage.interpretations as
                    | Array<{
                        intent?: {
                          name?: string;
                          slots?: Record<string, unknown>;
                        };
                        nluConfidence?: { score?: number };
                      }>
                    | undefined
                }
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Settings2 className="size-8 mb-2" />
              <p className="text-sm">
                Select a bot message to view parsed data
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntentSection({
  sessionState,
}: {
  sessionState: {
    intent?: {
      name?: string;
      state?: string;
      confirmationState?: string;
    };
    dialogAction?: { type?: string; slotToElicit?: string };
  };
}) {
  const intent = sessionState?.intent;
  const dialogAction = sessionState?.dialogAction;

  if (!intent) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Intent & Dialog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Intent:</span>
            <span className="ml-2 font-medium">{intent.name ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">State:</span>
            <span className="ml-2 font-mono text-xs">
              {intent.state ?? "—"}
            </span>
          </div>
          {intent.confirmationState && (
            <div>
              <span className="text-muted-foreground">Confirmation:</span>
              <span className="ml-2 font-mono text-xs">
                {intent.confirmationState}
              </span>
            </div>
          )}
          {dialogAction && (
            <>
              <div>
                <span className="text-muted-foreground">Dialog Action:</span>
                <span className="ml-2 font-mono text-xs">
                  {dialogAction.type ?? "—"}
                </span>
              </div>
              {dialogAction.slotToElicit && (
                <div>
                  <span className="text-muted-foreground">Eliciting:</span>
                  <span className="ml-2 font-mono text-xs">
                    {dialogAction.slotToElicit}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SlotsSection({
  slots,
}: {
  slots?: Record<string, { value?: { interpretedValue?: string } } | null>;
}) {
  if (!slots || Object.keys(slots).length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {Object.entries(slots).map(([name, slot]) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground min-w-24">{name}:</span>
              {slot?.value?.interpretedValue ? (
                <span className="font-medium">
                  {slot.value.interpretedValue}
                </span>
              ) : (
                <span className="text-muted-foreground italic">empty</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionAttributesSection({
  attributes,
}: {
  attributes?: Record<string, string>;
}) {
  if (!attributes || Object.keys(attributes).length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Session Attributes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {Object.entries(attributes).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground min-w-24">{key}:</span>
              <span className="font-mono text-xs">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InterpretationsSection({
  interpretations,
}: {
  interpretations?: Array<{
    intent?: { name?: string; slots?: Record<string, unknown> };
    nluConfidence?: { score?: number };
  }>;
}) {
  if (!interpretations || interpretations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Interpretations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {interpretations.map((interp, idx) => (
            <div
              key={interp.intent?.name ?? idx}
              className="flex items-center justify-between text-sm border-b last:border-0 pb-1 last:pb-0"
            >
              <span className="font-medium">{interp.intent?.name ?? "—"}</span>
              {interp.nluConfidence?.score !== undefined && (
                <span className="text-muted-foreground font-mono text-xs">
                  {(interp.nluConfidence.score * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
