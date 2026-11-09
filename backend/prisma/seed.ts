import process from "node:process";
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


const storageLayout = [
  {
    color: "GREEN",
    drawersPerRack: 3,
    rackNumbers: [1, 2, 3],
  },
  {
    color: "BLACK",
    drawersPerRack: 2,
    rackNumbers: [1, 2],
  },
  {
    color: "BLACK",
    drawersPerRack: 3,
    rackNumbers: [1, 2],
  },
  {
    color: "BLACK",
    drawersPerRack: 4,
    rackNumbers: [1, 2],
  },
  {
    color: "ORANGE",
    drawersPerRack: 2,
    rackNumbers: [1, 2, 3],
  },
] as const;

async function seedStorageLocations() {
  let racksProcessed = 0;
  let drawersProcessed = 0;

  for (const group of storageLayout) {
    for (const rackNumber of group.rackNumbers) {
      // Create the rack if it doesn't exist.
      const rack = await prisma.storageRack.upsert({
        where: {
          color_drawersPerRack_rackNumber: {
            color: group.color,
            drawersPerRack: group.drawersPerRack,
            rackNumber,
          },
        },
        update: {},
        create: {
          color: group.color,
          drawersPerRack: group.drawersPerRack,
          rackNumber,
        },
        select: {
          id: true,
        },
      });

      racksProcessed++;

      // Register every drawer in this rack.
      for (
        let drawerNumber = 1;
        drawerNumber <= group.drawersPerRack;
        drawerNumber++
      ) {
        await prisma.storageDrawer.upsert({
          where: {
            rackId_drawerNumber: {
              rackId: rack.id,
              drawerNumber,
            },
          },
          update: {},
          create: {
            rackId: rack.id,
            drawerNumber,
          },
        });

        drawersProcessed++;
      }
    }
  }

  console.log(
    `Storage seeded successfully: ${racksProcessed} racks and ${drawersProcessed} drawers.`
  );
}


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
  await seedStorageLocations();
}


main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });