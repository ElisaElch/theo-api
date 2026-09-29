import mongoose from "mongoose";

// Connects to MongoDB, then makes sure every model's indexes exist
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Creates missing indexes (like unique username/email) for all loaded models.
  // Unlike Mongoose's automatic index creation, this throws an error if it fails,
  // so the server won't start with missing indexes.
  await mongoose.syncIndexes();
  console.log("Indexes in sync");
}
