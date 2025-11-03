import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - comment out if you want to keep existing data)
  await prisma.user.deleteMany();
  console.log('✅ Cleaned existing data');

  // Create test users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@eventhub.com',
      password: '$2b$10$YourHashedPasswordHere', // This should be hashed with bcrypt in production
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  const organizerUser = await prisma.user.create({
    data: {
      name: 'John Organizer',
      email: 'organizer@eventhub.com',
      password: '$2b$10$YourHashedPasswordHere',
      role: UserRole.ORGANIZER,
      companyName: 'EventCo Inc',
      phone: '+1234567890',
      emailVerified: true,
      isActive: true,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      name: 'Jane Doe',
      email: 'user@eventhub.com',
      password: '$2b$10$YourHashedPasswordHere',
      role: UserRole.USER,
      phone: '+1987654321',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Created test users:');
  console.log(`   Admin: ${adminUser.email}`);
  console.log(`   Organizer: ${organizerUser.email}`);
  console.log(`   User: ${regularUser.email}`);
  
  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
