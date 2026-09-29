import { Schema, model } from "mongoose";

const placeSchema = new Schema(
  {
    externalId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["cafe", "restaurant", "hotel"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { timestamps: true },
);

const Place = model("Place", placeSchema);

export default Place;
