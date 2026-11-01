import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";


const connectionString = process.env.DATABASE_URL;

if(!connectionString) {
    throw new Error("Tera Database configure nahi hai!!!");
}

const adapter = new PrismaNeon({
    connectionString,
})

export const prisma = new PrismaClient({
    adapter,
})


const roles =[
    {
        name: "SUPER_ADMIN",
        description: "Has complete controle over the application, inshort apun hi bhagwan hai."
    }, 
    {
        name: "ADMIN",
        description: "Manages inventory, users and administrative operations.",
    },
    {
        name: "CLUB_PRESIDENT",
        description: "Represents the current club president.",
    },
    {
        name: "VICE_PRESIDENT",
        description: "Represents the current club vice president.",
    },
    {
        name: "CLUB_MEMBER",
        description: "Can access and use permitted inventory features.",
    },
    {
        name: "USER",
        description: "Has view-only access to the inventory.",
    },
] 


async function main() {
    for (const role of roles) {
        await prisma.role.upsert({
            where: {
                name: role.name,
            },
            update: {
                description: role.description,
            },
            create: role,
        })
    }

console.log("Roles seeded succesfully!");

// Bootstrap the initial Super Admin.
  const email = process.env.INITIAL_SUPER_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const name = process.env.INITIAL_SUPER_ADMIN_NAME?.trim();

  if (!email || !name) {
    throw new Error(
      "INITIAL_SUPER_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_NAME are required"
    );
  }

  let initialAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (!initialAdmin) {
    initialAdmin = await prisma.user.create({
      data: {
        name,
        email,
      },
    });
  } else if (!initialAdmin.isActive) {
    throw new Error("The initial Super Admin account is inactive.");
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: {
      name: "SUPER_ADMIN",
    },
  });

  const now = new Date();

  // Check whether the Super Admin role is already active.
  const existingAssignment =
    await prisma.userRoleAssignment.findFirst({
      where: {
        userId: initialAdmin.id,
        roleId: superAdminRole.id,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });

  if (!existingAssignment) {
    await prisma.userRoleAssignment.create({
      data: {
        userId: initialAdmin.id,
        roleId: superAdminRole.id,
        assignedById: null,
      },
    });
  }

  console.log(`Initial Super Admin configured: ${email}`);
}


main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });