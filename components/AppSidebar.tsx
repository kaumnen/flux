"use client";

import {
  Bot,
  ChevronRight,
  ClipboardList,
  LogOut,
  Plug,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";
import { CredentialsModal } from "./CredentialsModal";
import { RegionSelector } from "./RegionSelector";
import { ThemeToggle } from "./ThemeToggle";

export function AppSidebar() {
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { isAuthenticated, userInfo, isHydrated, setUnauthenticated } =
    useAuthStore();
  const utils = trpc.useUtils();

  const botsQuery = trpc.aws.listBots.useQuery(undefined, {
    enabled: isAuthenticated && isHydrated,
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
      utils.aws.invalidate();
      setUnauthenticated();
      router.push("/");
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
          <div className="px-2 text-xs text-muted-foreground">
            Amazon Lex V2 helper
          </div>
          {isAuthenticated && userInfo && (
            <div className="px-2">
              <RegionSelector />
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Bots</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isHydrated ? (
                  <>
                    <SidebarMenuItem>
                      <div className="flex h-8 items-center gap-2 px-2">
                        <div className="size-4 rounded-md bg-accent animate-pulse" />
                        <div className="h-4 flex-1 rounded-md bg-accent animate-pulse" />
                      </div>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <div className="flex h-8 items-center gap-2 px-2">
                        <div className="size-4 rounded-md bg-accent animate-pulse" />
                        <div className="h-4 flex-1 rounded-md bg-accent animate-pulse" />
                      </div>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <div className="flex h-8 items-center gap-2 px-2">
                        <div className="size-4 rounded-md bg-accent animate-pulse" />
                        <div className="h-4 flex-1 rounded-md bg-accent animate-pulse" />
                      </div>
                    </SidebarMenuItem>
                  </>
                ) : botsQuery.isLoading ? (
                  <>
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                  </>
                ) : !isAuthenticated ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Connect your AWS account to view bots
                    </div>
                  </SidebarMenuItem>
                ) : botsQuery.data?.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No bots found
                    </div>
                  </SidebarMenuItem>
                ) : (
                  botsQuery.data?.map((bot) => {
                    const isSelected = pathname?.startsWith(
                      `/bots/${bot.botId}`
                    );
                    const currentTab = searchParams.get("tab") || "overview";
                    const isOverview =
                      pathname === `/bots/${bot.botId}` &&
                      currentTab === "overview";
                    const isChat =
                      pathname === `/bots/${bot.botId}` &&
                      currentTab === "chat";

                    return (
                      <Collapsible
                        key={bot.botId}
                        asChild
                        defaultOpen={isSelected}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={bot.description || bot.botName}
                              isActive={isSelected}
                            >
                              <Bot className="size-4" />
                              <span>{bot.botName}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isOverview}
                                >
                                  <Link
                                    href={`/bots/${bot.botId}?tab=overview`}
                                  >
                                    <span>Overview</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={isChat}>
                                  <Link href={`/bots/${bot.botId}?tab=chat`}>
                                    <span>Chat & Debug</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/test-builder"}
                    tooltip="Create test sets for LexV2 bots"
                  >
                    <Link href="/test-builder">
                      <ClipboardList className="size-4" />
                      <span>Test Builder</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t">
          {!isHydrated ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="size-4 rounded-full bg-muted animate-pulse" />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-3 bg-muted rounded animate-pulse w-20" />
                </div>
              </div>
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          ) : isAuthenticated && userInfo ? (
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
            <div className="flex flex-col gap-2">
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
              <p className="text-xs text-muted-foreground text-center">
                Use credentials with Lex V2 access
              </p>
            </div>
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
