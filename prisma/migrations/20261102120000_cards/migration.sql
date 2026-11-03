-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "manageTokenHash" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "claimedByUid" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_token_key" ON "Card"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Card_manageTokenHash_key" ON "Card"("manageTokenHash");

-- CreateIndex
CREATE INDEX "Card_claimedByUid_idx" ON "Card"("claimedByUid");

