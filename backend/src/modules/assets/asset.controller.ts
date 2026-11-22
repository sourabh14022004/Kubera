import { Request, Response } from "express";
import {
    AssetListStatus,
    checkoutAsset,
    getAllAssets,
    getAllLoans,
    getLoanSummary,
    getMemberLoanSummary,
    type LoanListStatus,
    registerAsset,
    returnAsset,
    updateLoanDueDate,
    getLoanById,
} from "./asset.service.js";
import { AssetStatus } from "../../generated/prisma/enums.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasPrismaErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code
    );
}

export async function registerAssetController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        // Validate request body
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body."
            })
            return;
        }

        const {
            componentId,
            assetTag,
            serialNumber,
            acquiredAt,
            notes,
        } = req.body;

        // 2. Validate component Id
        if (
            typeof componentId !== "string" ||
            !UUID_REGEX.test(componentId)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid component Id / A valid component id required. "
            })
            return;
        }

        // 3. Validate asset tag
        if (
            typeof assetTag !== "string" ||
            assetTag.trim().length === 0
        ) {
            res.status(400).json({
                success: false,
                message: "Asset tag is required."
            })
            return;
        }

        // 4. Validate optional fields
        if (
            serialNumber !== undefined &&
            (typeof serialNumber !== "string" ||
                serialNumber.trim().length === 0)
        ) {
            res.status(400).json({
                success: false,
                message: "Serial number must be a non-empty string.",
            });
            return;
        }

        if (
            acquiredAt !== undefined &&
            (typeof acquiredAt !== "string" ||
                Number.isNaN(Date.parse(acquiredAt)))
        ) {
            res.status(400).json({
                success: false,
                message: "Acquired date must be a valid date string.",
            });
            return;
        }

        if (notes !== undefined && typeof notes !== "string") {
            res.status(400).json({
                success: false,
                message: "Notes must be a string.",
            });
            return;
        }

        // 5. Get authenticated Kubera user
        const performedById = res.locals.KuberaUser.id;

        // 6. Register asset
        const result = await registerAsset({
            componentId,
            assetTag,
            serialNumber,
            acquiredAt: acquiredAt ? new Date(acquiredAt) : undefined,
            notes,
            performedById,
        });

        // 7. Handle service outcomes
        switch (result.outcome) {
            case "COMPONENT_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Component not found.",
                });
                return;

            case "COMPONENT_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot register assets under an inactive component.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(409).json({
                    success: false,
                    message: "Assets can only be registered for INDIVIDUAL components.",
                });
                return;

            case "REGISTERED":
                res.status(201).json({
                    success: true,
                    message: "Asset registered successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        if (hasPrismaErrorCode(error, "P2002")) {
            res.status(409).json({
                success: false,
                message: "Asset tag or serial number already exists.",
            });
            return;
        }

        console.error("Register asset error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function getAllAssetsController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const { search, componentId, status, page, limit } = req.query;

        // Validate query parameter types
        const queryValues = [search, componentId, status, page, limit];

        if (queryValues.some((value) =>
            value !== undefined && typeof value !== "string"
        )) {
            res.status(400).json({
                success: false,
                message: "Query parameters must be single string values.",
            });
            return;
        }

        // Validate component ID
        if (
            componentId !== undefined &&
            !UUID_REGEX.test(componentId as string)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid component ID.",
            });
            return;
        }

        // Validate status
        const selectedStatus = (status as string | undefined) ?? "ALL";

        if (
            selectedStatus !== "ALL" &&
            !Object.values(AssetStatus).includes(selectedStatus as AssetStatus)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid asset status.",
            });
            return;
        }

        // Validate pagination
        const selectedPage = page === undefined ? 1 : Number(page);
        const selectedLimit = limit === undefined ? 20 : Number(limit);

        if (
            !Number.isInteger(selectedPage) ||
            selectedPage < 1 ||
            !Number.isInteger(selectedLimit) ||
            selectedLimit < 1 ||
            selectedLimit > 100
        ) {
            res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100.",
            });
            return;
        }

        const result = await getAllAssets({
            search: search ? (search as string).trim() : undefined,
            componentId: componentId as string | undefined,
            status: selectedStatus as AssetListStatus,
            page: selectedPage,
            limit: selectedLimit,
        });

        res.status(200).json({
            success: true,
            message: "Assets retrieved successfully.",
            ...result,
        });
    } catch (error) {
        console.error("Get all assets error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function checkoutAssetController(
    req: Request<{ assetId: string }>,
    res: Response,
): Promise<void> {
    try {
        const { assetId } = req.params;

        // 1. Validate asset ID
        if (!UUID_REGEX.test(assetId)) {
            res.status(400).json({
                success: false,
                message: "Invalid asset ID.",
            });
            return;
        }

        // 2. Validate request body
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { memberId, dueAt, note } = req.body;

        // 3. Validate member ID
        if (
            typeof memberId !== "string" ||
            !UUID_REGEX.test(memberId)
        ) {
            res.status(400).json({
                success: false,
                message: "A valid member ID is required.",
            });
            return;
        }

        // 4. Validate optional due date
        if (
            dueAt !== undefined &&
            (
                typeof dueAt !== "string" ||
                Number.isNaN(Date.parse(dueAt)) ||
                Date.parse(dueAt) <= Date.now()
            )
        ) {
            res.status(400).json({
                success: false,
                message: "Due date must be a valid future date.",
            });
            return;
        }

        // 5. Validate optional note
        if (note !== undefined && typeof note !== "string") {
            res.status(400).json({
                success: false,
                message: "Note must be a string.",
            });
            return;
        }

        // 6. Get authenticated issuer
        const issuedById = res.locals.KuberaUser.id;

        // 7. Execute checkout
        const result = await checkoutAsset({
            assetId,
            memberId,
            issuedById,
            dueAt: dueAt ? new Date(dueAt) : undefined,
            note,
        });

        // 8. Handle service outcomes
        switch (result.outcome) {
            case "ASSET_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Asset not found.",
                });
                return;

            case "COMPONENT_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot checkout an asset under an inactive component.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(409).json({
                    success: false,
                    message: "This operation requires an INDIVIDUAL component.",
                });
                return;

            case "MEMBER_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Member not found.",
                });
                return;

            case "MEMBER_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot issue an asset to an inactive member.",
                });
                return;

            case "ASSET_NOT_AVAILABLE":
                res.status(409).json({
                    success: false,
                    message: "Asset is not currently available for checkout.",
                });
                return;

            case "CHECKED_OUT":
                res.status(201).json({
                    success: true,
                    message: "Asset checked out successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Checkout asset error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function returnAssetController(
    req: Request<{ assetId: string }>,
    res: Response,
): Promise<void> {
    try {
        // 1. Validate asset ID
        const { assetId } = req.params;

        if (!UUID_REGEX.test(assetId)) {
            res.status(400).json({
                success: false,
                message: "Invalid asset ID.",
            });
            return;
        }

        // 2. Validate optional request body
        const body = req.body ?? {};

        if (
            typeof body !== "object" ||
            body === null ||
            Array.isArray(body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { note } = body;

        if (note !== undefined && typeof note !== "string") {
            res.status(400).json({
                success: false,
                message: "Note must be a string.",
            });
            return;
        }

        // 3. Get authenticated user
        const returnedById = res.locals.KuberaUser.id;

        // 4. Execute return operation
        const result = await returnAsset({
            assetId,
            returnedById,
            note,
        });

        // 5. Handle service outcomes
        switch (result.outcome) {
            case "ASSET_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Asset not found.",
                });
                return;

            case "ASSET_NOT_CHECKED_OUT":
                res.status(409).json({
                    success: false,
                    message: "Asset is not currently checked out.",
                });
                return;

            case "ACTIVE_LOAN_NOT_FOUND":
                res.status(409).json({
                    success: false,
                    message: "No outstanding loan was found for this asset.",
                });
                return;

            case "RETURNED":
                res.status(200).json({
                    success: true,
                    message: "Asset returned successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Return asset error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function getAllLoansController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const {
            search,
            memberId,
            componentId,
            assetId,
            status,
            page,
            limit,
        } = req.query;

        // 1. Validate query parameter types
        const queryValues = [
            search,
            memberId,
            componentId,
            assetId,
            status,
            page,
            limit,
        ];

        if (
            queryValues.some(
                (value) =>
                    value !== undefined && typeof value !== "string",
            )
        ) {
            res.status(400).json({
                success: false,
                message: "Query parameters must be single string values.",
            });
            return;
        }

        // 2. Validate UUID filters
        for (const id of [memberId, componentId, assetId]) {
            if (id !== undefined && !UUID_REGEX.test(id as string)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid ID filter.",
                });
                return;
            }
        }

        // 3. Validate status
        const selectedStatus = (status as string | undefined) ?? "ALL";

        const allowedStatuses: LoanListStatus[] = [
            "ALL",
            "OUTSTANDING",
            "OVERDUE",
            "CLOSED",
        ];

        if (!allowedStatuses.includes(selectedStatus as LoanListStatus)) {
            res.status(400).json({
                success: false,
                message: "Invalid loan status.",
            });
            return;
        }

        // 4. Validate pagination
        const selectedPage = page === undefined ? 1 : Number(page);
        const selectedLimit = limit === undefined ? 20 : Number(limit);

        if (
            !Number.isInteger(selectedPage) ||
            selectedPage < 1 ||
            !Number.isInteger(selectedLimit) ||
            selectedLimit < 1 ||
            selectedLimit > 100
        ) {
            res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100.",
            });
            return;
        }

        // 5. Retrieve loans
        const result = await getAllLoans({
            search: search ? (search as string).trim() : undefined,
            memberId: memberId as string | undefined,
            componentId: componentId as string | undefined,
            assetId: assetId as string | undefined,
            status: selectedStatus as LoanListStatus,
            page: selectedPage,
            limit: selectedLimit,
        });

        res.status(200).json({
            success: true,
            message: "Loans retrieved successfully.",
            ...result,
        });
    } catch (error) {
        console.error("Get all loans error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function getMyLoansController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const { search, status, page, limit } = req.query;

        // 1. Validate query parameter types
        const queryValues = [search, status, page, limit];

        if (
            queryValues.some(
                (value) => value !== undefined && typeof value !== "string",
            )
        ) {
            res.status(400).json({
                success: false,
                message: "Query parameters must be single string values.",
            });
            return;
        }

        // 2. Validate status
        const selectedStatus = (status as string | undefined) ?? "ALL";

        const allowedStatuses: LoanListStatus[] = [
            "ALL",
            "OUTSTANDING",
            "OVERDUE",
            "CLOSED",
        ];

        if (!allowedStatuses.includes(selectedStatus as LoanListStatus)) {
            res.status(400).json({
                success: false,
                message: "Invalid loan status.",
            });
            return;
        }

        // 3. Validate pagination
        const selectedPage = page === undefined ? 1 : Number(page);
        const selectedLimit = limit === undefined ? 20 : Number(limit);

        if (
            !Number.isInteger(selectedPage) ||
            selectedPage < 1 ||
            !Number.isInteger(selectedLimit) ||
            selectedLimit < 1 ||
            selectedLimit > 100
        ) {
            res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100.",
            });
            return;
        }

        // 4. Get the authenticated user's internal Kubera ID
        const memberId = res.locals.KuberaUser.id;

        // 5. Retrieve only this member's loans
        const result = await getAllLoans({
            memberId,
            search: search ? (search as string).trim() : undefined,
            status: selectedStatus as LoanListStatus,
            page: selectedPage,
            limit: selectedLimit,
        });

        res.status(200).json({
            success: true,
            message: "Your borrowing history retrieved successfully.",
            ...result,
        });
    } catch (error) {
        console.error("Get my loans error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function getLoanSummaryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const summary = await getLoanSummary();

        res.status(200).json({
            success: true,
            message: "Loan summary retrieved successfully.",
            data: summary,
        })
    } catch (error) {
        console.error("Get loan summaty error:", error)

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        })
    }
}

