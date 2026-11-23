import { prisma } from "../../config/database.js";
import { InventoryMovementType, TrackingType } from "../../generated/prisma/enums.js";

interface CheckoutBulkInput {
    componentId: string;
    memberId: string;
    issuedById: string;
    quantity: number;
    dueAt?: Date;
    note?: string;
}

export async function checkoutBulkInventory(
    input: CheckoutBulkInput,
) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        return { outcome: "INVALID_QUANTITY" as const };
    }

    return prisma.$transaction(async (tx) => {
        // 1. Find the component
        const component = await tx.component.findUnique({
            where: { id: input.componentId },
            select: {
                id: true,
                code: true,
                name: true,
                trackingType: true,
                isActive: true,
                quantityAvailable: true,
            },
        })
        if (!component) {
            return { outcome: "COMPONENT_NOT_FOUND" as const }
        }

        if (component.trackingType !== TrackingType.BULK) {
            return { outcome: "INVALID_TRACKING_TYPE" as const }
        }

        if (component.quantityAvailable === null) {
            return { outcome: "INVALID_STOCK_CONFIGURATION" as const }
        }

        // 2. Verify the borrowing member 
        const member = await tx.user.findUnique({
            where: { id: input.memberId },
            select: {
                id: true,
                isActive: true,
            },
        })

        if (!member) {
            return { outcome: "MEMBER_NOT_FOUND" as const };
        }

        if (!member.isActive) {
            return { outcome: "MEMBER_INACTIVE" as const };
        }

        // 3. Atomically decrement available stock
        const stockUpdate = await tx.component.updateMany({
            where: {
                id: input.componentId,
                isActive: true,
                trackingType: TrackingType.BULK,
                quantityAvailable: {
                    gte: input.quantity,
                },
            },
            data: {
                quantityAvailable: {
                    decrement: input.quantity,
                },
            },
        });

        if (stockUpdate.count === 0) {
            const latestComponent = await tx.component.findUnique({
                where: { id: input.componentId },
                select: {
                    isActive: true,
                    quantityAvailable: true,
                },
            });

            if (!latestComponent?.isActive) {
                return { outcome: "COMPONENT_INACTIVE" as const };
            }

            return {
                outcome: "INSUFFICIENT_STOCK" as const,
                availableQuantity: latestComponent?.quantityAvailable ?? 0,
            };
        }

        // 4. Create the inventory loan
        const loan = await tx.inventoryLoan.create({
            data: {
                componentId: input.componentId,
                memberId: input.memberId,
                issuedById: input.issuedById,
                quantityBorrowed: input.quantity,
                dueAt: input.dueAt,
                note: input.note?.trim() || null,
            },
        });

        // 5. Record the checkout movement
        await tx.inventoryMovement.create({
            data: {
                componentId: input.componentId,
                movementType: InventoryMovementType.CHECKOUT,
                quantityChange: -input.quantity,
                performedById: input.issuedById,
                memberId: input.memberId,
                loanId: loan.id,
                note: input.note?.trim() || "Bulk inventory checked out",
            },
        });

        return {
            outcome: "CHECKED_OUT" as const,
            data: {
                componentId: component.id,
                componentName: component.name,
                quantityBorrowed: input.quantity,
                loan,
            },
        };
    })
}

interface ReturnBulkInventoryInput {
    loanId: string;
    returnedById: string;
    quantity: number;
    note?: string;
}

