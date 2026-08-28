import { AuthUser } from "../interfaces/authInterface";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
