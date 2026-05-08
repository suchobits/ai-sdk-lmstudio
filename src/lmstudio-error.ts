import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils';
import { z } from 'zod';

const lmstudioErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.string().nullable().optional(),
  }),
});

export const lmstudioFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: lmstudioErrorSchema,
  errorToMessage: (error) => error.error.message,
});
