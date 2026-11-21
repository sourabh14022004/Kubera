-- CreateEnum
CREATE TYPE "StorageRackStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- AlterTable
ALTER TABLE "storage_racks" ADD COLUMN     "retired_at" TIMESTAMPTZ(6),
ADD COLUMN     "status" "StorageRackStatus" NOT NULL DEFAULT 'ACTIVE';
