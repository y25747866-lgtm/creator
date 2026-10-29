# NexoraOS Agents

NexoraOS runs NEXUS as the orchestrator with SCOUT (research), FLUX (creative), APEX (strategy), and FORGE (builder). FORGE returns reviewable implementation plans and source artifacts; generated code is not executed or written automatically.

## Requirements and setup

- Node.js 22 or later and npm.
- A Supabase project with the tables and RPC functions used by this source. The service-role key is highly privileged; keep it server-side and never commit it.
- An OpenAI-compatible local model server exposing `/v1/models`, `/v1/chat/completions`, and, for semantic-cache/RAG vector features, `/v1/embeddings`. The default base URL is `http://localhost:8000/v1`. A compatible model must be available under the configured model identifier (`DeepSeek-V4.1-Flash`).
- Optional: a browser-control service on `http://localhost:3200` implementing `POST /navigate` and `POST /snapshot`.
- Optional: a web-search service on `http://localhost:3100` implementing `POST /search` and returning `{ "results": [{ "title", "url", "text" }] }`.

The browser-control, web-search, and model services are external: this repository does not include their servers or a process manager. Start and supervise them using the deployment-specific instructions supplied by their providers. The code does not claim they are available. Browser and search calls report failures or fall back to model-only research as implemented; model readiness is checked at startup. If the model is unavailable after five minutes, the HTTP process remains up in degraded mode and does not start the queue watcher.

Copy `.env.example` to `.env` and set the required Supabase values plus any deployment-specific URLs. Do not commit `.env`:

```sh
npm ci
npm run build
npm start
```

For local development, use `npm run dev`. `npm start` runs the compiled `dist/server/index.js`; rerun `npm run build` after source changes.

## Environment variables

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: required for database operations.
- `LOCAL_MODEL_URL`: optional model API base URL; default `http://localhost:8000/v1`.
- `MODEL_PATH`: optional informational model-path setting for the deployment.
- `BROWSER_CONTROL_URL`: optional browser-control base URL; default `http://localhost:3200`.
- `WEB_SEARCH_URL`: optional web-search base URL; default `http://localhost:3100`.
- `COMPOSIO_API_KEY`: optional APEX connected-app integration.
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`: optional WhatsApp integration.
- `TELEGRAM_BOT_TOKEN`: optional Telegram integration.
- `FLUX_WORKSPACE`: output/read workspace for FLUX; default `/workspace/flux`.
- `PORT`: HTTP server port; default `3000`.

## Security and limitations

Arbitrary shell execution is intentionally disabled by default. No isolated runner/container is part of this project; enabling `child_process` command execution inside the agent server would expose server files, credentials, and host resources to untrusted model output. FLUX file operations reject absolute/traversal paths and constrain access to its configured workspace. Use a separate, credential-free container with fixed images and resource/network limits before considering a shell runner. Composio tool execution is user-scoped with the installed SDK and pinned tool versions; SDK calls cannot be interrupted mid-request. Protect the HTTP server, `/run`, webhooks, and SSE routes with deployment-level authentication/signature validation and network controls before public exposure.

The `agent_tasks` and `agent_sessions` mappings follow snake_case fields already used by the source filters and updates. No live Supabase credentials or schema were provided. In particular, the original `agent_events` camelCase insert shape is retained because its column names could not be verified. Actual table definitions, event columns, RLS policies, realtime publication, pgvector extension, and `semantic_cache_lookup`/`rag_search` RPC signatures remain unverified. Confirm them against the target database before deployment; mismatches may require a migration or mapping adjustment.

No new skills were installed or added during this phase.

## Credential security and integration limits

- Set `CREDENTIALS_ENCRYPTION_KEY` to a stable random 32-byte key (64 hex characters or base64). Back it up securely. Losing it means stored platform credentials cannot be decrypted. Never commit it or expose it to the browser.
- Social tokens are encrypted with AES-256-GCM before being stored in `platform_connections.credentials`. Existing plaintext connection rows are deliberately rejected; reconnect those accounts after configuring the key rather than silently trusting legacy secrets.
- The current `/platforms/:platform/connect` endpoint accepts credentials supplied by an authenticated server API caller; it is **not** a complete OAuth authorization-code flow. Do not expose a public frontend form that sends provider tokens through an untrusted path. OAuth consent, callback/state handling, refresh-token rotation, and provider app review must be implemented/configured per provider before describing the integrations as turnkey.
- Only X, Facebook Pages, and Instagram adapters are included. This is not a universal connector for every app. Each provider requires its own official API permissions and often app review. Media publishing and analytics vary by provider and account type.
- Apply `supabase/migrations/0002_compatibility_and_security.sql` and `0003_recovery_and_realtime.sql` only after reviewing them against a database backup and your current schema. They are intended to be additive; pre-existing duplicate `(user_id, platform)` rows can prevent creation of the unique index and must be resolved deliberately. The migration adds `agent_events` to Realtime as well as `agent_tasks`. Do not change an existing credential column type until existing values have been safely migrated; this source uses a versioned encrypted JSON envelope in `platform_connections.credentials`.
- Run `npm ci`, `npm run type-check`, `npm run build`, and `npm test` in an environment with npm dependencies available. This source bundle has not been live-tested against your Supabase project, real model endpoint, or social accounts.
