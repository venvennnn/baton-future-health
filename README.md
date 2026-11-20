# Baton

Synthetic screening follow-up demo. The public site runs on the local case file and a seeded simulator. It does not connect to Malaffi, a hospital system, or a Department of Health registry.

```bash
npm install
cp .env.example .env.local
```

Demo sign-in works without environment variables. The server signs the session cookie with a built-in demo key. Set `BATON_SESSION_SECRET` in `.env.local` to a random string of at least 16 characters when you want to override that key. The variable stays on the server.

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

"Continue as User" on the overview starts the User session without the form. Admin access always uses the login form. The Log In menu opens that form as User or as Admin. A User session can open the overview, the case board, and case records. An Admin session can open the overview, facilities, capacity planning, governance, and illness settings. The header names the illness being shown. Only colorectal screening (FIT) has cases in the synthetic file. Other illness requirements stay in the browser.
