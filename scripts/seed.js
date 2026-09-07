// Seed script - run directly to populate Neon database
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_2s7ypxcZTvdL@ep-twilight-thunder-a2hy1u4g-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
process.env.APP_PASSWORD = process.env.APP_PASSWORD || 'Kumluca.74'
process.env.APP_PASSWORD_SALT = process.env.APP_PASSWORD_SALT || 'stok-takip-salt-2024'
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const db = new PrismaClient()

function hashPassword(password) {
  const salt = process.env.APP_PASSWORD_SALT || 'stok-takip-salt-2024'
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

async function main() {
  console.log('🌱 Seeding database...')

  // Payment methods
  const pmCount = await db.paymentMethod.count()
  if (pmCount === 0) {
    await db.paymentMethod.createMany({
      data: [
        { name: 'Nakit', isDefault: true },
        { name: 'Wise' },
        { name: 'Vinted' },
        { name: 'Banka Hesabı' },
      ],
    })
    console.log('✅ Payment methods created')
  } else {
    console.log(`⏭️  Payment methods already exist (${pmCount})`)
  }

  // Sales channels
  const scCount = await db.salesChannel.count()
  if (scCount === 0) {
    await db.salesChannel.createMany({
      data: [
        { name: 'Vinted' },
        { name: 'Tori' },
        { name: 'Facebook' },
      ],
    })
    console.log('✅ Sales channels created')
  } else {
    console.log(`⏭️  Sales channels already exist (${scCount})`)
  }

  // Admin user
  const userCount = await db.user.count()
  if (userCount === 0) {
    const appPassword = process.env.APP_PASSWORD || 'admin123'
    await db.user.create({
      data: {
        username: 'admin',
        passwordHash: hashPassword(appPassword),
        displayName: 'Yönetici',
        role: 'admin',
      },
    })
    console.log('✅ Admin user created')
    console.log(`   Username: admin`)
    console.log(`   Password: ${appPassword}`)
  } else {
    console.log(`⏭️  Users already exist (${userCount})`)
  }

  console.log('\n🎉 Seed completed!')
  await db.$disconnect()
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  db.$disconnect()
  process.exit(1)
})
