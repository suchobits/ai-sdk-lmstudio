import type { LanguageModelV1Prompt } from '@ai-sdk/provider';
import { convertUint8ArrayToBase64 } from '@ai-sdk/provider-utils';

type LmstudioMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | LmstudioUserContentPart[] }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: LmstudioToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

type LmstudioUserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type LmstudioToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type ConversionWarning = {
  type: 'other';
  message: string;
};

export function convertToLmstudioChatMessages(
  prompt: LanguageModelV1Prompt,
): { messages: LmstudioMessage[]; warnings: ConversionWarning[] } {
  const messages: LmstudioMessage[] = [];
  const warnings: ConversionWarning[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system': {
        messages.push({ role: 'system', content: message.content });
        break;
      }

      case 'user': {
        const parts: LmstudioUserContentPart[] = [];

        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              parts.push({ type: 'text', text: part.text });
              break;
            }
            case 'image': {
              const url =
                part.image instanceof URL
                  ? part.image.toString()
                  : typeof part.image === 'string'
                    ? `data:${part.mimeType ?? 'image/png'};base64,${part.image}`
                    : `data:${part.mimeType ?? 'image/png'};base64,${convertUint8ArrayToBase64(part.image)}`;
              parts.push({ type: 'image_url', image_url: { url } });
              break;
            }
            case 'file': {
              if (part.mimeType?.startsWith('image/')) {
                const data =
                  part.data instanceof URL
                    ? part.data.toString()
                    : typeof part.data === 'string'
                      ? `data:${part.mimeType};base64,${part.data}`
                      : `data:${part.mimeType};base64,${convertUint8ArrayToBase64(part.data)}`;
                parts.push({ type: 'image_url', image_url: { url: data } });
              } else {
                warnings.push({
                  type: 'other',
                  message: 'Non-image file parts are not supported by LM Studio',
                });
              }
              break;
            }
            default: {
              warnings.push({
                type: 'other',
                message: `Unsupported user content type: ${(part as { type: string }).type}`,
              });
            }
          }
        }

        if (parts.length === 1 && parts[0].type === 'text') {
          messages.push({ role: 'user', content: parts[0].text });
        } else {
          messages.push({ role: 'user', content: parts });
        }
        break;
      }

      case 'assistant': {
        let text = '';
        const toolCalls: LmstudioToolCall[] = [];

        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              text += part.text;
              break;
            }
            case 'tool-call': {
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments:
                    typeof part.args === 'string'
                      ? part.args
                      : JSON.stringify(part.args),
                },
              });
              break;
            }
            case 'reasoning': {
              // LM Studio doesn't have native reasoning support
              break;
            }
            case 'redacted-reasoning': {
              break;
            }
            default: {
              warnings.push({
                type: 'other',
                message: `Unsupported assistant content type: ${(part as { type: string }).type}`,
              });
            }
          }
        }

        messages.push({
          role: 'assistant',
          content: text || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
        break;
      }

      case 'tool': {
        for (const part of message.content) {
          messages.push({
            role: 'tool',
            tool_call_id: part.toolCallId,
            content:
              typeof part.result === 'string'
                ? part.result
                : JSON.stringify(part.result),
          });
        }
        break;
      }
    }
  }

  return { messages, warnings };
}
