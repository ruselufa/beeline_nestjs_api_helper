export interface DeepseekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepseekRequestOptions {
  model: string;
  messages: DeepseekMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface DeepseekConfig {
  apiKey: string;
  apiUrl: string;
  timeouts: {
    total: number;
    connect: number;
    sockRead: number;
  };
}

export interface TextProcessingOptions {
  fileName: string;
  content: string;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
} 