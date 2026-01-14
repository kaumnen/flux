"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/stores/auth-store";
import { trpc } from "@/lib/trpc/client";

const LEX_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
] as const;

type RegionValue = (typeof LEX_REGIONS)[number]["value"];

function isValidRegion(region: string): region is RegionValue {
  return LEX_REGIONS.some((r) => r.value === region);
}

interface ParsedCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
}

function parseCredentials(text: string): ParsedCredentials | null {
  const result: ParsedCredentials = {};

  // Helper to extract value - handles both quoted (possibly multi-line) and unquoted values
  function extractValue(text: string, prefix: RegExp): string | null {
    const prefixMatch = text.match(prefix);
    if (!prefixMatch) return null;

    const afterPrefix = text.slice(
      (prefixMatch.index ?? 0) + prefixMatch[0].length
    );

    // Check if value is quoted
    if (afterPrefix.startsWith('"')) {
      // Find closing quote, handling multi-line
      const endQuote = afterPrefix.indexOf('"', 1);
      if (endQuote > 0) {
        return afterPrefix.slice(1, endQuote).replace(/[\s\n]+/g, "");
      }
    } else if (afterPrefix.startsWith("'")) {
      const endQuote = afterPrefix.indexOf("'", 1);
      if (endQuote > 0) {
        return afterPrefix.slice(1, endQuote).replace(/[\s\n]+/g, "");
      }
    } else {
      // Unquoted - take until whitespace
      const match = afterPrefix.match(/^([^\s\n]+)/);
      if (match) return match[1];
    }
    return null;
  }

  // Define prefixes for each format
  const prefixes = {
    // Unix/macOS: export AWS_ACCESS_KEY_ID="value"
    env: {
      accessKeyId: /export\s+AWS_ACCESS_KEY_ID=/i,
      secretAccessKey: /export\s+AWS_SECRET_ACCESS_KEY=/i,
      sessionToken: /export\s+AWS_SESSION_TOKEN=/i,
      region: /export\s+AWS_(?:DEFAULT_)?REGION=/i,
    },
    // Windows CMD: SET AWS_ACCESS_KEY_ID=value
    cmd: {
      accessKeyId: /SET\s+AWS_ACCESS_KEY_ID=/i,
      secretAccessKey: /SET\s+AWS_SECRET_ACCESS_KEY=/i,
      sessionToken: /SET\s+AWS_SESSION_TOKEN=/i,
      region: /SET\s+AWS_(?:DEFAULT_)?REGION=/i,
    },
    // PowerShell: $Env:AWS_ACCESS_KEY_ID="value"
    ps: {
      accessKeyId: /\$Env:AWS_ACCESS_KEY_ID=/i,
      secretAccessKey: /\$Env:AWS_SECRET_ACCESS_KEY=/i,
      sessionToken: /\$Env:AWS_SESSION_TOKEN=/i,
      region: /\$Env:AWS_(?:DEFAULT_)?REGION=/i,
    },
    // Credentials file: aws_access_key_id=value
    file: {
      accessKeyId: /aws_access_key_id\s*=\s*/i,
      secretAccessKey: /aws_secret_access_key\s*=\s*/i,
      sessionToken: /aws_session_token\s*=\s*/i,
      region: /(?<!default_)region\s*=\s*/i,
    },
  };

  const allPrefixes = [prefixes.env, prefixes.cmd, prefixes.ps, prefixes.file];

  for (const p of allPrefixes) {
    if (!result.accessKeyId) {
      const val = extractValue(text, p.accessKeyId);
      if (val) result.accessKeyId = val;
    }
    if (!result.secretAccessKey) {
      const val = extractValue(text, p.secretAccessKey);
      if (val) result.secretAccessKey = val;
    }
    if (!result.sessionToken) {
      const val = extractValue(text, p.sessionToken);
      if (val) result.sessionToken = val;
    }
    if (!result.region) {
      const val = extractValue(text, p.region);
      if (val) result.region = val;
    }
  }

  // Return null if we didn't find at least access key and secret
  if (!result.accessKeyId || !result.secretAccessKey) {
    return null;
  }

  return result;
}

