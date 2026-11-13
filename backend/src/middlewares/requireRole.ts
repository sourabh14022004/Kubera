import { NextFunction, Request, Response } from "express";


export function requireRole(...allowedRoles: string[]) {
    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        const user = res.locals.KuberaUser;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Kubera authentication is required.",
            });
        }

        const hasPermission = user.roles.some((role: string) =>
            allowedRoles.includes(role),
        )

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this operation.",
            })
        }

        next();
    };
}