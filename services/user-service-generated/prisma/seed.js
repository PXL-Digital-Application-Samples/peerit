// Seed script for user-service-generated: creates admin, teacher1, and student1 user profiles
// Run with: npx ts-node prisma/seed.ts (or npx node prisma/seed.js if using JS)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Keycloak user info from realm-config/peerit-realm.json
  const users = [
    {
      keycloakId: 'admin', // You may want to use the Keycloak UUID (sub claim) if available
      username: 'admin',
      email: 'admin@peerit.local',
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      enabled: true,
    },
    {
      keycloakId: 'teacher1',
      username: 'teacher1',
      email: 'teacher1@peerit.local',
      firstName: 'Jane',
      lastName: 'Smith',
      emailVerified: true,
      enabled: true,
    },
    {
      keycloakId: 'student1',
      username: 'student1',
      email: 'student1@peerit.local',
      firstName: 'John',
      lastName: 'Doe',
      emailVerified: true,
      enabled: true,
    },
  ];

  for (const user of users) {
    await prisma.userProfile.upsert({
      where: { username: user.username },
      update: user,
      create: user,
    });
  }

  console.log('Seeded user profiles: admin, teacher1, student1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
