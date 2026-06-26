-- Stok Takip Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "name" TEXT NOT NULL,
  "parentId" TEXT REFERENCES "Category"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SalesChannel" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "productNumber" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL,
  "purchasePrice" DOUBLE PRECISION NOT NULL,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "color" TEXT,
  "model" TEXT,
  "size" TEXT,
  "condition" TEXT,
  "imageUrl" TEXT,
  "imageData" TEXT,
  "isListed" BOOLEAN NOT NULL DEFAULT false,
  "listedDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'in_stock',
  "purchasePaymentId" TEXT NOT NULL REFERENCES "PaymentMethod"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Sale" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "productId" TEXT NOT NULL UNIQUE REFERENCES "Product"("id") ON DELETE CASCADE,
  "salePrice" DOUBLE PRECISION NOT NULL,
  "saleDate" TIMESTAMP(3) NOT NULL,
  "salesChannelId" TEXT NOT NULL REFERENCES "SalesChannel"("id"),
  "salePaymentId" TEXT NOT NULL REFERENCES "PaymentMethod"("id"),
  "buyerInfo" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "paymentMethodId" TEXT NOT NULL REFERENCES "PaymentMethod"("id"),
  "type" TEXT NOT NULL DEFAULT 'savings',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProductExpense" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Create cuid function for auto-generating IDs
CREATE OR REPLACE FUNCTION cuid() RETURNS TEXT AS $$
BEGIN
  RETURN 'c' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24);
END;
$$ LANGUAGE plpgsql;

-- Seed default data
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