export async function returnBulkInventory(
    input: ReturnBulkInventoryInput,
) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        return { outcome: "INVALID_QUANTITY" as const };
    }

    return prisma.$transaction(async (tx) => {
        // 1. Find the loan and its component
        const loan = await tx.inventoryLoan.findUnique({
            where: { id: input.loanId },
            include: {
                component: {
                    select: {
                        id: true,
                        name: true,
                        trackingType: true,
                        quantityAvailable: true,
                    },
                },
            },
        });

        if (!loan) {
            return { outcome: "LOAN_NOT_FOUND" as const };
        }

        // 2. Ensure this is a bulk inventory loan
        if (
            loan.assetId !== null ||
            loan.component.trackingType !== TrackingType.BULK
        ) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        if (loan.component.quantityAvailable === null) {
            return { outcome: "INVALID_STOCK_CONFIGURATION" as const };
        }

        // 3. Calculate outstanding quantity
        const outstandingQuantity =
            loan.quantityBorrowed -
            loan.quantityReturned -
            loan.quantityWrittenOff;

        if (outstandingQuantity <= 0) {
            return { outcome: "LOAN_ALREADY_CLOSED" as const };
        }

        if (input.quantity > outstandingQuantity) {
            return {
                outcome: "EXCEEDS_OUTSTANDING_QUANTITY" as const,
                outstandingQuantity,
            };
        }

        // 4. Atomically update the loan to prevent over-returning
        const loanUpdate = await tx.inventoryLoan.updateMany({
            where: {
                id: input.loanId,
                quantityReturned: loan.quantityReturned,
                quantityWrittenOff: loan.quantityWrittenOff,
                quantityBorrowed: loan.quantityBorrowed,
            },
            data: {
                quantityReturned: {
                    increment: input.quantity,
                },
            },
        });

        if (loanUpdate.count === 0) {
            return { outcome: "CONCURRENT_UPDATE" as const };
        }

        // 5. Restore available inventory
        await tx.component.update({
            where: { id: loan.componentId },
            data: {
                quantityAvailable: {
                    increment: input.quantity,
                },
            },
        });

        // 6. Record the return movement
        await tx.inventoryMovement.create({
            data: {
                componentId: loan.componentId,
                movementType: InventoryMovementType.RETURN,
                quantityChange: input.quantity,
                performedById: input.returnedById,
                memberId: loan.memberId,
                loanId: loan.id,
                note: input.note?.trim() || "Bulk inventory returned",
            },
        });

        // 7. Retrieve the updated loan
        const updatedLoan = await tx.inventoryLoan.findUniqueOrThrow({
            where: { id: loan.id },
        });

        return {
            outcome: "RETURNED" as const,
            data: {
                loan: updatedLoan,
                componentName: loan.component.name,
                quantityReturnedNow: input.quantity,
                outstandingQuantity:
                    updatedLoan.quantityBorrowed -
                    updatedLoan.quantityReturned -
                    updatedLoan.quantityWrittenOff,
            },
        };
    });
}

interface StockInBulkInput {
    componentId: string;
    performedById: string;
    quantity: number;
    note?: string;
}

export async function stockInBulkInventory(
    input: StockInBulkInput,
) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        return { outcome: "INVALID_QUANTITY" as const };
    }

    return prisma.$transaction(async (tx) => {
        // 1. Find the component
        const component = await tx.component.findUnique({
            where: { id: input.componentId },
            select: {
                id: true,
                name: true,
                trackingType: true,
                isActive: true,
                quantityAvailable: true,
            },
        });

        if (!component) {
            return { outcome: "COMPONENT_NOT_FOUND" as const };
        }

        if (!component.isActive) {
            return { outcome: "COMPONENT_INACTIVE" as const };
        }
        if (component.trackingType !== TrackingType.BULK) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        if (component.quantityAvailable === null) {
            return { outcome: "INVALID_STOCK_CONFIGURATION" as const };
        }

        // 2. Atomically increase available stock
        const stockUpdate = await tx.component.updateMany({
            where: {
                id: input.componentId,
                isActive: true,
                trackingType: TrackingType.BULK,
                quantityAvailable: { not: null },
            },
            data: {
                quantityAvailable: {
                    increment: input.quantity,
                },
            },
        });

        if (stockUpdate.count === 0) {
            return { outcome: "STOCK_UPDATE_FAILED" as const };
        }

        // 3. Record the stock-in movement
        await tx.inventoryMovement.create({
            data: {
                componentId: input.componentId,
                movementType: InventoryMovementType.STOCK_IN,
                quantityChange: input.quantity,
                performedById: input.performedById,
                note: input.note?.trim() || "Bulk inventory stocked in",
            },
        });

        // 4. Retrieve updated stock
        const updatedComponent = await tx.component.findUniqueOrThrow({
            where: { id: input.componentId },
            select: {
                id: true,
                name: true,
                quantityAvailable: true,
            },
        });

        return {
            outcome: "STOCK_ADDED" as const,
            data: {
                component: updatedComponent,
                quantityAdded: input.quantity,
            },
        };
    })

}

interface AdjustBulkInventoryInput {
    componentId: string;
    performedById: string;
    adjustment: number;
    note: string;
}

