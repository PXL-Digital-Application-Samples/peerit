// Seed script for user-service: creates admin, teacher1, and student1 user profiles
// Run with: npx prisma db seed

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  // Users matching Keycloak realm configuration
  // Note: Keycloak v26 doesn't provide 'sub' field, so we use username as keycloakId
  const users = [
    {
      keycloakId: 'admin', // Using username as ID since sub is missing
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
    {
      keycloakId: 'student2',
      username: 'student2',
      email: 'student2@peerit.local',
      firstName: 'Sarah',
      lastName: 'Johnson',
      emailVerified: true,
      enabled: true,
    },
    {
      keycloakId: 'student3',
      username: 'student3',
      email: 'student3@peerit.local',
      firstName: 'Mike',
      lastName: 'Wilson',
      emailVerified: true,
      enabled: true,
    },
  ];

  // Create or update users
  for (const user of users) {
    const result = await prisma.userProfile.upsert({
      where: { username: user.username },
      update: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        enabled: user.enabled,
      },
      create: user,
    });
    console.log(`✅ Created/Updated user: ${result.username} (${result.email})`);
  }

  // Create sample teams
  const teams = [
    {
      id: 'team-1',
      name: 'Project Alpha',
      description: 'Working on the main product feature',
    },
    {
      id: 'team-2',
      name: 'Project Beta',
      description: 'Research and development team',
    },
  ];

  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: team,
      create: team,
    });
    console.log(`✅ Created/Updated team: ${team.name}`);
  }

  // Assign roles to users
  const roleAssignments = [
    { username: 'admin', role: 'admin' },
    { username: 'teacher1', role: 'teacher' },
    { username: 'student1', role: 'student' },
    { username: 'student2', role: 'student' },
    { username: 'student3', role: 'student' },
  ];

  for (const assignment of roleAssignments) {
    const user = await prisma.userProfile.findUnique({
      where: { username: assignment.username }
    });

    if (user) {
      await prisma.roleAssignment.upsert({
        where: {
          userProfileId_role: {
            userProfileId: user.id,
            role: assignment.role
          }
        },
        update: {
          isActive: true,
          assignedAt: new Date(),
        },
        create: {
          userProfileId: user.id,
          role: assignment.role,
          assignedBy: 'system',
          isActive: true,
        }
      });
      console.log(`✅ Assigned role ${assignment.role} to ${assignment.username}`);
    }
  }

  // Add some users to teams
  const teamMemberships = [
    { username: 'teacher1', teamId: 'team-1', role: 'leader' },
    { username: 'student1', teamId: 'team-1', role: 'member' },
    { username: 'student2', teamId: 'team-1', role: 'member' },
    { username: 'student3', teamId: 'team-2', role: 'member' },
  ];

  for (const membership of teamMemberships) {
    const user = await prisma.userProfile.findUnique({
      where: { username: membership.username }
    });

    if (user) {
      await prisma.teamMembership.upsert({
        where: {
          userProfileId_teamId: {
            userProfileId: user.id,
            teamId: membership.teamId
          }
        },
        update: {
          isActive: true,
          teamRole: membership.role,
        },
        create: {
          userProfileId: user.id,
          teamId: membership.teamId,
          teamRole: membership.role,
          addedBy: 'system',
          isActive: true,
        }
      });
      console.log(`✅ Added ${membership.username} to team ${membership.teamId} as ${membership.role}`);
    }
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });