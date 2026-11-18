import { prisma } from "../../config/database.js";
import {
    TrackingType,
    InventoryMovementType,
    StorageRackStatus,
    AssetStatus,
    type Prisma
} from "../../generated/prisma/client.js";

interface CreateComponentInput {
    code: string;
    name: string;
    description?: string | null;
    categoryId: string;
    trackingType: TrackingType;
    initialQuantity?: number;
    unit?: string;
    minimumStock?: number;
    storageDrawerId?: string | null;
    performedById: string;
}



export async function createComponent(input: CreateComponentInput) {
    return prisma.$transaction(async (tx) => {
        // 1. Verify that the category exists and is active.
        const category = await tx.componentCategory.findUnique({
            where: { id: input.categoryId },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!category) {
            return { outcome: "CATEGORY_NOT_FOUND" as const };
        }

        if (!category.isActive) {
            return { outcome: "CATEGORY_INACTIVE" as const };
        }

        // 2. Validate the storage drawer, if one was provided.
        if (input.storageDrawerId) {
            const drawer = await tx.storageDrawer.findUnique({
                where: { id: input.storageDrawerId },
                select: {
                    id: true,
                    rack: {
                        select: {
                            status: true,
                        },
                    },
                },
            });

            if (!drawer) {
                return { outcome: "DRAWER_NOT_FOUND" as const };
            }

            if (drawer.rack.status !== StorageRackStatus.ACTIVE) {
                return { outcome: "RACK_RETIRED" as const };
            }
        }

        // 3. Determine available quantity based on tracking type.
        const quantityAvailable =
            input.trackingType === TrackingType.BULK
                ? input.initialQuantity ?? 0
                : null;

        // 4. Create the component.
        const component = await tx.component.create({
            data: {
                code: input.code.trim(),
                name: input.name.trim(),
                description: input.description?.trim() || null,
                categoryId: input.categoryId,
                trackingType: input.trackingType,
                quantityAvailable,
                unit: input.unit?.trim() || "pcs",
                minimumStock: input.minimumStock ?? 0,
                storageDrawerId: input.storageDrawerId ?? null,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // 5. Record initial stock for BULK components.
        if (
            input.trackingType === TrackingType.BULK &&
            quantityAvailable !== null &&
            quantityAvailable > 0
        ) {
            await tx.inventoryMovement.create({
                data: {
                    componentId: component.id,
                    movementType: InventoryMovementType.STOCK_IN,
                    quantityChange: quantityAvailable,
                    performedById: input.performedById,
                    note: "Initial stock recorded during component creation.",
                },
            });
        }

        return {
            outcome: "CREATED" as const,
            data: component,
        };
    });
}

export type ComponentStatus = "ACTIVE" | "INACTIVE" | "ALL";
export type ComponentStockStatus =
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "IN_STOCK";

interface GetComponentsInput {
    search?: string;
    categoryId?: string;
    trackingType?: TrackingType;
    storageDrawerId?: string;
    status: ComponentStatus;
    stockStatus?: ComponentStockStatus;
    page: number;
    limit: number;
}

export async function getAllComponents(
    input: GetComponentsInput,
) {
    const where: Prisma.ComponentWhereInput = {
        ...(input.status !== "ALL" && {
            isActive: input.status === "ACTIVE",
        }),

        ...(input.categoryId && {
            categoryId: input.categoryId,
        }),

        ...(input.trackingType && {
            trackingType: input.trackingType,
        }),

        ...(input.storageDrawerId && {
            storageDrawerId: input.storageDrawerId,
        }),

        ...(input.search && {
            OR: [
                {
                    name: {
                        contains: input.search,
                        mode: "insensitive",
                    },
                },
                {
                    code: {
                        contains: input.search,
                        mode: "insensitive",
                    },
                },
            ],
        }),

        ...(input.stockStatus && {
            AND: [
                {
                    trackingType: TrackingType.BULK,
                },
                ...(input.stockStatus === "LOW_STOCK"
                    ? [
                        {
                            quantityAvailable: {
                                gt: 0,
                                lte: prisma.component.fields.minimumStock,
                            },
                        },
                    ]
                    : input.stockStatus === "OUT_OF_STOCK"
                        ? [
                            {
                                quantityAvailable: 0,
                            },
                        ]
                        : [
                            {
                                quantityAvailable: {
                                    gt: prisma.component.fields.minimumStock,
                                },
                            },
                        ]),
            ],
        }),
    };

    const skip = (input.page - 1) * input.limit;

    const [components, total] = await prisma.$transaction([
        prisma.component.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: {
                name: "asc",
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                storageDrawer: {
                    select: {
                        id: true,
                        drawerNumber: true,
                        rack: {
                            select: {
                                color: true,
                                drawersPerRack: true,
                                rackNumber: true,
                                status: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        assets: true,
                        movements: true,
                    },
                },
            },
        }),

        prisma.component.count({ where }),
    ]);

    const data = components.map((component) => {
        const drawer = component.storageDrawer;
        const rack = drawer?.rack;

        const locationCode =
            drawer && rack
                ? `${rack.color}-R${String(rack.drawersPerRack).padStart(2, "0")}-C${String(rack.rackNumber).padStart(2, "0")}-D${String(drawer.drawerNumber).padStart(2, "0")}`
                : null;

        return {
            ...component,
            locationCode,
        };
    });

    return {
        data,
        pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
        },
    };
}

interface UpdateComponentInput {
  code?: string;
  name?: string;
  description?: string | null;
  categoryId?: string;
  unit?: string;
  minimumStock?: number;
  storageDrawerId?: string | null;
}

export async function updateComponent(
  componentId: string,
  input: UpdateComponentInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.component.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        categoryId: true,
        storageDrawerId: true,
      },
    });

    if (!existing) {
      return { outcome: "NOT_FOUND" as const };
    }

    // Validate a changed category.
    if (
      input.categoryId !== undefined &&
      input.categoryId !== existing.categoryId
    ) {
      const category = await tx.componentCategory.findUnique({
        where: { id: input.categoryId },
        select: { isActive: true },
      });

      if (!category) {
        return { outcome: "CATEGORY_NOT_FOUND" as const };
      }

      if (!category.isActive) {
        return { outcome: "CATEGORY_INACTIVE" as const };
      }
    }

    // Validate a changed storage drawer.
    if (
      input.storageDrawerId !== undefined &&
      input.storageDrawerId !== existing.storageDrawerId &&
      input.storageDrawerId !== null
    ) {
      const drawer = await tx.storageDrawer.findUnique({
        where: { id: input.storageDrawerId },
        select: {
          rack: {
            select: { status: true },
          },
        },
      });

      if (!drawer) {
        return { outcome: "DRAWER_NOT_FOUND" as const };
      }

      if (drawer.rack.status !== StorageRackStatus.ACTIVE) {
        return { outcome: "RACK_RETIRED" as const };
      }
    }

    const component = await tx.component.update({
      where: { id: componentId },
      data: {
        ...(input.code !== undefined && { code: input.code.trim() }),
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.categoryId !== undefined && {
          categoryId: input.categoryId,
        }),
        ...(input.unit !== undefined && { unit: input.unit.trim() }),
        ...(input.minimumStock !== undefined && {
          minimumStock: input.minimumStock,
        }),
        ...(input.storageDrawerId !== undefined && {
          storageDrawerId: input.storageDrawerId,
        }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      outcome: "UPDATED" as const,
      data: component,
    };
  });
}

