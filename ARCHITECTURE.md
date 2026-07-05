# Qlick — Αρχιτεκτονικό Σχέδιο

> Πλατφόρμα online κρατήσεων appointment-based επιχειρήσεων με QR-code-first διαφοροποίηση.

---

## 1. Συνοπτικά (TL;DR)

- **Brand**: Qlick (qlick.gr ή qlick.app — θα ελέγξουμε διαθεσιμότητα)
- **Tagline**: «Κλείσε το ραντεβού σου σε 10 δευτερόλεπτα»
- **Stack**: Next.js 15 (App Router) + Supabase (Postgres + Auth + Storage) + Stripe + Vercel
- **Γλώσσες**: EL / EN (i18n από την αρχή με `next-intl`)
- **Killer feature**: Template editor για QR-poster που μπαίνει στην πόρτα του καταστήματος
- **Monetization**: Free trial (3 μήνες για πρώτα 1000, 1 μήνας μετά) → €9/μήνα basic plan
- **Πληρωμές πελάτη→κατάστημα**: ΟΧΙ μέσω πλατφόρμας (πληρώνει στο κατάστημα)
- **Πληρωμές κατάστημα→Qlick**: Stripe subscriptions

---

## 2. Roles & High-level Actors

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CUSTOMER   │────▶│   BUSINESS   │◀────│  PLATFORM    │
│  (πελάτης)   │     │ (κατάστημα)  │     │   (Qlick)    │
└──────────────┘     └──────────────┘     └──────────────┘
   - Browse           - Onboarding         - Admin panel
   - Book             - Calendar           - Billing
   - Manage           - Staff mgmt         - Moderation
   - QR scan          - QR Editor          - Analytics
                      - Notifications
                      - Subscription
```

**4 user types:**
1. **Customer** — βρίσκει κατάστημα, κάνει κράτηση
2. **Business Owner** — διαχειρίζεται κατάστημα, υπηρεσίες, ωράριο
3. **Staff Member** — βλέπει δικό του calendar, διαχειρίζεται δικά του ραντεβού
4. **Platform Admin** (εσύ) — διαχειρίζεται όλα

---

## 3. Multi-tenancy & URL Structure

Multi-tenant με **subdomain ή slug-based** routing:

```
qlick.gr/                          → Landing page
qlick.gr/search?q=κουρείο&loc=Αθήνα → Discovery (όπως Fresha)
qlick.gr/b/{slug}                  → Public booking page (από QR ή link)
qlick.gr/b/{slug}/book/{service}   → Booking flow

qlick.gr/login                     → Customer/Business login
qlick.gr/signup/business           → Business signup wizard

qlick.gr/account                   → Customer dashboard (κρατήσεις, profile)

qlick.gr/dashboard                 → Business dashboard
qlick.gr/dashboard/calendar        → Calendar
qlick.gr/dashboard/services        → Services management
qlick.gr/dashboard/staff           → Staff management
qlick.gr/dashboard/qr              → QR template editor
qlick.gr/dashboard/marketing       → Marketing tools
qlick.gr/dashboard/reports         → Analytics
qlick.gr/dashboard/billing         → Subscription

qlick.gr/admin                     → Platform admin (μόνο εσύ)
```

Default: slug-based (`qlick.gr/b/barber-house-athens`). Custom domain για premium plans (v2).

---

## 4. Database Schema (Supabase / Postgres)

### Auth & Users
Supabase Auth handles `auth.users`. Επεκτείνουμε με:

```sql
-- Profile για όλους τους χρήστες (customer + business owner + staff)
profiles
  id uuid PK (= auth.users.id)
  full_name text
  phone text (verified via SMS OTP)
  phone_verified boolean
  avatar_url text
  preferred_language enum('el','en') default 'el'
  created_at, updated_at

-- Customer-specific (αν χρειαστεί)
customers
  id uuid PK (= profiles.id)
  loyalty_points int default 0
  notes text  -- internal notes από admin
