# Security & Privacy Architecture

## 1. Zero-Retention Document Shredder

SecurePrint enforces an automated 10-second server-side privacy cleanup:
1. When customer payment becomes verified `SUCCESS`, a background worker timer is set for 10,000ms.
2. The worker re-verifies that payment is settled before taking destructive action.
3. The worker invokes `storageService.deleteFile(storageKey)`, permanently unlinking and removing the object from disk/S3 storage.
4. The database record `PrintJobFile.isDeleted` is set to `true`, and `deletedAt` is timestamped.
5. `PrintJob.status` transitions to `FILES_DELETED`.
6. Subsequent attempts to download or stream the document receive an explicit `410 Gone: Document deleted according to privacy policy`.
7. Receipts remain permanently accessible because they are constructed entirely from database metadata.

---

## 2. Access Control & Authorization Matrix

| Actor | Public Routes | Customer Flow | Shop Console (`/admin`) | Super Admin (`/super-admin`) |
|---|---|---|---|---|
| **Anonymous Customer** | Allowed | Scoped by `sessionId` | Denied | Denied |
| **Shop Staff** | Allowed | Allowed | Operations Only | Denied |
| **Shop Owner** | Allowed | Allowed | Full Shop + Settings + Billing | Denied |
| **Super Admin** | Allowed | Allowed | Full Platform | Full Platform |

### Tenant Isolation Guarantee
Every tenant query enforces `where: { shopId: user.shopId }`. Tampering with URL parameters (e.g. attempting to query `/api/v1/shops/{otherShopId}/payments`) results in an immediate `403 Forbidden: Tenant isolation violation`.
