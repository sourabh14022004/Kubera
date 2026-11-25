import { prisma } from "../../config/database.js";
import { InventoryMovementType, TrackingType } from "../../generated/prisma/client.js";

export async function getInventoryOverview() {
    const [
        activeComponents,
        inactiveComponents,
        activeCategories,
        bulkComponents,
        individualComponents,
        lowStockComponents,
        outOfStockComponents,
    ] = await Promise.all([
        // Active components
        prisma.component.count({
            where: { isActive: true },
        }),

        // Inactive components
        prisma.component.count({
            where: { isActive: false },
        }),

        // Active categories
        prisma.componentCategory.count({
            where: { isActive: true },
        }),

        // Bulk inventory summary
        prisma.component.aggregate({
            where: {
                isActive: true,
                trackingType: TrackingType.BULK,
            },
            _count: {
                _all: true,
            },
            _sum: {
                quantityAvailable: true,
            },
        }),

        // Individual-tracked components
        prisma.component.count({
            where: {
                isActive: true,
                trackingType: TrackingType.INDIVIDUAL,
            },
        }),

        // Bulk components below or at minimum stock
        prisma.component.count({
            where: {
                isActive: true,
                trackingType: TrackingType.BULK,
                quantityAvailable: {
                    gt: 0,
                    lte: prisma.component.fields.minimumStock,
                },
            },
        }),

        // Bulk components with zero available stock
        prisma.component.count({
            where: {
                isActive: true,
                trackingType: TrackingType.BULK,
                quantityAvailable: 0,
            },
        }),
    ]);

    return {
        components: {
            active: activeComponents,
            inactive: inactiveComponents,
            individual: individualComponents,
            bulk: bulkComponents._count._all,
        },
        categories: {
            active: activeCategories,
        },
        bulkInventory: {
            totalAvailableUnits: bulkComponents._sum.quantityAvailable ?? 0,
            lowStockComponents,
            outOfStockComponents,
        },
    };
}

export async function getStockAlerts() {
    const components = await prisma.component.findMany({
        where: {
            isActive: true,
            trackingType: TrackingType.BULK,
            OR: [
                {
                    quantityAvailable: 0,
                },
                {
                    quantityAvailable: {
                        gt: 0,
                        lte: prisma.component.fields.minimumStock,
                    },
                },
            ],
        },
        orderBy: [
            { quantityAvailable: "asc" },
            { name: "asc" },
        ],
        select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            quantityAvailable: true,
            minimumStock: true,

            category: {
                select: {
                    id: true,
                    name: true,
                },
            },

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
    });

    return components.map((component) => {
        const available = component.quantityAvailable ?? 0;
        const rack = component.storageDrawer?.rack;
        const drawer = component.storageDrawer;

        const locationCode =
            rack && drawer
                ? `${rack.color}-R${String(rack.drawersPerRack).padStart(2, "0")}-C${String(rack.rackNumber).padStart(2, "0")}-D${String(drawer.drawerNumber).padStart(2, "0")}`
                : null;

        return {
            ...component,
            stockStatus:
                available === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
            locationCode,
        };
    });
}

interface MovementReportFilters {
    componentId?: string;
    movementType?: InventoryMovementType;
    memberId?: string;
    performedById?: string;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
}

export async function getMovementHistory(
    filters: MovementReportFilters,
) {
    const where = {
        ...(filters.componentId && {
            componentId: filters.componentId,
        }),

        ...(filters.movementType && {
            movementType: filters.movementType,
        }),

        ...(filters.memberId && {
            memberId: filters.memberId,
        }),

        ...(filters.performedById && {
            performedById: filters.performedById,
        }),

        ...((filters.from || filters.to) && {
            createdAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
            },
        }),
    };

    const [movements, total] = await Promise.all([
        prisma.inventoryMovement.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            skip: (filters.page - 1) * filters.limit,
            take: filters.limit,

            include: {
                component: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        trackingType: true,
                    },
                },

                performedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                member: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                asset: {
                    select: {
                        id: true,
                        assetTag: true,
                    },
                },

                loan: {
                    select: {
                        id: true,
                        quantityBorrowed: true,
                        quantityReturned: true,
                        quantityWrittenOff: true,
                    },
                },
            },
        }),

        prisma.inventoryMovement.count({ where }),
    ]);

    return {
        movements,
        pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: Math.ceil(total / filters.limit),
        },
    };
}