```

### Business / Tenant
```sql
businesses
  id uuid PK
  slug text UNIQUE  -- για το URL
  name text
  category_id uuid FK → categories
  description text
  description_en text  -- bilingual
  email text
  phone text
  website text
  facebook_url text
  instagram_url text
  google_place_id text  -- από Google Places API
  address jsonb  -- {street, city, postal, country, lat, lng}
  timezone text default 'Europe/Athens'
  currency text default 'EUR'
  logo_url text
  cover_url text
  gallery jsonb  -- array of image URLs
  brand_colors jsonb  -- {primary, secondary, accent}
  show_reviews boolean default true
  show_stats boolean default true  -- "2347+ ικανοποιημένοι"
  status enum('draft','active','suspended') default 'draft'
  created_at, updated_at

business_hours
  id, business_id FK
  day_of_week int (0-6)
  open_time time
  close_time time
  is_closed boolean
  -- Multiple rows per day allowed (για split shifts: 09-13, 17-21)

business_closures  -- holidays / special days
  id, business_id FK
  date date
  reason text
  is_closed boolean (or special hours)
  special_open_time, special_close_time

-- Πολλαπλοί owners/managers ανά business
business_members
  id, business_id FK, user_id FK
  role enum('owner','manager','staff','receptionist')
  invited_at, accepted_at
```

### Services
```sql
service_categories  -- π.χ. Hair / Beard / Color
  id, business_id FK
  name, name_en
  order_index

services
  id, business_id FK
  category_id FK
  name, name_en
  description, description_en
  duration_minutes int
  buffer_minutes int default 0  -- χρόνος μετά
  price_cents int
  is_active boolean
  requires_staff boolean default true
  bookable_online boolean default true
  color text  -- για calendar display
  order_index

-- Ποιοι staff μπορούν να κάνουν την υπηρεσία
service_staff
  service_id FK, staff_id FK (→ business_members)
  duration_override_minutes int NULL  -- αν συγκεκριμένος staff παίρνει διαφορετικό χρόνο
```

### Bookings
```sql
bookings
  id uuid PK
  business_id FK
  customer_id FK (profiles.id)
  staff_id FK (business_members.id) NULLABLE
  service_id FK
  starts_at timestamptz
  ends_at timestamptz
  status enum('pending','confirmed','completed','cancelled','no_show')
  source enum('web','qr','dashboard','phone')  -- για analytics
  customer_notes text
  internal_notes text
  cancellation_reason text
  cancelled_by enum('customer','business','system') NULL
  price_cents int  -- snapshot at booking time
  reminder_sent_at timestamptz
  created_at, updated_at

-- Πολλαπλές υπηρεσίες σε ένα ραντεβού (π.χ. κούρεμα + γένια)
booking_items
  id, booking_id FK
  service_id FK
  staff_id FK
  duration_minutes, price_cents
```

### QR Templates
```sql
-- Saved QR poster designs ανά business
qr_templates
  id uuid PK
  business_id FK
  name text  -- π.χ. "Front door A4"
  template_config jsonb  -- ολόκληρο το design state του editor
  template_preset_id FK → qr_template_presets NULL
  is_default boolean
  pdf_url text  -- generated artwork
  png_url text
  last_generated_at timestamptz
  created_at, updated_at

-- Έτοιμα presets που παρέχουμε εμείς (Elegant Gold, Minimal, Modern, Vintage...)
qr_template_presets
  id, name, preview_url, default_config jsonb
```

### Notifications
```sql
notification_settings
  id, business_id FK
  channel enum('email','sms','whatsapp','viber')
  trigger enum('booking_created','booking_reminder','booking_cancelled',
              'booking_no_show','review_request','marketing')
  enabled boolean
  template_id FK NULL
  hours_before int NULL  -- για reminder

notification_log
  id, business_id, booking_id, customer_id
  channel, trigger, status, sent_at, error
  cost_cents  -- για billing των SMS

notification_templates
  id, business_id FK NULL  -- NULL = system default
  channel, trigger
  subject, body  -- με variables: {customer_name}, {service}, {time}
  language enum('el','en')
```

### Subscriptions & Billing
```sql
plans
  id, name, slug
  price_cents_monthly, price_cents_yearly
  features jsonb  -- {max_staff, max_services, sms_enabled, custom_domain, ai_enabled}
  trial_days int  -- 90 για πρώτα 1000, 30 για μετά

