import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";

export interface KuberaUser {
    id: string;
    name: string;
    email: string;
    roles: string[];
}

export async function resolveKuberaUser(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const authUser = res.locals.authUser;

        if (!authUser?.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication identity is missing.",
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                neonAuthUserId: authUser.id,
            },
            include: {
                roleAssignments: {
                    where: {
                        revokedAt: null,
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } },
                        ],
                    },
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user || !user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is not registered or active in Kubera.",
            })
        }

        const roles = [
            ...new Set(
                user.roleAssignments.map((assignment) => assignment.role.name)
            )
        ];

        res.locals.KuberaUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            roles,
        } satisfies KuberaUser;

        next();
    } catch (error) {
        console.log("Kubera User resolution failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to resolve your Kubera account."
        })
    }
}