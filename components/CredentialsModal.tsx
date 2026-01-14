"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
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

  // Try environment variable format: export AWS_ACCESS_KEY_ID="value"
  const envPatterns = {
    accessKeyId: /export\s+AWS_ACCESS_KEY_ID=["']?([^"'\s\n]+)["']?/i,
    secretAccessKey: /export\s+AWS_SECRET_ACCESS_KEY=["']?([^"'\s\n]+)["']?/i,
    sessionToken: /export\s+AWS_SESSION_TOKEN=["']?([^"'\s\n]+)["']?/i,
    region: /export\s+AWS_(?:DEFAULT_)?REGION=["']?([^"'\s\n]+)["']?/i,
  };

  // Try credentials file format: aws_access_key_id=value
  const filePatterns = {
    accessKeyId: /aws_access_key_id\s*=\s*([^\s\n]+)/i,
    secretAccessKey: /aws_secret_access_key\s*=\s*([^\s\n]+)/i,
    sessionToken: /aws_session_token\s*=\s*([^\s\n]+)/i,
    region: /region\s*=\s*([^\s\n]+)/i,
  };

  // Try env format first
  let match = text.match(envPatterns.accessKeyId);
  if (match) result.accessKeyId = match[1];

  match = text.match(envPatterns.secretAccessKey);
  if (match) result.secretAccessKey = match[1];

  match = text.match(envPatterns.sessionToken);
  if (match) result.sessionToken = match[1];

  match = text.match(envPatterns.region);
  if (match) result.region = match[1];

  // If no env format found, try file format
  if (!result.accessKeyId) {
    match = text.match(filePatterns.accessKeyId);
    if (match) result.accessKeyId = match[1];
  }

  if (!result.secretAccessKey) {
    match = text.match(filePatterns.secretAccessKey);
    if (match) result.secretAccessKey = match[1];
  }

  if (!result.sessionToken) {
    match = text.match(filePatterns.sessionToken);
    if (match) result.sessionToken = match[1];
  }

  if (!result.region) {
    match = text.match(filePatterns.region);
    if (match) result.region = match[1];
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
  const [parseSuccess, setParseSuccess] = useState(false);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const handlePasteCredentials = () => {
    const parsed = parseCredentials(pasteText);
    if (parsed) {
      if (parsed.accessKeyId) setValue("accessKeyId", parsed.accessKeyId);
      if (parsed.secretAccessKey)
        setValue("secretAccessKey", parsed.secretAccessKey);
      if (parsed.sessionToken) setValue("sessionToken", parsed.sessionToken);
      if (parsed.region && isValidRegion(parsed.region)) {
        setValue("region", parsed.region);
      }
      setParseSuccess(true);
      setPasteText("");
      setTimeout(() => setParseSuccess(false), 2000);
    } else {
      setError("Could not parse credentials. Please check the format.");
    }
  };

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

          {parseSuccess && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              Credentials parsed successfully!
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pasteCredentials">
              Quick Paste{" "}
              <span className="text-muted-foreground">
                (env vars or credentials file format)
              </span>
            </Label>
            <div className="flex gap-2">
              <Textarea
                id="pasteCredentials"
                placeholder={`export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="min-h-[80px] font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handlePasteCredentials}
                disabled={!pasteText.trim()}
              >
                <ClipboardPaste className="size-4" />
              </Button>
            </div>
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
