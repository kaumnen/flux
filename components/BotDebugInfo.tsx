import { Check, Copy, Settings2 } from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChatMessage } from "./bot-types";

interface BotDebugInfoProps {
  selectedMessage: ChatMessage | null;
  messages: ChatMessage[];
  onSelectMessage: (id: string | null) => void;
  onHoverMessage?: (id: string | null) => void;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={label}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function BotDebugInfo({
  selectedMessage,
  messages,
  onSelectMessage,
  onHoverMessage,
}: BotDebugInfoProps) {
  if (!selectedMessage && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-6">
        <Settings2 className="size-12" />
        <p className="text-center">Start a conversation to see debug info</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="parsed" className="flex flex-col h-full">
      <div className="px-4 pt-2">
        <TabsList className="w-full">
          <TabsTrigger
            value="parsed"
            className="flex-1"
            disabled={!selectedMessage}
          >
            Parsed
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex-1">
            Raw JSON History
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="parsed"
        className="flex-1 overflow-auto p-4 space-y-4"
      >
        {selectedMessage ? (
          selectedMessage.sessionState ? (
            <>
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
              <OtherInfoSection
                sessionState={
                  selectedMessage.sessionState as Record<string, unknown>
                }
                requestAttributes={
                  (
                    selectedMessage.rawRequest as {
                      requestAttributes?: Record<string, string>;
                    }
                  )?.requestAttributes
                }
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p>No parsed session state available</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Settings2 className="size-12" />
            <p>Select a message to view parsed details</p>
          </div>
        )}
      </TabsContent>

      <TabsContent
        value="raw"
        className="flex-1 overflow-hidden m-0 flex flex-col"
      >
        {messages.filter((m) => m.rawRequest || m.rawResponse).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <p>No raw requests/responses available</p>
          </div>
        ) : (
          <div className="flex h-full overflow-hidden">
            {/* Message List Sidebar */}
            <div className="w-[80px] border-r overflow-y-auto shrink-0 bg-muted/10">
              <div className="flex flex-col">
                {messages
                  .filter((msg) => msg.rawRequest || msg.rawResponse)
                  .map((msg, index) => ({ msg, index: index + 1 }))
                  .reverse()
                  .map(({ msg, index }) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => onSelectMessage(msg.id)}
                      onMouseEnter={() => onHoverMessage?.(msg.id)}
                      onMouseLeave={() => onHoverMessage?.(null)}
                      className={`flex flex-col items-center justify-center gap-1 p-3 text-sm border-b text-center hover:bg-muted/50 transition-colors ${
                        selectedMessage?.id === msg.id
                          ? "bg-muted border-l-4 border-l-primary"
                          : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <span className="font-mono font-semibold text-lg">
                        #{index}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Selected Message Detail */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedMessage ? (
                selectedMessage.rawRequest || selectedMessage.rawResponse ? (
                  <div className="flex flex-col h-full">
                    <div className="flex flex-col gap-2 pb-4 border-b mb-4 shrink-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate max-w-[400px]">
                          {selectedMessage.content}
                        </h3>
                        <CopyButton
                          value={selectedMessage.id}
                          label="Copy message ID"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {selectedMessage.id}
                      </span>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <Tabs
                        defaultValue={
                          selectedMessage.rawRequest ? "request" : "response"
                        }
                        className="h-full flex flex-col"
                      >
                        <TabsList className="w-full justify-start shrink-0">
                          <TabsTrigger
                            value="request"
                            disabled={!selectedMessage.rawRequest}
                          >
                            Request
                          </TabsTrigger>
                          <TabsTrigger
                            value="response"
                            disabled={!selectedMessage.rawResponse}
                          >
                            Response
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent
                          value="request"
                          className="flex-1 mt-2 overflow-hidden min-h-0"
                        >
                          <Card className="h-full flex flex-col">
                            <CardContent className="p-0 flex-1 overflow-hidden">
                              <div className="flex items-center justify-end px-2 py-1 border-b bg-muted/30">
                                <CopyButton
                                  value={JSON.stringify(
                                    selectedMessage.rawRequest,
                                    null,
                                    2
                                  )}
                                  label="Copy raw request"
                                />
                              </div>
                              <div className="text-xs h-full overflow-auto">
                                <SyntaxHighlighter
                                  language="json"
                                  style={vscDarkPlus}
                                  customStyle={{
                                    margin: 0,
                                    padding: "12px",
                                    height: "100%",
                                    background: "hsl(var(--muted))",
                                  }}
                                  wrapLongLines
                                >
                                  {JSON.stringify(
                                    selectedMessage.rawRequest,
                                    null,
                                    2
                                  )}
                                </SyntaxHighlighter>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent
                          value="response"
                          className="flex-1 mt-2 overflow-hidden min-h-0"
                        >
                          <Card className="h-full flex flex-col">
                            <CardContent className="p-0 flex-1 overflow-hidden">
                              <div className="flex items-center justify-end px-2 py-1 border-b bg-muted/30">
                                <CopyButton
                                  value={JSON.stringify(
                                    selectedMessage.rawResponse,
                                    null,
                                    2
                                  )}
                                  label="Copy raw response"
                                />
                              </div>
                              <div className="text-xs h-full overflow-auto">
                                <SyntaxHighlighter
                                  language="json"
                                  style={vscDarkPlus}
                                  customStyle={{
                                    margin: 0,
                                    padding: "12px",
                                    height: "100%",
                                    background: "hsl(var(--muted))",
                                  }}
                                  wrapLongLines
                                >
                                  {JSON.stringify(
                                    selectedMessage.rawResponse,
                                    null,
                                    2
                                  )}
                                </SyntaxHighlighter>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p>No raw data for this message</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Settings2 className="size-8 opacity-50" />
                  <p>Select a message from the list to view raw data</p>
                </div>
              )}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Intent</span>
            <span className="font-medium">{intent.name ?? "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">State</span>
            <span className="font-mono text-xs">{intent.state ?? "—"}</span>
          </div>
          {intent.confirmationState && intent.confirmationState !== "None" && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Confirmation
              </span>
              <span className="font-mono text-xs">
                {intent.confirmationState}
              </span>
            </div>
          )}
          {dialogAction && (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Action</span>
                <span className="font-mono text-xs">
                  {dialogAction.type ?? "—"}
                </span>
              </div>
              {dialogAction.slotToElicit && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Eliciting
                  </span>
                  <span className="font-mono text-xs text-primary">
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Slots</CardTitle>
      </CardHeader>
      <CardContent>
        {!slots || Object.keys(slots).length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No slots found</p>
        ) : (
          <div className="grid gap-2">
            {Object.entries(slots).map(([name, slot]) => (
              <div
                key={name}
                className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-md border"
              >
                <span className="text-muted-foreground font-medium">
                  {name}
                </span>
                {slot?.value?.interpretedValue ? (
                  <span className="font-mono">
                    {slot.value.interpretedValue}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50 italic text-xs">
                    empty
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionAttributesSection({
  attributes,
}: {
  attributes?: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Session Attributes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!attributes || Object.keys(attributes).length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No session attributes
          </p>
        ) : (
          <div className="grid gap-2">
            {Object.entries(attributes).map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col text-sm p-2 bg-muted/30 rounded-md border"
              >
                <span className="text-xs text-muted-foreground">{key}</span>
                <span className="font-mono break-all">{value}</span>
              </div>
            ))}
          </div>
        )}
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
              className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-md border"
            >
              <span
                className="font-medium truncate mr-2"
                title={interp.intent?.name}
              >
                {interp.intent?.name ?? "—"}
              </span>
              {interp.nluConfidence?.score !== undefined && (
                <span
                  className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                    interp.nluConfidence.score > 0.8
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
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

function OtherInfoSection({
  sessionState,
  requestAttributes,
}: {
  sessionState?: Record<string, unknown>;
  requestAttributes?: Record<string, string>;
}) {
  // Filter out keys we already displayed
  const { intent, dialogAction, sessionAttributes, ...otherState } =
    sessionState || {};
  const hasOtherState = Object.keys(otherState).length > 0;
  const hasRequestAttributes =
    requestAttributes && Object.keys(requestAttributes).length > 0;

  if (!hasOtherState && !hasRequestAttributes) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Other Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOtherState && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Session State
            </span>
            <div className="text-xs rounded-md overflow-auto">
              <div className="flex items-center justify-end px-2 py-1 border-b bg-muted/30">
                <CopyButton
                  value={JSON.stringify(otherState, null, 2)}
                  label="Copy session state JSON"
                />
              </div>
              <SyntaxHighlighter
                language="json"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: "8px",
                  background: "hsl(var(--muted))",
                }}
                wrapLongLines
              >
                {JSON.stringify(otherState, null, 2)}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
        {hasRequestAttributes && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Request Attributes
            </span>
            <div className="grid gap-2">
              {Object.entries(requestAttributes).map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col text-sm p-2 bg-muted/30 rounded-md border"
                >
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <span className="font-mono break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