export async function getMovementAnalytics() {
    const groupedMovements = await prisma.inventoryMovement.groupBy({
        by: ["movementType"],
        _count: {
            _all: true,
        },
        _sum: {
            quantityChange: true,
        },
    });

    const analytics = Object.fromEntries(
        groupedMovements.map((movement) => [
            movement.movementType,
            {
                count: movement._count._all,
                netQuantityChange: movement._sum.quantityChange ?? 0,
            },
        ])
    );

    const movementTypes = [
        "STOCK_IN",
        "CHECKOUT",
        "RETURN",
        "ADJUSTMENT",
        "MARK_DAMAGED",
        "MARK_LOST",
        "RETIRE",
    ] as const;

    const breakdown = Object.fromEntries(
        movementTypes.map((type) => [
            type,
            analytics[type] ?? {
                count: 0,
                netQuantityChange: 0,
            },
        ])
    );

    return {
        totalMovements: groupedMovements.reduce(
            (total, movement) => total + movement._count._all,
            0
        ),
        breakdown,
    };
}



type WriteOffStats = {
    operations: number;
    knownUnits: number;
    unknownQuantityOperations: number;
};

type ComponentWriteOffStats = {
    id: string;
    code: string;
    name: string;
    category: string;
    damaged: WriteOffStats;
    lost: WriteOffStats;
};

const createWriteOffStats = (): WriteOffStats => ({
    operations: 0,
    knownUnits: 0,
    unknownQuantityOperations: 0,
});

export async function getDamageLossAnalytics() {
    const writeOffTypes = [
        InventoryMovementType.MARK_DAMAGED,
        InventoryMovementType.MARK_LOST,
    ];

    const writeOffWhere = {
        movementType: {
            in: writeOffTypes,
        },
    };

    const [
        structuredGroups,
        legacyGroups,
        unknownGroups,
    ] = await Promise.all([
        // New records with structured affected quantities.
        prisma.inventoryMovement.groupBy({
            by: ["componentId", "movementType"],
            where: {
                ...writeOffWhere,
                quantityAffected: {
                    not: null,
                },
            },
            _count: {
                _all: true,
            },
            _sum: {
                quantityAffected: true,
            },
        }),

        // Older available-stock write-offs.
        // Their negative quantityChange tells us the affected quantity.
        prisma.inventoryMovement.groupBy({
            by: ["componentId", "movementType"],
            where: {
                ...writeOffWhere,
                quantityAffected: null,
                quantityChange: {
                    lt: 0,
                },
            },
            _count: {
                _all: true,
            },
            _sum: {
                quantityChange: true,
            },
        }),

        // Older borrowed-stock write-offs.
        // quantityChange was zero, and the affected quantity wasn't stored.
        prisma.inventoryMovement.groupBy({
            by: ["componentId", "movementType"],
            where: {
                ...writeOffWhere,
                quantityAffected: null,
                quantityChange: 0,
            },
            _count: {
                _all: true,
            },
        }),
    ]);

    // Collect every component having a damage/loss movement.
    const componentIds = [
        ...new Set([
            ...structuredGroups.map((item) => item.componentId),
            ...legacyGroups.map((item) => item.componentId),
            ...unknownGroups.map((item) => item.componentId),
        ]),
    ];

    const components = await prisma.component.findMany({
        where: {
            id: {
                in: componentIds,
            },
        },
        select: {
            id: true,
            code: true,
            name: true,
            category: {
                select: {
                    name: true,
                },
            },
        },
    });

    const componentMap = new Map<string, ComponentWriteOffStats>();

    for (const component of components) {
        componentMap.set(component.id, {
            id: component.id,
            code: component.code,
            name: component.name,
            category: component.category.name,
            damaged: createWriteOffStats(),
            lost: createWriteOffStats(),
        });
    }

    const getStats = (
        componentId: string,
        movementType: InventoryMovementType
    ) => {
        const component = componentMap.get(componentId);

        if (!component) {
            throw new Error(`Component not found: ${componentId}`);
        }

        return movementType === InventoryMovementType.MARK_DAMAGED
            ? component.damaged
            : component.lost;
    };

    // Process records that have structured quantities.
    for (const group of structuredGroups) {
        const stats = getStats(group.componentId, group.movementType);

        stats.operations += group._count._all;
        stats.knownUnits += group._sum.quantityAffected ?? 0;
    }

    // Process older physical-stock write-offs.
    for (const group of legacyGroups) {
        const stats = getStats(group.componentId, group.movementType);

        stats.operations += group._count._all;
        stats.knownUnits += Math.abs(group._sum.quantityChange ?? 0);
    }

    // Process historical borrowed-stock write-offs with unknown quantities.
    for (const group of unknownGroups) {
        const stats = getStats(group.componentId, group.movementType);

        stats.operations += group._count._all;
        stats.unknownQuantityOperations += group._count._all;
    }

    const componentBreakdown = Array.from(componentMap.values()).sort(
        (a, b) =>
            b.damaged.knownUnits +
            b.lost.knownUnits -
            (a.damaged.knownUnits + a.lost.knownUnits)
    );

    const totalStats = (type: "damaged" | "lost"): WriteOffStats =>
        componentBreakdown.reduce(
            (total, component) => ({
                operations: total.operations + component[type].operations,
                knownUnits: total.knownUnits + component[type].knownUnits,
                unknownQuantityOperations:
                    total.unknownQuantityOperations +
                    component[type].unknownQuantityOperations,
            }),
            createWriteOffStats()
        );

    const damaged = totalStats("damaged");
    const lost = totalStats("lost");

    return {
        summary: {
            totalWriteOffOperations: damaged.operations + lost.operations,
            totalKnownAffectedUnits: damaged.knownUnits + lost.knownUnits,
            totalUnknownQuantityOperations:
                damaged.unknownQuantityOperations +
                lost.unknownQuantityOperations,
            damaged,
            lost,
        },
        components: componentBreakdown,
    };
}


