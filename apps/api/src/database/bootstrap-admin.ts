import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'admin@secureprint.io')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';

  console.log(`[Admin Bootstrap] Initializing Super Admin for: ${email}`);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      name: 'SecurePrint Platform Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`[Admin Bootstrap] Super Admin successfully configured (id: ${admin.id}, role: ${admin.role})`);
}

main()
  .catch((e) => {
    console.error('[Admin Bootstrap] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
