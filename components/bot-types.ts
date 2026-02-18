export interface ImageResponseCard {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: { text: string; value: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  rawRequest?: unknown;
  rawResponse?: unknown;
  sessionState?: unknown;
  interpretations?: unknown;
  imageResponseCards?: ImageResponseCard[];
}
