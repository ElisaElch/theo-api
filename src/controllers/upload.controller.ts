import fs from "node:fs/promises";
import type { RequestHandler } from "express";
import cloudinary from "../config/cloudinary.js";

// POST /api/uploads: sends the parsed photos to Cloudinary.
// Returns [{ url, publicId }], which the frontend adds to a visit's photos.
export const uploadPhotos: RequestHandler = async (req, res) => {
  const files = req.photoFiles ?? [];

  try {
    // Upload all photos at the same time instead of one after another
    const results = await Promise.all(
      files.map((file) =>
        cloudinary.uploader.upload(file.filepath, {
          folder: `theo/${req.user!.id}`, // one folder per user in Cloudinary
          // Shrink very large photos and compress them, to save storage space
          transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto" }],
        }),
      ),
    );

    const photos = results.map((result) => ({
      url: result.secure_url, // https link
      publicId: result.public_id, // needed to delete the photo later
    }));

    res.status(201).json({ photos });
  } finally {
    // Always delete the temporary files, even if an upload failed
    await Promise.all(files.map((file) => fs.unlink(file.filepath).catch(() => {})));
  }
};
