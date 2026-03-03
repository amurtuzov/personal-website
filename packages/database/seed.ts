
import { prismaClient } from './client';

async function main() {
  console.log('🌱 Starting database seeding...');

  const user = await prismaClient.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      // bcrypt hash for "ChangeMe123!"
      password: '$2b$10$hycfiqZeyHNG4oGGMfGmgu9IcgogZvXy53LGbRDFq9Id0gFbpfN3O',
      name: 'Admin User',
    },
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
