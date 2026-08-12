# CareerVeda — Entity Relationship Model

Target: **PostgreSQL 16** (Cloud SQL, asia-south1). Derived field-for-field from
`backend/src/models/*.js`, so this is the current Mongoose schema expressed
relationally — not an aspiration.

**17 tables:** 2 identity · 7 content · 5 supporting · 3 junction.

Legend for every diagram below:

| Notation | Meaning |
|---|---|
| `||--o{` | one → zero-or-many, FK **NOT NULL** |
| `|o--o{` | zero-or-one → zero-or-many, FK **nullable** |
| `..` (dotted) | logical relationship **not enforced** by a foreign key |
| `PK` `FK` `UK` | primary / foreign / unique key |

---

## 0. Overview — all 17 tables

```mermaid
erDiagram
    ADMINS |o--o{ ADMINS : "created_by"
    ADMINS ||--o{ REFRESH_TOKENS : "issues session"
    ADMINS |o--o{ AUDIT_LOGS : "actor (null on failed login)"
    ADMINS |o--o{ CONTENT_REVISIONS : "changed_by"
    ADMINS |o--o{ MEDIA : "uploaded_by / deleted_by"
    ADMINS |o--o{ LEADS : "assigned_to"
    ADMINS |o--o{ LEAD_NOTES : "author"

    ADMINS |o--o{ PROGRAMS : "created_by / updated_by / deleted_by"
    ADMINS |o--o{ FACULTY : "created_by / updated_by / deleted_by"
    ADMINS |o--o{ ALUMNI : "created_by / updated_by / deleted_by"
    ADMINS |o--o{ BLOGS : "created_by / updated_by / deleted_by"
    ADMINS |o--o{ JOBS : "created_by / updated_by / deleted_by"
    ADMINS |o--o{ FAQS : "created_by / updated_by / deleted_by"
    ADMINS |o--o{ POLICIES : "created_by / updated_by / deleted_by"

    PROGRAMS ||--o{ PROGRAM_MENTORS : ""
    FACULTY  ||--o{ PROGRAM_MENTORS : ""
    PROGRAMS ||--o{ PROGRAM_RELATED : "from"
    PROGRAMS ||--o{ PROGRAM_RELATED : "to"
    BLOGS    ||--o{ BLOG_RELATED : "from"
    BLOGS    ||--o{ BLOG_RELATED : "to"

    PROGRAMS |o--o{ ALUMNI : "graduated_from"
    LEADS    ||--o{ LEAD_NOTES : "has"

    MEDIA ||..o{ PROGRAMS : "media_ref jsonb (unenforced)"
    MEDIA ||..o{ FACULTY : "media_ref jsonb (unenforced)"
    MEDIA ||..o{ ALUMNI : "media_ref jsonb (unenforced)"
    MEDIA ||..o{ BLOGS : "media_ref jsonb (unenforced)"
    MEDIA ||..o{ JOBS : "media_ref jsonb (unenforced)"

    PROGRAMS ||..o{ CONTENT_REVISIONS : "polymorphic"
    FACULTY  ||..o{ CONTENT_REVISIONS : "polymorphic"
    ALUMNI   ||..o{ CONTENT_REVISIONS : "polymorphic"
    BLOGS    ||..o{ CONTENT_REVISIONS : "polymorphic"
    JOBS     ||..o{ CONTENT_REVISIONS : "polymorphic"
    FAQS     ||..o{ CONTENT_REVISIONS : "polymorphic"
    POLICIES ||..o{ CONTENT_REVISIONS : "polymorphic"

    PROGRAMS ||..o{ FAQS : "related_entity (polymorphic)"
    FACULTY  ||..o{ FAQS : "related_entity (polymorphic)"
    ALUMNI   ||..o{ FAQS : "related_entity (polymorphic)"
    BLOGS    ||..o{ FAQS : "related_entity (polymorphic)"
    JOBS     ||..o{ FAQS : "related_entity (polymorphic)"
    POLICIES ||..o{ FAQS : "related_entity (polymorphic)"
```

`ADMINS` is the hub — every table except the junctions carries at least one FK
back to it. That is the audit story: nothing changes without a named actor.

---

## Shared lifecycle block

These 18 columns are **identical on all seven content tables** (`programs`,
`faculty`, `alumni`, `blogs`, `jobs`, `faqs`, `policies`). In the source they
come from one Mongoose plugin; in Postgres they are copied into each table.
Shown once here rather than 7× in the diagrams below, where each content entity
carries the marker attribute `LIFECYCLE shared_block`.

| Column | Type | Null | Key | Default | Note |
|---|---|---|---|---|---|
| `id` | uuid | no | PK | `gen_random_uuid()` | |
| `slug` | varchar(140) | no | UK | — | lowercase, derived from title/name/question |
| `status` | text | no | | `'draft'` | CHECK: draft, in-review, scheduled, published, archived |
| `published_at` | timestamptz | yes | | `null` | set on transition, **not** on save |
| `scheduled_at` | timestamptz | yes | | `null` | |
| `featured` | boolean | no | | `false` | |
| `display_order` | integer | no | | `0` | |
| `rejected_reason` | varchar(500) | no | | `''` | cleared on publish |
| `seo` | jsonb | no | | `'{}'` | title, description, keywords[], og_image, canonical_url, no_index |
| `deleted_at` | timestamptz | yes | | `null` | **soft delete** — NULL means live |
| `deleted_by` | uuid | yes | FK→admins | `null` | |
| `created_by` | uuid | yes | FK→admins | `null` | |
| `updated_by` | uuid | yes | FK→admins | `null` | |
| `revision` | integer | no | | `1` | optimistic lock; mismatch ⇒ 409 |
| `created_at` | timestamptz | no | | `now()` | |
| `updated_at` | timestamptz | no | | `now()` | |

Indexes on each of the seven:
`(deleted_at, status, display_order)` · `(deleted_at, status, published_at DESC)` ·
`(status, scheduled_at)` · GIN over a generated `tsvector`.

**Visibility rule** (one definition, used by every public read):

```sql
deleted_at IS NULL
AND ( (status = 'published' AND (published_at IS NULL OR published_at <= now()))
   OR (status = 'scheduled' AND scheduled_at <= now()) )
```

---

## A. Identity, sessions & audit

```mermaid
erDiagram
    ADMINS {
        uuid    id PK
        varchar name "max 120"
        varchar email UK "lowercase, max 254"
        text    password_hash "argon2id, never serialised"
        text    role "super-admin | admin | editor | viewer"
        text    status "active | suspended"
        timestamptz password_changed_at
        integer token_version "bump invalidates all access tokens"
        text_arr password_history "last 5 hashes, reuse prevention"
        integer failed_login_attempts
        timestamptz locked_until "5f=1m 7f=5m 10f=30m 15f=240m"
        timestamptz last_login_at
        text    totp_secret "2FA scaffolding, not enabled"
        boolean totp_enabled
        uuid    created_by FK "self-referencing, nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    REFRESH_TOKENS {
        uuid    id PK
        uuid    admin_id FK "NOT NULL, ON DELETE CASCADE"
        text    token_hash UK "SHA-256 - raw token never stored"
        text    family "all tokens from one login"
        timestamptz expires_at
        timestamptz used_at "second exchange = reuse, revoke family"
        timestamptz revoked_at
        text    revoked_reason "logout|rotated|reuse-detected|password-changed|revoked-by-admin"
        varchar user_agent "session list display"
        varchar ip_prefix "truncated, not a location log"
        timestamptz created_at
        timestamptz updated_at
    }

    AUDIT_LOGS {
        uuid    id PK
        text    action "auth.* user.* content.* media.* lead.*"
        uuid    actor_id FK "NULLABLE - failed login asserts no identity"
        varchar actor_email "what was claimed"
        text    actor_role "frozen at the time, not joined"
        text    target_type "polymorphic"
        text    target_id "polymorphic"
        jsonb   metadata "chosen fields only, never a request body"
        varchar ip_prefix
        varchar user_agent
        text    request_id "join key to the application log"
        text    outcome "success | failure"
        timestamptz created_at "APPEND-ONLY - no updated_at"
    }

    CONTENT_REVISIONS {
        uuid    id PK
        text    resource "programs|faculty|alumni|blogs|jobs|faqs|policies"
        uuid    document_id "polymorphic - no FK possible"
        integer revision
        jsonb   snapshot "full prior document, archive only"
        uuid    changed_by FK
        varchar change_note
        timestamptz created_at
    }

    ADMINS |o--o{ ADMINS : "created_by"
    ADMINS ||--o{ REFRESH_TOKENS : "issues"
    ADMINS |o--o{ AUDIT_LOGS : "actor"
    ADMINS |o--o{ CONTENT_REVISIONS : "changed_by"
```

