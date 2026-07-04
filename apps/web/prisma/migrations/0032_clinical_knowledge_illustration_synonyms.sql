-- Clinical Knowledge Illustrations — Add synonym/alias support
-- Adds a text-array synonyms column so equivalent procedure names can
-- resolve to the same approved educational illustration.

ALTER TABLE "clinical_knowledge_illustrations"
  ADD COLUMN "synonyms" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX "idx_clinical_knowledge_illustrations_synonyms"
  ON "clinical_knowledge_illustrations" USING GIN ("synonyms");
