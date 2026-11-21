import { prisma } from "../../config/database.js";
import { TrackingType, InventoryMovementType, AssetStatus } from "../../generated/prisma/enums.js";
import { Prisma } from "../../generated/prisma/client.js";


interface RegisterAssetInput {
    componentId: string;
    assetTag: string;
    serialNumber?: string;
    acquiredAt?: Date;
    notes?: string;
    performedById: string;
}

export async function registerAsset(input: RegisterAssetInput) {
    return prisma.$transaction(async (tx) => {
        // 1. Verify that the component exists
        const component = await tx.component.findUnique({
            where: { id: input.componentId },
            select: {
                id: true,
                code: true,
                name: true,
                trackingType: true,
                isActive: true,
            },
        });

        if (!component) {
            return { outcome: "COMPONENT_NOT_FOUND" as const };
        }

        // 2. Only active INDIVIDUAL components can have assets registered
        if (!component.isActive) {
            return { outcome: "COMPONENT_INACTIVE" as const }
        }

        if (component.trackingType !== TrackingType.INDIVIDUAL) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        // 3. Create the physical asset
        const asset = await tx.asset.create({
            data: {
                componentId: input.componentId,
                assetTag: input.assetTag.trim(),
                serialNumber: input.serialNumber?.trim() || null,
                acquiredAt: input.acquiredAt,
                notes: input.notes?.trim() || null,
            },
        })

        // 4. Record the asset registration in movement history
        await tx.inventoryMovement.create({
            data: {
                componentId: input.componentId,
                assetId: asset.id,
                movementType: InventoryMovementType.STOCK_IN,
                quantityChange: 1,
                performedById: input.performedById,
                note: "Individual asset registered"
            },
        })

        return {
            outcome: "REGISTERED" as const,
            data: asset,
        };
    });
}

export type AssetListStatus = AssetStatus | "ALL";

interface GetAllAssetsInput {
    search?: string;
    componentId?: string;
    status?: AssetListStatus;
    page?: number;
    limit?: number;
}