- `audit_logs` is **append-only**, enforced at the database (`REVOKE UPDATE,
  DELETE` + a trigger), not by convention — an audit trail an attacker can edit
  is worse than none, because it is trusted.
- `content_revisions` is capped at **30 per document** and uniquely keyed
  `(resource, document_id, revision)`.
- MongoDB's TTL index on `refresh_tokens.expires_at` has no Postgres equivalent
  — it becomes a scheduled `DELETE WHERE expires_at < now()`.

---

## B. Content core — programs, faculty, alumni, blogs

```mermaid
erDiagram
    PROGRAMS {
        LIFECYCLE shared_block "18 cols, see above"
        varchar title "NOT NULL, max 300"
        varchar full_title
        varchar short_title
        varchar subtitle
        varchar category "indexed"
        varchar description "max 4000"
        varchar lead "max 4000"
        varchar duration
        text_arr mentorship
        varchar format
        varchar eligibility
        jsonb   image "media_ref"
        jsonb   hero_media "media_ref"
        jsonb   gallery "media_ref[]"
        text_arr badges
        text_arr overview
        varchar curriculum_intro
        text_arr curriculum
        jsonb   modules "n, title, duration, points[]"
        text_arr outcomes
        varchar gains_intro
        text_arr gains
        text_arr skills
        text_arr tools
        text_arr soft_skills
        text_arr internship
        varchar learners
        varchar projects
        varchar starting_price "STRING not numeric - formatted rupees"
        jsonb   fee "label, amount, note"
        varchar emi
        varchar guarantee
        varchar next_batch
        varchar seats
        jsonb   faqs "faq_entry[] - per-program, moves with it"
        varchar brochure_url
    }

    FACULTY {
        LIFECYCLE shared_block "18 cols, see above"
        varchar name "NOT NULL, max 160"
        varchar discipline "indexed, shares vocabulary with programs.category"
        varchar role
        varchar designation
        varchar company
        varchar description
        varchar bio "max 8000"
        varchar short_bio
        jsonb   photo "media_ref"
        jsonb   cover_image "media_ref"
        varchar education
        varchar experience
        varchar specialization
        text_arr achievements
        text_arr expertise
        jsonb   social_links "linkedin, twitter, github, website"
    }

    ALUMNI {
        LIFECYCLE shared_block "18 cols, see above"
        varchar name "NOT NULL, max 160"
        jsonb   image "media_ref"
        jsonb   company_logo "media_ref"
        varchar previous_role
        varchar current_role
        varchar previous_company
        varchar current_company
        uuid    program_id FK "nullable, ON DELETE SET NULL"
        varchar program_title "DENORMALISED - survives a program rename"
        varchar graduation_year
        varchar salary_before "string - may be a range or confidential"
        varchar salary_after "string"
        varchar percentage_hike "STORED not computed - no arithmetic possible"
        varchar quote
        varchar story "max 8000"
        text_arr skills
        varchar testimonial_video
        varchar accent "initials-placeholder gradient start"
        varchar accent_end
        boolean show_on_alumni_page "indexed - 2nd of 3 visibility surfaces"
    }

    BLOGS {
        LIFECYCLE shared_block "18 cols, see above"
        varchar title "NOT NULL, max 300"
        varchar category "indexed"
        varchar tag "label above the title"
        text_arr tags
        varchar author "PLAIN STRING byline, not an FK to admins"
        varchar date "human string - published_at drives ordering"
        varchar read_time "derived at 220wpm unless set"
        varchar excerpt
        varchar lead
        jsonb   sections "article_section[] - STRUCTURED, never HTML"
        text_arr highlights
        jsonb   cta "label, url"
        jsonb   image "media_ref"
        jsonb   gallery "media_ref[]"
    }

    PROGRAM_MENTORS {
        uuid program_id PK "FK"
        uuid faculty_id PK "FK"
    }

    PROGRAM_RELATED {
        uuid program_id PK "FK"
        uuid related_program_id PK "FK"
    }

    BLOG_RELATED {
        uuid blog_id PK "FK"
        uuid related_blog_id PK "FK"
    }

    PROGRAMS ||--o{ PROGRAM_MENTORS : "taught by"
    FACULTY  ||--o{ PROGRAM_MENTORS : "mentors"
    PROGRAMS ||--o{ PROGRAM_RELATED : "from"
    PROGRAMS ||--o{ PROGRAM_RELATED : "to"
    BLOGS    ||--o{ BLOG_RELATED : "from"
    BLOGS    ||--o{ BLOG_RELATED : "to"
    PROGRAMS |o--o{ ALUMNI : "graduated_from"
```

**The one real normalisation win.** In Mongo, `programs.mentors[]` and
`faculty.associatedPrograms[]` are two independent arrays describing the same
program↔faculty association from opposite ends — nothing keeps them in sync, so
they can and do disagree. Relationally they collapse into the single
`program_mentors` junction and the disagreement becomes impossible.

**Alumni has three visibility surfaces, two flags** — deliberate:

| Surface | Controlled by |
|---|---|
| Home-page outcome strip | `featured` |
| `/alumni` review grid | `show_on_alumni_page` |
| `/alumni` dome gallery | *nothing* — every published record |

The dome is the complete record of who came through, so it is intentionally not
filterable. Hiding someone from a curated strip must never erase them from it.

---

## C. Standalone content & media

```mermaid
erDiagram
    JOBS {
        LIFECYCLE shared_block "18 cols, see above"
        varchar title "NOT NULL"
        varchar company "indexed"
        jsonb   company_logo "media_ref"
        varchar location
        varchar work_mode
        varchar employment_type
        varchar experience_level
        varchar description "max 6000"
        text_arr requirements
        text_arr responsibilities
        text_arr skills
        varchar salary_range
        varchar application_url
        varchar application_email
        varchar source "third-party openings, not our vacancies"
        varchar source_job_id "NULL for hand-typed rows"
        timestamptz fetched_at "last seen upstream - not created_at"
        varchar dedupe_key "indexed, deliberately NOT unique"
        timestamptz posted_date
        timestamptz deadline
    }

    FAQS {
        LIFECYCLE shared_block "18 cols, see above"
        varchar question "NOT NULL, max 500 - slug source"
        varchar answer "NOT NULL, max 4000"
        varchar category "default General, indexed"
        text    related_entity_type "Program|Faculty|Alumni|Blog|Job|Policy"
        uuid    related_entity_id "polymorphic - no FK"
    }

    POLICIES {
        LIFECYCLE shared_block "18 cols, see above"
        varchar title "NOT NULL"
        varchar eyebrow "default Legal"
        varchar lead
        varchar updated "human last-updated line"
        timestamptz effective_date "machine-readable counterpart"
        varchar version "default 1.0"
        jsonb   stats "stat[] value+label"
        jsonb   sections "policy_section[] heading, body[], callout, list[], groups[], closing"
    }

    MEDIA {
        uuid    id PK
        varchar name "editor-facing label"
        varchar file_name "what ImageKit stored - unchanged on rename"
        varchar url "NOT NULL"
        varchar thumbnail_url
        varchar file_id UK "ImageKit id - only handle for remote delete"
        varchar file_path
        varchar folder "default /careerveda, indexed"
        varchar mime_type
        varchar extension
        bigint  size
        integer width "stored to reserve the box - prevents layout shift"
        integer height
        varchar alt
        varchar caption
        text_arr tags
        jsonb   focal_point "x,y in 0..1 - keeps subject in frame on re-crop"
        varchar content_hash "SHA-256 of bytes - re-upload offered as existing"
        uuid    uploaded_by FK
        timestamptz deleted_at
        uuid    deleted_by FK
        boolean external "no API key - UI hides a delete that would fail"
        varchar original_url "provenance, makes the copy reversible"
        timestamptz created_at
        timestamptz updated_at
    }

    MEDIA ||..o{ JOBS : "company_logo (jsonb, unenforced)"
    MEDIA ||..o{ POLICIES : "seo.og_image (unenforced)"
    FAQS  }o..|| POLICIES : "related_entity (polymorphic)"
```

`jobs` carries the schema's cleverest constraint:

```sql
UNIQUE (source, source_job_id) WHERE source_job_id IS NOT NULL
```

A **partial** unique index. This is what makes the hourly third-party ingest
idempotent at the *database* level rather than in sync code — two concurrent
Cloud Run instances re-fetching the same listing cannot create duplicates, the
second insert simply fails the key and is counted. Hand-typed jobs have
`source_job_id = NULL` and are exempt, rather than all colliding on `''`.

`dedupe_key` (normalised title+company+location) is indexed but **not** unique
on purpose: two genuinely different openings can share all three, and a unique
index there would block an admin from creating the second by hand.

---

## D. Lead capture

```mermaid
erDiagram
    LEADS {
        uuid    id PK
        text    type "consultation|enrollment|contact|newsletter, indexed"
        varchar name "NOT NULL"
        varchar email "NOT NULL"
        varchar mobile "NOT NULL"
        varchar user_type
        varchar program "STRING copy, validated against published programs"
        varchar message
        text    email_key "indexed - lowercased email"
        text    mobile_key "indexed - LAST TEN DIGITS only"
        varchar source "which form"
        varchar source_page
        jsonb   utm "source, medium, campaign, term, content"
        boolean consent
        text    status "new|contacted|qualified|converted|closed|spam, indexed"
        uuid    assigned_to FK "nullable"
        integer spam_score "0-100, honeypot + duplicate heuristics"
        boolean archived "indexed"
        varchar ip_hash "HMAC-SHA256 keyed - never the raw address"
        varchar user_agent
        varchar idempotency_key "partial UNIQUE where not null"
        timestamptz created_at
        timestamptz updated_at
    }

    LEAD_NOTES {
        uuid    id PK
        uuid    lead_id FK "NOT NULL, ON DELETE CASCADE"
        varchar body "NOT NULL, max 4000"
        uuid    author_id FK "nullable"
        timestamptz created_at
    }

    LEADS  ||--o{ LEAD_NOTES : "has"
    ADMINS |o--o{ LEADS : "assigned_to"
    ADMINS |o--o{ LEAD_NOTES : "author"
```

`email_key` / `mobile_key` are the whole de-duplication story. `mobile_key` is
the **last ten digits**, which is what makes `+91 92178 01191` and `9217801191`
the same person. The two-enrollment cap counts matches with `OR` across both
keys, so a different email with the same phone still counts as one applicant.
Both are candidates for `GENERATED ALWAYS AS` columns in Postgres — Mongo had to
compute them in application code.

`lead_notes` is the **only** embedded array in the whole schema that becomes a
real child table. The signal: in the source it is the one subdocument declared
with `_id: true`, and it carries its own FK to `admins`. Identity plus a
relationship equals an entity; everything else is a value object and stays
`jsonb`.

---

## Relationship matrix

