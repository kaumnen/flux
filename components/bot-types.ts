export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  rawRequest?: unknown;
  rawResponse?: unknown;
  sessionState?: unknown;
  interpretations?: unknown;
}