subscriptions
  id, business_id FK
  plan_id FK
  stripe_customer_id, stripe_subscription_id
  status enum('trialing','active','past_due','cancelled')
  trial_ends_at timestamptz
  current_period_ends_at timestamptz
  cancel_at_period_end boolean

-- Pay-as-you-go credits (SMS, WhatsApp)
credit_balances
  id, business_id FK
  sms_credits int default 0
  whatsapp_credits int default 0

credit_purchases
  id, business_id, stripe_payment_intent_id
  amount_cents, sms_added, whatsapp_added
```

### Reviews (optional, on/off ανά business)
```sql
reviews
  id, business_id, customer_id, booking_id
  rating int (1-5)
  comment text
  business_reply text
  status enum('pending','published','hidden')
  created_at
```

### Categories (taxonomy)
```sql
categories
  id, slug, name_el, name_en, icon, parent_id
  -- π.χ. Beauty > Barber, Hair, Nails / Medical > Dentist / Fitness > PT
```

### Indexes & RLS
- Όλοι οι πίνακες έχουν Row Level Security (Supabase RLS policies):
  - Customers βλέπουν μόνο τις δικές τους κρατήσεις/profile
  - Business members βλέπουν μόνο το δικό τους business
  - Public read μόνο σε `businesses` (status='active'), `services`, `business_hours`, `qr_templates` του specific business
- Indexes σε `bookings(business_id, starts_at)`, `bookings(staff_id, starts_at)`, `businesses(slug)`, `businesses(category_id, address->>'city')`

---

## 5. Auth Strategy

| Actor | Methods | Verification |
|-------|---------|--------------|
| **Customer** | Google OAuth, Facebook OAuth, Phone (SMS OTP) | Πάντα verified phone ή verified social account → αποτρέπει fake bookings |
| **Business Owner** | Email + password, Google OAuth | Email verification + προαιρετική τηλεφωνική επαλήθευση |
| **Staff** | Invite link via email → δημιουργεί password | Email verification |
| **Platform Admin** | Email + password + MFA | Hardcoded admin emails ή `is_admin` flag |

Όλα μέσω Supabase Auth. Phone OTP μέσω Supabase Twilio integration.

**Important UX**: Στο QR-scan flow ο πελάτης πρέπει να μπορεί να δει το booking page και να δει διαθεσιμότητα **χωρίς login**. Login ζητείται **μόνο** στο "Confirm" step → ελάχιστο friction.

---

## 6. Key Features — Detailed

### 6.1 Business Onboarding Wizard (Google Places autofill)
**Flow:**
1. Sign up email/password
2. **Step 1 — Find business**: Search box → Google Places Autocomplete
3. Επιλέγει το κατάστημά του → pull: name, address, phone, website, opening hours, photos, place_id
4. **Step 2 — Confirm/Edit**: Form με προ-συμπληρωμένα τα παραπάνω + bilingual description
5. **Step 3 — Category**: Διάλεξε industry (Barbershop, Salon, Dentist...)
6. **Step 4 — Services**: Πρόσθεσε τις πρώτες υπηρεσίες (templates ανά category π.χ. "Ανδρικό κούρεμα — 20min — 15€")
7. **Step 5 — Staff**: Πρόσθεσε staff (ή skip — solo)
8. **Step 6 — QR Template**: Επιλογή preset → preview → download PDF
9. **Done!** → Δείχνει business dashboard + share link + QR

**Time to first QR**: στόχος < 5 λεπτά.

### 6.2 QR Template Editor (Killer Feature)
**Built with**: React + Fabric.js ή Konva.js (canvas-based)

**Editor capabilities:**
- **Layout**: Πορτραίτο A4 (μέγεθος βάσης), επίσης A5, custom
- **Background**: Solid color, gradient, image upload, presets
- **Logo**: Upload, position, resize
- **Brand name**: Font picker (curated list ~20 fonts με EL support), size, color
- **Establishment year, tagline**
- **Opening hours block**: Style options (table, list, minimal)
- **CTA badge**: «Κλείστε ONLINE» — customizable text/color
- **QR code**: Auto-generated από το booking URL, με κεντρικό icon (calendar/scissors) optional
- **Action icons**: «Κλείσε / Άλλαξε / Ακύρωσε ραντεβού» (showable/hideable)
- **Trust badges**: Reviews/customer count (toggle on/off — `show_stats`)
- **Footer**: Custom text + decorative element
- **Color presets**: 8 ready palettes (Black/Gold όπως Barber House, Pastel, Minimal, Modern, Medical, Fitness...)
- **Live preview** δίπλα στο editor
- **Export**: Print-ready PDF (300 DPI με bleed), PNG για social

**Server-side rendering**: Για το PDF χρησιμοποιούμε **Puppeteer/Playwright** σε Vercel Function ή React-PDF. Storage σε Supabase Storage. URL αποθηκεύεται στο `qr_templates.pdf_url`.

**QR Code generation**: `qrcode` library, content = `https://qlick.gr/b/{slug}?utm_source=qr` (UTM για analytics — πόσες κρατήσεις ήρθαν από QR).

