import { v2 as cloudinary } from "cloudinary";

// Connects the Cloudinary library to your account, using the keys from .env.
// Other files import `cloudinary` from here, so the setup happens once.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // always return https:// links
});

export default cloudinary;
