import { PrismaClient, UserRole, ShopStatus, SubscriptionInterval, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding SecurePrint Database ---');

  const salt = await bcrypt.genSalt(10);
  const superAdminPassword = await bcrypt.hash('Admin@123456', salt);
  const shopOwnerPassword = await bcrypt.hash('ShopOwner@123', salt);

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@secureprint.io' },
    update: {},
    create: {
      email: 'admin@secureprint.io',
      passwordHash: superAdminPassword,
      name: 'SecurePrint Platform Admin',
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log('✔ Super Admin created:', superAdmin.email);

  // 2. SaaS Subscription Plans
  const plans = [
    {
      name: 'Starter Cyber Cafe',
      tier: 'STARTER',
      price: 499.0,
      interval: SubscriptionInterval.MONTHLY,
      features: ['Up to 2 Desktop Agents', 'Up to 2 Windows Printers', '1,000 Monthly Jobs', 'Automatic 10s Privacy Cleanup', 'Standard Dashboard'],
      limits: { maxAgents: 2, maxPrinters: 2, monthlyJobs: 1000 },
    },
    {
      name: 'Pro Document Center',
      tier: 'PRO',
      price: 999.0,
      interval: SubscriptionInterval.MONTHLY,
      features: ['Up to 5 Desktop Agents', 'Up to 5 Windows Printers', '5,000 Monthly Jobs', 'Priority Spooling', 'Realtime Queue Alerts', 'Custom Pricing Matrix'],
      limits: { maxAgents: 5, maxPrinters: 5, monthlyJobs: 5000 },
    },
    {
      name: 'Enterprise Print Counter',
      tier: 'ENTERPRISE',
      price: 2499.0,
      interval: SubscriptionInterval.MONTHLY,
      features: ['Unlimited Desktop Agents', 'Unlimited Windows Printers', 'Unlimited Monthly Jobs', 'Dedicated Support', 'Audit Log Export', 'Multi-Counter Cash Handling'],
      limits: { maxAgents: 999, maxPrinters: 999, monthlyJobs: 999999 },
    },
  ];

  const createdPlans = [];
  for (const p of plans) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { id: `plan-${p.tier.toLowerCase()}` },
      update: { price: p.price, name: p.name },
      create: {
        id: `plan-${p.tier.toLowerCase()}`,
        name: p.name,
        tier: p.tier,
        price: p.price,
        interval: p.interval,
        featuresJson: p.features,
        limitsJson: p.limits,
      },
    });
    createdPlans.push(plan);
    console.log(`✔ Plan created: ${plan.name} (₹${plan.price}/mo)`);
  }

  // 3. Demo Print Shop: "Apex Digital Prints"
  const defaultPricing = {
    ratePerBwPage: 2.0,
    ratePerColorPage: 10.0,
    rateA3Multiplier: 2.0,
    rateLegalMultiplier: 1.2,
    duplexDiscountPercent: 10,
    minimumOrderAmount: 2.0,
    currency: 'INR',
  };

  const shop = await prisma.shop.upsert({
    where: { slug: 'apex-digital' },
    update: {},
    create: {
      name: 'Apex Digital Prints',
      slug: 'apex-digital',
      address: 'Shop 14, Commercial Complex, MG Road, Bengaluru',
      phone: '+91 98765 43210',
      status: ShopStatus.ACTIVE,
      shopSettings: {
        create: {
          pricingRulesJson: defaultPricing,
          autoPrintEnabled: false,
          cashAccepted: true,
        },
      },
    },
  });

  const shopOwner = await prisma.user.upsert({
    where: { email: 'owner@apexdigital.com' },
    update: { shopId: shop.id },
    create: {
      email: 'owner@apexdigital.com',
      passwordHash: shopOwnerPassword,
      name: 'Rajesh Sharma',
      role: UserRole.SHOP_OWNER,
      shopId: shop.id,
    },
  });

  await prisma.shopMember.upsert({
    where: { shopId_userId: { shopId: shop.id, userId: shopOwner.id } },
    update: {},
    create: {
      shopId: shop.id,
      userId: shopOwner.id,
      role: UserRole.SHOP_OWNER,
    },
  });

  // Activate Pro Plan for demo shop
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const existingSub = await prisma.subscription.findFirst({
    where: { shopId: shop.id },
  });

  if (!existingSub) {
    const sub = await prisma.subscription.create({
      data: {
        shopId: shop.id,
        planId: createdPlans[1].id, // Pro
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      },
    });

    await prisma.subscriptionPayment.create({
      data: {
        shopId: shop.id,
        subscriptionId: sub.id,
        amount: createdPlans[1].price,
        currency: 'INR',
        provider: 'CASHFREE',
        providerRef: `SUB_INIT_${Date.now()}`,
        status: 'SUCCESS',
      },
    });
    console.log('✔ Initial Active Subscription linked to Apex Digital Prints');
  }

  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