export async function getMemberLoanSummaryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        // Get the authenticated member's internal Kubera ID
        const memberId = res.locals.KuberaUser.id;

        const result = await getMemberLoanSummary(memberId);

        if (!result) {
            res.status(404).json({
                success: false,
                message: "Member not found.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Member loan summary retrieved successfully.",
            data: result,
        });
    } catch (error) {
        console.error("Get member loan summary error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function updateLoanDueDateController(
    req: Request<{ loanId: string }>,
    res: Response,
): Promise<void> {
    try {
        // 1. Validate loan ID
        const { loanId } = req.params;

        if (!UUID_REGEX.test(loanId)) {
            res.status(400).json({
                success: false,
                message: "Invalid loan ID.",
            });
            return;
        }

        // 2. Validate request body
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { dueAt } = req.body;

        // 3. Validate due date
        if (
            typeof dueAt !== "string" ||
            Number.isNaN(Date.parse(dueAt)) ||
            Date.parse(dueAt) <= Date.now()
        ) {
            res.status(400).json({
                success: false,
                message: "Due date must be a valid future date.",
            });
            return;
        }

        // 4. Update due date
        const result = await updateLoanDueDate({
            loanId,
            dueAt: new Date(dueAt),
        });

        // 5. Handle service outcomes
        switch (result.outcome) {
            case "NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Loan not found.",
                });
                return;

            case "LOAN_CLOSED":
                res.status(409).json({
                    success: false,
                    message: "Cannot update the due date of a closed loan.",
                });
                return;

            case "INVALID_DUE_DATE":
                res.status(400).json({
                    success: false,
                    message: "Due date must be in the future.",
                });
                return;

            case "UPDATED":
                res.status(200).json({
                    success: true,
                    message: "Loan due date updated successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Update loan due date error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function getLoansByIdController(
    req: Request<{ loanId: string }>,
    res: Response,
): Promise<void> {
    try {

        // 1. Vlidate loan ID
        const { loanId } = req.params;

        if (!UUID_REGEX.test(loanId)) {
            res.status(400).json({
                success: false,
                message: "Invalid loan id."
            })
            return;
        }

        // 2. Retrive loan details
        const loan = await getLoanById(loanId);

        if (!loan) {
            res.status(404).json({
                success: false,
                message: "Loan not found."
            })
            return;
        }

        // 3. Check access permissions
        const currentUser = res.locals.KuberaUser;

        const managementRoles = [
            "SUPER_ADMIN",
            "ADMIN",
            "CLUB_PRESIDENT",
            "VICE_PRESIDENT",
        ];

        const canViewAllLoans = currentUser.roles.some(
            (role: string) => managementRoles.includes(role),
        );

        // Members can view only their own loans.
        if (!canViewAllLoans && loan.memberId !== currentUser.id) {
            res.status(404).json({
                success: false,
                message: "Loan not found.",
            });
            return;
        }

        // 4. Return loan details
        res.status(200).json({
            success: true,
            message: "Loan details retrieved successfully.",
            data: loan,
        });


    } catch (error) {
        console.log("Get loan details errro:", error)

        res.status(500).json({
            success: false,
            message: "Internal server error."
        })
    }

}