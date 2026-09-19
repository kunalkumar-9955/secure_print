# SecurePrint 🖨️🔒

> **Zero-Retention Contactless Cloud & Native Windows Printing Multi-Tenant SaaS**  
> Designed for cyber cafes, photocopy centers, print counters, educational campuses, and corporate document shops.

---

## 1. Overview & Core Product Principles

SecurePrint turns any cyber cafe, photocopy center, or document shop into an instant, contactless print station without requiring walk-in customers to join the shop's local Wi-Fi network, pair Bluetooth, or install mobile apps.

### Key Architectural Pillars
- **One Permanent Shop QR Code**: Each shop has a permanent, unchanging public slug (`/s/:shopSlug`). The QR code contains strictly the shop URL—never customer IDs, job IDs, or temporary tokens.
- **Strict Multi-Tenancy & Tenant Isolation**: Every shop is a tenant. All records (`print_jobs`, `files`, `payments`, `printers`, `desktop_agents`) are scoped by `shopId` with server-side database and API guard enforcement.
- **Native Windows Print Agent (.NET 10 LTS WPF)**: Real physical Windows Print Spooler integration (`System.Printing`). Direct spooling without browser `window.print()` workarounds.
- **Provider-Agnostic Payment Engine**: Abstracted `PaymentService` with native `CashfreeProvider`. Enforces HMAC-SHA256 signature verification, server-side status confirmation, idempotency, and counter cash handling.
- **Absolute Rule: No Payment Before Printing Completed**: Backend guards strictly block payment order creation until the shop completes physical printing.
- **Automated 10-Second Server-Side Privacy Shredder**: Exactly 10 seconds after verified payment success, background workers permanently wipe original documents from private storage, invalidate signed access, and update status to `FILES_DELETED`.
- **Independent Metadata Receipts**: Permanent receipts generated strictly from database metadata—guaranteed accessible forever after original files are destroyed.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Web Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query |
| **Backend API** | NestJS, TypeScript, Modular Architecture, Passport JWT |
| **Database & ORM** | PostgreSQL 18, Prisma ORM |
| **Realtime & Queue** | WebSockets (Socket.IO), Delayed Timer Workers |
| **Storage Subsystem** | Private Object Storage with pre-signed temporary streaming URLs |
| **Payment Gateway** | Cashfree (HMAC-SHA256 webhook signatures, server-to-server verification) |
| **Desktop Agent** | C#, .NET 10 LTS, WPF, Native `System.Printing.LocalPrintServer` |

---

## 3. Monorepo Structure

```
SecurePrint/
├── apps/
│   ├── web/                     # Next.js 15 App Router Frontend
│   │   ├── src/app/
│   │   │   ├── s/[shopSlug]/    # Customer shop landing & session initialization
│   │   │   ├── job/[jobId]/     # Multi-step flow: /upload, /options, /review, /status, /payment, /success, /receipt
│   │   │   ├── admin/           # Shopkeeper console: /print-queue, /printers, /agents, /qr, /subscription, /settings
│   │   │   ├── super-admin/     # Platform admin: /shops, /plans, /audit-logs, /system-health
│   │   │   └── login/           # Unified sign-in with quick credential presets
│   ├── api/                     # NestJS Modular Backend
│   │   ├── src/
│   │   │   ├── modules/         # auth, shops, subscriptions, customers, jobs, storage, pricing, agents, printers, payments, cleanup, receipts, analytics, audit, health
│   │   │   ├── common/          # Guards, Filters, Decorators, Interceptors
│   │   │   └── database/        # PrismaService & seed script
│   │   ├── prisma/
│   │   │   └── schema.prisma    # 18+ multi-tenant models
│   │   └── test/                # Unit, integration, and E2E acceptance test suite
│   └── print-agent/             # C# .NET 10 LTS WPF Desktop Application
│       └── SecurePrint.Agent/   # SpoolerService, AgentClient, MVVM ViewModels, MainWindow
├── packages/
│   ├── shared-types/            # Shared Enums, DTOs, State Machine rules
│   ├── validation/              # Zod validation schemas
│   └── config/                  # Environment schemas & defaults
└── docs/                        # Complete technical documentation suite
```

---

## 4. Quickstart Guide

### Prerequisites
- Node.js 20+ (Node v24 recommended)
- PostgreSQL 18+ running on `localhost:5432`
- .NET 10 SDK (`dotnet --version`)

### 1. Install Dependencies & Build Packages
```bash
npm install
npm run build:packages
```

### 2. Database Setup & Migration
```bash
# In apps/api
cd apps/api
npx prisma generate
npx prisma db push
npx ts-node src/database/seed.ts
```

### 3. Run Development Servers
```bash
# Terminal 1: Start Backend API (Port 4000)
cd apps/api
npm run start:dev

# Terminal 2: Start Web Frontend (Port 3000)
cd apps/web
npm run dev

# Terminal 3: Build & Launch Native Windows Print Agent (.NET 10 WPF)
cd apps/print-agent/SecurePrint.Agent
dotnet run
```

---

## 5. Default Credentials

- **Super Admin**: `admin@secureprint.io` / `Admin@123456`
- **Shop Owner (Apex Digital Prints)**: `owner@apexdigital.com` / `ShopOwner@123`
- **Customer Storefront**: `http://localhost:3000/s/apex-digital`
- **Shop Dashboard**: `http://localhost:3000/admin`
- **Super Admin Console**: `http://localhost:3000/super-admin`

---

## 6. Automated Testing

```bash
# Run unit & cryptographic verification tests
cd apps/api
npx jest --config jest.config.js test/pricing.spec.ts test/state-machine.spec.ts test/cashfree-webhook.spec.ts

# Run end-to-end full 15-step acceptance journey test
npx jest --config jest.config.js test/e2e-journey.spec.ts
```

---

## 7. Documentation Suite

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System architecture and state machine specifications
- [`docs/DATABASE.md`](docs/DATABASE.md) - Schema reference, tenant isolation, and indexing strategy
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md) - Cashfree provider integration, webhooks, and counter cash
- [`docs/PRINT-AGENT.md`](docs/PRINT-AGENT.md) - Windows Print Agent pairing protocol and spooling architecture
- [`docs/SECURITY.md`](docs/SECURITY.md) - Threat models, privacy shredder, and RBAC policies
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - Production Docker deployment and SSL configuration
- [`docs/TESTING.md`](docs/TESTING.md) - Comprehensive automated test suite reference
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) - Operational runbooks and diagnostics
