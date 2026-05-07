import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles: RoleName[] = [
    RoleName.CUSTOMER,
    RoleName.FREELANCER,
    RoleName.ARBITER,
  ];

  for (const roleName of roles) {
    // Upsert ile tekrar calistirmada duplicate olusmaz
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  console.log('Role seed completed');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
