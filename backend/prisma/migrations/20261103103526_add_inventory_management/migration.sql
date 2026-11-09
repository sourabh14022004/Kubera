/*
  Warnings:

  - You are about to drop the column `google_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[neon_auth_user_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StorageColor" AS ENUM ('GREEN', 'BLACK', 'ORANGE');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('BULK', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'CHECKED_OUT', 'UNDER_MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'CHECKOUT', 'RETURN', 'ADJUSTMENT', 'MARK_DAMAGED', 'MARK_LOST', 'RETIRE');

-- DropIndex
DROP INDEX "users_google_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "google_id",
ADD COLUMN     "neon_auth_user_id" TEXT;

-- CreateTable
CREATE TABLE "component_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "component_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_racks" (
    "id" UUID NOT NULL,
    "color" "StorageColor" NOT NULL,
    "drawers_per_rack" INTEGER NOT NULL,
    "rack_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "storage_racks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_drawers" (
    "id" UUID NOT NULL,
    "rack_id" UUID NOT NULL,
    "drawer_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "storage_drawers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "tracking_type" "TrackingType" NOT NULL,
    "quantity_available" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "minimum_stock" INTEGER NOT NULL DEFAULT 0,
    "storage_drawer_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "serial_number" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "checked_out_to_id" UUID,
    "checked_out_at" TIMESTAMPTZ(6),
    "acquired_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "asset_id" UUID,
    "movement_type" "InventoryMovementType" NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "performed_by_id" UUID NOT NULL,
    "member_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loan_id" UUID,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_loans" (
    "id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "asset_id" UUID,
    "member_id" UUID NOT NULL,
    "issued_by_id" UUID NOT NULL,
    "quantity_borrowed" INTEGER NOT NULL,
    "quantity_returned" INTEGER NOT NULL DEFAULT 0,
    "quantity_written_off" INTEGER NOT NULL DEFAULT 0,
    "checked_out_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "component_categories_name_key" ON "component_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "storage_racks_color_drawers_per_rack_rack_number_key" ON "storage_racks"("color", "drawers_per_rack", "rack_number");

-- CreateIndex
CREATE UNIQUE INDEX "storage_drawers_rack_id_drawer_number_key" ON "storage_drawers"("rack_id", "drawer_number");

-- CreateIndex
CREATE UNIQUE INDEX "components_code_key" ON "components"("code");

-- CreateIndex
CREATE INDEX "components_category_id_idx" ON "components"("category_id");

-- CreateIndex
CREATE INDEX "components_storage_drawer_id_idx" ON "components"("storage_drawer_id");

-- CreateIndex
CREATE INDEX "components_name_idx" ON "components"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serial_number_key" ON "assets"("serial_number");

-- CreateIndex
CREATE INDEX "assets_component_id_status_idx" ON "assets"("component_id", "status");

-- CreateIndex
CREATE INDEX "assets_checked_out_to_id_idx" ON "assets"("checked_out_to_id");

-- CreateIndex
CREATE INDEX "inventory_movements_component_id_created_at_idx" ON "inventory_movements"("component_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_asset_id_created_at_idx" ON "inventory_movements"("asset_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_performed_by_id_created_at_idx" ON "inventory_movements"("performed_by_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_member_id_created_at_idx" ON "inventory_movements"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_loans_component_id_idx" ON "inventory_loans"("component_id");

-- CreateIndex
CREATE INDEX "inventory_loans_member_id_idx" ON "inventory_loans"("member_id");

-- CreateIndex
CREATE INDEX "inventory_loans_issued_by_id_idx" ON "inventory_loans"("issued_by_id");

-- CreateIndex
CREATE INDEX "inventory_loans_asset_id_idx" ON "inventory_loans"("asset_id");

-- CreateIndex
CREATE INDEX "inventory_loans_due_at_idx" ON "inventory_loans"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_neon_auth_user_id_key" ON "users"("neon_auth_user_id");

-- AddForeignKey
ALTER TABLE "storage_drawers" ADD CONSTRAINT "storage_drawers_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "storage_racks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "component_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_storage_drawer_id_fkey" FOREIGN KEY ("storage_drawer_id") REFERENCES "storage_drawers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_checked_out_to_id_fkey" FOREIGN KEY ("checked_out_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "inventory_loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================
-- INVENTORY DATA INTEGRITY CONSTRAINTS
-- ============================================

-- Storage rack validation
ALTER TABLE "storage_racks"
ADD CONSTRAINT "storage_racks_positive_dimensions_check"
CHECK (
    "drawers_per_rack" > 0
    AND "rack_number" > 0
);

-- Storage drawer validation
ALTER TABLE "storage_drawers"
ADD CONSTRAINT "storage_drawers_positive_number_check"
CHECK ("drawer_number" > 0);

-- Component stock validation
ALTER TABLE "components"
ADD CONSTRAINT "components_minimum_stock_check"
CHECK ("minimum_stock" >= 0);

-- Bulk components must have a non-negative available quantity.
-- Individual components must not use a bulk quantity.
ALTER TABLE "components"
ADD CONSTRAINT "components_tracking_quantity_check"
CHECK (
    (
        "tracking_type" = 'BULK'
        AND "quantity_available" IS NOT NULL
        AND "quantity_available" >= 0
    )
    OR
    (
        "tracking_type" = 'INDIVIDUAL'
        AND "quantity_available" IS NULL
    )
);

-- Asset checkout consistency
ALTER TABLE "assets"
ADD CONSTRAINT "assets_checkout_consistency_check"
CHECK (
    (
        "status" = 'CHECKED_OUT'
        AND "checked_out_to_id" IS NOT NULL
        AND "checked_out_at" IS NOT NULL
    )
    OR
    (
        "status" <> 'CHECKED_OUT'
        AND "checked_out_to_id" IS NULL
        AND "checked_out_at" IS NULL
    )
);

-- Loan quantity validation
ALTER TABLE "inventory_loans"
ADD CONSTRAINT "inventory_loans_quantity_check"
CHECK (
    "quantity_borrowed" > 0
    AND "quantity_returned" >= 0
    AND "quantity_written_off" >= 0
    AND (
        "quantity_returned" + "quantity_written_off"
    ) <= "quantity_borrowed"
);

-- A loan must either represent:
-- 1. A bulk component quantity, without an asset ID.
-- 2. One individual asset, with an asset ID.
ALTER TABLE "inventory_loans"
ADD CONSTRAINT "inventory_loans_asset_quantity_check"
CHECK (
    (
        "asset_id" IS NULL
        AND "quantity_borrowed" > 0
    )
    OR
    (
        "asset_id" IS NOT NULL
        AND "quantity_borrowed" = 1
    )
);

-- Prevent two simultaneously open loans for the same individual asset.
CREATE UNIQUE INDEX "inventory_loans_one_open_loan_per_asset_key"
ON "inventory_loans" ("asset_id")
WHERE
    "asset_id" IS NOT NULL
    AND (
        "quantity_returned" + "quantity_written_off"
    ) < "quantity_borrowed";

-- ============================================
-- INVENTORY MOVEMENT VALIDATION
-- ============================================

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_quantity_sign_check"
CHECK (
    "quantity_change" <> 0
    AND (
        ("movement_type" = 'STOCK_IN' AND "quantity_change" > 0)
        OR ("movement_type" = 'CHECKOUT' AND "quantity_change" < 0)
        OR ("movement_type" = 'RETURN' AND "quantity_change" > 0)
        OR ("movement_type" = 'MARK_DAMAGED' AND "quantity_change" < 0)
        OR ("movement_type" = 'MARK_LOST' AND "quantity_change" < 0)
        OR ("movement_type" = 'RETIRE' AND "quantity_change" < 0)
        OR ("movement_type" = 'ADJUSTMENT')
    )
);