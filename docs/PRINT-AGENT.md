# Windows Print Agent Architecture (.NET 10 LTS WPF)

The SecurePrint Print Agent is a native Windows application built with **C#**, **.NET 10 LTS**, and **WPF**.

---

## 1. Responsibilities

- **6-Digit Pairing Protocol**: Interacts with the backend via short-lived, single-use pairing codes.
- **Persistent Machine Identity**: Assigns a stable `installationId` (stored in `%APPDATA%/SecurePrint/agent-config.json`) to deduplicate reconnections.
- **Printer Discovery**: Enumerates local and network Windows print queues using `System.Printing.LocalPrintServer`.
- **Driver Capability Mapping**: Extracts supported paper sizes (A4, A3, Legal), color capabilities, and duplex modes.
- **Physical Spooling**: Pulls private documents via secure authorized endpoints, attaches `PrintTicket` parameters, and submits directly to `queue.AddJob()`.
- **Status Reporting**: Relays attempt progress (`SUBMITTED` -> `PRINTING` -> `COMPLETED` / `FAILED`) to the cloud.
- **Heartbeat Worker**: Pings `/api/v1/agent/heartbeat` every 15 seconds. If heartbeats are missed beyond 45 seconds, the cloud marks the agent as `OFFLINE`.

---

## 2. Installation & Running

### From Source
```powershell
cd apps/print-agent/SecurePrint.Agent
dotnet build
dotnet run
```

### First Launch & Pairing Flow
1. Open the Web Dashboard at `/admin/agents`.
2. Click **"Connect Computer"** to generate a 6-digit code (e.g. `849201`).
3. Enter the 6-digit code into the Desktop Agent UI and click **"Connect Computer"**.
4. The agent receives a revocable pairing token and immediately begins synchronizing all Windows print queues.
5. In the Web Dashboard, the computer status immediately flips to **ONLINE**.