const credentialsSchema = z.object({
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  sessionToken: z.string().optional(),
  region: z.string().min(1, "Region is required"),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage?: string;
}

export function CredentialsModal({
  open,
  onOpenChange,
  errorMessage,
}: CredentialsModalProps) {
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [pasteText, setPasteText] = useState("");
  const [parseStatus, setParseStatus] = useState<{
    found: string[];
    applied: boolean;
  } | null>(null);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      accessKeyId: "",
      secretAccessKey: "",
      sessionToken: "",
      region: "us-east-1",
    },
  });

  const connectMutation = trpc.aws.connect.useMutation({
    onSuccess: (data) => {
      setAuthenticated(
        {
          account: data.account,
          arn: data.arn,
          userId: data.userId,
          region: data.region,
        },
        !!watch("sessionToken")
      );
      onOpenChange(false);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onSubmit = (data: CredentialsFormData) => {
    setError(null);
    connectMutation.mutate({
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
      sessionToken: data.sessionToken || undefined,
      region: data.region as (typeof LEX_REGIONS)[number]["value"],
    });
  };

  const selectedRegion = watch("region");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset();
      setPasteText("");
      setParseStatus(null);
      setError(null);
    }
  }, [open, reset]);

  // Auto-parse credentials as user types/pastes
  useEffect(() => {
    if (!pasteText.trim()) {
      setParseStatus(null);
      return;
    }

    const parsed = parseCredentials(pasteText);
    if (parsed) {
      const found: string[] = [];
      if (parsed.accessKeyId) {
        setValue("accessKeyId", parsed.accessKeyId);
        found.push("Access Key");
      }
      if (parsed.secretAccessKey) {
        setValue("secretAccessKey", parsed.secretAccessKey);
        found.push("Secret Key");
      }
      if (parsed.sessionToken) {
        setValue("sessionToken", parsed.sessionToken);
        found.push("Session Token");
      }
      if (parsed.region && isValidRegion(parsed.region)) {
        setValue("region", parsed.region);
        found.push("Region");
      }
      setParseStatus({ found, applied: true });
      setError(null);
    } else {
      setParseStatus(null);
    }
  }, [pasteText, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Connect to AWS</DialogTitle>
          <DialogDescription>
            Enter your AWS credentials to connect to Amazon Lex V2.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {(error || errorMessage) && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error || errorMessage}
            </div>
          )}

          {parseStatus?.applied && (
            <div className="flex items-center gap-1.5 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              <Check className="size-4" />
              <span>Found: {parseStatus.found.join(", ")}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pasteCredentials">
              Quick Paste{" "}
              <span className="text-muted-foreground">
                (paste credentials and fields auto-fill)
              </span>
            </Label>
            <Textarea
              id="pasteCredentials"
              placeholder={`Paste your AWS credentials here...
export AWS_ACCESS_KEY_ID="..."
$Env:AWS_SECRET_ACCESS_KEY="..."`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="min-h-[80px] max-h-[120px] overflow-auto break-all font-mono text-xs"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter manually
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessKeyId">Access Key ID</Label>
            <Input
              id="accessKeyId"
              type="text"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              {...register("accessKeyId")}
            />
            {errors.accessKeyId && (
              <p className="text-sm text-destructive">
                {errors.accessKeyId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretAccessKey">Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              type="password"
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              {...register("secretAccessKey")}
            />
            {errors.secretAccessKey && (
              <p className="text-sm text-destructive">
                {errors.secretAccessKey.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionToken">
              Session Token{" "}
              <span className="text-muted-foreground">(optional, for SSO)</span>
            </Label>
            <Input
              id="sessionToken"
              type="password"
              placeholder="FwoGZXIvYXdzE..."
              {...register("sessionToken")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select
              value={selectedRegion}
              onValueChange={(value) => setValue("region", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {LEX_REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.region && (
              <p className="text-sm text-destructive">
                {errors.region.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={connectMutation.isPending}>
              {connectMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