export async function getAllAssets(input: GetAllAssetsInput = {}) {
    const {
        search,
        componentId,
        status = "ALL",
        page = 1,
        limit = 20,
    } = input;

    const where: Prisma.AssetWhereInput = {
        ...(componentId && { componentId }),
        ...(status !== "ALL" && { status }),
        ...(search && {
            OR: [
                {
                    assetTag: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    serialNumber: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ],
        }),
    };

    const skip = (page - 1) * limit;

    const [assets, total] = await prisma.$transaction([
        prisma.asset.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                component: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        trackingType: true,
                        storageDrawer: {
                            select: {
                                drawerNumber: true,
                                rack: {
                                    select: {
                                        color: true,
                                        drawersPerRack: true,
                                        rackNumber: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        prisma.asset.count({ where }),
    ]);

    const data = assets.map((asset) => {
        const drawer = asset.component.storageDrawer;
        const rack = drawer?.rack;

        const pad = (value: number) => String(value).padStart(2, "0");

        const locationCode =
            drawer && rack
                ? `${rack.color}-R${pad(rack.drawersPerRack)}-C${pad(rack.rackNumber)}-D${pad(drawer.drawerNumber)}`
                : null;

        return {
            ...asset,
            locationCode,
        };
    });

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

interface CheckoutAssetInput {
    assetId: string;
    memberId: string;
    issuedById: string;
    dueAt?: Date;
    note?: string;
}

export async function checkoutAsset(input: CheckoutAssetInput) {
    return prisma.$transaction(async (tx) => {
        // 1. Find the asset and its component
        const asset = await tx.asset.findUnique({
            where: { id: input.assetId },
            select: {
                id: true,
                assetTag: true,
                status: true,
                component: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        trackingType: true,
                    },
                },
            },
        });

        if (!asset) {
            return { outcome: "ASSET_NOT_FOUND" as const };
        }

        if (!asset.component.isActive) {
            return { outcome: "COMPONENT_INACTIVE" as const };
        }

        if (asset.component.trackingType !== TrackingType.INDIVIDUAL) {
            return { outcome: "INVALID_TRACKING_TYPE" as const };
        }

        // 2. Verify the borrowing member
        const member = await tx.user.findUnique({
            where: { id: input.memberId },
            select: { id: true, isActive: true },
        });

        if (!member) {
            return { outcome: "MEMBER_NOT_FOUND" as const };
        }

        if (!member.isActive) {
            return { outcome: "MEMBER_INACTIVE" as const };
        }

        // 3. Atomically claim the available asset.
        // This prevents two simultaneous requests from checking out
        // the same physical asset.
        const updated = await tx.asset.updateMany({
            where: {
                id: input.assetId,
                status: AssetStatus.AVAILABLE,
            },
            data: {
                status: AssetStatus.CHECKED_OUT,
                checkedOutToId: input.memberId,
                checkedOutAt: new Date(),
            },
        });

        if (updated.count === 0) {
            return { outcome: "ASSET_NOT_AVAILABLE" as const };
        }

        // 4. Create the loan
        const loan = await tx.inventoryLoan.create({
            data: {
                componentId: asset.component.id,
                assetId: asset.id,
                memberId: input.memberId,
                issuedById: input.issuedById,
                quantityBorrowed: 1,
                dueAt: input.dueAt,
                note: input.note?.trim() || null,
            },
        });

        // 5. Record the checkout movement
        await tx.inventoryMovement.create({
            data: {
                componentId: asset.component.id,
                assetId: asset.id,
                movementType: InventoryMovementType.CHECKOUT,
                quantityChange: -1,
                performedById: input.issuedById,
                memberId: input.memberId,
                loanId: loan.id,
                note: input.note?.trim() || "Asset checked out",
            },
        });

        return {
            outcome: "CHECKED_OUT" as const,
            data: {
                assetId: asset.id,
                assetTag: asset.assetTag,
                loan,
            },
        };
    });
}

interface ReturnAssetInput {
    assetId: string;
    returnedById: string;
    note?: string;
}

export async function returnAsset(input: ReturnAssetInput) {
    return prisma.$transaction(async (tx) => {
        // 1. Find the asset
        const asset = await tx.asset.findUnique({
            where: { id: input.assetId },
            select: {
                id: true,
                assetTag: true,
                status: true,
            },
        });

        if (!asset) {
            return { outcome: "ASSET_NOT_FOUND" as const };
        }

        if (asset.status !== AssetStatus.CHECKED_OUT) {
            return { outcome: "ASSET_NOT_CHECKED_OUT" as const };
        }

        // 2. Find the outstanding loan for this asset
        const loans = await tx.inventoryLoan.findMany({
            where: { assetId: asset.id },
            orderBy: { checkedOutAt: "desc" },
        });

        const activeLoan = loans.find(
            (loan) =>
                loan.quantityBorrowed -
                loan.quantityReturned -
                loan.quantityWrittenOff >
                0,
        );

        if (!activeLoan) {
            return { outcome: "ACTIVE_LOAN_NOT_FOUND" as const };
        }

        // 3. Atomically claim the checked-out asset for return
        const updated = await tx.asset.updateMany({
            where: {
                id: asset.id,
                status: AssetStatus.CHECKED_OUT,
            },
            data: {
                status: AssetStatus.AVAILABLE,
                checkedOutToId: null,
                checkedOutAt: null,
            },
        });

        if (updated.count === 0) {
            return { outcome: "ASSET_NOT_CHECKED_OUT" as const };
        }

        // 4. Update the loan
        const loan = await tx.inventoryLoan.update({
            where: { id: activeLoan.id },
            data: {
                quantityReturned: {
                    increment: 1,
                },
            },
        });

        // 5. Record the return movement
        await tx.inventoryMovement.create({
            data: {
                componentId: activeLoan.componentId,
                assetId: asset.id,
                movementType: InventoryMovementType.RETURN,
                quantityChange: 1,
                performedById: input.returnedById,
                memberId: activeLoan.memberId,
                loanId: activeLoan.id,
                note: input.note?.trim() || "Asset returned",
            },
        });

        return {
            outcome: "RETURNED" as const,
            data: {
                assetId: asset.id,
                assetTag: asset.assetTag,
                loan,
            },
        };
    });
}

// Loan Management

export type LoanListStatus =
    | "ALL"
    | "OUTSTANDING"
    | "OVERDUE"
    | "CLOSED";

interface GetAllLoansInput {
    search?: string;
    memberId?: string;
    componentId?: string;
    assetId?: string;
    status?: LoanListStatus;
    page?: number;
    limit?: number;
}

export async function getAllLoans(input: GetAllLoansInput = {}) {
    const {
        search,
        memberId,
        componentId,
        assetId,
        status = "ALL",
        page = 1,
        limit = 20,
    } = input;

    const where: Prisma.InventoryLoanWhereInput = {
        ...(memberId && { memberId }),
        ...(componentId && { componentId }),
        ...(assetId && { assetId }),

        ...(search && {
            OR: [
                {
                    member: {
                        is: {
                            name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    member: {
                        is: {
                            email: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    component: {
                        is: {
                            name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    component: {
                        is: {
                            code: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    asset: {
                        is: {
                            assetTag: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            ],
        }),
    };

    // Retrieve matching loans and their related records.
    const loans = await prisma.inventoryLoan.findMany({
        where,
        orderBy: {
            checkedOutAt: "desc",
        },
        include: {
            member: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            issuedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            component: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                },
            },
            asset: {
                select: {
                    id: true,
                    assetTag: true,
                    status: true,
                },
            },
        },
    });

    // Calculate each loan's current status.
    const now = new Date();

    const enrichedLoans = loans.map((loan) => {
        const outstandingQuantity = Math.max(
            0,
            loan.quantityBorrowed -
            loan.quantityReturned -
            loan.quantityWrittenOff,
        );

        const loanStatus: Exclude<LoanListStatus, "ALL"> =
            outstandingQuantity === 0
                ? "CLOSED"
                : loan.dueAt && loan.dueAt < now
                    ? "OVERDUE"
                    : "OUTSTANDING";

        return {
            ...loan,
            outstandingQuantity,
            loanStatus,
        };
    });

    // Apply the calculated status filter.
    const filteredLoans =
        status === "ALL"
            ? enrichedLoans
            : enrichedLoans.filter((loan) => loan.loanStatus === status);

    // Apply pagination after filtering.
    const total = filteredLoans.length;
    const skip = (page - 1) * limit;

    return {
        data: filteredLoans.slice(skip, skip + limit),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}