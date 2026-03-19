DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LendStatus') THEN
        CREATE TYPE "LendStatus" AS ENUM ('OPEN', 'CLOSED');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Lend" (
        "id" TEXT NOT NULL,
        "friendName" TEXT NOT NULL,
        "friendContact" TEXT,
        "principalAmount" DOUBLE PRECISION NOT NULL,
        "lentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "note" TEXT,
        "status" "LendStatus" NOT NULL DEFAULT 'OPEN',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT NOT NULL,
        CONSTRAINT "Lend_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LendReturn" (
        "id" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lendId" TEXT NOT NULL,
        CONSTRAINT "LendReturn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Lend_userId_idx" ON "Lend"("userId");
CREATE INDEX IF NOT EXISTS "Lend_lentAt_idx" ON "Lend"("lentAt");
CREATE INDEX IF NOT EXISTS "Lend_status_idx" ON "Lend"("status");
CREATE INDEX IF NOT EXISTS "LendReturn_lendId_idx" ON "LendReturn"("lendId");
CREATE INDEX IF NOT EXISTS "LendReturn_returnedAt_idx" ON "LendReturn"("returnedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Lend_userId_fkey'
    ) THEN
        ALTER TABLE "Lend"
            ADD CONSTRAINT "Lend_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LendReturn_lendId_fkey'
    ) THEN
        ALTER TABLE "LendReturn"
            ADD CONSTRAINT "LendReturn_lendId_fkey"
            FOREIGN KEY ("lendId") REFERENCES "Lend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
