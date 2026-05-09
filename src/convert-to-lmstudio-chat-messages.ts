import type { LanguageModelV3Prompt } from '@ai-sdk/provider';

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

export function convertToLmstudioChatMessages(prompt: LanguageModelV3Prompt): {
	messages: LmstudioMessage[];
	warnings: ConversionWarning[];
} {
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
						case 'file': {
							if (
								typeof part.mediaType === 'string' &&
								part.mediaType.startsWith('image/')
							) {
								const data = part.data;
								let url: string;
								if (data instanceof URL) {
									url = data.toString();
								} else if (typeof data === 'string') {
									url = `data:${part.mediaType};base64,${data}`;
								} else if (data instanceof Uint8Array) {
									const base64 = uint8ArrayToBase64(data);
									url = `data:${part.mediaType};base64,${base64}`;
								} else {
									url = String(data);
								}
								parts.push({ type: 'image_url', image_url: { url } });
							} else {
								warnings.push({
									type: 'other',
									message:
										'Non-image file parts are not supported by LM Studio',
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
										typeof part.input === 'string'
											? part.input
											: JSON.stringify(part.input),
								},
							});
							break;
						}
						case 'reasoning':
						case 'file':
						case 'tool-result': {
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
					if (part.type !== 'tool-result') continue;
					messages.push({
						role: 'tool',
						tool_call_id: part.toolCallId,
						content:
							typeof part.output === 'string'
								? part.output
								: JSON.stringify(part.output),
					});
				}
				break;
			}
		}
	}

	return { messages, warnings };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}
