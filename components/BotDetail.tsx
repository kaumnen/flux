"use client";

import { AlertCircle, Bot, Calendar, Clock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function formatDate(dateString?: string) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
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

export function BotDetail({ botId }: BotDetailProps) {
  const botQuery = trpc.aws.describeBot.useQuery({ botId });

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
    <div className="flex flex-col gap-6 p-6">
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
                <p>{formatDate(bot.creationDateTime)}</p>
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
                <p>{formatDate(bot.lastUpdatedDateTime)}</p>
              </CardContent>
            </Card>
          </div>
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
                    {bot.failureReasons.map((reason) => (
                      <li key={reason} className="text-sm">
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
        <Skeleton className="h-10 w-48" />
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
