import { Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChatMessage } from "./bot-types";

interface BotDebugInfoProps {
  selectedMessage: ChatMessage | null;
}

export function BotDebugInfo({ selectedMessage }: BotDebugInfoProps) {
  if (!selectedMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-6">
        <Settings2 className="size-12" />
        <p className="text-center">
          Select a bot message in the chat to view details
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="parsed" className="flex flex-col h-full">
      <div className="px-4 pt-2">
        <TabsList className="w-full">
          <TabsTrigger value="parsed" className="flex-1">
            Parsed
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex-1">
            Raw JSON
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="parsed"
        className="flex-1 overflow-auto p-4 space-y-4"
      >
        {selectedMessage.sessionState ? (
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
                sessionState={selectedMessage.sessionState as Record<string, unknown>}
                requestAttributes={
                    (selectedMessage.rawRequest as { requestAttributes?: Record<string, string> })?.requestAttributes
                }
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p>No parsed session state available</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="flex-1 overflow-auto p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Request</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px] whitespace-pre-wrap break-all">
              {JSON.stringify(selectedMessage.rawRequest, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px] whitespace-pre-wrap break-all">
              {JSON.stringify(selectedMessage.rawResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
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
              <span className="text-muted-foreground font-medium">{name}</span>
              {slot?.value?.interpretedValue ? (
                <span className="font-mono">{slot.value.interpretedValue}</span>
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
           <p className="text-sm text-muted-foreground italic">No session attributes</p>
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
    const { intent, dialogAction, sessionAttributes, ...otherState } = sessionState || {};
    const hasOtherState = Object.keys(otherState).length > 0;
    const hasRequestAttributes = requestAttributes && Object.keys(requestAttributes).length > 0;

    if (!hasOtherState && !hasRequestAttributes) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Other Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOtherState && (
            <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Session State</span>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(otherState, null, 2)}
                </pre>
            </div>
        )}
        {hasRequestAttributes && (
             <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Request Attributes</span>
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
