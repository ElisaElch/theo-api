import type { RequestHandler } from "express";
import formidable from "formidable";

// Limits: Cloudinary's free plan allows up to 10 MB per image,
// and a visit can have up to 12 photos
const MAX_PHOTOS = 12;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

// Reads photo uploads (multipart/form-data) from the "photos" field.
// Saves each image to a temporary file and puts them on req.photoFiles.
const parsePhotos: RequestHandler = async (req, _res, next) => {
  const form = formidable({
    maxFiles: MAX_PHOTOS,
    maxFileSize: MAX_FILE_SIZE,
    maxTotalFileSize: MAX_PHOTOS * MAX_FILE_SIZE,
    allowEmptyFiles: false,
    // Only keep images; anything else (PDFs, videos...) is skipped
    filter: ({ mimetype }) => Boolean(mimetype?.startsWith("image/")),
  });

  try {
    const [, files] = await form.parse(req);
    const photos = files.photos ?? [];

    // No images: nothing was sent, or every file was skipped by the filter
    if (photos.length === 0) {
      return next(
        new Error("Please choose at least one image (JPG, PNG or WebP)", {
          cause: { status: 400 },
        }),
      );
    }

    req.photoFiles = photos;
    next();
  } catch {
    // Formidable throws when a limit is broken (too big, too many files)
    next(
      new Error("Each photo must be under 10 MB, and you can upload up to 12 at a time", {
        cause: { status: 400 },
      }),
    );
  }
};

export default parsePhotos;
