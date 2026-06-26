---
name: local-testing-and-seeding
description: Instructions for executing the utility scripts under scripts/ (e.g. seeding the LEP BC club, creating test users, running features tests) so developer agents can locally reproduce database states.
license: MIT
metadata:
  author: KelabSukan Team
  version: "1.0.0"
---

# KelabSukan Local Seeding & Testing Script Rules

This skill documents the utility scripts available in the [scripts/](file:///Users/abc/Documents/Badminton%20v2/scripts) directory. Use this skill when standing up a local test database, seeding sample clubs, verifying auth status, or running integration test flows.

## When to Apply

Reference these guidelines when:
- Setting up a local Supabase instance
- Resetting test profiles or creating fake matches for local UI previewing
- Testing user registration and login flows programmatically
- Running backend API checks or database feature suites

---

## 1. Directory Script Inventory

Below is the list of utility scripts stored under `scripts/` and their respective functions:

| Script File | Language / Shell | Purpose |
|---|---|---|
| [setup-supabase.sh](file:///Users/abc/Documents/Badminton%20v2/scripts/setup-supabase.sh) | Shell (bash) | Initializes local Supabase container, applies migrations, and prepares database schemas. |
| [seed-lep-bc.cjs](file:///Users/abc/Documents/Badminton%20v2/scripts/seed-lep-bc.cjs) | CommonJS (node) | Seeds the "LEP BC" badminton club, including core members, matches, sets, and ELO histories. |
| [create-test-users.cjs](file:///Users/abc/Documents/Badminton%20v2/scripts/create-test-users.cjs) | CommonJS (node) | Populates mock Auth users in the local Auth schema. |
| [register-test-users.cjs](file:///Users/abc/Documents/Badminton%20v2/scripts/register-test-users.cjs) | CommonJS (node) | programmatically signs up test users via Supabase auth API endpoint. |
| [check-test-users.cjs](file:///Users/abc/Documents/Badminton%20v2/scripts/check-test-users.cjs) | CommonJS (node) | Audits existing local users to verify credentials match target states. |
| [insert-test-data.js](file:///Users/abc/Documents/Badminton%20v2/scripts/insert-test-data.js) | Node.js ES6 | Inserts mock matches, ratings, and attendance logs. |
| [test-login.cjs](file:///Users/abc/Documents/Badminton%20v2/scripts/test-login.cjs) | CommonJS (node) | Validates that mock users can retrieve valid JWT tokens. |
| [api-test.sh](file:///Users/abc/Documents/Badminton%20v2/scripts/api-test.sh) | Shell (bash) | Runs a series of curl requests testing API endpoints. |
| [test-all-features.sh](file:///Users/abc/Documents/Badminton%20v2/scripts/test-all-features.sh) | Shell (bash) | Runs the comprehensive E2E CLI testing pipeline. |

---

## 2. Common Execution Workflows

To avoid seeding issues, always run the scripts in their correct order.

### Resetting and Seeding the Local DB
If your local database state is corrupted or empty, run:
```bash
# 1. Reset database container and run migrations
bash scripts/setup-supabase.sh

# 2. Register mock auth credentials
node scripts/register-test-users.cjs

# 3. Build profiles and seed LEP BC badminton records
node scripts/seed-lep-bc.cjs
```

### Checking Auth credentials
Verify that auth registration succeeded and login is active:
```bash
node scripts/check-test-users.cjs
node scripts/test-login.cjs
```

> [!TIP]
> Keep the local Supabase container running (`npx supabase start`) before launching any seeding scripts, otherwise the scripts will output connection timeout errors.
