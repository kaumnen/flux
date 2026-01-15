"use client";

import {
  Bot,
  Download,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadCSV } from "@/lib/test-export";
import { TestConversationEditor } from "./TestConversationEditor";
import { TestUploadDialog } from "./TestUploadDialog";
import type { TestConversation, TestSet } from "./test-builder-types";

function generateId(): string {
  return crypto.randomUUID();
}

function createEmptyConversation(): TestConversation {
  return {
    id: generateId(),
    turns: [
      {
        id: generateId(),
        type: "user",
        utterance: "",
        expectedIntent: "",
      },
    ],
  };
}

export function TestBuilder() {
  const [testSet, setTestSet] = useState<TestSet>({
    name: "",
    description: "",
    conversations: [],
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleAddConversation = () => {
    setTestSet((prev) => ({
      ...prev,
      conversations: [...prev.conversations, createEmptyConversation()],
    }));
  };

  const handleUpdateConversation = (
    conversationId: string,
    updated: TestConversation
  ) => {
    setTestSet((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.id === conversationId ? updated : c
      ),
    }));
  };

  const handleDeleteConversation = (conversationId: string) => {
    setTestSet((prev) => ({
      ...prev,
      conversations: prev.conversations.filter((c) => c.id !== conversationId),
    }));
  };

  const handleExportCSV = () => {
    if (testSet.conversations.length === 0) {
      return;
    }
    downloadCSV(testSet);
  };

  const isExportDisabled =
    !testSet.name.trim() || testSet.conversations.length === 0;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Bot className="size-8" />
          <div>
            <h1 className="text-2xl font-semibold">Test Builder</h1>
            <p className="text-muted-foreground">
              Create test sets for LexV2 bots
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExportDisabled}
          >
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
          <Button
            disabled={isExportDisabled}
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="size-4 mr-2" />
            Upload to LexV2
          </Button>
        </div>
      </div>

      <TestUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        testSet={testSet}
      />

      {/* Test Set Metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Test Set Details
          </CardTitle>
          <CardDescription>Name and describe your test set</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-set-name">Name</Label>
            <Input
              id="test-set-name"
              placeholder="My Test Set"
              value={testSet.name}
              onChange={(e) =>
                setTestSet((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-set-description">Description (optional)</Label>
            <Textarea
              id="test-set-description"
              placeholder="Describe what this test set covers..."
              value={testSet.description}
              onChange={(e) =>
                setTestSet((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="size-4" />
                Conversations
              </CardTitle>
              <CardDescription>
                Add multi-turn test conversations
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddConversation}>
              <Plus className="size-4 mr-1" />
              Add Conversation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testSet.conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="size-12 mb-4" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">
                Click "Add Conversation" to create your first test case
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {testSet.conversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Conversation {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConversation(conversation.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <TestConversationEditor
                    conversation={conversation}
                    onChange={(updated) =>
                      handleUpdateConversation(conversation.id, updated)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
