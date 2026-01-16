-- Convert metadata column from text to jsonb
ALTER TABLE "oauth_client"
ALTER COLUMN "metadata" TYPE jsonb USING metadata::jsonb;
