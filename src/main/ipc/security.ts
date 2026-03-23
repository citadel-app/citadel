import { z } from 'zod';

/**
 * Wraps an IPC handler callback with a strict Zod schema validation.
 * If the arguments sent over the IPC bridge fail validation, the backend
 * refuses to execute and immediately throws an error boundary to prevent
 * malformed data from executing system-level actions.
 */
export function createSafeHandler<Schema extends z.ZodTypeAny, Result>(
    schema: Schema,
    handler: (event: Electron.IpcMainInvokeEvent, payload: z.infer<Schema>) => Promise<Result> | Result
) {
    return async (event: Electron.IpcMainInvokeEvent, rawPayload: any) => {
        try {
            // Strictly validate the IPC payload before doing any work
            const validPayload = schema.parse(rawPayload);
            return await handler(event, validPayload);
        } catch (error: any) {
            if (error instanceof z.ZodError || error.name === 'ZodError') {
                const errors = (error as any).errors as z.ZodIssue[];
                console.error(`[IPC Security Gate] Validation failed for channel:`, errors);
                throw new Error(`[IPC Security] Validation Failed: ${errors.map(e => e.message).join(', ')}`);
            }
            console.error(`[IPC Handler Error] Unhandled exception execution:`, error);
            throw error;
        }
    };
}
