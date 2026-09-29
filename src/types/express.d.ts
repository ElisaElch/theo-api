// The three roles a user can have (matches the enum in the User model)
export type Role = "user" | "admin" | "superadmin";

// Adds `user` to Express's Request type.
// `authenticate` sets it after checking the login cookie.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}
