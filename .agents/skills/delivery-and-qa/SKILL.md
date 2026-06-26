---
name: delivery-and-qa
description: Rules for lint verification, unit testing, mobile/desktop viewport validation, Netlify preview checks, and Stripe/PostGIS testing.
license: MIT
metadata:
  author: KelabSukan Team
  version: "1.0.0"
---

# KelabSukan QA, Verification, & Deployment Rules

This skill outlines the strict validation gates and delivery protocols for all updates submitted to the KelabSukan Live Sports Network. Use this skill when testing changed code, executing migrations, or preparing a preview deployment.

## When to Apply

Reference these guidelines when:
- Preparing code for review or merge
- Debugging failing lint checks or unit tests
- Validating UI responsiveness across device viewports
- Creating database migrations or testing payment integration flows

---

## 1. The QA Quality Gates

Before any branch can be merged or deployed, it must pass all automated codebase checks:

- **Lint Verification**: Run `npm run lint`. There must be **0 errors**. Fix all typescript warnings or unused variables. Do not disable lint warnings inline without principal approval.
- **Unit Testing**: Run `npm run test`. Verify that all components, utility helpers, and hook tests pass.
- **Production Compilation**: Run `npm run build`. Confirm that compiler trees resolve without warnings or asset generation errors.

---

## 2. Multi-Viewport Layout Validation

Since over 80% of our active users record scores on mobile, all UI layouts must be optimized for compact viewports while scaling gracefully to desktop screens:

- **Mobile Baseline (390px)**: Check for text overflows, squished button borders, and broken flex-wrap rows. Confirm that the bottom navigation bar doesn't overlay input fields or score entry selectors.
- **Desktop Scale (1440px)**: Ensure cards, newsroom panels, and scoreboard columns are capped by container max-widths (`max-w-[1180px]`). Do not let images or text blocks stretch infinitely across widescreen layouts.

---

## 3. Supabase Migration Verification

Database migrations are append-only. Run checks before pushing live:

1. **Local Dry-Run**: Run the CLI validation command to test SQL syntax against the target container:
   ```bash
   npx supabase db push --linked --dry-run --include-all
   ```
2. **RLS Audit**: Every new table must have Row Level Security enabled. Verify that read permissions match the user's public or private club privacy status.
3. **PostGIS Indexes**: When querying geolocation data (e.g., proximity searches), verify that spatial indexes (`USING gist`) are declared to avoid table-scan latencies.

---

## 4. Preview Deployments & SPA Routing

All user-facing UI changes require a Netlify preview deploy:

- **Deployment Logs Check**: Verify that the Netlify build logs report a clean status with no unresolved dependency alerts.
- **Client Route Fallbacks**: In single-page app setups (SPA), reload the browser while viewing a nested route (e.g., `/clubs/:id/settings`). If the page returns a 404, verify that `_redirects` or `netlify.toml` is configured correctly:
  ```toml
  [[redirects]]
    from = "/*"
    status = 200
    to = "/index.html"
  ```

---

## 5. Stripe Checkout Webhook Validation

When deploying Stripe payment features:
- **Sandbox Testing**: Always use Stripe test cards and mock transaction states.
- **Webhook Integrity**: Verify that local or staging test runners correctly trigger and receive mock webhook requests (e.g. `payment_intent.succeeded`) to update the participant status in the database.
