
import type { RequestHandler } from "express";

import { verifyNeonAuth } from "./verifyNeonAuth.js";
import { resolveKuberaUser } from "./resolveKuberaUser.js";

// Verifies the Neon JWT and resolves the corresponding Kubera user.
export const requireAuth: RequestHandler[] = [
  verifyNeonAuth,
  resolveKuberaUser,
];
