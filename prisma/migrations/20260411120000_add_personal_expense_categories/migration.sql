-- CreateTable
CREATE TABLE "PersonalExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏷️',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PersonalExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalExpenseCategory_userId_idx" ON "PersonalExpenseCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalExpenseCategory_userId_slug_key" ON "PersonalExpenseCategory"("userId", "slug");

-- AddForeignKey
ALTER TABLE "PersonalExpenseCategory" ADD CONSTRAINT "PersonalExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
