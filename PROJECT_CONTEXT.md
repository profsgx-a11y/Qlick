# Qlick — Project Context (handoff)

> Read this first. Everything a new session needs to continue development.
> Companion doc: `C:\Site\ARCHITECTURE.md` (original 10-phase plan).

---

## 1. What Qlick is

SaaS **online-booking platform** for appointment-based businesses (beauty, medical,
fitness, lessons…), like **Fresha but with a QR-poster-first differentiator** and
**no POS**. Customers scan a QR poster on the shop door (or visit a link), pick a
slot, and book. The **QR Template Editor** (Canva-like) is the killer feature.

- **Scope:** everything Fresha has **minus POS**. Customers pay **at the shop**; the
  platform never handles customer→business money. Stripe is only for shop→Qlick
  subscriptions (not yet built).
- **Target market:** Greece first; UI is **EL (default) + EN**.
- **Brand:** Qlick. Premium dark UI. Domain TBD (qlick.gr / qlick.app).

## 2. Business model (decided)

- First **1000** shops that register: **3 months free**. After that: **1 month free**.
- Then **€9/month Basic**. Pro/Premium (SMS/WhatsApp/Viber credits, AI receptionist,
  custom domain) — pricing TBD.
- Free/trial accounts: **no SMS/WhatsApp** (cost control); email only.

## 3. Tech stack

- **Next.js 16.2.9** (App Router, **Turbopack**), **React 19.2.4**, **TypeScript**, **Tailwind v4**.
- **Supabase** (Postgres 17 + Auth + Storage) via `@supabase/ssr`.
- **Konva 10 / react-konva 19** + **jspdf 4** + **qrcode** (QR editor & export).
- **libphonenumber-js** (phone validation), OpenStreetMap **Nominatim** (address autocomplete).
- **i18n: vanilla** (NOT next-intl). Dictionaries in `lib/i18n-dict.ts` (authDict) and
  `i18n/dictionaries/{el,en}.json` (Dictionary); `i18n/config.ts`; locale routing in `proxy.ts`.
  **Client i18n provider** (added 2026-06-18): `i18n/shared.ts` (Dictionary type w/o server-only),
  `i18n/provider.tsx` (`DictProvider` + **`useDict()`** hook) mounted in `app/[locale]/layout.tsx`.
  Pattern: server components → `getDictionary(locale)`; client → `useDict()`. Add a new section to
  BOTH json files, then replace hardcoded GR with `dict.X`. Server-action user messages → return
  **stable codes**, map to locale client-side (never GR strings from server in client error paths).
  Category names bilingual via `name_el`/`name_en` per locale.
  **i18n rollout STATUS: ✅ COMPLETE (incl. server-action errors).** ✅ marketing/auth · ✅ public
  `shop`+`booking` · ✅ `search` · ✅ customer `account` · ✅ **dashboard 100%** (sidebar/topbar/overview/
  services/bookings/reviews/settings/staff/reports/calendar + components) · ✅ **QR editor internals**
  · ✅ **ALL dashboard server-action messages** now return **stable codes** translated client-side via
  `dashboard.errors.*` (dict el+en) + helper `lib/dash-error.ts` `dashErr(errors, code, fallback)`.
  Every page AND every server error renders EL/EN. Pattern for new server actions: return a code, add
  it to `dashboard.errors` (both json), display with `dashErr(dd.errors, res.error, fallback)`.
  Memory: `project_i18n_rollout`.
- App lives in **`C:\Site\qlick-app`**. Local-only dev (no deploy yet).

## 4. Supabase project

- **Project ref/id:** `bjkzkmhpyiqvmdhcfpco` — region **eu-central-1** (Frankfurt), Postgres 17.
- Managed via the **Supabase MCP** tools in-session (apply_migration, execute_sql,
  generate_typescript_types, get_advisors, get_logs…).
