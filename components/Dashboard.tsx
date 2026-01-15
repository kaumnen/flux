"use client";

import { Bot, Layers, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";

function StatusBadge({ status }: { status?: string }) {
  const variant =
    status === "Available"
      ? "default"
      : status === "Creating" || status === "Versioning"
        ? "secondary"
        : "destructive";

  return <Badge variant={variant}>{status ?? "Unknown"}</Badge>;
}

export function Dashboard() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  const botsQuery = trpc.aws.listBots.useQuery(undefined, {
    enabled: isAuthenticated && isHydrated,
  });

  if (!isHydrated) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <Bot className="size-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Welcome to Flux</h2>
          <p className="text-muted-foreground max-w-[500px]">
            Connect your AWS account to manage and monitor your Amazon Lex bots.
            Click the "Connect to AWS" button in the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  if (botsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (botsQuery.error) {
    return (
      <div className="p-8 text-center text-destructive">
        Error loading bots: {botsQuery.error.message}
      </div>
    );
  }

  const bots = botsQuery.data || [];
  const availableBots = bots.filter((b) => b.botStatus === "Available").length;

  return (
    <div className="flex-1 p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Amazon Lex bots
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableBots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regions</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Current session region
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Your Bots</h2>
        {bots.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bot className="size-12 mb-4 opacity-50" />
              <p>No bots found in this region.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <Link key={bot.botId} href={`/bots/${bot.botId}?tab=overview`}>
                <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="truncate pr-2" title={bot.botName}>
                        {bot.botName}
                      </CardTitle>
                      <StatusBadge status={bot.botStatus} />
                    </div>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {bot.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Bot ID:</span>
                        <span className="font-mono">{bot.botId}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Latest Version:</span>
                        <span className="font-mono">
                          {bot.latestBotVersion || "DRAFT"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 p-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}
