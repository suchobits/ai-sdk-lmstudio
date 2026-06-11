import type {
	LanguageModelV3,
	LanguageModelV3CallOptions,
	LanguageModelV3Content,
	LanguageModelV3StreamPart,
	SharedV3Warning,
} from '@ai-sdk/provider';
import type { ParseResult } from '@ai-sdk/provider-utils';
import {
	createEventSourceResponseHandler,
	createJsonResponseHandler,
	generateId,
	postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { convertToLmstudioChatMessages } from './convert-to-lmstudio-chat-messages.js';
import { getResponseMetadata } from './get-response-metadata.js';
import type {
	LmstudioChatSettings,
	LmstudioConfig,
} from './lmstudio-chat-settings.js';
import { lmstudioFailedResponseHandler } from './lmstudio-error.js';
import { prepareTools } from './lmstudio-prepare-tools.js';
import { mapLmstudioFinishReason } from './map-lmstudio-finish-reason.js';
import { mapLmstudioUsage } from './map-lmstudio-usage.js';

export class LmstudioChatLanguageModel implements LanguageModelV3 {
	readonly specificationVersion = 'v3' as const;
	readonly provider: string;
	readonly modelId: string;
	readonly supportedUrls: Record<string, RegExp[]> = {};

	constructor(
		modelId: string,
		readonly _settings: LmstudioChatSettings,
		private readonly config: LmstudioConfig,
	) {
		this.provider = config.provider;
		this.modelId = modelId;
	}

	private getArgs(options: LanguageModelV3CallOptions) {
		const { messages, warnings: messageWarnings } =
			convertToLmstudioChatMessages(options.prompt);
		const {
			tools,
			tool_choice,
			warnings: toolWarnings,
		} = prepareTools(options.tools, options.toolChoice);

		const warnings: SharedV3Warning[] = [...messageWarnings, ...toolWarnings];

		const responseFormat = options.responseFormat;
		const body = {
			model: this.modelId,
			messages,
			temperature: options.temperature,
			max_tokens: options.maxOutputTokens,
			top_p: options.topP,
			frequency_penalty: options.frequencyPenalty,
			presence_penalty: options.presencePenalty,
			stop: options.stopSequences,
			seed: options.seed,
			...(tools ? { tools } : {}),
			...(tool_choice ? { tool_choice } : {}),
			...(responseFormat?.type === 'json'
				? {
						response_format: responseFormat.schema
							? {
									type: 'json_schema',
									json_schema: {
										name: responseFormat.name ?? 'response',
										description: responseFormat.description,
										schema: responseFormat.schema,
									},
								}
							: { type: 'json_object' },
					}
				: {}),
		};

		return { body, warnings };
	}

	async doGenerate(options: LanguageModelV3CallOptions) {
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
		const metadata = getResponseMetadata(response);

		const content: LanguageModelV3Content[] = [];

		if (choice.message.reasoning_content) {
			content.push({
				type: 'reasoning',
				text: choice.message.reasoning_content,
			});
		}

		if (choice.message.content) {
			content.push({
				type: 'text',
				text: choice.message.content,
			});
		}

		if (choice.message.tool_calls) {
			for (const toolCall of choice.message.tool_calls) {
				content.push({
					type: 'tool-call',
					toolCallId: toolCall.id,
					toolName: toolCall.function.name,
					input: toolCall.function.arguments,
				});
			}
		}

		return {
			content,
			finishReason: mapLmstudioFinishReason(choice.finish_reason),
			usage: mapLmstudioUsage(response.usage),
			request: { body },
			response: {
				...metadata,
				headers: responseHeaders,
				body: response,
			},
			warnings,
		};
	}

	async doStream(options: LanguageModelV3CallOptions) {
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

		let finishReason: ReturnType<typeof mapLmstudioFinishReason> = {
			unified: 'other',
			raw: undefined,
		};
		let usage = mapLmstudioUsage(undefined);
		let emittedStreamStart = false;
		let textId: string | undefined;
		let reasoningId: string | undefined;

		const toolCalls: Record<
			number,
			{ id: string; name: string; arguments: string; emittedStart: boolean }
		> = {};

		type ChunkType = z.infer<typeof lmstudioChatChunkSchema>;

		const stream = response.pipeThrough(
			new TransformStream<ParseResult<ChunkType>, LanguageModelV3StreamPart>({
				transform(result, controller) {
					if (!result.success) return;

					const chunk = result.value;

					if (!emittedStreamStart) {
						controller.enqueue({ type: 'stream-start', warnings });
						emittedStreamStart = true;
					}

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
						if (!reasoningId) {
							reasoningId = generateId();
							controller.enqueue({
								type: 'reasoning-start',
								id: reasoningId,
							});
						}
						controller.enqueue({
							type: 'reasoning-delta',
							id: reasoningId,
							delta: choice.delta.reasoning_content,
						});
					}

					if (choice.delta?.content) {
						if (reasoningId) {
							controller.enqueue({
								type: 'reasoning-end',
								id: reasoningId,
							});
							reasoningId = undefined;
						}
						if (!textId) {
							textId = generateId();
							controller.enqueue({
								type: 'text-start',
								id: textId,
							});
						}
						controller.enqueue({
							type: 'text-delta',
							id: textId,
							delta: choice.delta.content,
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
									emittedStart: false,
								};
							}

							if (tc.function?.name && toolCalls[index]) {
								toolCalls[index].name = tc.function.name;
							}

							if (tc.function?.arguments && toolCalls[index]) {
								if (!toolCalls[index].emittedStart) {
									controller.enqueue({
										type: 'tool-input-start',
										id: toolCalls[index].id,
										toolName: toolCalls[index].name,
									});
									toolCalls[index].emittedStart = true;
								}
								toolCalls[index].arguments += tc.function.arguments;
								controller.enqueue({
									type: 'tool-input-delta',
									id: toolCalls[index].id,
									delta: tc.function.arguments,
								});
							}
						}
					}

					if (choice.finish_reason) {
						finishReason = mapLmstudioFinishReason(choice.finish_reason);
					}
				},

				flush(controller) {
					if (reasoningId) {
						controller.enqueue({
							type: 'reasoning-end',
							id: reasoningId,
						});
					}

					if (textId) {
						controller.enqueue({
							type: 'text-end',
							id: textId,
						});
					}

					for (const tc of Object.values(toolCalls)) {
						if (tc.emittedStart) {
							controller.enqueue({
								type: 'tool-input-end',
								id: tc.id,
							});
						}
						controller.enqueue({
							type: 'tool-call',
							toolCallId: tc.id,
							toolName: tc.name,
							input: tc.arguments,
						});
					}

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
			request: { body },
			response: {
				headers: responseHeaders,
			},
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
