"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

  const createUploadUrlMutation = trpc.aws.createUploadUrl.useMutation();
  const startImportMutation = trpc.aws.startTestSetImport.useMutation();

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
      // Step 1: Get upload URL
      const uploadUrlResult = await createUploadUrlMutation.mutateAsync();

      if (!uploadUrlResult?.uploadUrl || !uploadUrlResult?.importId) {
        throw new Error("Failed to get upload URL");
      }

      // Step 2: Convert test set to CSV and upload
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

      // Step 3: Start import
      await startImportMutation.mutateAsync({
        importId: uploadUrlResult.importId,
        testSetName: testSet.name,
        description: testSet.description,
        roleArn,
        storageLocation: {
          s3BucketName,
          s3Path,
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload to LexV2
          </DialogTitle>
          <DialogDescription>
            Upload your test set directly to Amazon Lex V2
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-arn">IAM Role ARN</Label>
              <Input
                id="role-arn"
                placeholder="arn:aws:iam::123456789012:role/LexTestRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Role with permissions to access S3 and Lex
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s3-bucket">S3 Bucket Name</Label>
              <Input
                id="s3-bucket"
                placeholder="my-lex-test-bucket"
                value={s3BucketName}
                onChange={(e) => setS3BucketName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s3-path">S3 Path</Label>
              <Input
                id="s3-path"
                placeholder="test-sets/my-test"
                value={s3Path}
                onChange={(e) => setS3Path(e.target.value)}
              />
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
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Uploading test set to LexV2...
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="py-4">
            <Alert>
              <AlertTitle>Upload Started</AlertTitle>
              <AlertDescription>
                Your test set import has been initiated. Check the LexV2 console
                to monitor the import progress.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "error" && (
          <div className="py-4">
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
