export interface TestSet {
  name: string;
  description?: string;
  conversations: TestConversation[];
}

export interface TestConversation {
  id: string;
  turns: TestTurn[];
}

export type TestTurn = UserTestTurn | AgentTestTurn;

export interface UserTestTurn {
  id: string;
  type: "user";
  utterance: string;
  expectedIntent: string;
  expectedSlots?: Record<string, string>;
}

export interface AgentTestTurn {
  id: string;
  type: "agent";
  expectedResponse: string;
}
