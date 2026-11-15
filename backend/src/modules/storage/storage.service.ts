import { StorageColor } from "../../generated/prisma/client.js";
import { prisma } from "../../config/database.js";

const pad = (value: number) => String(value).padStart(2, "0");

// Generates GREEN-R03-C01 from a rack record.
function getRackLocationCode(rack: {
  color: string;
  drawersPerRack: number;
  rackNumber: number;
}) {
  return `${rack.color}-R${pad(rack.drawersPerRack)}-C${pad(rack.rackNumber)}`;
}

// Adds human-readable location codes to a rack and its drawers.
function addLocationCodes<
  T extends {
    color: string;
    drawersPerRack: number;
    rackNumber: number;
    drawers: Array<{ drawerNumber: number }>;
  }
>(rack: T) {
  const rackCode = getRackLocationCode(rack);

  return {
    ...rack,
    locationCode: rackCode,
    drawers: rack.drawers.map((drawer) => ({
      ...drawer,
      locationCode: `${rackCode}-D${pad(drawer.drawerNumber)}`,
    })),
  };
}

// GET /api/storage/racks
export async function getAllRacks() {
  const racks = await prisma.storageRack.findMany({
    orderBy: [
      { color: "asc" },
      { drawersPerRack: "asc" },
      { rackNumber: "asc" },
    ],
    include: {
      drawers: {
        orderBy: {
          drawerNumber: "asc",
        },
        include: {
          components: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              code: true,
              name: true,
              trackingType: true,
              quantityAvailable: true,
              unit: true,
              minimumStock: true,
            },
          },
        },
      },
    },
  });

  return racks.map(addLocationCodes);
}

// GET /api/storage/racks/:rackId
export async function getRackById(rackId: string) {
  const rack = await prisma.storageRack.findUnique({
    where: { id: rackId },
    include: {
      drawers: {
        orderBy: {
          drawerNumber: "asc",
        },
        include: {
          components: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              code: true,
              name: true,
              trackingType: true,
              quantityAvailable: true,
              unit: true,
              minimumStock: true,
            },
          },
        },
      },
    },
  });

  if (!rack) return null;

  return addLocationCodes(rack);
}

// GET /api/storage/drawers/:drawerId
export async function getDrawerById(drawerId: string) {
  const drawer = await prisma.storageDrawer.findUnique({
    where: { id: drawerId },
    include: {
      rack: {
        select: {
          id: true,
          color: true,
          drawersPerRack: true,
          rackNumber: true,
        },
      },
      components: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          trackingType: true,
          quantityAvailable: true,
          unit: true,
          minimumStock: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!drawer) return null;

  const rackCode = getRackLocationCode(drawer.rack);

  return {
    ...drawer,
    locationCode: `${rackCode}-D${pad(drawer.drawerNumber)}`,
    rack: {
      ...drawer.rack,
      locationCode: rackCode,
    },
  };
}


export const ALLOWED_DRAWERS: Record<StorageColor, number[]> = {
  GREEN: [3],
  BLACK: [2, 3, 4],
  ORANGE: [2],
};

export async function createRack(
  color: StorageColor,
  drawersPerRack: number,
) {
  return prisma.$transaction(async (tx) => {
    // Find the highest rack number in this color/drawer group.
    const lastRack = await tx.storageRack.findFirst({
      where: {
        color,
        drawersPerRack,
      },
      orderBy: {
        rackNumber: "desc",
      },
      select: {
        rackNumber: true,
      },
    });

    const nextRackNumber = (lastRack?.rackNumber ?? 0) + 1;

    // Create the rack and all its drawers atomically.
    const rack = await tx.storageRack.create({
      data: {
        color,
        drawersPerRack,
        rackNumber: nextRackNumber,
        drawers: {
          create: Array.from(
            { length: drawersPerRack },
            (_, index) => ({
              drawerNumber: index + 1,
            }),
          ),
        },
      },
      include: {
        drawers: {
          orderBy: {
            drawerNumber: "asc",
          },
        },
      },
    });

    return addLocationCodes(rack);
  });
}
