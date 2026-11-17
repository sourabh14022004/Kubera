import { prisma } from "../../config/database.js";
import {
    TrackingType,
    InventoryMovementType,
    StorageRackStatus,
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