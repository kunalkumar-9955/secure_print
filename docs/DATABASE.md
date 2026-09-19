# Database Architecture & Domain Models

SecurePrint uses **PostgreSQL 18** with **Prisma ORM**.

## 1. Domain Entities & Schema

### Primary Tables
- `Shop`: Multi-tenant organization account with permanent unique `slug`, contact details, and `status` (`PENDING_PAYMENT`, `ACTIVE`, `SUSPENDED`, `DISABLED`).
- `User`: Platform staff, shop owners, and super admins. Scoped by `shopId` for tenant users.
- `ShopMember`: Explicit many-to-many relationship linking shop staff users with granular permission overrides.
- `SubscriptionPlan`: SaaS plans (`STARTER`, `PRO`, `ENTERPRISE`) managed by Super Admin.
- `Subscription`: Active shop plan, start/end periods, renewal tracking.
- `SubscriptionPayment`: Audit record of SaaS subscription payments made to SecurePrint.
- `CustomerSession`: Anonymous customer session initiated via permanent QR scan. Scoped by `shopId`.
- `PrintJob`: Core print order. Tracks `jobCode`, `status`, `printOptionsJson`, `pricingSnapshotJson`, `printingCompleted`, and payment status.
- `PrintJobFile`: Private document records. Stores `storageKey`, size, mimeType, and deletion metadata (`isDeleted`, `deletedAt`).
- `Printer`: Windows print queues discovered dynamically by the Desktop Agent.
- `DesktopAgent`: Paired Windows host computers. Uses unique `installationId` to deduplicate reconnections.
- `PrintAttempt`: Records each physical spooling attempt sent to a specific printer with unique `attemptId`.
- `Payment`: Financial transaction records for customer print orders (Cashfree or Cash).
- `PaymentEvent`: Webhook event audit trail enforcing idempotency.
- `CleanupJob`: Records scheduled 10-second server-side file deletion workers.
- `Receipt`: Permanent printable metadata receipt preserved forever after file deletion.
- `ShopSettings`: Pricing rules matrix, operating hours, auto-print preferences.
- `AuditLog`: Immutable platform security log tracking actions, actors, and IP addresses.

---

## 2. Server-Side Tenant Isolation

Every tenant-scoped query must enforce `shopId` equality:
```prisma
const jobs = await prisma.printJob.findMany({
  where: { shopId: req.user.shopId }
});
```

The NestJS `ShopAccessGuard` intercepts every incoming request targeting `/api/v1/shops/:shopId/*` and validates that `req.user.shopId === param.shopId` unless the caller is authenticated with `UserRole.SUPER_ADMIN`.
