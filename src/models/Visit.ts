import { Schema, model } from "mongoose";

const visitSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    place: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["visited", "wantToGo"],
      default: "visited",
    },
    visitDate: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    whatIHad: { type: String, default: "", trim: true },
    memory: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    photos: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      default: [],
    },
    sourceUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

visitSchema.index({ user: 1, place: 1 }, { unique: true });

const Visit = model("Visit", visitSchema);

export default Visit;
