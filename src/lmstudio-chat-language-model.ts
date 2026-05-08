import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
  LanguageModelV1StreamPart,
} from '@ai-sdk/provider';
import type { ParseResult } from '@ai-sdk/provider-utils';
import {
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import type { LmstudioChatSettings, LmstudioConfig } from './lmstudio-chat-settings.js';
import { convertToLmstudioChatMessages } from './convert-to-lmstudio-chat-messages.js';
import { getResponseMetadata } from './get-response-metadata.js';
import { lmstudioFailedResponseHandler } from './lmstudio-error.js';
import { prepareTools } from './lmstudio-prepare-tools.js';
import { mapLmstudioFinishReason } from './map-lmstudio-finish-reason.js';
import { mapLmstudioUsage } from './map-lmstudio-usage.js';

export class LmstudioChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode = 'json' as const;
  readonly supportsStructuredOutputs = true;

  constructor(
    modelId: string,
    private readonly settings: LmstudioChatSettings,
    private readonly config: LmstudioConfig,
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
  }

  private getArgs(options: LanguageModelV1CallOptions) {
    const { messages, warnings: messageWarnings } =
      convertToLmstudioChatMessages(options.prompt);
    const {
      tools,
      tool_choice,
      response_format,
      warnings: toolWarnings,
    } = prepareTools(options.mode);

    const warnings: LanguageModelV1CallWarning[] = [
      ...messageWarnings,
      ...toolWarnings,
    ];

    const body = {
      model: this.modelId,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      seed: options.seed,
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
      ...(response_format ? { response_format } : {}),
    };

    return { body, warnings };
  }

  async doGenerate(options: LanguageModelV1CallOptions) {
    const { body, warnings } = this.getArgs(options);

    const { value: response, responseHeaders } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: this.config.headers(),
      body,
      failedResponseHandler: lmstudioFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        lmstudioChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const choice = response.choices[0];
    const { id, modelId, timestamp } = getResponseMetadata(response);

    const reasoning = choice.message.reasoning_content
      ? [{ type: 'text' as const, text: choice.message.reasoning_content }]
      : undefined;

    return {
      text: choice.message.content ?? undefined,
      reasoning,
      toolCalls: choice.message.tool_calls?.map((toolCall) => ({
        toolCallType: 'function' as const,
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        args: toolCall.function.arguments,
      })),
      finishReason: mapLmstudioFinishReason(choice.finish_reason),
      usage: mapLmstudioUsage(response.usage),
      rawCall: {
        rawPrompt: body.messages,
        rawSettings: body,
      },
      rawResponse: {
        headers: responseHeaders,
      },
      response: { id, modelId, timestamp },
      warnings,
    };
  }

  async doStream(options: LanguageModelV1CallOptions) {
    const { body, warnings } = this.getArgs(options);

    const { value: response, responseHeaders } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: this.config.headers(),
      body: {
        ...body,
        stream: true,
        stream_options: { include_usage: true },
      },
      failedResponseHandler: lmstudioFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        lmstudioChatChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    let finishReason: ReturnType<typeof mapLmstudioFinishReason> = 'unknown';
    let usage = { promptTokens: 0, completionTokens: 0 };

    const toolCalls: Record<
      number,
      { id: string; name: string; arguments: string }
    > = {};

    type ChunkType = z.infer<typeof lmstudioChatChunkSchema>;

    const stream = response.pipeThrough(
      new TransformStream<ParseResult<ChunkType>, LanguageModelV1StreamPart>({
        transform(result, controller) {
          if (!result.success) return;

          const chunk = result.value;

          if (!chunk.choices?.length && chunk.usage) {
            usage = mapLmstudioUsage(chunk.usage);
            return;
          }

          const choice = chunk.choices?.[0];
          if (!choice) return;

          if (chunk.id) {
            controller.enqueue({
              type: 'response-metadata',
              ...getResponseMetadata(chunk),
            });
          }

          if (choice.delta?.reasoning_content) {
            controller.enqueue({
              type: 'reasoning',
              textDelta: choice.delta.reasoning_content,
            });
          }

          if (choice.delta?.content) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: choice.delta.content,
            });
          }

          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const index = tc.index;

              if (tc.id) {
                toolCalls[index] = {
                  id: tc.id,
                  name: tc.function?.name ?? '',
                  arguments: '',
                };
              }

              if (tc.function?.name && toolCalls[index]) {
                toolCalls[index].name = tc.function.name;
              }

              if (tc.function?.arguments && toolCalls[index]) {
                toolCalls[index].arguments += tc.function.arguments;
                controller.enqueue({
                  type: 'tool-call-delta',
                  toolCallType: 'function',
                  toolCallId: toolCalls[index].id,
                  toolName: toolCalls[index].name,
                  argsTextDelta: tc.function.arguments,
                });
              }
            }
          }

          if (choice.finish_reason) {
            finishReason = mapLmstudioFinishReason(choice.finish_reason);

            for (const tc of Object.values(toolCalls)) {
              controller.enqueue({
                type: 'tool-call',
                toolCallType: 'function',
                toolCallId: tc.id,
                toolName: tc.name,
                args: tc.arguments,
              });
            }
          }
        },

        flush(controller) {
          controller.enqueue({
            type: 'finish',
            finishReason,
            usage,
          });
        },
      }),
    );

    return {
      stream,
      rawCall: {
        rawPrompt: body.messages,
        rawSettings: body,
      },
      rawResponse: {
        headers: responseHeaders,
      },
      warnings,
    };
  }
}

const lmstudioChatResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  created: z.number().optional(),
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        reasoning_content: z.string().nullable().optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              type: z.literal('function'),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            }),
          )
          .optional(),
      }),
      finish_reason: z.string().nullable().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

const lmstudioChatChunkSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  created: z.number().optional(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullable().optional(),
            reasoning_content: z.string().nullable().optional(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().optional(),
                  function: z
                    .object({
                      name: z.string().optional(),
                      arguments: z.string().optional(),
                    })
                    .optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional()
    .nullable(),
});
