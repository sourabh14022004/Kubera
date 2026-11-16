import { StorageColor } from "../../generated/prisma/client.js";
import { prisma } from "../../config/database.js";
import { StorageRackStatus } from "../../generated/prisma/client.js";

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
export async function getAllRacks(
  status: StorageRackStatus | "ALL" = StorageRackStatus.ACTIVE,
) {
  const racks = await prisma.storageRack.findMany({
    where: status === "ALL" ? undefined : { status },
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


export async function retireRack(rackId: string) {
  return prisma.$transaction(async (tx) => {
    const rack = await tx.storageRack.findUnique({
      where: { id: rackId },
      include: {
        drawers: {
          select: {
            components: {
              select: {
                id: true,
              }
            }
          }
        }
      }
    });

    // Check whether the rack exists.
    if (!rack) {
      return { outcome: "NOT_FOUND" as const };
    }

    // Prevent retiring an already retired rack.
    if (rack.status === StorageRackStatus.RETIRED) {
      return { outcome: "ALREADY_RETIRED" as const };
    }

    // Count all components assigned to this rack.
    const componentCount = rack.drawers.reduce(
      (total, drawer) => total + drawer.components.length,
      0,
    );

    // A rack must be empty before retirement.
    if (componentCount > 0) {
      return {
        outcome: "HAS_COMPONENTS" as const,
        componentCount,
      };
    }

    // Mark the rack as retired without deleting its records.
    const retiredRack = await tx.storageRack.update({
      where: { id: rackId },
      data: {
        status: StorageRackStatus.RETIRED,
        retiredAt: new Date(),
      },
      include: {
        drawers: {
          orderBy: {
            drawerNumber: "asc",
          },
        },
      },
    });

    return {
      outcome: "RETIRED" as const,
      data: addLocationCodes(retiredRack),
    };
  })
}

export async function restoreRack(rackId: string) {
  return prisma.$transaction(async (tx) => {
    // Check whether the rack exists and its current status.
    const rack = await tx.storageRack.findUnique({
      where: { id: rackId},
      select: {
        id: true,
        status: true,
      },
    });

    if(!rack) {
      return { outcome: "NOT_FOUND" as const};
    }

    if (rack.status === StorageRackStatus.ACTIVE) {
      return {outcome: "ALREADY_ACTIVE"  as const};
    }

    // Restore only if the rack is currently retired.
    const updateResult = await tx.storageRack.updateMany({
      where: {
        id: rackId,
        status: StorageRackStatus.RETIRED,
      }, 
      data: {
        status: StorageRackStatus.ACTIVE,
        retiredAt: null,
      },
    })

    // Handle a concurrent change safely
    if(updateResult.count === 0) {
      const latestRack = await tx.storageRack.findUnique({
        where: {id: rackId},
        select: {status: true}
      });

      if (!latestRack) {
        return { outcome: "NOT_FOUND" as const};
      }

      if (latestRack.status === StorageRackStatus.ACTIVE) {
        return { outcome: "ALREADY_ACTIVE" as const}
      }

      throw new Error("Unable to restore the rack.")
    }

    const restoredRack = await tx.storageRack.findUnique({
      where: { id: rackId},
      include: {
        drawers: {
          orderBy: { drawerNumber: "asc"},
        },
      },
    });

    if (!restoredRack) {
      return { outcome: "NOT_FOUND" as const};
    }

    return {
      outcome: "RESTORED" as const,
      data: addLocationCodes(restoredRack)
    }
  })
}