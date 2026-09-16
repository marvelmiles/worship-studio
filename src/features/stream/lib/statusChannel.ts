import { z } from "zod";

export const STATUS_CHANNEL_LABEL = "status";

const statusMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("viewerLive"), live: z.boolean() }),
  z.object({ type: z.literal("audioShared"), on: z.boolean() }),
  z.object({ type: z.literal("deviceName"), name: z.string().min(1).max(120) }),
]);

export type StatusMessage = z.infer<typeof statusMessageSchema>;

export const parseStatusMessage = (data: unknown): StatusMessage | null => {
  if (typeof data !== "string") return null;
  try {
    const parsed = statusMessageSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const sendStatusMessage = (
  channel: RTCDataChannel | null,
  message: StatusMessage,
): void => {
  if (channel?.readyState !== "open") return;
  try {
    channel.send(JSON.stringify(message));
  } catch {
    return;
  }
};
