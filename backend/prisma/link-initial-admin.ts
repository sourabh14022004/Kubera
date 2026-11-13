import process from "node:process";
import { prisma } from "../src/config/database.js";

async function main() {
    const adminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const authenticatedEmail = process.env.INITIAL_SUPER_ADMIN_AUTH_EMAIL
        ?.trim()
        .toLowerCase();

    const neonAuthUserId = process.env.INITIAL_SUPER_ADMIN_NEON_AUTH_USER_ID?.trim();

    if (!adminEmail || !authenticatedEmail || !neonAuthUserId) {
        throw new Error(
            "Missing Super Admin linking environment variables.",
        );
    }

    if (adminEmail !== authenticatedEmail) {
        throw new Error(
            "Auth email doesn't match the email we found in the DB, make sure you're logged in with the same account you're trying to promote!"
        )
    }

    await prisma.$transaction(async (tx) => {
        const admin = await tx.user.findUnique({
            where: { email: adminEmail },
        })


        if (!admin || !admin.isActive) {
            throw new Error(
                "Initial Super Admin account does not exist or is inactive.",
            )
        }

        const superAdminRole = await tx.role.findUnique({
            where: { name: "SUPER_ADMIN" },
        })

        if (!superAdminRole) {
            throw new Error(
                "SUPER_ADMIN role does not exist."
            )
        }
        const now = new Date();

        const assigment = await tx.userRoleAssignment.findFirst({
            where: {
                userId: admin.id,
                roleId: superAdminRole.id,
                revokedAt: null,

                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } },
                ],
            },
        });

        if (!superAdminRole) {
            throw new Error(
                "Initial account dont have an SUPER_ADMIN assignemnt.",
            );
        }

        const identityOwner = await tx.user.findUnique({
            where: {
                neonAuthUserId
            },
        })

        if (identityOwner && identityOwner.id !== admin.id) {
            throw new Error(
                "This Neon Auth identity is already linked to another Kubera user.",
            )
        }


        const result = await tx.user.updateMany({
            where: {
                id: admin.id,
                neonAuthUserId: null,
            },
            data: {
                neonAuthUserId,
            },
        })

        if (result.count !== 1) {
            throw new Error(
                "Identity linking failed. The user record may have changed.",
            )
        }

        console.log("Initial Super Admin identity linked successfully.");
        console.log(`Account: ${adminEmail}`);
        console.log(`Kubera User ID: ${admin.id}`);
        console.log("Neon Auth identity: linked");
    })
}

main()
    .catch((error) => {
        console.error("Identity linking failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });