# SecurePrint Architecture Specification

## 1. System Overview

SecurePrint is engineered as a multi-tenant cloud-and-desktop printing platform connecting three distinct user actors:
1. **Walk-In Customers**: Scan permanent QR codes, upload documents, select options, track job status, and pay.
2. **Shopkeepers (Cyber Cafe / Photocopy Center Operators)**: Manage incoming queues, dispatch physical print attempts, confirm counter cash, and configure pricing matrices.
3. **Super Administrators**: Oversee multi-tenant shops, SaaS subscription plans, platform revenue, and system health.

---

## 2. Job State Machine

```
[REQUEST_SENT]
       │
       ▼
[SHOP_RECEIVED] ──────► [PRINT_FAILED]
       │                      │
       ▼                      ▼
   [PRINTING] ────────► (Retry Spool)
       │
       ▼
[PRINTING_COMPLETED]
       │
       ▼
[AWAITING_PAYMENT]
   ├──► Online Checkout (Cashfree) ──► [PAYMENT_PENDING] ──► [PAYMENT_SUCCESS]
   └──► Counter Cash Requested     ──► Operator Confirms ──► [PAYMENT_SUCCESS]
                                                                   │
                                                                   ▼
                                                            [CLEANUP_PENDING]
                                                                   │ (10s Server-Side Delay)
                                                                   ▼
                                                            [FILES_DELETED]
                                                                   │
                                                                   ▼
                                                             [JOB_CLOSED]
```

### Transition Enforcement Rules
- No illegal transitions permitted.
- `paymentStatus` cannot become `SUCCESS` without server-side verification.
- `printingCompleted` must be `true` before payment route `/job/:jobId/payment` becomes payable.
- `FILES_DELETED` cannot occur until verified payment.

---

## 3. Communication Protocols

| Channel | Source | Destination | Protocol | Purpose |
|---|---|---|---|---|
| Customer Browser | Cloud API | HTTPS REST | File uploads, session creation, review |
| Customer Browser | Cloud API | WebSockets (Socket.IO) | Real-time state timeline updates |
| Shop Browser | Cloud API | HTTPS REST | Queue mutations, cash confirmations, settings |
| Windows Desktop Agent | Cloud API | HTTPS REST | Pairing (6-digit code), heartbeats (15s), printer sync |
| Windows Desktop Agent | Windows OS | `System.Printing` | Native spooling via Windows Print Spooler |
| Payment Gateway | Cloud API | HTTPS Webhook | Cashfree asynchronous payment confirmations |
