# Baton

Synthetic screening follow-up demo. The public site runs on the local case file and a seeded simulator. It does not connect to Malaffi, a hospital system, or a Department of Health registry.

```bash
npm install
cp .env.example .env.local
```

Set `BATON_SESSION_SECRET` in `.env.local` to a random string of at least 16 characters. That value signs the demo session cookie and stays on the server. In development, if the variable is missing, the app uses a local-only fallback so `npm run dev` still starts. Production does not use that fallback: set the variable in the host environment or demo login cannot issue a session.

```bash
npm run dev
```

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` cover the checks used before deployment.

The overview at `/` is public. Workspace pages use a signed HttpOnly session cookie.

Demo credentials, for synthetic data only:

| Role | Username | Password | Opens |
| --- | --- | --- | --- |
| User | `user` | `password` | `/cases` |
| Admin | `admin` | `password` | `/facilities` |

"Continue as User" on the overview starts the User session without the form. Admin access always uses the login form. A User session can open the overview, the case board, and case records. An Admin session can open the overview, facilities, the policy simulator, and governance.
