"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEX_REGIONS, type LexRegion } from "@/lib/constants/regions";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";

export function RegionSelector() {
  const router = useRouter();
  const { userInfo, setAuthenticated, isSSO } = useAuthStore();
  const utils = trpc.useUtils();

  const changeRegionMutation = trpc.aws.changeRegion.useMutation({
    onSuccess: (data) => {
      if (userInfo) {
        setAuthenticated({ ...userInfo, region: data.region }, isSSO);
      }
      utils.aws.invalidate();
      router.push("/");
    },
  });

  const currentRegion = userInfo?.region ?? "us-east-1";

  const handleRegionChange = (region: string) => {
    if (region !== currentRegion) {
      changeRegionMutation.mutate({ region: region as LexRegion });
    }
  };

  return (
    <Select
      value={currentRegion}
      onValueChange={handleRegionChange}
      disabled={changeRegionMutation.isPending}
    >
      <SelectTrigger className="h-7 w-full text-xs">
        <Globe className="size-3 mr-1.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEX_REGIONS.map((region) => (
          <SelectItem
            key={region.value}
            value={region.value}
            className="text-xs"
          >
            <span className="font-medium">{region.value}</span>
            <span className="ml-2 text-muted-foreground">{region.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
