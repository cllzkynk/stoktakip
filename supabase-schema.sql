-- Stok Takip - Supabase Tablo Oluşturma SQL
-- Bunu Supabase SQL Editor'e yapıştır ve Run'a bas

-- CUID fonksiyonu
CREATE OR REPLACE FUNCTION cuid() RETURNS TEXT AS $$
BEGIN
  RETURN 'c' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24);
END;
$$ LANGUAGE plpgsql;

-- Tablolar
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" TEXT PRIMARY KEY,
  "checksum" TEXT NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SalesChannel" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "productNumber" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" TEXT,
  "purchasePrice" DOUBLE PRECISION NOT NULL,
  "purchaseDate" TIMESTAMPTZ NOT NULL,
  "color" TEXT,
  "model" TEXT,
  "size" TEXT,
  "condition" TEXT,
  "imageUrl" TEXT,
  "imageData" TEXT,
  "isListed" BOOLEAN NOT NULL DEFAULT false,
  "listedDate" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'in_stock',
  "purchasePaymentId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Sale" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "productId" TEXT NOT NULL UNIQUE,
  "salePrice" DOUBLE PRECISION NOT NULL,
  "saleDate" TIMESTAMPTZ NOT NULL,
  "salesChannelId" TEXT NOT NULL,
  "salePaymentId" TEXT NOT NULL,
  "buyerInfo" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "paymentMethodId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'savings',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProductExpense" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "productId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign Keys
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_purchasePaymentId_fkey" FOREIGN KEY ("purchasePaymentId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salePaymentId_fkey" FOREIGN KEY ("salePaymentId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductExpense" ADD CONSTRAINT "ProductExpense_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");
CREATE INDEX IF NOT EXISTS "Product_purchasePaymentId_idx" ON "Product"("purchasePaymentId");
CREATE INDEX IF NOT EXISTS "Sale_productId_idx" ON "Sale"("productId");
CREATE INDEX IF NOT EXISTS "Sale_salesChannelId_idx" ON "Sale"("salesChannelId");
CREATE INDEX IF NOT EXISTS "Sale_salePaymentId_idx" ON "Sale"("salePaymentId");
CREATE INDEX IF NOT EXISTS "Expense_paymentMethodId_idx" ON "Expense"("paymentMethodId");
CREATE INDEX IF NOT EXISTS "ProductExpense_productId_idx" ON "ProductExpense"("productId");

-- Seed data
INSERT INTO "PaymentMethod" ("id", "name", "isDefault", "initialBalance") VALUES
  ('pm_nakit', 'Nakit', true, 0),
  ('pm_wise', 'Wise', false, 0),
  ('pm_vinted_pm', 'Vinted', false, 0),
  ('pm_banka', 'Banka Hesabı', false, 0)
ON CONFLICT DO NOTHING;

INSERT INTO "SalesChannel" ("id", "name") VALUES
  ('sc_vinted', 'Vinted'),
  ('sc_tori', 'Tori'),
  ('sc_facebook', 'Facebook')
ON CONFLICT DO NOTHING;
