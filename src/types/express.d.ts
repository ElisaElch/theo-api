import type { File as FormidableFile } from "formidable";

// The three roles a user can have (matches the enum in the User model)
export type Role = "user" | "admin" | "superadmin";

// Extra properties our middleware adds to Express's Request
declare global {
  namespace Express {
    interface Request {
      // Set by `authenticate` after checking the login cookie
      user?: {
        id: string;
        role: Role;
      };

      // Set by `parsePhotos`: the uploaded image files, saved temporarily on disk
      photoFiles?: FormidableFile[];
    }
  }
}
