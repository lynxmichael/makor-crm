import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Rôles internes attendus par le CDC (§1.3, §3) : Super Admin, Admin
 * ventes, Superviseur, Commercial, Manager.
 */
const ROLES = [
  { name: 'SUPER_ADMIN', description: 'Administration système complète' },
  { name: 'ADMIN_VENTES', description: 'Pilotage commercial, campagnes et catalogue' },
  { name: 'SUPERVISEUR', description: "Supervision d'une équipe commerciale" },
  { name: 'COMMERCIAL', description: 'Gestion du portefeuille client assigné' },
  { name: 'MANAGER', description: 'Facturation et encaissements' },
] as const;

/** Un "module" de permission par grande fonction du CRM (CDC §3 :
 * "gestion fine des permissions par module"). */
const MODULES = [
  'users', 'settings', 'customers', 'leads', 'deals', 'pipeline',
  'activities', 'products', 'quotes', 'purchase_orders', 'contracts',
  'invoices', 'payments', 'recharges', 'sender_id', 'campaigns',
  'documents', 'objectives', 'dashboard', 'reporting', 'audit',
] as const;

/** Modules accessibles à chaque rôle (au-delà du Super Admin, qui a
 * tout). Sert de base de départ éditable ensuite depuis l'écran
 * "Rôles & permissions". */
const ROLE_MODULES: Record<string, readonly string[]> = {
  ADMIN_VENTES: MODULES.filter((m) => m !== 'users' && m !== 'audit'),
  SUPERVISEUR: [
    'customers', 'leads', 'deals', 'pipeline', 'activities', 'products',
    'quotes', 'purchase_orders', 'contracts', 'documents', 'objectives',
    'dashboard', 'reporting',
  ],
  COMMERCIAL: [
    'customers', 'leads', 'deals', 'pipeline', 'activities', 'products',
    'quotes', 'purchase_orders', 'contracts', 'documents', 'dashboard',
  ],
  MANAGER: [
    'customers', 'invoices', 'payments', 'recharges', 'documents',
    'dashboard', 'reporting',
  ],
};

const SECTORS = [
  'Télécommunications', 'Banque & Finance', 'Assurance', 'E-commerce',
  'Distribution & Grande consommation', 'Santé', 'Éducation',
  'ONG & Organisations internationales', 'Secteur public', 'Industrie',
];

const COUNTRIES: [string, string][] = [
  ["Côte d'Ivoire", 'CI'],
  ['Sénégal', 'SN'],
  ['Mali', 'ML'],
  ['Burkina Faso', 'BF'],
  ['Bénin', 'BJ'],
  ['Togo', 'TG'],
  ['Guinée', 'GN'],
];

const CURRENCIES: [string, string, boolean][] = [
  ['XOF', 'Franc CFA (BCEAO)', true],
  ['EUR', 'Euro', false],
  ['USD', 'Dollar américain', false],
];

/** Pipeline par défaut (CDC §4.6 : Prospect → RDV → Proposition → Bon
 * de commande → Contrat → Vente), modifiable ensuite par le Super Admin
 * depuis l'écran "Pipeline personnalisé". */
const PIPELINE_STAGES = [
  { name: 'Prospection', order: 1, color: '#94a3b8' },
  { name: 'RDV planifié', order: 2, color: '#60a5fa' },
  { name: 'Proposition envoyée', order: 3, color: '#818cf8' },
  { name: 'Négociation', order: 4, color: '#f59e0b' },
  { name: 'Bon de commande', order: 5, color: '#fb923c' },
  {
    name: 'Vente gagnée',
    order: 6,
    color: '#22c55e',
    isClosedWon: true,
    requiresSignedOrder: true,
  },
  { name: 'Perdu', order: 7, color: '#ef4444', isClosedLost: true },
];

const PRODUCTS = [
  { name: 'SMS Marketing', code: 'SMS-MKT', price: 15 },
  { name: 'SMS OTP', code: 'SMS-OTP', price: 12 },
  { name: 'API SMS', code: 'API-SMS', price: 10 },
  { name: 'WhatsApp Business', code: 'WA-BIZ', price: 20 },
  { name: 'Voice / IVR', code: 'VOICE', price: 25 },
  { name: 'Sender ID dédié', code: 'SENDER-ID', price: 50000 },
];

