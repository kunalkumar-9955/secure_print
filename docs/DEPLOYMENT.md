# Production Deployment & Infrastructure Guide

## 1. Docker Compose Production Topology

A complete `docker-compose.yml` is provided in `infrastructure/docker-compose.yml` defining:
- `api`: NestJS Backend API (Port 4000)
- `web`: Next.js 15 Web Application (Port 3000)
- `postgres`: PostgreSQL 18 Cluster
- `redis`: Redis Cache & Queue Manager
- `caddy`: Reverse proxy providing automatic TLS/HTTPS certificates

---

## 2. Environment Variables Checklist

Ensure the following are configured in production:
```env
PORT=4000
NODE_ENV=production
API_BASE_URL=https://api.secureprint.example
PUBLIC_BASE_URL=https://secureprint.example

DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@db:5432/secureprint?schema=public
REDIS_URL=redis://redis:6379

JWT_SECRET=super-secure-32-char-random-jwt-secret-key-prod
JWT_EXPIRES_IN=7d

CASHFREE_ENV=PRODUCTION
CASHFREE_APP_ID=cf_app_production_id
CASHFREE_SECRET_KEY=cf_secret_production_key
CASHFREE_WEBHOOK_SECRET=cf_webhook_production_secret

TZ=Asia/Kolkata
```

---

## 3. Windows Print Agent Deployment

For cyber cafe and document center shop computers:
1. Publish the C# agent as a self-contained single-file executable:
   ```powershell
   cd apps/print-agent/SecurePrint.Agent
   dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
   ```
2. Copy `SecurePrint.Agent.exe` to the shop's Windows PC.
3. Configure `agent-config.json` with the production `ApiBaseUrl: "https://api.secureprint.example"`.
4. Launch the application and complete pairing.
