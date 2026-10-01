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
    // 1–10 stars, or 11 for an exceptional place ("beyond perfect")
    rating: { type: Number, min: 1, max: 11 },
    // Why it earned the 11th star, e.g. "Best chai latte I've ever had"
    exceptionalReason: { type: String, default: "", trim: true },
    // Separate from the rating: a place can be a favourite at any rating
    isFavourite: { type: Boolean, default: false },
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
