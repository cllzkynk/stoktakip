-- Kullanıcı ve Aktivite Log Tabloları
-- Bunu Supabase SQL Editor'e yapıştır ve Run'a bas

-- CUID fonksiyonu (yoksa oluşturur)
CREATE OR REPLACE FUNCTION cuid() RETURNS TEXT AS $$
BEGIN
  RETURN 'c' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24);
END;
$$ LANGUAGE plpgsql;

-- Kullanıcı tablosu
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktivite log tablosu
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- 'product_create', 'product_update', 'product_delete', 'sale_create', 'sale_delete', 'expense_create', 'expense_delete', 'user_create', 'user_update', 'user_delete', 'login', 'login_failed'
  "details" TEXT, -- JSON string with details
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign keys
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- Varsayılan admin kullanıcısı
-- Şifre: Kumluca.74 -> SHA-256 hash
-- NOT: Bu hash'i API üzerinden oluşturacağız, şimdilik placeholder
INSERT INTO "User" ("id", "username", "passwordHash", "displayName", "role")
VALUES ('user_admin', 'admin', 'PLACEHOLDER_UPDATE_VIA_API', 'Yönetici', 'admin')
ON CONFLICT DO NOTHING;
