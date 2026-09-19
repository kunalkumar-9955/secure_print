# Operational Troubleshooting Runbook

## 1. Printer Disconnected / Offline

### Symptoms
- Printer appears as `OFFLINE` in `/admin/printers`.
- Test print fails with `"No connected SecurePrint Print Agent is available."`

### Diagnostic Steps
1. Verify the Windows host PC is powered on and connected to the internet.
2. Check if the native agent `SecurePrint.Agent.exe` is running in the Windows system tray.
3. If the agent status reads `OFFLINE`, check network connectivity to the cloud API (`http://localhost:4000` or production URL).
4. Verify Windows Print Spooler service is active:
   ```powershell
   Get-Service -Name Spooler
   ```
5. If the spooler is stopped, restart it via `Restart-Service Spooler`.

---

## 2. Webhook Signature Verification Failures

### Symptoms
- Cashfree webhooks fail with `400 Invalid webhook signature`.
- Payments remain in `PAYMENT_PENDING` after customer completes checkout.

### Diagnostic Steps
1. Confirm `CASHFREE_WEBHOOK_SECRET` in `.env` matches the secret generated in your Cashfree Merchant Dashboard under **Developers -> Webhooks**.
2. Verify the raw request body is being passed without JSON middleware pre-mutations.
3. Ensure server system clocks are synchronized with NTP to avoid timestamp drift.

---

## 3. Document Deletion & Storage Recovery

### Symptoms
- Customer or staff attempts to access a document and sees `410 Gone: Document deleted`.

### Expected Behavior
- This is by design! Exactly 10 seconds after verified payment, original documents are wiped.
- Receipts and historical transaction records remain accessible forever under `/job/:jobId/receipt`.
