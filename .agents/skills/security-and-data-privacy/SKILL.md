---
name: security-and-data-privacy
description: Guidelines for Postgres RLS policies, hiding user contact info/billing history, public vs private scope control, and redacting details for youth/minor profiles.
license: MIT
metadata:
  author: KelabSukan Team
  version: "1.0.0"
---

# KelabSukan Security & Data Privacy Rules

This skill governs Row Level Security (RLS) schemas, database privacy configurations, and data redaction requirements for the KelabSukan Live Sports Network. Use this skill when writing database migrations, exposing user settings, or managing public feeds.

## When to Apply

Reference these guidelines when:
- Creating new database tables in Supabase (all tables must have RLS enabled)
- Modifying profiles, memberships, or match tables
- Implementing data extraction APIs to prevent leaking contact details or transaction logs
- Filtering public dashboards to comply with youth privacy requirements

---

## 1. Row Level Security (RLS) Policy Guide

All Supabase tables must run explicit RLS rules. Never deploy a table with open write or read boundaries.

### Core Policy Models

#### A. Profiles Table
- **Select**: Anyone can view (public settings opt-in).
- **Update**: Restricted to the account owner:
  ```sql
  auth.uid() = id
  ```

#### B. Clubs & Memberships
- **Clubs Select**: Public read allowed.
- **Clubs Update**: Restricted to club owners/admins:
  ```sql
  EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.club_id = id 
      AND memberships.user_id = auth.uid() 
      AND memberships.role = 'admin'
  )
  ```
- **Memberships Write**: Only owner (joining/leaving) or club admin.

#### C. Matches & Sessions
- **Select**: Public read if the parent club is marked public. If the club is private, select is restricted to active members of that club.
- **Insert**: restricted to authenticated members of the club.

---

## 2. PII & Financial Data Restrictions

Personal Identifiable Information (PII) and transaction data must be shielded from API views:

- **Contact Redaction**: Users' emails, phone numbers, and physical addresses must **never** be exposed in public API returns or public profiles.
- **Billing Privacy**: Stripe invoice links, transaction tokens, and billing records must use a strict user filter:
  ```sql
  CREATE POLICY "Billing viewable only by owner" 
  ON payment_records FOR SELECT 
  USING (auth.uid() = user_id);
  ```

---

## 3. Youth & Minor Profile Safety

To protect junior athletes, the system must enforce strict visibility controls on accounts identified as minors:

- **Initials Only**: Replace full display names with initials (e.g., "Amir Tan" becomes "A. T.") in public feeds, public tournament brackets, and leaderboard tables.
- **Hide Media**: Do not render profile photos or custom cartoon avatars for minors on public proof pages.
- **Opt-in Exclusions**: Provide club admins and parents with a toggle to exclude youth profile records from public search indexes.

---

## 4. Private Club Isolation

Clubs marked as `is_private = true` must hide all activities:
- Hide session schedulers, attendance check-ins, match histories, and rosters from non-members.
- Verify that frontend detail pages redirect unauthorized visitors to the "/discover" page.