- `qlick-app/.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (modern publishable key, not legacy anon).
- **Email confirmation is OFF** for dev (Auth → User Signups → "Confirm email") so signup
  auto-logs-in. Turn ON for production (with real SMTP e.g. Resend).
- **OAuth (Google/Facebook):** UI + callback route built but **INACTIVE** — needs
  credentials added in the Supabase dashboard. Email/password works.

## 5. How to run / verify

```
cd C:\Site\qlick-app
npm run dev          # Turbopack, http://localhost:3000  (redirects / -> /el)
npx tsc --noEmit     # type-check (do this after every change set)
```
- **⚠️ Mobile / phone testing — the REAL fix is `allowedDevOrigins` (in `next.config.ts`).**
  Next 16 **blocks cross-origin dev resources** (`/_next/*`, HMR) when you open the site from the
  **LAN IP** (e.g. `192.168.1.74:3000`) instead of localhost → the page renders but the client
  doesn't fully hydrate → **taps don't work on the phone**. Fixed by `allowedDevOrigins:
  ["192.168.1.74","192.168.1.*","192.168.0.*","10.0.0.*","172.16.0.*"]` in `next.config.ts`. With
  that in place, **`npm run dev` works fine on the phone** (no need for a production build). If the
  user's LAN IP isn't covered, add it there. `next dev` binds to `0.0.0.0` by default → phone reaches
  `http://<LAN-IP>:3000`.
  - Production build is still the fastest/most reliable for phone demos:
    `npm run build` → `npx next start -H 0.0.0.0 -p 3000` (no hot-reload — rebuild after edits).
  - The user tests on a real iPhone — verify mobile behavior by exercising it (memory
    `feedback_mobile_verification`).
- **Turbopack instability (the user has a "RESET for 500" script — crashes recur).** Two seen:
  (1) "Jest worker encountered… exceeding retry limit"; (2) **`RangeError: Map maximum size exceeded`**
  (`AsyncHook.init` via `useActionState`, worsened by blocked-HMR retry storm). Quick fix: kill node,
  `rm -rf .next`, restart. The `allowedDevOrigins` fix above should reduce (2) (stops the HMR storm).
  **If crashes persist, switch the `dev` script to `next dev --webpack`** (stable bundler, slightly
  slower HMR; `--webpack` flag exists in Next 16).
- Smoke-test routes with `curl -sSL -o /dev/null -w "%{http_code}"`; check the dev
  server background log for `⨯`/errors.
- DB checks/migrations via Supabase MCP. After schema change: regenerate types and
  update `lib/supabase/types.ts` (kept hand-synced).

## 6. Repo layout (`qlick-app/`)

```
app/[locale]/
  (marketing)/          landing (page.tsx shows the saved QR poster in hero), layout adds Google Fonts
  (auth)/
    login/              email/password + social buttons
    signup/business/    3-step wizard (account→business→hours); actions.ts, wizard.tsx
    auth/callback/      OAuth code exchange ; auth/logout/
  b/[slug]/             public business page (hours respect day_order)
    book/               customer booking flow (booking-flow.tsx, actions.ts)
  account/              customer "my bookings"
  dashboard/
    layout.tsx          sidebar + auth guard (requireBusiness)
    page.tsx            overview: "today" stat cards (bookings today / staff on shift today /
                        revenue today) + onboarding checklist (draft) → 48h publish celebration
    services/           CRUD (services-manager.tsx, actions.ts)
    bookings/           list w/ tabs (upcoming/past/cancelled/all), counts, status actions, bulk delete
    qr/                 QR EDITOR — qr-editor.tsx (Konva), konva-nodes.tsx, qr-editor-loader.tsx (dynamic ssr:false), actions.ts
    calendar/           full calendar (day/week/month)
    reports/            analytics (revenue/bookings/source/no-show/top services+staff, ?range=)
    settings/           business info + HOURS EDITOR (drag-reorder days, split shifts) — hours-editor.tsx, actions.ts
app/api/geocode/route.ts   Nominatim proxy (countrycodes=gr,cy)
app/api/place-search/route.ts  Nominatim business autofill (extratags: phone/hours/website)
app/api/reverse-geocode/route.ts  Nominatim reverse proxy ?lat=&lng=&lang= → { label: "Suburb, City" } (used by GPS auto-detect in search + GPS button in Settings)
proxy.ts                locale routing + Supabase session refresh (NOT middleware.ts)
lib/
  supabase/{client,server,types}.ts
  qr-template.ts        design model (elements: text/rect/ellipse/line/image/qr/icon/table), PALETTES,
                        buildDefaultTemplate, buildIconSvg, buildTableSvg, ICONS, applyPaletteToDesign, font helpers
  qr-render.ts          server-side QrDesign → SVG (used by landing hero)
  availability.ts       timezone-aware slot computation (handles multiple/split shifts)
  dashboard.ts          requireBusiness() guard + business context
  validation.ts (email/phone), format.ts (money/duration/datetime), qr.ts, slug.ts, i18n-dict.ts, utils.ts
components/  ui/  marketing/  dashboard/  brand/  auth/
```

## 7. Database (Postgres) — current schema

**Tables:** `profiles` (extends auth.users; trigger auto-creates; **first_name + last_name**
[migration 034 — replaced `full_name`]; **account_type** customer|business — strict role
separation), `businesses`
(slug, name, category_id, phone, address jsonb, status draft|active|suspended,
brand_colors, show_reviews/stats, **day_order jsonb** [display order of days]),
`business_members` (owner|manager|staff|receptionist), `categories` (41 total = 7 parents +
34 subcats: beauty/medical/fitness/education/automotive/pets/other; migration 041 added 11 medical
specialties + 3 beauty subcats), `business_hours`
(day_of_week 0-6, is_closed, open/close_time, **order_index** for split shifts —
multiple rows per day = morning+afternoon), `business_closures`, `service_categories`,
`services` (duration, buffer, price_cents, is_active, bookable_online), `bookings`
(starts/ends_at, status pending|confirmed|completed|cancelled|no_show, snapshot
service_name/price, customer_name/phone/notes), `qr_templates` (config jsonb = QrDesign,
is_default, png_url/pdf_url). **View:** `my_businesses` (security_invoker).

**RPCs (all SECURITY DEFINER, owner-checked):**
- `create_business_with_owner(name,slug,category,phone,address,hours)` — atomic business+owner+hours; inserts 2 hour rows for split shifts (open_time2/close_time2). **One business per owner** (migration 035): raises `already_owns_business` if the caller already has an `owner` membership. `businesses` has NO INSERT RLS policy → this RPC is the only creation path. The wizard page + action also redirect an existing owner to /dashboard.
- `create_booking(business,service,starts_at,name,phone,notes)` — validates, computes ends_at, **double-booking guard**, snapshots.
- `get_busy_intervals(business,from,to)` — busy ranges only (no customer data) for public availability.
- `email_available(email)` — signup early check (anon-callable).
- `delete_past_bookings(business)` / `delete_cancelled_bookings(business)` — bulk cleanup.
- `is_business_member` / `is_business_owner_or_manager` — RLS helpers.
- Triggers: `tg_set_updated_at`, `handle_new_user`, `tg_set_completed_at` (stamps
  `bookings.completed_at` on →completed), and **publish triggers** `services_activate_business`
  + `staff_activate_business` → both call **`maybe_activate_business(business)`** which flips
  draft→active ONLY when the business has BOTH an active+bookable service AND ≥1 active staff
  (migration 038; replaced the old "active on first service" behavior).

**RLS:** enabled everywhere. Public read of active businesses + their services/hours/
closures/qr_templates. Members read own business; owners/managers write. Customers
read/create own bookings; owners update bookings of their business. Business creation
ONLY via the RPC (no direct insert policy). Storage bucket **`business-assets`** (public)
for logos.

**Migrations applied:** 001–028 (core auth → split shifts → day_order → qr_templates →
staff/service_staff → reviews → staff hours/time-off → landline → 026 account_type → 027 unified
booking → 028 favorites → 029 half-star ratings + review name visibility → 030 customer
cancel/reschedule → 031 profile address → 032 business_categories → 033 blocks/reports →
034 first_name/last_name split (drop full_name) → 035 one-business-per-owner guard in
`create_business_with_owner` → **036 review 48h window** (`bookings.completed_at` + trigger
`tg_set_completed_at`; `create_review` rejects with `review_window_closed` if >48h after completion)
→ **037 pin search_path on that trigger** → **038 publish requires staff+service**
(`maybe_activate_business` + triggers on services & staff) → **039 bookings_paused**
(`businesses.bookings_paused`; `create_booking` raises `bookings_paused` when set —
lets an owner temporarily pause ONLINE customer bookings while entering existing ones;
dashboard walk-ins bypass the RPC so they keep working) → **040 published_at**
(`businesses.published_at`; set by `maybe_activate_business` on go-live, backfilled to
created_at — drives the "published!" celebration which now shows only for the first 48h)) →
**041 categories expansion** (11 medical specialties: pediatrician/cardiologist/ent/ophthalmologist/
dermatologist/gynecologist/orthopedist/psychiatrist/speech-therapy/endocrinologist/neurologist +
3 beauty: makeup-artist/laser-hair-removal/slimming — all bilingual name_el/name_en, idempotent
ON CONFLICT(slug)) → **042 platform admin** (`profiles.is_admin`; `is_platform_admin(uid)` helper;
admin RLS on `categories`; SECURITY DEFINER admin RPCs `admin_overview_stats`/`admin_list_businesses`/
`admin_set_business_status`/`admin_delete_business`/`admin_list_users`/`admin_delete_user`) →
**043** (revoke execute on admin fns from anon/public, grant authenticated) → **044 admin trial
visibility** (no new tables — `admin_overview_stats` adds `in_trial`/`trial_expired`/`subscribed`[=0
placeholder until Stripe]; `admin_list_businesses` adds `published_at`/`trial_state`/`trial_days_left`/
`trial_total_days`. Trial = 90 days for the first 1000 by registration order (`created_at` rank), 30
after; **clock starts at `published_at`** (go-live), state not_started/trialing/expired) → **045 admin
last-login** (`admin_list_businesses` adds `owner_last_sign_in_at` = owner's `auth.users.last_sign_in_at`;
businesses list shows a «Τελευταία σύνδεση» column — never / today / «πριν N ημ.», warning ≥30d).
`favorites`
(customer_id→profiles, business_id→businesses, PK pair, RLS own-only). `reviews.rating` is
**numeric(2,1)** (half steps); `create_review`/`update_review` take `p_name_visibility`
('full'|'first'|'anonymous') and resolve the stored `customer_name` server-side from profile name.
**Review eligibility (migration 036):** a customer may leave a review ONLY while the booking is
`completed` AND within **48h** of `completed_at` (set by trigger when status→completed; covers all
status-change paths). Cancelled/no-show → never (also blocked by `booking_not_completed`). Editing an
existing review is NOT time-limited. UI (`account/page.tsx` + `review-button.tsx`) shows the
«Άσε κριτική» button only inside the window (+deadline hint), else a muted "window expired" note.
`create_review`/`update_review` actions now return **stable codes** → `lib/review-error.ts`
`reviewError(acc, code)` translates them (account dict `errReview*`).

**Account roles (migrations 026–027):** `profiles.account_type` (`customer` default | `business`).
`lib/auth.ts` → `roleHome()` + `getAccountType()`. **UNIFIED model** (Supabase locks email as
unique → can't have 2 accounts per email): one account does BOTH. `account_type` is only the
**default login home** (business→/dashboard, customer→/account), NOT a hard gate. A business
account CAN also book as a customer (027 dropped the `business_cannot_book` guard) and access
/account; /account shows a «Διαχείριση καταστήματος»→/dashboard link when the user owns a business;
dashboard sidebar has «Τα ραντεβού μου»→/account. Customer signup requires a **mobile** phone.
**Two signup paths:** `/signup` chooser (2 cards) → `/signup/customer` or `/signup/business`
(existing wizard). Login + marketing header link to `/signup`.
**Customer account area (Phase C):** `account/layout.tsx` (shared header + `AccountNav` tabs) wraps
4 tabs — `/account` (bookings), `/account/favorites`, `/account/reviews` (my-reviews + edit),
`/account/profile` (name/mobile via `updateProfile` + password via `changePassword`). Favorites:
`FavoriteButton` (heart) on public `/b/[slug]` hero + favorites list; `toggleFavorite` action.
**Discovery** `/account/search` + public `(marketing)/search`: `business-search.tsx` (category
dropdown + OSM city/area autocomplete → lat/lng) → server haversine (30km radius, nearest-first,
category incl. children) over active businesses. **GPS auto-detect** on mount (`useEffect([])`):
`navigator.geolocation.getCurrentPosition()` → `/api/reverse-geocode` → sets `coords`+`locText`
silently (no button; silent fail on permission denied). Prop `basePath?` fixes a pre-existing bug
(always redirected to `/account/search`; public search page passes `basePath="/{locale}/search"`).
`AddressAutocomplete.onChange` is guarded by `userTyped.current` → programmatic GPS `setLocText`
never triggers `setCoords(null)`. Cards redesigned: **logo (h-16 w-32, object-contain, 2:1 ratio)
+ name top**, details+distance+actions below `border-t`. Same layout in `account/page.tsx`,
`account/favorites`, `account/search`, `(marketing)/search`, `my-reviews.tsx`. Tabs in `AccountNav`
use flex-wrap (no scroll). Booking cards (account + search) show a favorite heart.
**Customer self-service** (migration 030): upcoming bookings have `booking-actions.tsx` →
**cancel** (`cancel_booking` RPC) + **reschedule** (`reschedule_booking` RPC — mirrors create_booking
availability checks, excludes self; same service + staff preference; reuses `getAvailableSlots`).
NOTE: Supabase returns `numeric` (e.g. reviews.rating) as a **string** → coerce with `Number()`.
**Profile** `/account/profile`: name + **required mobile** + optional home address (`profiles.address`
jsonb, migration 031, city/street/postcode + lat/lng) + change password. The saved address
**prefills `/account/search`** as the default location (distances from home). Customer signup stays
minimal (no address).
**Multi-category** (migration 032): `business_categories(business_id, category_id)` many-to-many —
a business can offer several service types and appears in each one's search. Settings has a
`category-editor.tsx` (chips, `saveBusinessCategories`); `businesses.category_id` kept as primary.
`/account/search` filters via `business_categories` (parent ⇒ children).
**Name split + mandatory business address** (migration 034): `profiles.full_name` dropped →
**`first_name` + `last_name`** (backfill split; `handle_new_user` reads first/last from metadata,
falls back to splitting a `full_name` so the in-booking guest signup still works; `create_review`/
`update_review` build the displayed name from first/last). Split applied in customer signup,
business wizard, Settings (business-info-editor «δικό σου»), and customer profile-form;
`DashboardContext` exposes firstName/lastName. **Business address is now required** (street/city/
postcode) in both the signup wizard and Settings (client + server validation); a new optional
**`address.area`** (Περιοχή/Γειτονιά) is stored in the address jsonb. Customer address stays optional.

## 8. Features built (Phases 0–3 complete)

- **Phase 0:** landing (EL/EN, premium dark), branding, i18n, proxy locale routing.
- **Phase 1:** customer/owner auth; 3-step business signup wizard with **email + Greek
  phone validation**, **OSM address autocomplete**, OAuth buttons (inactive), early
  email-availability check; authenticated mode (skips account step after OAuth).
- **Phase 2:** dashboard shell; **services CRUD**; **public business page**;
  **availability engine** (timezone Europe/Athens, split shifts); **booking flow**
  (service→date→slot→mandatory login→confirm; phone uses same validation); **bookings
  management** (tabs + counts + confirm/complete/no-show/cancel + restore cancelled +
  bulk delete past/cancelled); customer **/account**.
  - **Past-due reminder**: `dashboard/layout.tsx` queries bookings still
    `pending`/`confirmed` with `ends_at < now()` → `components/dashboard/past-due-reminder.tsx`
    (auto-opening modal on every dashboard page, floating badge to reopen) lets the owner mark each
    Completed/No-show/Cancelled (reuses `updateBookingStatus`). Dict `dashboard.pastDue.*`.
- **Phase 3 — QR Editor** (Konva, `dashboard/qr`):
  - Elements: text, rect, ellipse(circle), line, image(logo upload→Storage), qr, icon
    (16-icon library), **table** (auto-aligned schedule; per-row line toggle; outer/column
    borders; pulls hours from Settings via "Φόρτωση από Ρυθμίσεις"; drag-reorder rows).
  - Multi-select (shift-click + rubber-band), group move, **alignment guides + magnet
    snapping** (Shift = free), rotation (handle + numeric, center-preserving),
    keyboard shortcuts (Ctrl C/X/V/D, **undo/redo Ctrl Z/Y**, Delete, Esc, arrows),
    layer order, opacity, auto-width text, click-empty deselect.
  - **3 palettes** (Black/Gold, Navy/Gold #0B2341, Green/Gold #0E3B2E) all white bg;
    `applyPaletteToDesign` recolors by role (DARKS→primary, GOLDS→accent, LIGHTS→bg).
  - Export **PNG (2×)** + **PDF A4** (jspdf); save/load default template (upsert).
  - **Landing hero** renders the saved poster via `lib/qr-render.ts` (server SVG).

## 9. Design / branding

- **UI (app):** dark — bg `#0a0a0a`, surfaces `#111/#181818/#1f1f1f`, text `#f5f5f4`,
  gold accent **`#d4a857`**. Font **Inter** (has greek subset). Tokens in `app/globals.css`.
- **QR poster:** premium gold **`#C89B3C`**; inks `#111111`/`#1F1F1F`; muted `#6b6b6b`.
  Fonts: **Bebas Neue** (Latin logo), **Montserrat** (greek headings/body/table),
  **EB Garamond Italic** (greek premium italic). ⚠️ Poppins/Playfair/Cormorant/Anton/
  Oswald have **no Greek glyphs** — only for Latin. Poster fonts loaded via Google Fonts
  `<link>` (NOT next/font — Konva canvas needs literal family names).

## 10. Conventions & gotchas (important)

- **Next.js 16:** use `proxy.ts` (middleware deprecated); `params`/`searchParams` are
  **Promises** (await); prefer **inline param types** over `PageProps`/`LayoutProps`
  generics; bundled docs at `node_modules/next/dist/docs/` are the source of truth.
- **Konva** components must be **dynamic-imported with `ssr:false`** (loader pattern).
  Resize: bake scaleX/scaleY into width/height (reset scale). `strokeScaleEnabled={false}`
  on shapes/lines. Background rect `listening={false}` so empty clicks hit the stage.
  `boundBoxFunc` must allow thin boxes (lines) — reject only when both dims tiny.
  lucide `Palette` clashes with our `Palette` type → import as `PaletteIcon`.
- **Supabase SSR:** `proxy.ts` MUST call `createServerClient` + `await getUser()` each
  request (refreshes session/cookies) or server actions run as `anon` → RLS errors.
  Owner-scoped multi-row writes → SECURITY DEFINER RPCs. Type generator marks RPC args
  non-null even when SQL allows null → pass "" / validated values.
- **business_hours vs QR poster table:** the Settings hours are the source of truth for
  booking availability + public page. The QR poster's table element is a **decorative
  snapshot** (manually editable; "Φόρτωση από Ρυθμίσεις" re-syncs it).
- Money stored as `price_cents`. Times stored as `time`; bookings as `timestamptz`.
- **Dark-theme opt-out (`color-scheme: dark`):** the site declares `color-scheme: dark` in
  `globals.css` `:root` AND `viewport.colorScheme="dark"` (root layout → `<meta name=color-scheme>`).
  This is the **official opt-out from Chromium auto-dark-mode** (desktop Brave/Chrome/Edge force-dark).
  Without it those browsers recolor the page and **break the QR poster** (its schedule table renders
  as a `data:` `<image>` that force-dark won't invert → dark text on a darkened bg = invisible). **Keep
  this declared.** ⚠️ This does **NOT** stop **Brave iOS "Night Mode"** — a separate forced WebKit
  filter (all iOS browsers are WebKit) that ignores `color-scheme` and can't be opted out of by the
  site. **Fix for Night Mode = render the hero poster as a single flat PNG** (a raster `<img>` is
  treated as a photo → true colors survive the filter; confirmed working in Brave Night Mode).
  `(marketing)/page.tsx` hero fallback chain: **(1)** `public/hero-poster.png` if present → `<img>`;
  **(2)** live SVG `renderDesignToSvg`; **(3)** `QrPreview`. The PNG is currently a **manual** snapshot
  dropped in `public/` (future: auto-upload from the editor `stage.toDataURL` → Storage →
  `qr_templates.png_url`). Booking page `/b/[slug]` uses HTML hours so it was never affected.
  The **QR editor** toolbar (`qr-editor.tsx`, an info (i) button + popover next to the «QR» button)
  shows `dashboard.qr.browserNoteTitle/browserNoteBody` telling owners that on-screen distortion/odd
  colors are their browser's dark/night-mode/filters/extensions, and the exported PDF/PNG is unaffected.
- Conflict/availability is **business-level** (one appointment at a time) — fine for solo
  pros; needs staff/resources for multi-chair shops (future).
- **Mobile / responsive (done 2026-06-19, verified on a real iPhone):** the whole app is
  mobile-friendly. Public pages (landing/auth/`/b/[slug]`/booking/`/account`) were already
  responsive. The **dashboard** got a mobile shell: `components/dashboard/mobile-nav.tsx`
  (`MobileNavProvider`+`useMobileNav`); a **hamburger in the Topbar** (`md:hidden`) opens the
  Sidebar as a **drawer**; content padding `p-4 sm:p-6 lg:p-8`. Account tabs (`account-nav.tsx`)
  use the same hamburger-drawer pattern below `md` (desktop = horizontal tabs). Headers
  (`account/layout`, `marketing/header`): manage/logout buttons are **icon-only below `sm`** to
  avoid overflow. List cards with a logo (account/search/favorites/reviews) → logo
  `size-16 sm:h-24 sm:w-48` + left group `flex-1` + booking name-row `flex-wrap`.
  - **⚠️ Drawer pattern = CONDITIONAL RENDER (not translate-toggle).** Both drawers mount **only
    while open** (`{open && <div className="md:hidden">…backdrop+aside…</div>}`); desktop is a
    permanent `hidden md:flex` column. **Do NOT** hide a drawer by toggling
    `-translate-x-full`↔`translate-x-0` with `transition-transform`: in **Tailwind v4** the
    transition animates the `translate` *property* and **gets stuck between `%` and `px`** (the
    drawer froze off-screen / wouldn't open). Conditional render avoids this AND guarantees a
    closed drawer can never overlay/block taps. Breakpoint = **`md` (768px)**.
  - All breakpoints are **`sm`/`md`/`lg` only → desktop is byte-for-byte unchanged.**
  - The **QR editor is desktop-only**: `qr-editor-loader.tsx` `matchMedia("(min-width:768px)")`
    gate → below that a «Best on a computer» notice (`dashboard.qr.mobileTitle/mobileBody`), Konva
    not mounted.
  - `globals.css`: interactive elements get `touch-action: manipulation` +
    `-webkit-tap-highlight-color: transparent` (snappy iOS taps).
  - New dashboard pages: keep `<Topbar/>` + `<div className="p-4 sm:p-6 lg:p-8">`; wide controls
    (tab strips, multi-col toolbars) need `overflow-x-auto` or `flex-col … md:grid`.

## 11. Current state

- **One business:** "Barber House", slug `barber-house`, status **active**,
  owner `giorgakis18os@gmail.com`, city **Κομοτηνή**. Has services, hours, and a custom saved QR
  poster. DB otherwise clean.
- Landing hero shows that saved poster. Everything type-clean; routes return 200.
- **Mobile responsiveness COMPLETE & verified on the user's real iPhone** (all reported bugs fixed).
- **⚠️ Barber House coordinates (41.1185163, 25.3932547) have ~865m OSM error.** The GPS button
  in Dashboard → Settings is the fix: use it on the phone WHILE AT the shop (after granting Safari
  location permission: Settings → Privacy → Location Services → Safari → While Using, AND in Safari
  tap «AA» → Website Settings → Location → Allow). The button also updates the city field via
  reverse-geocode so coords/city stay in sync.

## 12. Pending / likely next

- **Platform Admin (`/admin`)** — BUILT (migrations 042/043; `app/[locale]/admin/` overview +
  businesses + users + categories + **settings** [change password/email]; `lib/admin.ts` `requireAdmin`;
  `lib/auth.ts` `userHome` sends admins to /admin on login). **Admin account exists:**
  `admin@qlick.gr` / `12345678` (`profiles.is_admin=true`; hand-created in `auth.users`+`auth.identities`).
  Login with it → lands on `/admin`. **Overview now shows a «Συνδρομές» section** (in-trial / trial-expired /
  paying[=0 until Stripe]) and the Businesses list has a **«Συνδρομή» badge column** (Trial · Xd / expired /
  not-started) — migration 044; trial computed from `published_at` + registration rank, no billing tables yet.
  Future admin modules: reviews moderation, subscriptions/Stripe (turns the 0 placeholder real),
  **email-sent counter vs Resend limit** (user wants it; build with the notifications engine), audit log,
  login-as-business for support.
- **Fix Barber House GPS coords**: owner must use the GPS button in Dashboard → Settings while
  standing at the shop with a phone that has location permission (see §11 above for iOS steps).
- **Notifications** (email confirmations/reminders via Resend) — not built. When built, add a
  `notification_log` and surface an **email-sent-this-month vs plan-limit counter in the admin overview**
  (user asked, so he can upgrade Resend before hitting the ~3,000/mo free cap).
- **Activate Google/Facebook OAuth** (add credentials in Supabase dashboard).
- **Template cloning:** make new businesses start from a chosen poster layout — user asked; not built.
- **Billing/Stripe** (Phase 7), AI receptionist (future).
- Security: landing renders saved poster via `dangerouslySetInnerHTML` (SVG). Text is
  escaped; colors/fonts inserted raw — fine for single trusted owner, **sanitize before
  multi-tenant public showcase**.

## 13. Working style (user preferences)

- User is a **non-technical founder**; communicates in Greek/greeklish. Reply in Greek;
  explain decisions by **business impact**, not implementation. Show results/screenshots for UI.
- **⚠️ BILINGUAL-FIRST (hard rule):** EVERY new feature/page/string ships in **both EL + EN from
  the start** — never hardcode Greek, never defer translation. Add keys to BOTH `i18n/dictionaries/
  el.json` AND `en.json` (symmetric); client → `useDict()`, server → `getDictionary(locale)`;
  server-action errors → return a **code**, translate client-side via `dashErr(dd.errors, res.error,
  fallback)` (`lib/dash-error.ts`) with the code added to `dashboard.errors` in both json. Before
  calling anything "done": verify the two json are symmetric (no missing keys) + tsc clean. See memory
  `feedback_bilingual` and `project_i18n_rollout`.
- For **big features: ask clarifying multiple-choice questions + brief plan before coding**.
  Trivial fixes: just do them.
- Persistent memory in `C:\Users\giorg\.claude\projects\C--Site\memory\` (project/user/
  feedback notes) — keep it updated, don't duplicate the repo.