### 6.3 Booking Flow (Customer)
**Public booking page (`/b/{slug}`)**:
1. Hero (cover + name + rating + categories)
2. About / location / hours
3. **Services list** (grouped by category, με duration & price)
4. CTA «Κλείσε ραντεβού»

**Booking widget (modal ή dedicated page):**
1. **Service selection** (multi-select για combo)
2. **Staff selection** (ή "Οποιοσδήποτε διαθέσιμος")
3. **Date picker** (calendar με διαθεσιμότητα)
4. **Time slots** (15min granularity, μόνο διαθέσιμα slots)
5. **Customer details**: Φόρμα ή login → λογαριασμός (Google/FB/Phone)
6. **Confirm**: Σύνοψη + κουμπί Confirm
7. **Success page**: Add to calendar, Cancel link, Modify link, share

**Smart availability algorithm**:
- Παίρνει business hours + closures + staff availability + existing bookings + service duration + buffer
- Returns array of valid timeslots
- Caching ανά business για performance

### 6.4 Business Dashboard
**Calendar (κύρια view)**:
- Day / Week / Month views
- Color-coded ανά service ή staff
- Drag & drop για reschedule
- Quick add booking (walk-in)
- Filters (staff, service, status)

**Services**: CRUD + import templates ανά category
**Staff**: Invite, schedules, services they perform, time-off requests
**Customers**: Λίστα όλων των πελατών που έχουν κάνει κράτηση + notes, history
**Marketing**: Email/SMS broadcasts (paid plan), discount codes, last-minute deals
**Reports**: Revenue (informational — δεν διαχειριζόμαστε χρήματα), booking count, source breakdown (QR vs web vs direct), no-show rate, popular services/staff
**QR Designs**: Λίστα saved templates, edit, re-download
**Settings**: Business info, hours, closures, brand, notifications, team

### 6.5 Notifications Engine
**Channels**:
| Channel | Provider | Cost | Plan Tier |
|---------|----------|------|-----------|
| Email | Resend | Free up to 3K/month, ~$1/10K | All plans |
| SMS | Twilio | ~€0.05/SMS (Greece) | Paid only (credits) |
| WhatsApp | Twilio WhatsApp Business | ~€0.04/message | Paid only (credits) |
| Viber | Infobip/Routee | ~€0.03/message | Paid only (credits) |

**Trigger jobs**:
- **Booking created** → instant email/SMS confirmation
- **24h before** → reminder
- **2h before** → final reminder (configurable)
- **No-show** → flag for review
- **After booking** → review request email (optional)

**Implementation**: Supabase Edge Functions + pg_cron για scheduled sends. Queue table για retries.

### 6.6 Subscription & Billing
**Plans (initial):**

| Plan | Price | Free trial | Features |
|------|-------|------------|----------|
| **Trial (early)** | Free | 90 days | All Basic, no SMS/WhatsApp |
| **Trial (regular)** | Free | 30 days | All Basic, no SMS/WhatsApp |
| **Basic** | €9/mo | — | Unlimited bookings, 3 staff, email notifications, QR editor, Google Places, 1 location |
| **Pro** | €19/mo (TBD) | — | + SMS/WhatsApp/Viber credits (50 included), 10 staff, marketing tools |
| **Premium** | €39/mo (TBD) | — | + AI receptionist (future), custom domain, advanced analytics, unlimited staff |

