"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  Database,
  Key,
  Loader2,
  Shield,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/lib/stores/auth-store";
import { testSetToCSV } from "@/lib/test-export";
import { trpc } from "@/lib/trpc/client";
import type { TestSet } from "./test-builder-types";

interface TestUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSet: TestSet;
}

type UploadStep = "config" | "uploading" | "success" | "error";

export function TestUploadDialog({
  open,
  onOpenChange,
  testSet,
}: TestUploadDialogProps) {
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<UploadStep>("config");
  const [error, setError] = useState<string | null>(null);

  const [roleArn, setRoleArn] = useState("");
  const [s3BucketName, setS3BucketName] = useState("");
  const [s3Path, setS3Path] = useState("");
  const [kmsKeyArn, setKmsKeyArn] = useState("");

  const [bucketPopoverOpen, setBucketPopoverOpen] = useState(false);
  const [kmsPopoverOpen, setKmsPopoverOpen] = useState(false);

  const createUploadUrlMutation = trpc.aws.createUploadUrl.useMutation();
  const startImportMutation = trpc.aws.startTestSetImport.useMutation();

  const bucketsQuery = trpc.aws.listBuckets.useQuery(undefined, {
    enabled: isAuthenticated && open,
  });

  const kmsKeysQuery = trpc.aws.listKmsKeys.useQuery(undefined, {
    enabled: isAuthenticated && open,
  });

  const handleUpload = async () => {
    if (!isAuthenticated) {
      setError("Please connect to AWS first");
      setStep("error");
      return;
    }

    if (!roleArn || !s3BucketName || !s3Path) {
      setError("Please fill in all required fields");
      return;
    }

    setStep("uploading");
    setError(null);

    try {
      const uploadUrlResult = await createUploadUrlMutation.mutateAsync();

      if (!uploadUrlResult?.uploadUrl || !uploadUrlResult?.importId) {
        throw new Error("Failed to get upload URL");
      }

      const csvContent = testSetToCSV(testSet);
      const blob = new Blob([csvContent], { type: "text/csv" });

      const uploadResponse = await fetch(uploadUrlResult.uploadUrl, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": "text/csv",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      await startImportMutation.mutateAsync({
        importId: uploadUrlResult.importId,
        testSetName: testSet.name,
        description: testSet.description,
        roleArn,
        storageLocation: {
          s3BucketName,
          s3Path,
          kmsKeyArn: kmsKeyArn || undefined,
        },
      });

      setStep("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      setStep("error");
    }
  };

  const handleClose = () => {
    setStep("config");
    setError(null);
    onOpenChange(false);
  };

  const isUploading = step === "uploading";

  const selectedKmsKey = kmsKeysQuery.data?.find((k) => k.keyArn === kmsKeyArn);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload to LexV2
          </DialogTitle>
          <DialogDescription>
            Configure storage and permissions for your test set import
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5 py-2">
            {/* IAM Role ARN */}
            <div className="space-y-2">
              <Label
                htmlFor="role-arn"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Shield className="size-4 text-amber-500" />
                IAM Role ARN
              </Label>
              <Input
                id="role-arn"
                placeholder="arn:aws:iam::123456789012:role/LexTestRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Role with permissions to access S3 and Lex
              </p>
            </div>

            {/* S3 Bucket */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Database className="size-4 text-emerald-500" />
                S3 Bucket
              </Label>
              <Popover
                open={bucketPopoverOpen}
                onOpenChange={setBucketPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-mono text-sm"
                  >
                    {s3BucketName || (
                      <span className="text-muted-foreground">
                        Select or type bucket name...
                      </span>
                    )}
                    <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search buckets..."
                      value={s3BucketName}
                      onValueChange={setS3BucketName}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {bucketsQuery.isLoading ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <Loader2 className="size-4 animate-spin" />
                            <span>Loading buckets...</span>
                          </div>
                        ) : (
                          <div className="py-2">
                            <p>No buckets found.</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Type a bucket name to use it anyway.
                            </p>
                          </div>
                        )}
                      </CommandEmpty>
                      <CommandGroup heading="Available Buckets">
                        <ScrollArea className="h-[200px]">
                          {bucketsQuery.data?.map((bucket) => (
                            <CommandItem
                              key={bucket.name}
                              value={bucket.name ?? ""}
                              onSelect={(value) => {
                                setS3BucketName(value);
                                setBucketPopoverOpen(false);
                              }}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <Database className="size-4 text-muted-foreground" />
                                <span className="font-mono text-sm">
                                  {bucket.name}
                                </span>
                              </div>
                              {s3BucketName === bucket.name && (
                                <Check className="size-4 text-emerald-500" />
                              )}
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* S3 Path */}
            <div className="space-y-2">
              <Label htmlFor="s3-path" className="text-sm font-medium">
                S3 Path
              </Label>
              <Input
                id="s3-path"
                placeholder="test-sets/my-test"
                value={s3Path}
                onChange={(e) => setS3Path(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {/* KMS Key */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Key className="size-4 text-blue-500" />
                KMS Key
                <Badge variant="secondary" className="text-xs font-normal">
                  Optional
                </Badge>
              </Label>
              <Popover open={kmsPopoverOpen} onOpenChange={setKmsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-sm"
                  >
                    {selectedKmsKey ? (
                      <span className="truncate">
                        {selectedKmsKey.description || selectedKmsKey.keyId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        No encryption
                      </span>
                    )}
                    <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search KMS keys..." />
                    <CommandList>
                      <CommandEmpty>
                        {kmsKeysQuery.isLoading ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <Loader2 className="size-4 animate-spin" />
                            <span>Loading keys...</span>
                          </div>
                        ) : (
                          "No KMS keys found."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setKmsKeyArn("");
                            setKmsPopoverOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <span className="text-muted-foreground">
                            No encryption
                          </span>
                          {!kmsKeyArn && (
                            <Check className="size-4 text-emerald-500" />
                          )}
                        </CommandItem>
                        <ScrollArea className="h-[200px]">
                          {kmsKeysQuery.data?.map((key) => (
                            <CommandItem
                              key={key.keyId}
                              value={key.description || key.keyId || ""}
                              onSelect={() => {
                                setKmsKeyArn(key.keyArn ?? "");
                                setKmsPopoverOpen(false);
                              }}
                              className="flex items-center justify-between"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">
                                  {key.description || "Unnamed key"}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {key.keyId}
                                </span>
                              </div>
                              {kmsKeyArn === key.keyArn && (
                                <Check className="size-4 text-emerald-500" />
                              )}
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "uploading" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <Loader2 className="size-10 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Uploading test set...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-6">
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <Check className="size-4 text-emerald-500" />
              <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                Upload Started
              </AlertTitle>
              <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                Your test set import has been initiated. Check the LexV2 console
                to monitor the import progress.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "error" && (
          <div className="py-6">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>
                {error || "An error occurred during upload"}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {step === "config" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                <Upload className="size-4 mr-2" />
                Upload
              </Button>
            </>
          )}
          {(step === "success" || step === "error") && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
