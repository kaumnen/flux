import type {
  TestConversation,
  TestSet,
  TestTurn,
} from "@/components/test-builder-types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateTurn(
  turn: TestTurn,
  turnIndex: number,
  conversationIndex: number
): string[] {
  const errors: string[] = [];
  const turnLabel = `Conversation ${conversationIndex + 1}, Turn ${turnIndex + 1}`;

  if (turn.type === "user") {
    if (!turn.utterance.trim()) {
      errors.push(`${turnLabel}: Missing user utterance`);
    }
    if (!turn.expectedIntent.trim()) {
      errors.push(`${turnLabel}: Missing expected intent`);
    }
    if (turn.expectedSlots) {
      for (const [name, value] of Object.entries(turn.expectedSlots)) {
        if (name.trim() && !value.trim()) {
          errors.push(`${turnLabel}: Slot "${name}" has no value`);
        }
        if (!name.trim() && value.trim()) {
          errors.push(`${turnLabel}: Slot value "${value}" has no name`);
        }
      }
    }
  } else {
    if (!turn.expectedResponse.trim()) {
      errors.push(`${turnLabel}: Missing expected agent response`);
    }
  }

  return errors;
}

function validateConversation(
  conversation: TestConversation,
  conversationIndex: number
): string[] {
  const errors: string[] = [];

  if (conversation.turns.length === 0) {
    errors.push(`Conversation ${conversationIndex + 1}: No turns defined`);
    return errors;
  }

  // Check for consecutive user turns
  for (let i = 1; i < conversation.turns.length; i++) {
    if (
      conversation.turns[i].type === "user" &&
      conversation.turns[i - 1].type === "user"
    ) {
      errors.push(
        `Conversation ${conversationIndex + 1}: Consecutive user turns at Turn ${i} and ${i + 1} - user must wait for agent response`
      );
    }
  }

  for (let i = 0; i < conversation.turns.length; i++) {
    errors.push(...validateTurn(conversation.turns[i], i, conversationIndex));
  }

  return errors;
}

export function validateTestSet(testSet: TestSet): ValidationResult {
  const errors: string[] = [];

  if (testSet.conversations.length === 0) {
    return {
      isValid: false,
      errors: ["No conversations defined"],
    };
  }

  for (let i = 0; i < testSet.conversations.length; i++) {
    errors.push(...validateConversation(testSet.conversations[i], i));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function isTestSetComplete(testSet: TestSet): boolean {
  return validateTestSet(testSet).isValid;
}