Counter μετράει active subscriptions για να καθορίσει trial length.

**Stripe integration**:
- Stripe Checkout για initial subscribe
- Stripe Customer Portal για cancellation/payment method
- Webhook handler για status changes (`/api/webhooks/stripe`)
- Credit purchases (SMS): one-time Stripe Payment Intent

### 6.7 i18n (EL/EN)
- `next-intl` library
- `/messages/el.json`, `/messages/en.json`
- Language switcher στο header
- URL prefix: `/el/...` και `/en/...` (default `/el/`)
- DB content (services, descriptions) έχει `_en` columns — fallback στα EL αν κενό

---

## 7. Integrations & Costs (Monthly estimate για 1000 active businesses)

| Service | Purpose | Estimated cost |
|---------|---------|----------------|
| **Vercel** | Hosting | $20-50 (Pro plan) |
| **Supabase** | DB + Auth + Storage | $25-100 (Pro plan, scales με usage) |
| **Google Places API** | Onboarding autofill | ~$50 (3K lookups/mo) |
| **Resend** | Email | $20-50 |
| **Twilio (SMS)** | Παίρνει credits από καταστήματα — break-even ή profit margin |
| **Stripe** | Payment processing | 1.4% + €0.25 ανά subscription |
| **Domain + SSL** | qlick.gr | €15/year + free SSL |
| **Misc** (Sentry, Posthog) | Monitoring | $20-50 |
| **Total fixed** | | ~€150-300/μήνα baseline |

**Revenue at 1000 paying @ €9** = €9000/μήνα → υγιές margin.

---

## 8. Code & Repo Structure

