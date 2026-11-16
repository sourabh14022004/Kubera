import { prisma } from "../../config/database.js";

export type CategoryStatus = "ACTIVE" | "INACTIVE" | "ALL";

// Get categories with their component counts.
export async function getAllCategories(
    status: CategoryStatus = "ACTIVE",
) {
    const categories = await prisma.componentCategory.findMany({
        where:
            status === "ALL"
                ? undefined
                : { isActive: status === "ACTIVE" },

        orderBy: {
            name: "asc",
        },

        include: {
            _count: {
                select: {
                    components: true,
                },
            },
        },
    });

    return categories;
}

// Create a new category.
export async function createCategory(input: {
    name: string;
    description?: string | null;
}) {
    return prisma.componentCategory.create({
        data: {
            name: input.name.trim(),
            description: input.description?.trim() || null,
        },
    });
}


function isForeignKeyConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2003"
    );
}

export async function deleteCategory(categoryId: string) {
    try {
        return await prisma.$transaction(async (tx) => {
            const category = await tx.componentCategory.findUnique({
                where: { id: categoryId },
                select: {
                    id: true,
                    _count: {
                        select: {
                            components: true,
                        },
                    },
                },
            });

            if (!category) {
                return { outcome: "NOT_FOUND" as const };
            }

            if (category._count.components > 0) {
                return {
                    outcome: "HAS_COMPONENTS" as const,
                    componentCount: category._count.components,
                };
            }

            await tx.componentCategory.delete({
                where: { id: categoryId },
            });

            return { outcome: "DELETED" as const };
        });
    } catch (error) {
        if (isForeignKeyConstraintError(error)) {
            return { outcome: "BLOCKED_BY_REFERENCE" as const };
        }

        throw error;
    }
}

// Update category details.
export async function updateCategory(
    categoryId: string,
    input: {
        name?: string;
        description?: string | null;
    },
) {
    return prisma.componentCategory.update({
        where: { id: categoryId },
        data: {
            ...(input.name !== undefined && {
                name: input.name.trim(),
            }),
            ...(input.description !== undefined && {
                description: input.description?.trim() || null,
            }),
        },
    });
}

// Deactivate a category without deleting its components.
export async function deactivateCategory(categoryId: string) {
    return prisma.$transaction(async (tx) => {
        const category = await tx.componentCategory.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!category) {
            return { outcome: "NOT_FOUND" as const };
        }

        if (!category.isActive) {
            return { outcome: "ALREADY_INACTIVE" as const };
        }

        const updatedCategory = await tx.componentCategory.update({
            where: { id: categoryId },
            data: { isActive: false },
        });

        return {
            outcome: "DEACTIVATED" as const,
            data: updatedCategory,
        };
    });
}

// To activate a category
export async function activateCategory(categoryId: string) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.componentCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!category) {
      return { outcome: "NOT_FOUND" as const };
    }

    if (category.isActive) {
      return { outcome: "ALREADY_ACTIVE" as const };
    }

    const updatedCategory = await tx.componentCategory.update({
      where: { id: categoryId },
      data: { isActive: true },
    });

    return {
      outcome: "ACTIVATED" as const,
      data: updatedCategory,
    };
  });
}