import { systemPromptV2 } from './system.prompt_v2';
import { salesPromptV2 } from './sales.prompt_v2';

export const combinedPromptV2 = `${systemPromptV2}

${salesPromptV2}`;

export function getCombinedPrompt(): string {
    return combinedPromptV2;
} 