```
C:\Site\
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/      # Landing, pricing, about
│   │   │   ├── page.tsx
│   │   │   ├── pricing/
│   │   │   └── for-business/
│   │   ├── (booking)/
│   │   │   ├── b/[slug]/     # Public booking page
│   │   │   ├── search/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── signup/business/
│   │   ├── account/          # Customer dashboard
│   │   ├── dashboard/        # Business dashboard
│   │   │   ├── calendar/
│   │   │   ├── services/
│   │   │   ├── staff/
│   │   │   ├── qr/           # QR editor
│   │   │   ├── marketing/
│   │   │   ├── reports/
│   │   │   ├── billing/
│   │   │   └── settings/
│   │   └── admin/            # Platform admin
│   └── api/
│       ├── bookings/
│       ├── availability/
│       ├── geocode/          # Nominatim address autocomplete proxy
│       ├── place-search/     # Nominatim business autofill (onboarding wizard)
│       ├── reverse-geocode/  # Nominatim reverse proxy → { label } (GPS auto-detect)
│       ├── qr/generate/
│       ├── webhooks/stripe/
│       └── notifications/send/
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── booking/
│   ├── dashboard/
│   ├── qr-editor/            # Canvas editor components
│   └── marketing/
├── lib/
│   ├── supabase/             # client, server, admin
│   ├── stripe/
│   ├── google-places/
│   ├── notifications/        # email, sms, whatsapp adapters
│   ├── availability/         # slot calculation
│   ├── qr/                   # QR generation, PDF rendering
│   └── i18n/
├── messages/
│   ├── el.json
│   └── en.json
├── supabase/
│   ├── migrations/           # SQL migrations
│   ├── seed.sql
│   └── functions/            # Edge Functions
├── public/
│   ├── qr-presets/           # Template preset previews
│   └── ...
├── middleware.ts             # locale + auth routing
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

**Major dependencies**:
- `next@15`, `react@19`, `typescript`
- `@supabase/ssr`, `@supabase/supabase-js`
- `next-intl`
- `tailwindcss`, `shadcn/ui`, `lucide-react`
- `react-hook-form`, `zod` (forms + validation)
- `stripe`, `@stripe/stripe-js`
- `qrcode`, `fabric` ή `konva` (canvas editor), `@react-pdf/renderer` ή Puppeteer (PDF gen)
- `date-fns` ή `dayjs` με timezone support
- `resend`, `twilio`
- `posthog-js`, `@sentry/nextjs`

---

## 9. Development Roadmap

### **Phase 0 — Foundation** (project setup) — 1 σύνεδρο
- Next.js + TS + Tailwind + shadcn/ui setup
- Supabase project + auth + DB migrations
- i18n setup (EL/EN)
- Layout shells (marketing / dashboard)
- Branding (Qlick logo placeholder, colors, typography)

### **Phase 1 — Public + Auth** — 2-3 σύνεδρα
- Landing page (EL/EN) με conversion focus
- Pricing page
- Customer auth (Google/Facebook/Phone OTP)
- Business signup wizard (steps 1-2: account + business basics, **without** Google Places ακόμα)

### **Phase 2 — Core Booking** — 3-4 σύνεδρα
- Public business page `/b/[slug]`
- Services management (dashboard)
- Business hours management
- Staff management (basic)
- Availability calculation engine
- Booking flow (customer side)
- Bookings list (dashboard)

### **Phase 3 — QR Editor** ⭐ killer feature — 3-4 σύνεδρα
- Canvas editor με Konva.js
- Template presets (5 styles αρχικά)
- PDF/PNG export
- QR generation με UTM tracking
- Re-export, save multiple designs

### **Phase 4 — Calendar + Polish** — 2-3 σύνεδρα
- Full calendar view (day/week/month)
- Drag-drop reschedule
- Walk-in quick add
- Customer database view

### **Phase 5 — Notifications** — 2 σύνεδρα
- Email confirmations + reminders (Resend)
- SMS/WhatsApp adapters (gated by plan/credits)
- Notification settings UI

### **Phase 6 — Smart Onboarding** — 1-2 σύνεδρα
- Google Places integration
- Auto-fill onboarding step
- Photo import

### **Phase 7 — Billing** — 2 σύνεδρα
- Stripe Checkout for subscriptions
- Customer portal
- Trial logic (1000-counter)
- Credit purchases for SMS

### **Phase 8 — Marketing & Reports** — 2-3 σύνεδρα
- Marketing campaigns
- Discount codes
- Analytics dashboard
- Source attribution (QR vs web)

### **Phase 9 — Polish, GDPR, Launch** — 2 σύνεδρα
- Privacy policy, ToS, cookie banner
- GDPR data export/delete
- Sentry, PostHog
- SEO (sitemap, structured data per business)
- Performance audit

### **Future (post-launch)**:
- AI Receptionist (assistant.ai)
- Multi-location chains
- POS-like cash register
- Staff time-off requests/approvals
- Loyalty program
- Mobile apps (React Native / PWA)
- Custom domain για premium

---

## 10. Open Questions για μελλοντική απόφαση

- **Domain**: qlick.gr vs qlick.app vs qlick.io;
- **Logo**: Σχεδιασμός — μόνοι μας στο Phase 0 με placeholder ή hire designer;
- **Pro/Premium plan pricing**: Εξετάζεται μετά το AI scope
- **AI Receptionist scope**: voice (Twilio + Claude/OpenAI) ή chat μόνο;
- **Custom domain**: Σε ποιο plan; (Premium προτείνεται)
- **GDPR DPO**: Απαιτείται για EU operations σε κάποιο όγκο
- **Λογιστικό/Νομικό**: Σύσταση εταιρείας, ΦΠΑ subscriptions

---

## 11. First Sprint — Τι ξεκινάω αμέσως μόλις εγκριθεί το plan

1. `npm create next-app@latest` με TypeScript + Tailwind + App Router
2. Install: `shadcn`, `next-intl`, `@supabase/ssr`, `lucide-react`
3. Supabase project create + run πρώτη migration με tables: `profiles`, `businesses`, `business_hours`, `services`, `bookings`
4. Layout shell + branding tokens (κρατάμε Black/Gold όπως το Barber House mock — clean & premium)
5. Landing page Greek-first με placeholder copy
6. Auth pages (login/signup)
7. Business signup wizard steps 1-2

Συνολικά για Phase 0 + Phase 1: ~3 με 4 working sessions για να έχουμε live landing + auth + business onboarding skeleton.
