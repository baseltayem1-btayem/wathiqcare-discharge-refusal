-- Add bilingual and review-tracking fields to clinical_knowledge_illustrations
-- and extend the image_review_status enum for ChatGPT-generated draft assets.

-- Enum values for generated ChatGPT drafts and pending clinical review.
ALTER TYPE "public"."ClinicalKnowledgeIllustrationStatus" ADD VALUE IF NOT EXISTS 'generated_by_chatgpt_draft';
ALTER TYPE "public"."ClinicalKnowledgeIllustrationStatus" ADD VALUE IF NOT EXISTS 'pending_clinical_review';

-- New columns to support separate base/EN/AR image URLs, label metadata,
-- language direction, production/integration tracking, and Arabic review status.
ALTER TABLE "public"."clinical_knowledge_illustrations"
  ADD COLUMN IF NOT EXISTS "image_base_url" TEXT,
  ADD COLUMN IF NOT EXISTS "image_en_url" TEXT,
  ADD COLUMN IF NOT EXISTS "image_ar_url" TEXT,
  ADD COLUMN IF NOT EXISTS "labels_en" JSONB,
  ADD COLUMN IF NOT EXISTS "labels_ar" JSONB,
  ADD COLUMN IF NOT EXISTS "language_direction" TEXT,
  ADD COLUMN IF NOT EXISTS "production_status" TEXT,
  ADD COLUMN IF NOT EXISTS "integration_status" TEXT,
  ADD COLUMN IF NOT EXISTS "arabic_review_status" TEXT;
