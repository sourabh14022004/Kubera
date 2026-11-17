import { prisma } from "../../config/database.js";
import {
    TrackingType,
    InventoryMovementType,
    StorageRackStatus,
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