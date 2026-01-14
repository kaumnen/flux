"use client";

import { Bot, LogOut, Plug, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";
import { CredentialsModal } from "./CredentialsModal";
import { ThemeToggle } from "./ThemeToggle";

export function AppSidebar() {
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>();
  const pathname = usePathname();

  const { isAuthenticated, userInfo, setUnauthenticated } = useAuthStore();

  const botsQuery = trpc.aws.listBots.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (botsQuery.error?.data?.code === "UNAUTHORIZED") {
      setUnauthenticated();
      setAuthError(botsQuery.error.message);
      setCredentialsModalOpen(true);
    }
  }, [botsQuery.error, setUnauthenticated]);

  const disconnectMutation = trpc.aws.disconnect.useMutation({
    onSuccess: () => {
      setUnauthenticated();
    },
  });

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const extractUsername = (arn?: string) => {
    if (!arn) return "Unknown";
    const parts = arn.split("/");
    return parts[parts.length - 1] || arn.split(":").pop() || "Unknown";
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <Bot className="size-5" />
              <span className="font-semibold">Flux</span>
            </div>
            <ThemeToggle />
          </div>
          {isAuthenticated && userInfo && (
            <div className="px-2 text-xs text-muted-foreground">
              {userInfo.region}
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Bots</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isAuthenticated ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Connect to AWS to view bots
                    </div>
                  </SidebarMenuItem>
                ) : botsQuery.isLoading ? (
                  <>
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                  </>
                ) : botsQuery.data?.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No bots found
                    </div>
                  </SidebarMenuItem>
                ) : (
                  botsQuery.data?.map((bot) => (
                    <SidebarMenuItem key={bot.botId}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/bots/${bot.botId}`}
                        tooltip={bot.description || bot.botName}
                      >
                        <Link href={`/bots/${bot.botId}`}>
                          <Bot className="size-4" />
                          <span>{bot.botName}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t">
          {isAuthenticated && userInfo ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <User className="size-4 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {extractUsername(userInfo.arn)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {userInfo.account}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                <LogOut className="size-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setAuthError(undefined);
                setCredentialsModalOpen(true);
              }}
            >
              <Plug className="size-4 mr-2" />
              Connect to AWS
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>

      <CredentialsModal
        open={credentialsModalOpen}
        onOpenChange={setCredentialsModalOpen}
        errorMessage={authError}
      />
    </>
  );
}
