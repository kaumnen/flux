import type { TestSet, TestTurn } from "@/components/test-builder-types";

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function getMaxSlotCount(testSet: TestSet): number {
  let maxSlots = 0;
  for (const conversation of testSet.conversations) {
    for (const turn of conversation.turns) {
      if (turn.type === "user" && turn.expectedSlots) {
        const slotCount = Object.keys(turn.expectedSlots).length;
        if (slotCount > maxSlots) {
          maxSlots = slotCount;
        }
      }
    }
  }
  return maxSlots;
}

interface CSVRow {
  lineNumber: number;
  conversationNumber: string;
  source: "User" | "Agent";
  input: string;
  expectedOutputIntent: string;
  slots: string[];
}

function turnToCSVRow(
  lineNumber: number,
  conversationNumber: number,
  turn: TestTurn,
  maxSlots: number
): CSVRow {
  const slots: string[] = [];

  if (turn.type === "user") {
    if (turn.expectedSlots) {
      for (const [name, value] of Object.entries(turn.expectedSlots)) {
        if (value) {
          slots.push(`${name} = ${value}`);
        }
      }
    }
    // Pad with empty strings to match maxSlots
    while (slots.length < maxSlots) {
      slots.push("");
    }

    return {
      lineNumber,
      conversationNumber: conversationNumber.toString(),
      source: "User",
      input: turn.utterance,
      expectedOutputIntent: turn.expectedIntent,
      slots,
    };
  }

  // Agent turn
  // Pad with empty strings to match maxSlots
  while (slots.length < maxSlots) {
    slots.push("");
  }

  return {
    lineNumber,
    conversationNumber: conversationNumber.toString(),
    source: "Agent",
    input: turn.expectedResponse,
    expectedOutputIntent: "",
    slots,
  };
}

export function testSetToCSV(testSet: TestSet): string {
  const maxSlots = getMaxSlotCount(testSet);

  // Build headers
  const headers = [
    "Line #",
    "Conversation #",
    "Source",
    "Input",
    "Expected Output Intent",
  ];

  for (let i = 1; i <= maxSlots; i++) {
    headers.push(`Expected Output Slot ${i}`);
  }

  const rows: CSVRow[] = [];
  let lineNumber = 1;

  for (
    let convIndex = 0;
    convIndex < testSet.conversations.length;
    convIndex++
  ) {
    const conversation = testSet.conversations[convIndex];
    const conversationNumber = convIndex + 1;

    for (const turn of conversation.turns) {
      rows.push(turnToCSVRow(lineNumber, conversationNumber, turn, maxSlots));
      lineNumber++;
    }
  }

  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.lineNumber.toString(),
        row.conversationNumber,
        row.source,
        escapeCSVField(row.input),
        escapeCSVField(row.expectedOutputIntent),
        ...row.slots.map(escapeCSVField),
      ].join(",")
    ),
  ];

  return csvLines.join("\n");
}

export function downloadCSV(testSet: TestSet): void {
  const csv = testSetToCSV(testSet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${testSet.name || "test-set"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
