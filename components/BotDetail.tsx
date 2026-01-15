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
import { BotChat } from "@/components/BotChat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";

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

function DateTimeDisplay({ dateString }: { dateString?: string }) {
  if (!dateString) return <span>N/A</span>;

  return (
    <div className="flex flex-col">
      <span>{formatRelativeTime(dateString)}</span>
      <span className="text-xs text-muted-foreground">
        {formatDateTime(dateString)}
      </span>
    </div>
  );
}

export function BotDetail({ botId }: BotDetailProps) {
  const { isAuthenticated } = useAuthStore();

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
        <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
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

          <Tabs defaultValue="simple">
            <TabsList>
              <TabsTrigger value="simple">Simple</TabsTrigger>
              <TabsTrigger value="aliases">Aliases</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Bot ID
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-sm">{bot.botId}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Bot Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{bot.botType ?? "Standard"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="size-4" />
                      Created
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DateTimeDisplay dateString={bot.creationDateTime} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="size-4" />
                      Last Updated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DateTimeDisplay dateString={bot.lastUpdatedDateTime} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="aliases" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Tag className="size-4" />
                    Bot Aliases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aliasesQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : aliasesQuery.data?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No aliases found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Alias Name</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Lambda</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aliasesQuery.data?.map((alias) => (
                          <AliasRow
                            key={alias.botAliasId}
                            botId={botId}
                            alias={alias}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="size-4" />
                    Bot Versions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {versionsQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : versionsQuery.data?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No versions found
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Version</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versionsQuery.data?.map((version) => (
                          <TableRow key={version.botVersion}>
                            <TableCell className="font-mono">
                              {version.botVersion}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={version.botStatus} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {version.description || "-"}
                            </TableCell>
                            <TableCell>
                              <DateTimeDisplay
                                dateString={version.creationDateTime}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="size-4" />
                      Idle Session Timeout
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{formatDuration(bot.idleSessionTTLInSeconds)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Shield className="size-4" />
                      Data Privacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {bot.dataPrivacy?.childDirected
                        ? "COPPA compliant (child-directed)"
                        : "Not child-directed"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      IAM Role ARN
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-sm break-all">
                      {bot.roleArn ?? "N/A"}
                    </p>
                  </CardContent>
                </Card>

                {bot.failureReasons && bot.failureReasons.length > 0 && (
                  <Card className="md:col-span-2 border-destructive">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="size-4" />
                        Failure Reasons
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {bot.failureReasons.map((reason, index) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: static list, no reordering
                          <li key={`${reason}-${index}`} className="text-sm">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {bot.botMembers && bot.botMembers.length > 0 && (
                  <Card className="md:col-span-2">
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
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60} minSize={30}>
        <BotChat botId={botId} />
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

function AliasRow({ botId, alias }: AliasRowProps) {
  const { isAuthenticated } = useAuthStore();

  const aliasDetailQuery = trpc.aws.describeBotAlias.useQuery(
    { botId, botAliasId: alias.botAliasId ?? "" },
    { enabled: isAuthenticated && !!alias.botAliasId }
  );

  const lambdaArns = aliasDetailQuery.data?.lambdaArns;
  const hasLambda = lambdaArns && Object.values(lambdaArns).some(Boolean);

  return (
    <TableRow>
      <TableCell className="font-medium">{alias.botAliasName}</TableCell>
      <TableCell className="font-mono">{alias.botVersion || "-"}</TableCell>
      <TableCell>
        <StatusBadge status={alias.botAliasStatus} />
      </TableCell>
      <TableCell>
        {aliasDetailQuery.isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : hasLambda ? (
          <div className="flex flex-col gap-1">
            {Object.entries(lambdaArns).map(
              ([locale, arn]) =>
                arn && (
                  <div key={locale} className="flex items-center gap-1">
                    <Code className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {locale}:
                    </span>
                    <span className="font-mono text-xs truncate max-w-48">
                      {arn.split(":").pop()}
                    </span>
                  </div>
                )
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <DateTimeDisplay dateString={alias.lastUpdatedDateTime} />
      </TableCell>
    </TableRow>
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
