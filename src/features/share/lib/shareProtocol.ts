import { z } from "zod";

export const SHARE_CHANNEL_LABEL = "library-share";

/* Small enough for every browser to accept in one message, with the send
   paused whenever the link has more than it can push out. */
export const SHARE_CHUNK_BYTES = 16 * 1024;
export const SHARE_BUFFER_HIGH_BYTES = 1024 * 1024;
export const SHARE_BUFFER_LOW_BYTES = 256 * 1024;

const shareMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("offer"),
    name: z.string().min(1).max(120),
    summary: z.string().min(1).max(300),
    items: z.number().int().nonnegative(),
    bytes: z.number().nonnegative(),
  }),
  z.object({ type: z.literal("accept") }),
  z.object({ type: z.literal("decline") }),
  z.object({ type: z.literal("sent"), bytes: z.number().nonnegative() }),
  /* Either side may walk away mid transfer, so the other stops waiting rather
     than sitting on a link that will never carry anything else. */
  z.object({ type: z.literal("cancel") }),
  z.object({ type: z.literal("importing") }),
  z.object({
    type: z.literal("result"),
    ok: z.boolean(),
    message: z.string().min(1).max(300),
  }),
]);

export type ShareMessage = z.infer<typeof shareMessageSchema>;

export const parseShareMessage = (data: unknown): ShareMessage | null => {
  if (typeof data !== "string") return null;
  try {
    const parsed = shareMessageSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const sendShareMessage = (
  channel: RTCDataChannel | null,
  message: ShareMessage,
): void => {
  if (channel?.readyState !== "open") return;
  try {
    channel.send(JSON.stringify(message));
  } catch {
    return;
  }
};