export async function adjustBulkInventory(
    input: AdjustBulkInventoryInput,
) {
    if (
        !Number.isSafeInteger(input.adjustment) ||
        input.adjustment === 0 ||
        Math.abs(input.adjustment) > 2147483647
    ) {
        return { outcome: "INVALID_ADJUSTMENT" as const };
    }

    if (!input.note.trim()) {
        return { outcome: "NOTE_REQUIRED" as const };
    }

    return prisma.$transaction(async (tx) => {
        // 1. Find the component
        const component = await tx.component.findUnique({
            where: { id: input.componentId },
            select: {
                id: true,
                name: true,
                trackingType: true,
                isActive: true,
                quantityAvailable: true,
            },
        });

        if (!component) {
            return { outcome: "COMPONENT_NOT_FOUND" as const };
        }

        if (!component.isActive) {
            return { outcome: "COMPONENT_INACTIVE" as const };
        }

        if (component.trackingType !== TrackingType.BULK) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        if (component.quantityAvailable === null) {
            return { outcome: "INVALID_STOCK_CONFIGURATION" as const };
        }

        // 2. Prepare an atomic stock adjustment
        const isDecrease = input.adjustment < 0;

        const stockUpdate = await tx.component.updateMany({
            where: {
                id: input.componentId,
                isActive: true,
                trackingType: TrackingType.BULK,
                quantityAvailable: isDecrease
                    ? { gte: Math.abs(input.adjustment) }
                    : { not: null },
            },
            data: {
                quantityAvailable: isDecrease
                    ? { decrement: Math.abs(input.adjustment) }
                    : { increment: input.adjustment },
            },
        });

        if (stockUpdate.count === 0) {
            const latestComponent = await tx.component.findUnique({
                where: { id: input.componentId },
                select: {
                    isActive: true,
                    quantityAvailable: true,
                },
            });

            if (!latestComponent?.isActive) {
                return { outcome: "COMPONENT_INACTIVE" as const };
            }

            if (
                isDecrease &&
                latestComponent.quantityAvailable !== null &&
                latestComponent.quantityAvailable <
                Math.abs(input.adjustment)
            ) {
                return {
                    outcome: "INSUFFICIENT_STOCK" as const,
                    availableQuantity: latestComponent.quantityAvailable,
                };
            }

            return { outcome: "STOCK_UPDATE_FAILED" as const };
        }

        // 3. Record the adjustment movement
        await tx.inventoryMovement.create({
            data: {
                componentId: input.componentId,
                movementType: InventoryMovementType.ADJUSTMENT,
                quantityChange: input.adjustment,
                performedById: input.performedById,
                note: input.note.trim(),
            },
        });

        // 4. Retrieve updated stock
        const updatedComponent = await tx.component.findUniqueOrThrow({
            where: { id: input.componentId },
            select: {
                id: true,
                name: true,
                quantityAvailable: true,
            },
        });

        return {
            outcome: "ADJUSTED" as const,
            data: {
                component: updatedComponent,
                adjustment: input.adjustment,
            },
        };
    });
}

type BulkWriteOffReason = "DAMAGED" | "LOST";

interface WriteOffBulkInventoryInput {
    componentId: string;
    performedById: string;
    quantity: number;
    reason: BulkWriteOffReason;
    note: string;
}

export async function writeOffBulkInventory(
    input: WriteOffBulkInventoryInput,
) {
    if (
        !Number.isSafeInteger(input.quantity) ||
        input.quantity <= 0 ||
        input.quantity > 2147483647
    ) {
        return { outcome: "INVALID_QUANTITY" as const };
    }

    if (!input.note.trim()) {
        return { outcome: "NOTE_REQUIRED" as const };
    }

    if (
        input.reason !== "DAMAGED" &&
        input.reason !== "LOST"
    ) {
        return { outcome: "INVALID_REASON" as const };
    }

    return prisma.$transaction(async (tx) => {
        // 1. Find the component
        const component = await tx.component.findUnique({
            where: { id: input.componentId },
            select: {
                id: true,
                name: true,
                trackingType: true,
                isActive: true,
                quantityAvailable: true,
            },
        });

        if (!component) {
            return { outcome: "COMPONENT_NOT_FOUND" as const };
        }

        if (!component.isActive) {
            return { outcome: "COMPONENT_INACTIVE" as const };
        }

        if (component.trackingType !== TrackingType.BULK) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        if (component.quantityAvailable === null) {
            return { outcome: "INVALID_STOCK_CONFIGURATION" as const };
        }

        // 2. Atomically decrease available stock
        const stockUpdate = await tx.component.updateMany({
            where: {
                id: input.componentId,
                isActive: true,
                trackingType: TrackingType.BULK,
                quantityAvailable: {
                    gte: input.quantity,
                },
            },
            data: {
                quantityAvailable: {
                    decrement: input.quantity,
                },
            },
        });

        if (stockUpdate.count === 0) {
            const latestComponent = await tx.component.findUnique({
                where: { id: input.componentId },
                select: {
                    isActive: true,
                    quantityAvailable: true,
                },
            });

            if (!latestComponent?.isActive) {
                return { outcome: "COMPONENT_INACTIVE" as const };
            }

            return {
                outcome: "INSUFFICIENT_STOCK" as const,
                availableQuantity: latestComponent?.quantityAvailable ?? 0,
            };
        }

        // 3. Determine the movement type
        const movementType =
            input.reason === "DAMAGED"
                ? InventoryMovementType.MARK_DAMAGED
                : InventoryMovementType.MARK_LOST;

        // 4. Record the write-off movement
        await tx.inventoryMovement.create({
            data: {
                componentId: input.componentId,
                movementType,
                quantityChange: -input.quantity,
                performedById: input.performedById,
                note: input.note.trim(),
            },
        });

        // 5. Retrieve updated stock
        const updatedComponent = await tx.component.findUniqueOrThrow({
            where: { id: input.componentId },
            select: {
                id: true,
                name: true,
                quantityAvailable: true,
            },
        });

        return {
            outcome: "WRITTEN_OFF" as const,
            data: {
                component: updatedComponent,
                reason: input.reason,
                quantityRemoved: input.quantity,
            },
        };
    });
}

