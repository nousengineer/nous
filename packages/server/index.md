# Kairos Server

Next.js app with agent hosting (Direct Connect protocol) and internal management UI.

## Stack

- **Runtime:** Next.js 15 (App Router) + custom server for WebSocket
- **Auth:** Firebase Admin SDK + GitHub OAuth (org-gated)
- **DB:** Firestore (users) + JSON file (sessions)
- **UI:** Tailwind CSS v4, dark theme
- **Agent:** `@chronokairo/sdk` for provider communication

## Dev

```sh
cp .env.example .env   # fill with real values
npm install
npm run dev            # starts on :3333
```

## Routes

| Path | Auth | Description |
|---|---|---|
| `/login` | — | GitHub OAuth login |
| `/dashboard` | session | Overview stats |
| `/dashboard/sessions` | session | Session list |
| `/dashboard/users` | admin | User management |
| `/api/health` | — | Health check |
| `/api/auth/config` | — | Firebase/GitHub config |
| `/api/auth/session` | — | Login (POST), logout (DELETE) |
| `/api/auth/github/exchange` | — | GitHub code → token (API) |
| `/api/auth/github/callback` | — | GitHub OAuth redirect (browser) |
| `/api/auth/me` | session | Current user profile |
| `/api/sessions` | session | Create/list sessions |
| `/api/sessions/:id` | session | Session detail/delete |
| `/api/sessions/:id/ws` | — | WebSocket (agent stream) |
| `/api/admin/users` | admin | List users |
| `/api/admin/users/:uid` | admin | Update/delete user |

## Auth Flow

1. User visits `/login` → clicks "Sign in with GitHub"
2. Redirects to GitHub OAuth → back to `/api/auth/github/callback`
3. Server checks org membership → creates Firebase user → sets `session` cookie
4. All subsequent requests use the httpOnly cookie

## Env Vars

See `.env.example`.