export async function deactivateComponent(componentId: string) {
  return prisma.$transaction(async (tx) => {
    const component = await tx.component.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        isActive: true,
        assets: {
          where: {
            status: AssetStatus.CHECKED_OUT,
          },
          select: { id: true },
        },
        loans: {
          select: {
            quantityBorrowed: true,
            quantityReturned: true,
            quantityWrittenOff: true,
          },
        },
      },
    });

    if (!component) {
      return { outcome: "NOT_FOUND" as const };
    }

    if (!component.isActive) {
      return { outcome: "ALREADY_INACTIVE" as const };
    }

    const outstandingLoanQuantity = component.loans.reduce(
      (total, loan) =>
        total +
        Math.max(
          0,
          loan.quantityBorrowed -
            loan.quantityReturned -
            loan.quantityWrittenOff,
        ),
      0,
    );

    const checkedOutAssetCount = component.assets.length;

    if (outstandingLoanQuantity > 0 || checkedOutAssetCount > 0) {
      return {
        outcome: "HAS_OUTSTANDING_LOANS" as const,
        outstandingLoanQuantity,
        checkedOutAssetCount,
      };
    }

    const updated = await tx.component.update({
      where: { id: componentId },
      data: { isActive: false },
    });

    return {
      outcome: "DEACTIVATED" as const,
      data: updated,
    };
  });
}

export async function activateComponent(componentId: string) {
  return prisma.$transaction(async (tx) => {
    const component = await tx.component.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!component) {
      return { outcome: "NOT_FOUND" as const };
    }

    if (component.isActive) {
      return { outcome: "ALREADY_ACTIVE" as const };
    }

    const updated = await tx.component.update({
      where: { id: componentId },
      data: { isActive: true },
    });

    return {
      outcome: "ACTIVATED" as const,
      data: updated,
    };
  });
}