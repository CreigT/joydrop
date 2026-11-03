-- v0.2.0: link a card to its signed-in sender so it can appear on their dashboard.
-- Additive only: one nullable column and one index. Existing rows and older app
-- versions are unaffected.
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "senderUid" TEXT;
CREATE INDEX IF NOT EXISTS "Card_senderUid_idx" ON "Card"("senderUid");
