import cloudinary from "../config/cloudinary.js";

// Deletes photos from Cloudinary by their publicId.
// Never throws: if the clean-up fails, the user's action (e.g. deleting a visit)
// should still succeed. The error is logged so it can be fixed later.
export async function deletePhotos(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;

  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch (err) {
    console.error("Failed to delete photos from Cloudinary:", err);
  }
}
