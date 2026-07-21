import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  // Départements
  const commercial = await prisma.department.upsert({
    where: { name: 'Commercial' },
    update: {},
    create: {
      name: 'Commercial',
    },
  });

  const technique = await prisma.department.upsert({
    where: { name: 'Technique' },
    update: {},
    create: {
      name: 'Technique',
    },
  });

  const finance = await prisma.department.upsert({
    where: { name: 'Finance' },
    update: {},
    create: {
      name: 'Finance',
    },
  });

  // Rôles
  const superAdmin = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Administrateur système',
    },
  });

  await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
    },
  });

  await prisma.role.upsert({
    where: { name: 'COMMERCIAL' },
    update: {},
    create: {
      name: 'COMMERCIAL',
    },
  });

  // Mot de passe
  const password = await argon2.hash('Admin@2026');

  // Utilisateur administrateur
  await prisma.user.upsert({
    where: {
      email: 'admin@makor.com',
    },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@makor.com',
      password,
      role: {
        connect: {
          id: superAdmin.id,
        },
      },
      department: {
        connect: {
          id: commercial.id,
        },
      },
    },
  });

  console.log('Seed terminé.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });