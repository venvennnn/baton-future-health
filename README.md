# Baton

Synthetic screening follow-up demo. The public site runs on the local case file and a seeded simulator. It does not connect to Malaffi, a hospital system, or a Department of Health registry.

```bash
npm install
npm run dev
```

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` cover the checks used before deployment. No environment variables are required.

Screens: `/` overview, `/cases` staff worklist, `/cases/FIT-26771` demo record, `/facilities` bottlenecks, `/simulator` policy scenarios, `/governance` notes on what the demo does not do.
