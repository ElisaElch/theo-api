import { Schema, model } from "mongoose";

const connectionSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    // Who has muted the other person. One-way: if A mutes B, B doesn't mute A.
    // Muted friends stay friends, but their places don't show in your feed or map.
    mutedBy: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true },
);

connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Connection = model("Connection", connectionSchema);

export default Connection;