async function main() {
  console.log('Seeding...');

  // --- Paramètres système (CDC §4.5) ---
  const existingSettings = await prisma.organizationSettings.findFirst();

  if (!existingSettings) {
    await prisma.organizationSettings.create({
      data: {
        companyName: 'MAKOR Group Telecom',
        defaultCurrency: 'XOF',
        vatRate: 0.18,
      },
    });
  }

  for (const sector of SECTORS) {
    await prisma.sector.upsert({ where: { name: sector }, update: {}, create: { name: sector } });
  }

  for (const [name, code] of COUNTRIES) {
    await prisma.country.upsert({ where: { code }, update: {}, create: { name, code } });
  }

  for (const [code, name, isBase] of CURRENCIES) {
    await prisma.currency.upsert({ where: { code }, update: {}, create: { code, name, isBase } });
  }

  // --- Départements / équipes ---
  const departments = await Promise.all(
    ['Commercial', 'Technique', 'Finance'].map((name) =>
      prisma.department.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const [commercialDept] = departments;

  // --- Rôles ---
  const roles = new Map<string, string>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    roles.set(role.name, created.id);
  }

  // --- Permissions (une par module) + attribution par rôle ---
  const permissions = new Map<string, string>();
  for (const moduleName of MODULES) {
    const created = await prisma.permission.upsert({
      where: { code: `${moduleName}.manage` },
      update: {},
      create: {
        code: `${moduleName}.manage`,
        label: `Gérer le module ${moduleName}`,
        module: moduleName,
      },
    });
    permissions.set(moduleName, created.id);
  }

  // Super Admin : accès à tous les modules.
  for (const moduleName of MODULES) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles.get('SUPER_ADMIN')!,
          permissionId: permissions.get(moduleName)!,
        },
      },
      update: {},
      create: {
        roleId: roles.get('SUPER_ADMIN')!,
        permissionId: permissions.get(moduleName)!,
      },
    });
  }

  for (const [roleName, moduleNames] of Object.entries(ROLE_MODULES)) {
    for (const moduleName of moduleNames) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles.get(roleName)!,
            permissionId: permissions.get(moduleName)!,
          },
        },
        update: {},
        create: {
          roleId: roles.get(roleName)!,
          permissionId: permissions.get(moduleName)!,
        },
      });
    }
  }

  // --- Pipeline de vente par défaut ---
  for (const stage of PIPELINE_STAGES) {
    await prisma.pipelineStage.upsert({
      where: { name: stage.name },
      update: {},
      create: stage,
    });
  }

  // --- Catalogue produits ---
  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product,
    });
  }

  // --- Comptes de démonstration (un par rôle, mot de passe à changer
  // dès la première connexion) ---
  const defaultPassword = await argon2.hash(
    process.env.SEED_DEFAULT_PASSWORD ?? 'Makor@2026!',
  );

  const demoUsers = [
    { email: 'admin@makor.ci', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN' },
    { email: 'ventes@makor.ci', firstName: 'Admin', lastName: 'Ventes', role: 'ADMIN_VENTES' },
    { email: 'superviseur@makor.ci', firstName: 'Awa', lastName: 'Koné', role: 'SUPERVISEUR' },
    { email: 'commercial@makor.ci', firstName: 'Ibrahim', lastName: 'Traoré', role: 'COMMERCIAL' },
    { email: 'manager@makor.ci', firstName: 'Fatou', lastName: 'Diabaté', role: 'MANAGER' },
  ];

  for (const demo of demoUsers) {
    await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        firstName: demo.firstName,
        lastName: demo.lastName,
        email: demo.email,
        password: defaultPassword,
        role: { connect: { id: roles.get(demo.role)! } },
        department: { connect: { id: commercialDept.id } },
      },
    });
  }

  console.log('Seed terminé.');
  console.log(
    `Comptes créés (mot de passe par défaut : ${
      process.env.SEED_DEFAULT_PASSWORD ?? 'Makor@2026!'
    }) :`,
  );
  demoUsers.forEach((u) => console.log(`  - ${u.role.padEnd(14)} ${u.email}`));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
