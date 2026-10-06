import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, default: "", trim: true, maxlength: 50 }, // optional
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    bio: { type: String, default: "", maxlength: 150 },
    location: { type: String, default: "", trim: true, maxlength: 100 },

    // Profile photo on Cloudinary (publicId lets us delete the old photo when it's replaced)
    avatar: {
      url: { type: String },
      publicId: { type: String },
    },

    // Not shown anywhere yet; ready for personal recommendations later
    interests: { type: [String], default: [] },

    // When the user agreed to the Terms and Privacy Policy (required to sign up)
    termsAcceptedAt: { type: Date, required: true },

    // Settings with sensible defaults; a settings page can change them later
    settings: {
      friendRequestsFrom: { type: String, enum: ["everyone", "nobody"], default: "everyone" },
      showStatsToFriends: { type: Boolean, default: true },
      notifyFriendActivity: { type: Boolean, default: true },
      notifyFriendRequests: { type: Boolean, default: true },
      notifyAppUpdates: { type: Boolean, default: true },
      distanceUnit: { type: String, enum: ["km", "mi"], default: "km" },
    },

    // No verification email yet; ready for when that's added
    emailVerified: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
  },
  {
    timestamps: true,
    virtuals: {
      // "Sophie Taylor", or just "Sophie" without a last name.
      // Calculated whenever it's read and never stored, so it can't get out of sync.
      name: {
        get() {
          return [this.firstName, this.lastName].filter(Boolean).join(" ");
        },
      },
    },
  },
);

const User = model("User", userSchema);

export default User;