-- CreateEnum
CREATE TYPE "AcademicCalendarType" AS ENUM ('SEMESTER', 'TERM');

-- CreateEnum
CREATE TYPE "AcademicPeriodType" AS ENUM ('SEMESTER', 'TERM');

-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLOSED');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calendar_type" "AcademicCalendarType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "AcademicPeriodType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_tenant_id_name_key" ON "academic_years"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "academic_years_tenant_id_idx" ON "academic_years"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_periods_academic_year_id_sequence_key" ON "academic_periods"("academic_year_id", "sequence");

-- CreateIndex
CREATE INDEX "academic_periods_tenant_id_idx" ON "academic_periods"("tenant_id");

-- AlterTable
ALTER TABLE "academic_results" ADD COLUMN "period_id" TEXT;

-- AlterTable
ALTER TABLE "academic_rosters" ADD COLUMN "period_id" TEXT;

-- Backfill: create a default academic year (TERM calendar) for every tenant that already has academic data
INSERT INTO "academic_years" ("id", "name", "calendar_type", "start_date", "end_date", "status", "is_current", "tenant_id", "created_at", "updated_at")
SELECT gen_random_uuid(), '2025/2026', 'TERM'::"AcademicCalendarType", '2025-09-01 00:00:00'::timestamp, '2026-06-30 00:00:00'::timestamp, 'ACTIVE'::"AcademicYearStatus", true, "t"."id", NOW(), NOW()
FROM "tenants" AS "t"
WHERE EXISTS (SELECT 1 FROM "academic_results" AS "r" WHERE "r"."tenant_id" = "t"."id")
   OR EXISTS (SELECT 1 FROM "academic_rosters" AS "ro" WHERE "ro"."tenant_id" = "t"."id");

-- Backfill: create 4 term periods for each year created above
INSERT INTO "academic_periods" ("id", "name", "sequence", "type", "start_date", "end_date", "academic_year_id", "tenant_id", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Term 1', 1, 'TERM'::"AcademicPeriodType", '2025-09-01 00:00:00'::timestamp, '2025-11-30 00:00:00'::timestamp, "y"."id", "y"."tenant_id", NOW(), NOW()
FROM "academic_years" AS "y"
UNION ALL
SELECT gen_random_uuid(), 'Term 2', 2, 'TERM'::"AcademicPeriodType", '2025-12-01 00:00:00'::timestamp, '2026-02-28 00:00:00'::timestamp, "y"."id", "y"."tenant_id", NOW(), NOW()
FROM "academic_years" AS "y"
UNION ALL
SELECT gen_random_uuid(), 'Term 3', 3, 'TERM'::"AcademicPeriodType", '2026-03-01 00:00:00'::timestamp, '2026-04-30 00:00:00'::timestamp, "y"."id", "y"."tenant_id", NOW(), NOW()
FROM "academic_years" AS "y"
UNION ALL
SELECT gen_random_uuid(), 'Term 4', 4, 'TERM'::"AcademicPeriodType", '2026-05-01 00:00:00'::timestamp, '2026-06-30 00:00:00'::timestamp, "y"."id", "y"."tenant_id", NOW(), NOW()
FROM "academic_years" AS "y";

-- Backfill: map existing free-text results to their period
UPDATE "academic_results" AS "r"
SET "period_id" = "p"."id"
FROM "academic_periods" AS "p"
WHERE "r"."period_id" IS NULL
  AND "p"."tenant_id" = "r"."tenant_id"
  AND "p"."sequence" = CASE
    WHEN "r"."term" ILIKE '%1%' THEN 1
    WHEN "r"."term" ILIKE '%2%' THEN 2
    WHEN "r"."term" ILIKE '%3%' THEN 3
    WHEN "r"."term" ILIKE '%4%' THEN 4
    ELSE 1
  END;

-- Backfill: map existing free-text rosters to their period
UPDATE "academic_rosters" AS "ro"
SET "period_id" = "p"."id"
FROM "academic_periods" AS "p"
WHERE "ro"."period_id" IS NULL
  AND "p"."tenant_id" = "ro"."tenant_id"
  AND "p"."sequence" = CASE
    WHEN "ro"."term" ILIKE '%1%' THEN 1
    WHEN "ro"."term" ILIKE '%2%' THEN 2
    WHEN "ro"."term" ILIKE '%3%' THEN 3
    WHEN "ro"."term" ILIKE '%4%' THEN 4
    ELSE 1
  END;

-- Drop legacy free-text columns (their indexes are dropped with them)
ALTER TABLE "academic_results" DROP COLUMN "term";

ALTER TABLE "academic_rosters" DROP COLUMN "term";
ALTER TABLE "academic_rosters" DROP COLUMN "year";

-- CreateIndex
CREATE INDEX "academic_results_section_id_subject_id_slot_id_period_id_idx" ON "academic_results"("section_id", "subject_id", "slot_id", "period_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_rosters_section_id_period_id_key" ON "academic_rosters"("section_id", "period_id");

-- AlterTable
ALTER TABLE "academic_results" ALTER COLUMN "period_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "academic_rosters" ALTER COLUMN "period_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_results" ADD CONSTRAINT "academic_results_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_rosters" ADD CONSTRAINT "academic_rosters_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