type LoanWriteOffReason = "DAMAGED" | "LOST";

interface WriteOffBulkLoanInput {
    loanId: string;
    performedById: string;
    quantity: number;
    reason: LoanWriteOffReason;
    note: string;
}

export async function writeOffBulkLoan(
    input: WriteOffBulkLoanInput,
) {
    if (
        !Number.isSafeInteger(input.quantity) ||
        input.quantity <= 0 ||
        input.quantity > 2147483647
    ) {
        return { outcome: "INVALID_QUANTITY" as const };
    }

    if (!input.note.trim()) {
        return { outcome: "NOTE_REQUIRED" as const };
    }

    if (
        input.reason !== "DAMAGED" &&
        input.reason !== "LOST"
    ) {
        return { outcome: "INVALID_REASON" as const };
    }

    return prisma.$transaction(async (tx) => {
        // 1. Find the loan
        const loan = await tx.inventoryLoan.findUnique({
            where: { id: input.loanId },
            include: {
                component: {
                    select: {
                        id: true,
                        name: true,
                        trackingType: true,
                    },
                },
            },
        });

        if (!loan) {
            return { outcome: "LOAN_NOT_FOUND" as const };
        }

        // 2. Ensure this is a bulk inventory loan
        if (
            loan.assetId !== null ||
            loan.component.trackingType !== TrackingType.BULK
        ) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        // 3. Calculate outstanding quantity
        const outstandingQuantity =
            loan.quantityBorrowed -
            loan.quantityReturned -
            loan.quantityWrittenOff;

        if (outstandingQuantity <= 0) {
            return { outcome: "LOAN_ALREADY_CLOSED" as const };
        }

        if (input.quantity > outstandingQuantity) {
            return {
                outcome: "EXCEEDS_OUTSTANDING_QUANTITY" as const,
                outstandingQuantity,
            };
        }

        // 4. Atomically update the loan
        const loanUpdate = await tx.inventoryLoan.updateMany({
            where: {
                id: input.loanId,
                quantityReturned: loan.quantityReturned,
                quantityWrittenOff: loan.quantityWrittenOff,
                quantityBorrowed: loan.quantityBorrowed,
            },
            data: {
                quantityWrittenOff: {
                    increment: input.quantity,
                },
            },
        });

        if (loanUpdate.count === 0) {
            const latestLoan = await tx.inventoryLoan.findUnique({
                where: { id: input.loanId },
                select: {
                    quantityBorrowed: true,
                    quantityReturned: true,
                    quantityWrittenOff: true,
                },
            });

            if (!latestLoan) {
                return { outcome: "LOAN_NOT_FOUND" as const };
            }

            const latestOutstanding =
                latestLoan.quantityBorrowed -
                latestLoan.quantityReturned -
                latestLoan.quantityWrittenOff;

            if (latestOutstanding <= 0) {
                return { outcome: "LOAN_ALREADY_CLOSED" as const };
            }

            if (input.quantity > latestOutstanding) {
                return {
                    outcome: "EXCEEDS_OUTSTANDING_QUANTITY" as const,
                    outstandingQuantity: latestOutstanding,
                };
            }

            return { outcome: "CONCURRENT_UPDATE" as const };
        }

        // 5. Determine movement type
        const movementType =
            input.reason === "DAMAGED"
                ? InventoryMovementType.MARK_DAMAGED
                : InventoryMovementType.MARK_LOST;

        // 6. Record the loan write-off
        await tx.inventoryMovement.create({
            data: {
                componentId: loan.componentId,
                movementType,
                quantityChange: 0,
                performedById: input.performedById,
                memberId: loan.memberId,
                loanId: loan.id,
                note: `${input.quantity} units written off: ${input.note.trim()}`,
            },
        });

        // 7. Retrieve updated loan
        const updatedLoan = await tx.inventoryLoan.findUniqueOrThrow({
            where: { id: loan.id },
        });

        const remainingOutstanding =
            updatedLoan.quantityBorrowed -
            updatedLoan.quantityReturned -
            updatedLoan.quantityWrittenOff;

        return {
            outcome: "WRITTEN_OFF" as const,
            data: {
                loan: updatedLoan,
                componentName: loan.component.name,
                reason: input.reason,
                quantityWrittenOffNow: input.quantity,
                outstandingQuantity: remainingOutstanding,
                loanStatus:
                    remainingOutstanding === 0 ? "CLOSED" : "OUTSTANDING",
            },
        };
    });
}