export async function getBorrowingAnalytics() {
    const now = new Date();

    // Fetch the loan fields needed for aggregation.
    const loans = await prisma.inventoryLoan.findMany({
        select: {
            id: true,
            componentId: true,
            quantityBorrowed: true,
            quantityReturned: true,
            quantityWrittenOff: true,
            dueAt: true,
            component: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    category: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    type ComponentBorrowingStats = {
        id: string;
        code: string;
        name: string;
        category: string;
        totalLoans: number;
        outstandingLoans: number;
        overdueLoans: number;
        borrowedQuantity: number;
        returnedQuantity: number;
        writtenOffQuantity: number;
        outstandingQuantity: number;
    };

    const summary = {
        totalLoans: loans.length,
        outstandingLoans: 0,
        overdueLoans: 0,
        closedLoans: 0,
        totalBorrowedQuantity: 0,
        totalReturnedQuantity: 0,
        totalWrittenOffQuantity: 0,
        totalOutstandingQuantity: 0,
    };

    const componentStats = new Map<string, ComponentBorrowingStats>();

    for (const loan of loans) {
        // Calculate the remaining quantity for this loan.
        const outstandingQuantity = Math.max(
            loan.quantityBorrowed -
            loan.quantityReturned -
            loan.quantityWrittenOff,
            0
        );

        const isOutstanding = outstandingQuantity > 0;
        const isOverdue = isOutstanding && loan.dueAt !== null && loan.dueAt < now;

        // Update overall statistics.
        summary.totalBorrowedQuantity += loan.quantityBorrowed;
        summary.totalReturnedQuantity += loan.quantityReturned;
        summary.totalWrittenOffQuantity += loan.quantityWrittenOff;
        summary.totalOutstandingQuantity += outstandingQuantity;

        if (isOutstanding) {
            summary.outstandingLoans++;
        } else {
            summary.closedLoans++;
        }

        if (isOverdue) {
            summary.overdueLoans++;
        }

        // Initialize component statistics when needed.
        let stats = componentStats.get(loan.componentId);

        if (!stats) {
            stats = {
                id: loan.component.id,
                code: loan.component.code,
                name: loan.component.name,
                category: loan.component.category.name,
                totalLoans: 0,
                outstandingLoans: 0,
                overdueLoans: 0,
                borrowedQuantity: 0,
                returnedQuantity: 0,
                writtenOffQuantity: 0,
                outstandingQuantity: 0,
            };

            componentStats.set(loan.componentId, stats);
        }

        // Update component-wise statistics.
        stats.totalLoans++;
        stats.borrowedQuantity += loan.quantityBorrowed;
        stats.returnedQuantity += loan.quantityReturned;
        stats.writtenOffQuantity += loan.quantityWrittenOff;
        stats.outstandingQuantity += outstandingQuantity;

        if (isOutstanding) {
            stats.outstandingLoans++;
        }

        if (isOverdue) {
            stats.overdueLoans++;
        }
    }

    // Rank components by number of loans, then quantity borrowed.
    const components = Array.from(componentStats.values()).sort(
        (a, b) =>
            b.totalLoans - a.totalLoans ||
            b.borrowedQuantity - a.borrowedQuantity
    );

    return {
        summary,
        mostBorrowedComponents: components.slice(0, 5),
        components,
    };
}


type ActivityInterval = "DAY" | "MONTH";

type MovementActivityStats = {
    count: number;
    netQuantityChange: number;
    affectedUnits: number;
    unknownQuantityOperations: number;
};

type ActivityBucket = {
    period: string;
    totalMovements: number;
    netStockChange: number;
    byType: Record<InventoryMovementType, MovementActivityStats>;
};

const createMovementActivityStats = (): MovementActivityStats => ({
    count: 0,
    netQuantityChange: 0,
    affectedUnits: 0,
    unknownQuantityOperations: 0,
});

const createActivityBreakdown = (): Record<
    InventoryMovementType,
    MovementActivityStats
> => {
    return Object.fromEntries(
        Object.values(InventoryMovementType).map((type) => [
            type,
            createMovementActivityStats(),
        ])
    ) as Record<InventoryMovementType, MovementActivityStats>;
};

export async function getInventoryActivityTrends(input: {
    interval?: ActivityInterval;
    from?: Date;
    to?: Date;
} = {}) {
    const interval = input.interval ?? "DAY";
    const now = new Date();

    // Normalize the start date to UTC midnight or the first of the month.
    let startDate: Date;

    if (input.from) {
        startDate =
            interval === "DAY"
                ? new Date(
                    Date.UTC(
                        input.from.getUTCFullYear(),
                        input.from.getUTCMonth(),
                        input.from.getUTCDate()
                    )
                )
                : new Date(
                    Date.UTC(input.from.getUTCFullYear(), input.from.getUTCMonth(), 1)
                );
    } else if (interval === "DAY") {
        const today = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        );

        startDate = new Date(today - 29 * 24 * 60 * 60 * 1000);
    } else {
        startDate = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)
        );
    }

    // The end boundary is exclusive in the database query.
    let endExclusive: Date;

    if (input.to) {
        endExclusive =
            interval === "DAY"
                ? new Date(
                    Date.UTC(
                        input.to.getUTCFullYear(),
                        input.to.getUTCMonth(),
                        input.to.getUTCDate() + 1
                    )
                )
                : new Date(
                    Date.UTC(input.to.getUTCFullYear(), input.to.getUTCMonth() + 1, 1)
                );
    } else if (interval === "DAY") {
        endExclusive = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + 1
            )
        );
    } else {
        endExclusive = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
        );
    }

    if (startDate >= endExclusive) {
        throw new Error("The activity trend start date must be before the end date.");
    }

    // Retrieve only movements within the requested date range.
    const movements = await prisma.inventoryMovement.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lt: endExclusive,
            },
        },
        select: {
            createdAt: true,
            movementType: true,
            quantityChange: true,
            quantityAffected: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    const buckets = new Map<string, ActivityBucket>();

    const getPeriodKey = (date: Date) =>
        interval === "DAY"
            ? date.toISOString().slice(0, 10)
            : date.toISOString().slice(0, 7);

    // Pre-create buckets so dates/months without activity are included.
    const cursor = new Date(startDate);

    while (cursor < endExclusive) {
        const period = getPeriodKey(cursor);

        buckets.set(period, {
            period,
            totalMovements: 0,
            netStockChange: 0,
            byType: createActivityBreakdown(),
        });

        if (interval === "DAY") {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        } else {
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
    }

    // Add each movement to its corresponding bucket.
    for (const movement of movements) {
        const period = getPeriodKey(movement.createdAt);
        const bucket = buckets.get(period);

        if (!bucket) continue;

        const stats = bucket.byType[movement.movementType];

        bucket.totalMovements++;
        bucket.netStockChange += movement.quantityChange;

        stats.count++;
        stats.netQuantityChange += movement.quantityChange;

        // Damage/loss quantities require special handling because older
        // borrowed-stock write-offs may have quantityChange = 0.
        if (
            movement.movementType === InventoryMovementType.MARK_DAMAGED ||
            movement.movementType === InventoryMovementType.MARK_LOST
        ) {
            if (movement.quantityAffected !== null) {
                stats.affectedUnits += movement.quantityAffected;
            } else if (movement.quantityChange < 0) {
                // Recover historical available-stock write-offs.
                stats.affectedUnits += Math.abs(movement.quantityChange);
            } else {
                // Historical borrowed-stock write-off with unknown quantity.
                stats.unknownQuantityOperations++;
            }
        }
    }

    const activityBuckets = Array.from(buckets.values());

    // Calculate totals across the entire requested period.
    const summary = {
        totalMovements: 0,
        netStockChange: 0,
        byType: createActivityBreakdown(),
    };

    for (const bucket of activityBuckets) {
        summary.totalMovements += bucket.totalMovements;
        summary.netStockChange += bucket.netStockChange;

        for (const type of Object.values(InventoryMovementType)) {
            const periodStats = bucket.byType[type];
            const totalStats = summary.byType[type];

            totalStats.count += periodStats.count;
            totalStats.netQuantityChange += periodStats.netQuantityChange;
            totalStats.affectedUnits += periodStats.affectedUnits;
            totalStats.unknownQuantityOperations += periodStats.unknownQuantityOperations;
        }
    }

    return {
        interval,
        range: {
            from: startDate.toISOString(),
            to: new Date(endExclusive.getTime() - 1).toISOString(),
        },
        summary,
        buckets: activityBuckets,
    };
}
