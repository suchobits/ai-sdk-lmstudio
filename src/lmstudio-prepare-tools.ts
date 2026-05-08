import type {
  LanguageModelV1CallOptions,
  LanguageModelV1FunctionTool,
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
  mode: LanguageModelV1CallOptions['mode'],
): {
  tools: LmstudioTool[] | undefined;
  tool_choice: LmstudioToolChoice | undefined;
  response_format: { type: string; schema?: unknown } | undefined;
  warnings: PrepareWarning[];
} {
  const warnings: PrepareWarning[] = [];

  switch (mode.type) {
    case 'regular': {
      const tools = mode.tools
        ?.filter((tool): tool is LanguageModelV1FunctionTool => {
          if (tool.type === 'function') return true;
          warnings.push({ type: 'other', message: 'Provider-defined tools are not supported by LM Studio' });
          return false;
        })
        .map(
          (tool): LmstudioTool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          }),
        );

      const toolChoice = mode.toolChoice
        ? mapToolChoice(mode.toolChoice)
        : undefined;

      return {
        tools: tools?.length ? tools : undefined,
        tool_choice: toolChoice,
        response_format: undefined,
        warnings,
      };
    }

    case 'object-json': {
      return {
        tools: undefined,
        tool_choice: undefined,
        response_format: mode.schema
          ? { type: 'json_schema', schema: mode.schema }
          : { type: 'json_object' },
        warnings,
      };
    }

    case 'object-tool': {
      return {
        tools: [
          {
            type: 'function',
            function: {
              name: mode.tool.name,
              description: mode.tool.description,
              parameters: mode.tool.parameters,
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: mode.tool.name },
        },
        response_format: undefined,
        warnings,
      };
    }

    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unsupported mode: ${(_exhaustive as { type: string }).type}`);
    }
  }
}

function mapToolChoice(
  toolChoice: NonNullable<
    Extract<
      LanguageModelV1CallOptions['mode'],
      { type: 'regular' }
    >['toolChoice']
  >,
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
