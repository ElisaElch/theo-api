import { z } from "zod";

// POST /api/connections: who to send a friend request to
export const sendRequestSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id"),
});

// PATCH /api/connections/:id/mute: mute (true) or unmute (false) a friend
export const muteSchema = z.object({
  muted: z.boolean(),
});

export type SendRequestInput = z.infer<typeof sendRequestSchema>;
export type MuteInput = z.infer<typeof muteSchema>;
