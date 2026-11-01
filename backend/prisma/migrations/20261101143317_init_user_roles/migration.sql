-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('PERSONAL', 'UNIVERSITY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_type" "AuthType" NOT NULL DEFAULT 'UNIVERSITY';

-- Prevent duplicate active role assignments
CREATE UNIQUE INDEX "unique_active_user_role"
ON "user_role_assignments" ("user_id", "role_id")
WHERE "revoked_at" IS NULL;