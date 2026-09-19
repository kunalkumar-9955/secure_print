# Automated Testing Suite & QA Validation

SecurePrint features comprehensive automated unit, integration, cryptographic, and end-to-end acceptance tests.

---

## 1. Test Architecture

| Suite | File | Coverage |
|---|---|---|
| **Pricing Engine** | `apps/api/test/pricing.spec.ts` | B&W, Color, A3/Legal multipliers, duplex discounts, minimum order threshold |
| **State Machine** | `apps/api/test/state-machine.spec.ts` | Sequential transitions, blocking illegal transitions |
| **Webhook Security** | `apps/api/test/cashfree-webhook.spec.ts` | Cryptographic HMAC-SHA256 signature verification, body tampering detection |
| **E2E Acceptance** | `apps/api/test/e2e-journey.spec.ts` | Full 15-step end-to-end customer and shopkeeper lifecycle with 10s cleanup |

---

## 2. Executing Automated Tests

```bash
# Run unit & cryptographic tests
cd apps/api
npx jest --config jest.config.js test/pricing.spec.ts test/state-machine.spec.ts test/cashfree-webhook.spec.ts

# Run E2E Acceptance Journey
npx jest --config jest.config.js test/e2e-journey.spec.ts
```

---

## 3. Responsive UI Browser Viewport Matrix

All routes have been verified across the following viewports without layout distortion or horizontal scroll:
- `320px` (Ultra-compact mobile)
- `360px` (Standard Android)
- `375px` (iPhone SE / Standard iOS)
- `390px` (iPhone 13/14/15)
- `414px` (Plus-sized mobile)
- `430px` (Pro Max mobile)
- `768px` (iPad / Tablet)
- `1024px` (Desktop / Tablet Landscape)
- `1280px` (Standard Laptop)
- `1440px` (High-res Desktop)
- `1920px` (Full HD Display)
