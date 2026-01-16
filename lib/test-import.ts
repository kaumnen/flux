import type {
  AgentTestTurn,
  TestConversation,
  TestSet,
  UserTestTurn,
} from "@/components/test-builder-types";

function generateId(): string {
  return crypto.randomUUID();
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

function parseSlot(slotString: string): { name: string; value: string } | null {
  const trimmed = slotString.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.+?)\s*=\s*(.+)$/);
  if (match) {
    return { name: match[1].trim(), value: match[2].trim() };
  }
  return null;
}

export interface ParseResult {
  success: true;
  testSet: TestSet;
  filename: string;
}

export interface ParseError {
  success: false;
  error: string;
}

export type ImportResult = ParseResult | ParseError;

export function parseCSV(csvContent: string, filename: string): ImportResult {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return { success: false, error: "CSV file is empty or has no data rows" };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  const conversationIdx = headers.findIndex((h) => h.includes("conversation"));
  const sourceIdx = headers.findIndex((h) => h === "source");
  const inputIdx = headers.findIndex((h) => h === "input");
  const intentIdx = headers.findIndex(
    (h) => h.includes("intent") || h.includes("expected output intent")
  );

  if (conversationIdx === -1 || sourceIdx === -1 || inputIdx === -1) {
    return {
      success: false,
      error:
        "CSV is missing required columns: Conversation #, Source, or Input",
    };
  }

  const slotIndices: number[] = [];
  headers.forEach((h, i) => {
    if (h.includes("slot")) {
      slotIndices.push(i);
    }
  });

  const conversationsMap = new Map<string, TestConversation>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const conversationNum = fields[conversationIdx]?.trim() || "1";
    const source = fields[sourceIdx]?.trim().toLowerCase();
    const input = fields[inputIdx]?.trim() || "";
    const intent = intentIdx !== -1 ? fields[intentIdx]?.trim() || "" : "";

    if (!conversationsMap.has(conversationNum)) {
      conversationsMap.set(conversationNum, {
        id: generateId(),
        turns: [],
      });
    }

    const conversation = conversationsMap.get(conversationNum);
    if (!conversation) continue;

    if (source === "user") {
      const slots: Record<string, string> = {};

      for (const slotIdx of slotIndices) {
        const slotValue = fields[slotIdx];
        if (slotValue) {
          const parsed = parseSlot(slotValue);
          if (parsed) {
            slots[parsed.name] = parsed.value;
          }
        }
      }

      const turn: UserTestTurn = {
        id: generateId(),
        type: "user",
        utterance: input,
        expectedIntent: intent,
        ...(Object.keys(slots).length > 0 && { expectedSlots: slots }),
      };

      conversation.turns.push(turn);
    } else if (source === "agent") {
      const turn: AgentTestTurn = {
        id: generateId(),
        type: "agent",
        expectedResponse: input,
      };

      conversation.turns.push(turn);
    }
  }

  const conversations = Array.from(conversationsMap.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, conv]) => conv)
    .filter((conv) => conv.turns.length > 0);

  if (conversations.length === 0) {
    return { success: false, error: "No valid conversations found in CSV" };
  }

  const baseName = filename.replace(/\.csv$/i, "");

  return {
    success: true,
    testSet: {
      name: baseName,
      description: `Imported from ${filename}`,
      conversations,
    },
    filename,
  };
}
