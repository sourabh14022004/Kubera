import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";

const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;


if(!jwksUrl || !authBaseUrl) {
    throw new Error("Neon Auth enviourment variable are missing");
}

const JWKS = createRemoteJWKSet(new URL(jwksUrl));

const issuer = new URL(authBaseUrl).origin;

export interface AuthenticatedUser {
    id: string;
    email?: string;
    name?: string;
}

export async function verifyNeonAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
        }

        const token = authorization.split(" ")[1];

        const { payload } = await jwtVerify(token, JWKS, {
            issuer,
        })

        if (!payload.sub) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token",
            })
        }
        res.locals.authUser = {
            id: payload.sub,
            email: typeof payload.email === "string" ? payload.email : undefined,
            name: typeof payload.name === "string" ? payload.name : undefined, 
        } satisfies AuthenticatedUser;

        next();
    } catch {
        return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
        });
    }
}