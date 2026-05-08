import type {
	LanguageModelV2CallOptions,
	LanguageModelV2FunctionTool,
} from '@ai-sdk/provider';

type PrepareWarning = { type: 'other'; message: string };

type LmstudioTool = {
	type: 'function';
	function: {
		name: string;
		description?: string;
		parameters: unknown;
	};
};

type LmstudioToolChoice =
	| 'auto'
	| 'none'
	| 'required'
	| { type: 'function'; function: { name: string } };

export function prepareTools(
	tools: LanguageModelV2CallOptions['tools'],
	toolChoice: LanguageModelV2CallOptions['toolChoice'],
): {
	tools: LmstudioTool[] | undefined;
	tool_choice: LmstudioToolChoice | undefined;
	warnings: PrepareWarning[];
} {
	const warnings: PrepareWarning[] = [];

	const mappedTools = tools
		?.filter((tool): tool is LanguageModelV2FunctionTool => {
			if (tool.type === 'function') return true;
			warnings.push({
				type: 'other',
				message: 'Provider-defined tools are not supported by LM Studio',
			});
			return false;
		})
		.map(
			(tool): LmstudioTool => ({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema,
				},
			}),
		);

	const mappedToolChoice = toolChoice ? mapToolChoice(toolChoice) : undefined;

	return {
		tools: mappedTools?.length ? mappedTools : undefined,
		tool_choice: mappedToolChoice,
		warnings,
	};
}

function mapToolChoice(
	toolChoice: NonNullable<LanguageModelV2CallOptions['toolChoice']>,
): LmstudioToolChoice {
	switch (toolChoice.type) {
		case 'auto':
			return 'auto';
		case 'none':
			return 'none';
		case 'required':
			return 'required';
		case 'tool':
			return {
				type: 'function',
				function: { name: toolChoice.toolName },
			};
	}
}
