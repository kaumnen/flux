"use client";

import {
  AlertCircle,
  Bot,
  Calendar,
  Clock,
  Code,
  GitBranch,
  Shield,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { BotChat } from "@/components/BotChat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";
import { BotDebugInfo } from "./BotDebugInfo";
import type { ChatMessage } from "./bot-types";

interface BotDetailProps {
  botId: string;
}

function StatusBadge({ status }: { status?: string }) {
  const variant =
    status === "Available"
      ? "default"
      : status === "Creating" || status === "Versioning"
        ? "secondary"
        : "destructive";

  return <Badge variant={variant}>{status ?? "Unknown"}</Badge>;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
  return "Just now";
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `${date.toLocaleString()} (${timezone})`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "N/A";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function DateTimeDisplay({
  dateString,
  className,
}: {
  dateString?: string;
  className?: string;
}) {
  if (!dateString) return <span className={className}>N/A</span>;

  return (
    <div className={`flex flex-col ${className}`}>
      <span>{formatRelativeTime(dateString)}</span>
      <span className="text-xs text-muted-foreground">
        {formatDateTime(dateString)}
      </span>
    </div>
  );
}

export function BotDetail({ botId }: BotDetailProps) {
  const { isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  const selectedMessage =
    messages.find((m) => m.id === selectedMessageId) || null;

  const botQuery = trpc.aws.describeBot.useQuery(
    { botId },
    { enabled: isAuthenticated }
  );
  const versionsQuery = trpc.aws.listBotVersions.useQuery(
    { botId },
    { enabled: isAuthenticated }
  );
  const aliasesQuery = trpc.aws.listBotAliases.useQuery(
    { botId },
    { enabled: isAuthenticated }
  );

  if (botQuery.isLoading) {
    return <BotDetailSkeleton />;
  }

  if (botQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <AlertCircle className="size-12" />
        <p>Failed to load bot details</p>
        <p className="text-sm">{botQuery.error.message}</p>
      </div>
    );
  }

  const bot = botQuery.data;

  if (!bot) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <Bot className="size-12" />
        <p>Bot not found</p>
      </div>
    );
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={40} minSize={25}>
        <Tabs defaultValue="info" className="flex flex-col h-full">
          <div className="px-4 py-2 border-b bg-muted/10">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Bot Info
              </TabsTrigger>
              <TabsTrigger value="debug" className="flex-1">
                Logs & Debug
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="info"
            className="flex-1 overflow-auto p-6 m-0 space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Bot className="size-8" />
                <div>
                  <h1 className="text-2xl font-semibold">{bot.botName}</h1>
                  {bot.description && (
                    <p className="text-muted-foreground">{bot.description}</p>
                  )}
                </div>
              </div>
              <StatusBadge status={bot.botStatus} />
            </div>

            {/* Basic Info */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bot ID</span>
                  <span className="font-mono text-sm">{bot.botId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm">{bot.botType ?? "Standard"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    Created
                  </span>
                  <DateTimeDisplay
                    dateString={bot.creationDateTime}
                    className="text-right"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Updated
                  </span>
                  <DateTimeDisplay
                    dateString={bot.lastUpdatedDateTime}
                    className="text-right"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Session Timeout
                  </span>
                  <span className="text-sm">
                    {formatDuration(bot.idleSessionTTLInSeconds)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Shield className="size-3" />
                    Data Privacy
                  </span>
                  <span className="text-sm">
                    {bot.dataPrivacy?.childDirected
                      ? "Child-directed"
                      : "Not child-directed"}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    IAM Role
                  </span>
                  <p className="font-mono text-xs break-all mt-1">
                    {bot.roleArn ?? "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Aliases */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="size-4" />
                  Aliases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aliasesQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : aliasesQuery.data?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No aliases found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {aliasesQuery.data?.map((alias) => (
                      <AliasItem
                        key={alias.botAliasId}
                        botId={botId}
                        alias={alias}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Versions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="size-4" />
                  Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versionsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : versionsQuery.data?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No versions found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {versionsQuery.data?.map((version) => (
                      <div
                        key={version.botVersion}
                        className="p-3 rounded-md border bg-muted/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-medium">
                            {version.botVersion}
                          </span>
                          <StatusBadge status={version.botStatus} />
                        </div>
                        {version.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          <DateTimeDisplay
                            dateString={version.creationDateTime}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Failure Reasons */}
            {bot.failureReasons && bot.failureReasons.length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Failure Reasons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {bot.failureReasons.map((reason, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static list
                      <li key={`${reason}-${index}`} className="text-sm">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Bot Members */}
            {bot.botMembers && bot.botMembers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Bot Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {bot.botMembers.map((member) => (
                      <li
                        key={member.botMemberId}
                        className="flex items-center gap-2"
                      >
                        <Bot className="size-4" />
                        <span>{member.botMemberName}</span>
                        <span className="text-muted-foreground text-sm">
                          ({member.botMemberId})
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="debug" className="flex-1 overflow-hidden m-0">
            <BotDebugInfo selectedMessage={selectedMessage} />
          </TabsContent>
        </Tabs>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60} minSize={30}>
        <BotChat
          botId={botId}
          messages={messages}
          setMessages={setMessages}
          selectedMessageId={selectedMessageId}
          onSelectMessage={setSelectedMessageId}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface AliasRowProps {
  botId: string;
  alias: {
    botAliasId?: string;
    botAliasName?: string;
    botVersion?: string;
    botAliasStatus?: string;
    lastUpdatedDateTime?: string;
  };
}

function AliasItem({ botId, alias }: AliasRowProps) {
  const { isAuthenticated } = useAuthStore();

  const aliasDetailQuery = trpc.aws.describeBotAlias.useQuery(
    { botId, botAliasId: alias.botAliasId ?? "" },
    { enabled: isAuthenticated && !!alias.botAliasId }
  );

  const lambdaArns = aliasDetailQuery.data?.lambdaArns;
  const hasLambda = lambdaArns && Object.values(lambdaArns).some(Boolean);

  return (
    <div className="p-3 rounded-md border bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="font-medium">{alias.botAliasName}</span>
        <StatusBadge status={alias.botAliasStatus} />
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        Version: <span className="font-mono">{alias.botVersion || "-"}</span>
      </div>
      {aliasDetailQuery.isLoading ? (
        <Skeleton className="h-4 w-32 mt-2" />
      ) : hasLambda ? (
        <div className="mt-2 space-y-1">
          {Object.entries(lambdaArns).map(
            ([locale, arn]) =>
              arn && (
                <div key={locale} className="flex items-center gap-1">
                  <Code className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {locale}:
                  </span>
                  <span className="font-mono text-xs break-all">
                    {arn.split(":").pop()}
                  </span>
                </div>
              )
          )}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1 text-muted-foreground">
          <Code className="size-3" />
          <span className="text-xs">No Lambda functions</span>
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2">
        <DateTimeDisplay dateString={alias.lastUpdatedDateTime} />
      </div>
    </div>
  );
}

function BotDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}
