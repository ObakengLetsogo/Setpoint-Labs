# Setpoint Labs

Learn PLC logic by running it. A browser based PLC and industrial automation training platform:
short lessons, ladder diagram and structured text that execute scan by scan, and animated 3D
machines that react in real time. Built for TVET students, apprentices, artisans and maintenance
teams in South Africa and wider Africa.

Self hosted on a Hostinger VPS with Nginx, PM2, MySQL and Let's Encrypt. See [deploy/README.md](deploy/README.md).

## What is in it

- **Course:** 49 lessons in six tracks: Foundations, Machines, Process Control, Wiring and Commissioning, Advanced, and Platform tours. Every lesson has a checkpoint, a guided code tour, a wiring view, a 10 question quiz and a video slot. Each track ends in a practical assessment marked by hidden tests, and a pass earns a PDF certificate with a public verify page.
- **Simulator:** ladder and IEC structured text interpreters (`engine/`), a ladder to ST translator, and a translator into Siemens STL, Allen Bradley rung text, Schneider IL, Mitsubishi, Omron and Delta notation, with each family's addressing (`engine/platforms.ts`).
- **Machines:** 12 data driven rigs with physics and faults (`rigs/`, `components/rigs/`): motor starter, star-delta, reversing, conveyor, sorting, bottling, traffic junction, lift, batch mixer, tank, duplex pumps and a VSD fan. A sandbox opens any of them for free play, with a live multimeter.
- **Accounts and payments:** session auth with argon2 and email verification, transactional email over SMTP, and Stitch payments behind a `PaymentProvider` interface. Webhooks are signed, idempotent and audited. Access comes from entitlements with a 3 day grace, and paid lesson content is only served by `/api/lessons/<id>` after an access check.
- **Organisations:** employer and institution seats, classes with a controller lock, CSV import and export, assignments and grading, invoices marked paid by an admin, and an admin page for payments, grants, enquiries, certificates and video uploads.

## Develop

```bash
npm install
cp .env.example .env.local          # defaults work with a local MySQL and the payment simulator
npm run db:migrate && ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=change-me-now npm run db:seed
npm run dev
```

In development, payments go to a simulator at `/dev/pay/<id>`, which sends signed webhooks through
the real handler. Sent email appears at `/dev/mail`.

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests: engines, rigs, lessons, quizzes, translators, assessments |
| `TEST_DATABASE_URL=mysql://... npm test` | Adds the MySQL integration tests for billing and access |
| `npm run lint` | ESLint, including a rule that keeps lesson content out of client code |
| `npm run db:generate` | Creates a migration after changing `db/schema.ts` |
| `npx tsx scripts/content/written.mts` | Refreshes the list of written lessons after adding one |
| `npm run test:e2e` | Playwright tests |

## Layout

```
app/              pages, server actions and API routes
components/       stage, rigs, lesson panels, site and dashboard UI
config/plans.ts   every price, in cents, VAT inclusive
data/             curriculum, lesson content, teaching panels, quizzes, assessments
db/               Drizzle schema and migrations
deploy/           server guide, Nginx, PM2, deploy and backup scripts
engine/           ladder, structured text and platform translators
lib/server/       auth, access, billing, payments, email, certificates, videos, dashboards
rigs/             machine definitions and physics
store/sim.ts      the simulator state in the browser
```

Setpoint Labs is for education only. It is not for use on live plant.
