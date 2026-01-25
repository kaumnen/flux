"use client";

import { AlertCircle, Bot, Plus, Trash2, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AgentTestTurn,
  TestConversation,
  TestTurn,
  UserTestTurn,
} from "./test-builder-types";

function generateId(): string {
  return crypto.randomUUID();
}

interface TestConversationEditorProps {
  conversation: TestConversation;
  onChange: (conversation: TestConversation) => void;
}

function hasConsecutiveUserError(turns: TestTurn[]): boolean {
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].type === "user" && turns[i - 1].type === "user") {
      return true;
    }
  }
  return false;
}

export function TestConversationEditor({
  conversation,
  onChange,
}: TestConversationEditorProps) {
  const lastTurn = conversation.turns[conversation.turns.length - 1];
  const canAddUserTurn = !lastTurn || lastTurn.type === "agent";
  const canAddAgentTurn =
    lastTurn?.type === "user" || lastTurn?.type === "agent";

  const handleAddTurn = (turnType: "user" | "agent") => {
    const newTurn: TestTurn =
      turnType === "user"
        ? {
            id: generateId(),
            type: "user",
            utterance: "",
            expectedIntent: "",
          }
        : {
            id: generateId(),
            type: "agent",
            expectedResponse: "",
          };

    onChange({
      ...conversation,
      turns: [...conversation.turns, newTurn],
    });
  };

  const handleUpdateTurn = (turnId: string, updated: TestTurn) => {
    onChange({
      ...conversation,
      turns: conversation.turns.map((t) => (t.id === turnId ? updated : t)),
    });
  };

  const handleDeleteTurn = (turnId: string) => {
    onChange({
      ...conversation,
      turns: conversation.turns.filter((t) => t.id !== turnId),
    });
  };

  const showConsecutiveUserError = hasConsecutiveUserError(conversation.turns);

  return (
    <div className="space-y-3">
      {showConsecutiveUserError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            Consecutive user turns are not allowed. User must wait for agent
            response before speaking again.
          </AlertDescription>
        </Alert>
      )}

      {conversation.turns.map((turn, index) => (
        <div
          key={turn.id}
          className={`p-3 rounded-md border ${
            turn.type === "user" ? "bg-primary/5" : "bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={turn.type === "user" ? "default" : "secondary"}>
                {turn.type === "user" ? (
                  <User className="size-3 mr-1" />
                ) : (
                  <Bot className="size-3 mr-1" />
                )}
                Turn {index + 1} - {turn.type === "user" ? "User" : "Agent"}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteTurn(turn.id)}
              disabled={conversation.turns.length === 1}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>

          {turn.type === "user" ? (
            <UserTurnEditor
              turn={turn}
              onChange={(updated) => handleUpdateTurn(turn.id, updated)}
            />
          ) : (
            <AgentTurnEditor
              turn={turn}
              onChange={(updated) => handleUpdateTurn(turn.id, updated)}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2">
        {canAddUserTurn && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddTurn("user")}
          >
            <Plus className="size-3 mr-1" />
            Add User Turn
          </Button>
        )}
        {canAddAgentTurn && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddTurn("agent")}
          >
            <Plus className="size-3 mr-1" />
            Add Agent Turn
          </Button>
        )}
      </div>
    </div>
  );
}

interface UserTurnEditorProps {
  turn: UserTestTurn;
  onChange: (turn: UserTestTurn) => void;
}

function UserTurnEditor({ turn, onChange }: UserTurnEditorProps) {
  const handleSlotChange = (slotName: string, slotValue: string) => {
    const newSlots = { ...turn.expectedSlots, [slotName]: slotValue };
    if (!slotValue) {
      delete newSlots[slotName];
    }
    onChange({ ...turn, expectedSlots: newSlots });
  };

  const handleAddSlot = () => {
    const slotName = `slot${Object.keys(turn.expectedSlots || {}).length + 1}`;
    onChange({
      ...turn,
      expectedSlots: { ...turn.expectedSlots, [slotName]: "" },
    });
  };

  const handleRemoveSlot = (slotName: string) => {
    const newSlots = { ...turn.expectedSlots };
    delete newSlots[slotName];
    onChange({ ...turn, expectedSlots: newSlots });
  };

  const handleRenameSlot = (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;
    const newSlots = { ...turn.expectedSlots };
    const value = newSlots[oldName];
    delete newSlots[oldName];
    newSlots[newName] = value ?? "";
    onChange({ ...turn, expectedSlots: newSlots });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">User Utterance</Label>
        <Textarea
          placeholder="What the user says..."
          value={turn.utterance}
          onChange={(e) => onChange({ ...turn, utterance: e.target.value })}
          className="min-h-[2.5rem] break-all whitespace-pre-wrap"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Expected Intent</Label>
        <Input
          placeholder="IntentName"
          value={turn.expectedIntent}
          onChange={(e) =>
            onChange({ ...turn, expectedIntent: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Expected Slots (optional)</Label>
          <Button variant="ghost" size="sm" onClick={handleAddSlot}>
            <Plus className="size-3 mr-1" />
            Add Slot
          </Button>
        </div>
        {turn.expectedSlots && Object.keys(turn.expectedSlots).length > 0 && (
          <div className="space-y-2">
            {Object.entries(turn.expectedSlots).map(([name, value], index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: slot names change during editing, need stable key
              <div key={index} className="flex gap-2 items-center">
                <Input
                  className="w-32"
                  placeholder="Slot name"
                  value={name}
                  onChange={(e) => handleRenameSlot(name, e.target.value)}
                />
                <Input
                  className="flex-1"
                  placeholder="Expected value"
                  value={value}
                  onChange={(e) => handleSlotChange(name, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSlot(name)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentTurnEditorProps {
  turn: AgentTestTurn;
  onChange: (turn: AgentTestTurn) => void;
}

function AgentTurnEditor({ turn, onChange }: AgentTurnEditorProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Expected Agent Response</Label>
      <Textarea
        placeholder="What the bot should respond..."
        value={turn.expectedResponse}
        onChange={(e) =>
          onChange({ ...turn, expectedResponse: e.target.value })
        }
        rows={2}
        className="break-all whitespace-pre-wrap"
      />
    </div>
  );
}