| Parent | Child | Cardinality | FK column | ON DELETE | Optional |
|---|---|---|---|---|---|
| admins | admins | 1 : 0..N | `created_by` | SET NULL | yes |
| admins | refresh_tokens | 1 : 0..N | `admin_id` | CASCADE | **no** |
| admins | audit_logs | 0..1 : 0..N | `actor_id` | SET NULL | yes |
| admins | content_revisions | 0..1 : 0..N | `changed_by` | SET NULL | yes |
| admins | media | 0..1 : 0..N | `uploaded_by`, `deleted_by` | SET NULL | yes |
| admins | leads | 0..1 : 0..N | `assigned_to` | SET NULL | yes |
| admins | lead_notes | 0..1 : 0..N | `author_id` | SET NULL | yes |
| admins | *each of 7 content tables* | 0..1 : 0..N | `created_by`, `updated_by`, `deleted_by` | SET NULL | yes |
| programs | alumni | 0..1 : 0..N | `program_id` | SET NULL | yes |
| leads | lead_notes | 1 : 0..N | `lead_id` | CASCADE | **no** |
| programs ↔ faculty | program_mentors | M : N | both PK | CASCADE | — |
| programs ↔ programs | program_related | M : N self | both PK | CASCADE | — |
| blogs ↔ blogs | blog_related | M : N self | both PK | CASCADE | — |
| media ⇢ 7 content tables | — | 1 : 0..N | inside `jsonb` | **none** | unenforced |
| 7 content tables ⇢ content_revisions | — | 1 : 0..N | `resource` + `document_id` | **none** | polymorphic |
| 6 content tables ⇢ faqs | — | 0..1 : 0..N | `related_entity_type` + `_id` | **none** | polymorphic |
| any table ⇢ audit_logs | — | 0..1 : 0..N | `target_type` + `target_id` | **none** | polymorphic |

Self-referencing pairs should carry `CHECK (a <> b)`. `program_related` is
directional in the source (A relating to B does not imply the reverse), so do
**not** enforce symmetry.

---

## The three polymorphic associations

Postgres cannot express "FK to one of seven tables". All three below keep the
`(type, id)` pair with no FK, which is the right call in each case — but for
different reasons.

| | `faqs.related_entity_*` | `content_revisions.resource + document_id` | `audit_logs.target_*` |
|---|---|---|---|
| Points at | 6 content tables | 7 content tables | anything, incl. deleted rows |
| Alternative worth considering | exclusive arc: 6 nullable FKs + a CHECK that exactly one is set | none — the archive must outlive its subject | none |
| Verdict | **Exclusive arc.** Only 6 targets, referential integrity is worth having, and an orphaned FAQ pointing at a purged program is a real bug. | **Keep as-is.** A revision must survive a permanent purge of the row it describes; an FK would cascade the history away. | **Keep as-is.** The trail must record actions on records that no longer exist. An FK would make the log deletable, defeating its purpose. |

---

## Deliberate denormalisation

Four places where the schema stores a copy on purpose. Each would break if
normalised:

| Redundancy | Why it must stay |
|---|---|
| `media_ref` jsonb copies url / dimensions / alt from `media` | A program card renders 9 images. Nine joins on the hottest public read path buys nothing — these values change only when an admin replaces the asset. `width`/`height` specifically let the frontend reserve the box and avoid layout shift. Cost: the "where is this asset used?" lookup must scan jsonb. |
| `alumni.program_title` alongside `alumni.program_id` | An alumnus graduated from what the program was **called at the time**. Renaming or retiring a program must not rewrite their story. |
| `leads.program` as text, not an FK | Validated against published programs at write time, then frozen. A lead is a historical record of what someone asked about; deleting the program must not corrupt it. |
| `audit_logs.actor_role` | The role **at the time of the action**. Joining to `admins.role` would retroactively rewrite history every time someone is promoted. |

---

## Normal form

**In 3NF:** `admins`, `refresh_tokens`, `lead_notes`, `media`, and all three
junction tables.

**Deliberately not in 3NF**, with the exceptions above as justification:
the seven content tables (jsonb value objects and `media_ref` copies),
`alumni` (`program_title`), `leads` (`program`, plus `email_key`/`mobile_key`
derived from `email`/`mobile`), and `audit_logs` (`actor_email`, `actor_role`).

Every exception is a **point-in-time snapshot** or a **read-path optimisation**.
Neither is a normalisation failure — both are cases where the correct value is
the one that was true when the row was written, not the one that is true now.

---

## Counts

| Group | Tables |
|---|---|
| Identity & sessions | `admins`, `refresh_tokens` |
| Content (shared lifecycle) | `programs`, `faculty`, `alumni`, `blogs`, `jobs`, `faqs`, `policies` |
| Supporting | `leads`, `lead_notes`, `media`, `content_revisions`, `audit_logs` |
| Junction | `program_mentors`, `program_related`, `blog_related` |
| **Total** | **17** |
