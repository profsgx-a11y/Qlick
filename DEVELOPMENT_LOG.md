# Qlick — Development Log

> Χρονολογικό ημερολόγιο αποφάσεων & προόδου ανά session.
> Companion docs: `PROJECT_CONTEXT.md` (handoff), `ARCHITECTURE.md` (αρχικό 10-phase plan).
> Νεότερη εγγραφή πάνω-πάνω.

---

## 2026-07-16 — Εισαγωγή ραντεβού από Excel + Εξαγωγή (Onboarding Φάση 1) ✅ DONE

Ο user: «θα βαρεθούν να περάσουν τα ραντεβού τους & δεν θα δοκιμάσουν» → σχέδιο 2 φάσεων (AskUserQuestion):
**Φάση 1 = Excel import/export (τώρα)** · Φάση 2 = Google Calendar (αρχική φόρτωση + push Qlick→GCal +
busy blocks GCal→Qlick — θέλει Google verification για calendar scope, ξεκινά νωρίς). Αποφάσεις: πρότυπο +
έξυπνη ανίχνευση (όχι ελεύθερο mapping UI)· GCal events = κλεισμένες ώρες + προαιρετικό one-time import.
- **migration `add_import_booking_source`:** `bookings_source_check` +`'import'`. SQL smoke (rollback):
  insert completed+completed_at+source='import'+card link περνά όλα τα constraints.
- **`lib/booking-import.ts` (pure core, 0 εξαρτήσεις από HTTP/exceljs):** `foldText` (πεζά/τόνοι/ς→σ),
  `detectColumns` (συνώνυμα EL/EN, exact→contains, phone πριν το name, **date πριν το time** ώστε το
  «Ημερομηνία & Ώρα» να πάει στο date), parse ημερομηνιών (Date/Excel serial/DD-MM-YYYY κ.λπ. + 2ψήφιο
  έτος), ωρών (HH:MM/κλάσμα ημέρας/πμ-μμ), διάρκειας («1:30»→90), τιμής («15,50»/€), `matchByName`
  (exact→unique prefix→unique substring, αλλιώς null→χειροκίνητο mapping), `parseSheet` (προβλήματα ανά
  γραμμή: bad_date/bad_time/missing_name/bad_phone/unknown_service/unknown_staff/duplicate_in_file +
  `whenLabel` server-side), `finalizeRows` (mappings, διάρκεια/τιμή από υπηρεσία, past→isPast, dedupeKey =
  starts|τηλέφωνο-ψηφία ή folded όνομα). Timezone μέσω υπάρχοντος `zonedTimeToUtc`. **2 test suites**
  (esbuild bundle + node — το tsx σπάει το libphonenumber JSON require): 46 checks core + **round-trip σε
  πραγματικό .xlsx** (exceljs write→load→parse: Excel date/time cells→σωστό UTC, «25,50»→2550, E.164,
  κρυφό Lists sheet αγνοείται). ALL OK.
- **Template route** `bookings/import/template` (GET, owner/manager): παράγει **προσωποποιημένο** πρότυπο —
  9 στήλες EL/EN, **dropdowns υπηρεσιών/προσωπικού του καταστήματος** (κρυφό sheet "Lists", όχι inline
  formula → δεν σκάει το 255-char όριο του Excel· showErrorMessage:false → free text επιτρέπεται), numFmt
  ημ/ώρας/τιμής, frozen header, sheet «Οδηγίες» (7 bullets). ⚠️ exceljs: `dataValidations` λείπει από τα
  types (cast) + `writeBuffer()` → `Uint8Array` cast.
- **Actions (`bookings/import/actions.ts`):** `parseImportFile` (FormData .xlsx ≤4MB → exceljs → normCell
  richText/formula/hyperlink → **σάρωση 10 πρώτων γραμμών για header** → parseSheet σε ΟΛΟ τον κατάλογο
  (και ανενεργά — ιστορικά δεδομένα)) · `importBookings` (**πλήρες sanitize** του client payload — ξανά
  normalizePhone, validate service/staff ids, mappings μόνο σε δικά του ids) → dedupe vs ΟΛΑ τα υπάρχοντα
  bookings στο εύρος ημερομηνιών (**και cancelled** — ό,τι ακύρωσες δεν ξαναζωντανεύει) + in-batch →
  **CRM auto-fill:** match καρτών by τηλέφωνο→όνομα, δημιουργία νέων `business_customers`, link
  `business_customer_id` → insert σε chunks 400: `customer_id=owner` (walk-in pattern), past→
  `completed`+completed_at, future→`confirmed`, source='import', notes→customer_notes. ΧΩΡΙΣ έλεγχο
  ωραρίου/capacity (ιστορικά δεδομένα δεν κόβονται), κανένα email. Επιστρέφει
  imported/duplicates/skipped/customersCreated.
- **UI:** νέα σελίδα `dashboard/bookings/import` (Topbar + `ImportWizard` client): 2 κάρτες (κατέβασμα
  προτύπου / **drag&drop upload**) → preview (3 counters, **mapping dropdowns** για άγνωστες υπηρεσίες/
  άτομα με SelectMenu, default διάρκεια αν χρειάζεται, πίνακας 50 πρώτων γραμμών με chips προβλημάτων,
  overflow-x για mobile) → done screen (στατιστικά + CTAs ημερολόγιο/πελατολόγιο/νέο αρχείο). Στα
  **Ραντεβού**: κουμπιά «Εισαγωγή»/«Εξαγωγή Excel» δεξιά από τα tabs + CTA στο EmptyState όταν 0 ραντεβού.
- **Export route** `bookings/export` (GET): όλα τα ραντεβού σε .xlsx — ίδιες 9 στήλες με το πρότυπο
  (**round-trip**) + Κατάσταση/Πηγή (localized), ώρες στο business timezone.
- **`next.config.ts`:** `experimental.serverActions.bodySizeLimit: "6mb"` (upload 4MB + parsed rows).
- **i18n bilingual-first:** νέο `dashboard.import` (~80 keys + 7 instructions) + 8 error codes σε
  `dashboard.errors`, EL+EN **1621==1621 keys συμμετρικά**. tsc EXIT 0 · eslint EXIT 0 · build OK.
- ⚠️ **Οπτική επαλήθευση από τον χρήστη** (θέλει login σε business λογαριασμό — PC + κινητό): κατέβασμα
  προτύπου, ανέβασμα, preview/mapping, εισαγωγή, εμφάνιση σε Ραντεβού/Ημερολόγιο/Πελάτες, εξαγωγή.
- **Επόμενο (Φάση 2 — GCal):** πίνακας `calendar_connections` (refresh tokens, RLS server-only) + OAuth
  connect/callback routes + push σε create/cancel/reschedule (`bookings.gcal_event_id`, extendedProperty
  για anti-loop) + Vercel cron busy-sync (`external_busy_events` → availability + RPC guard) + one-time
  import με preview. **Ξεκίνα την αίτηση Google verification νωρίς** (sensitive scope: domain, privacy
  policy ✓, demo video· test mode ≤100 users μέχρι τότε).

---

## 2026-06-25 — Hero landing: benefit card «Γιατί QR στην πόρτα;» (γεμίζει το κενό full-bleed) ✅ DONE

Follow-up του full-bleed: ο χρήστης είδε το hero «αραιό» στη μέση (text αριστερά / poster δεξιά) σε φαρδιά
οθόνη & ζήτησε έξτρα κείμενο εκεί (έδωσε ιδέα, ελευθερία να το βελτιώσω).
- **Μεσαία στήλη ΚΕΝΤΡΟ** (ανάμεσα σε κείμενο & poster — όχι card/πλαίσιο). Μετά από screenshot-mockup χρήστη,
  τελική μορφή: **χρυσός τίτλος** (`gold-underline`, display) + απάντηση + **λίστα 4 benefits** (κύκλος-icon
  Clock/CalendarDays/Bell/Check + bold τίτλος + muted υπότιτλος, χωρισμένα με hairlines). Νέο array
  `hero.benefits` (4× title+sub) σε el.json+en.json (**1004==1004 συμμετρικά**). **Responsive 12-col grid:** το hero έγινε `grid-cols-1` (mobile) → `lg:grid-cols-12`·
  κείμενο `lg:col-span-7 xl:col-span-5`, κάρτα `block lg:hidden xl:block xl:col-span-3`, poster
  `lg:col-span-5 xl:col-span-4`. Δηλ. κινητό: στοιβάζεται ανάμεσα· laptop(lg): κρυφή (εκεί δεν υπάρχει κενό,
  2 columns γεμίζουν)· wide(xl+): **κεντρική ζώνη ανάμεσα στα δύο** (vertically-centered μέσω `items-center`).
- **Copy (βελτιωμένο, bilingual):** EL «Γιατί να βάλω το QR στην πόρτα μου;» / «…ο πιο άμεσος τρόπος…
  ακόμα κι όταν το κατάστημα είναι κλειστό.» — EN «Why put the QR on my door?» / «…even when you're closed.»
  (πρόσθεσα το «closed» hook που δένει με το retention vision). 2 νέα keys `hero.qrCardTitle`/`qrCardBody`
  σε el.json+en.json (**956==956 συμμετρικά**). tsc EXIT 0 · eslint EXIT 0.

---

## 2026-06-25 — Container tuning: «φαρδύ αλλά μαζεμένο» (follow-up full-bleed) ✅ DONE

Μετά το απόλυτο full-bleed, ο χρήστης βρήκε ότι έμενε «πολύ λίγο κενό» στις άκρες & ζήτησε «λίγο πιο
μαζεμένα». `components/ui/container.tsx`: `md`/`lg`/`xl` `max-w-none` → **`max-w-[1600px]`** (πολύ πιο φαρδύ
από το αρχικό 1280 που είχε απορρίψει, αλλά μαζεμένο σε μεγάλες οθόνες)· padding `lg:px-16` → **`md:px-12
lg:px-20`** (πιο άνετα περιθώρια). `sm` αμετάβλητο. tsc EXIT 0. Μνήμη [[feedback_full_width]] ενημερώθηκε:
ΜΗΝ γυρίσεις σε στενό 1280 ΟΥΤΕ σε edge-to-edge.

---

## 2026-06-25 — Full-bleed σελίδες: όλες πλήρους πλάτους όπως το dashboard ✅ DONE

Ο χρήστης παρατήρησε ότι η landing (& λοιπές marketing/public) είχαν κενά δεξιά/αριστερά ενώ το dashboard
πιάνει όλη την οθόνη. Εξήγησα ότι το constrained πλάτος είναι το premium πρότυπο (readability), αλλά με
**AskUserQuestion** ο χρήστης επέλεξε ρητά **«Πλήρες πλάτος παντού»**.
- **`components/ui/container.tsx`** (single source of truth — πιάνει ΟΛΕΣ τις σελίδες με `<Container>`):
  `md`/`lg`/`xl` → **`max-w-none`** (full-bleed)· `sm` μένει `max-w-3xl` (σπάνια narrow column/form). Padding
  άκρων → `px-6 md:px-10 lg:px-16` ώστε να μην κολλάει στις άκρες. Τα inner text blocks κρατούν τα δικά τους
  `max-w-*` (subtitles κ.λπ.) → το κείμενο μένει σχετικά αναγνώσιμο ακόμη και full.
- Επηρεάζονται: landing, for-business, about, contact, qr-editor, marketing/search, `b/[slug]` + layout,
  account layout. Το dashboard ήταν ήδη full (δικό του padding) → τώρα **συνεπές παντού**. tsc EXIT 0.
- ⚠️ **Προς οπτικό έλεγχο:** σε πολύ φαρδιές οθόνες το hero της landing (text αριστερά / poster δεξιά) μπορεί
  να δείχνει «αραιό» στη μέση· αν ενοχλεί, εύκολο να καπαριστεί μόνο το hero ή να μεγαλώσει το poster.

---

## 2026-06-25 — i18n cleanup: 2 hardcoded ελληνικά → bilingual ✅ DONE

Follow-up μετά το redesign — διόρθωση 2 παραβιάσεων bilingual-first που είχα εντοπίσει. tsc EXIT 0 ·
eslint EXIT 0 · JSON 954==954 συμμετρικά.
- **`login/page.tsx` oauth-error:** το hardcoded «Η σύνδεση δεν ολοκληρώθηκε…» → νέο `login.oauthError`
  (EL+EN) στο `lib/i18n-dict.ts` (type + EL + EN — το tsc εγγυάται συμμετρία).
- **`qr/page.tsx` Topbar:** hardcoded title/subtitle → **reuse υπαρχόντων** `dashboard.navQr` («QR Poster»)
  + `dashboard.qr.subtitle` («Σχεδίασε την αφίσα QR…»), φορτώνοντας `getDictionary(locale)` όπως οι άλλες
  dashboard σελίδες. **Μηδέν νέα JSON strings.** (Έκλεισε το αντίστοιχο background-task chip.)
- ⚠️ Pre-existing & σκόπιμο (άθικτο): το `@next/next/no-page-custom-font` warning στο qr/page.tsx — το
  Google Fonts `<link>` που απαιτεί ο Konva για literal family names.

---

## 2026-06-25 — «Wow» redesign Φάση 5 (κλείσιμο): Marketing + Auth ✅ DONE

Ολοκληρώνεται η Φάση 5 (όλες οι δημόσιες σελίδες). **Μηδέν νέα i18n strings.** tsc EXIT 0 · eslint EXIT 0.
Visual-only.

- **Landing (`(marketing)/page.tsx`):** hero text+poster rise-in, badge glow. Value-prop / industry /
  reliability cards → `elev-card` + hover-lift + glow + staggered rise-in + icon `group-hover:scale-110`.
  How-it-works steps → hover-lift + rise-in + gold number brighten. Pricing cards → rise-in + hover-lift.
  Final CTA rise-in.
- **Auth:** signup chooser cards (customer/business) → elev-card + hover-lift + glow + icon scale + stagger.
  Login χρησιμοποιεί ήδη premium `Card`· forms = premium Input/Button (καμία toggle). ⚠️ Pre-existing:
  `login/page.tsx` έχει hardcoded ελληνικό oauth-error (i18n cleanup εκκρεμεί, όπως & `qr/page.tsx`).
- **Λοιπές marketing:** `for-business` (detail cards + steps + pricing), `about` (values), `qr-editor`
  (features + steps), `contact` (info cards) → consistent elev-card + hover-lift + rise-in + icon scale.
  `legal-page.tsx` (terms/privacy/cookies) → staggered rise-in στις ενότητες (reading column, αλλιώς άθικτο).
  `(marketing)/search` → book-buttons gold glow + press, empty states → `<EmptyState>` (business cards ήδη
  premium μέσω `Card`).
- **🎉 ΦΑΣΕΙΣ 1-5 ΟΛΟΚΛΗΡΩΜΕΝΕΣ** — όλο το site (dashboard + account + δημόσια + marketing + auth) στο «wow»
  premium vocabulary. Εξαιρέθηκαν by-design: `admin/*` (ρητά από χρήστη), `account/profile` & auth forms
  (standard premium forms), Konva canvas (qr-editor internals). ⚠️ **Οπτική επαλήθευση** εκκρεμεί από χρήστη.

---

## 2026-06-25 — «Wow» redesign Φάση 5 (έναρξη): Booking flow + Storefront /b/[slug] ✅ DONE

Ξεκίνησε η Φάση 5 (δημόσιες σελίδες) από τα **2 πιο κρίσιμα για πωλήσεις**. **Μηδέν νέα i18n strings.**
tsc EXIT 0. Όλες οι αλλαγές visual-only — flow/data logic ανέπαφη.

- **Booking flow (`b/[slug]/book/booking-flow.tsx`):** service cards → group + animate-rise stagger + χρυσό
  icon chip (Tag) + duration/price chips + hover-lift + glow + arrow-slide. Staff cards (any-available +
  άτομα) → ίδια συνταγή + avatar gold ring/glow. Month calendar: nav arrows gold-lit + press, day cells
  press-scale + **selected gold με glow**, slots staggered rise-in + press. Confirm summary → gold-framed
  (`--shadow-card-gold`) + rise-in. Done screen → success circle με **ring + glow**, container rise-in.
  StepBar → smooth transitions + glow στο τρέχον βήμα + connector fade. Back buttons (×5) → gold hover +
  arrow-slide. Καθάρισα dead import `CalIcon`. ⚠️ 1 **προϋπάρχον** set-state-in-effect (slot-fetch effect,
  άθικτο) — δεν προστέθηκε νέο.
- **Storefront (`b/[slug]/page.tsx`):** hero content + logo (gold ring) rise-in, badge glow. Service cards →
  full treatment (icon chip + chips + hover-lift + glow + stagger + book-button gold glow + press + arrow-slide).
  Hours sidebar → `elev-card` + rise-in. Review cards → `elev-card` + rise-in stagger + hover-lift. Staff
  rating chips gold hover. `b/[slug]/layout.tsx` ήδη premium (sticky frosted) — άθικτο.
- **⚠️ Οπτική επαλήθευση** εκκρεμεί (PC + mobile). Απομένει Φάση 5: marketing (landing/pricing/about/contact/
  legal/for-business/qr-editor/search) + auth (login/signup business+customer).

---

## 2026-06-25 — «Wow» redesign Φάση 4 (κλείσιμο): staff/[id], account/*, QR chrome ✅ DONE

Τρίτη παρτίδα — κλείνει ουσιαστικά η Φάση 4 (dashboard + customer account). **admin/* ΕΞΑΙΡΕΘΗΚΕ** ρητά
από τον χρήστη. **Μηδέν νέα i18n strings.** tsc EXIT 0.

- **`staff/[id]/schedule-editor.tsx`:** custom-hours & subtract-paid checkboxes → `<Switch>`· full/partial
  radios → **segmented control με sliding χρυσό indicator** (optimistic)· type-pills (repo/leave/sick/unpaid)
  press-scale + gold hover· work-hours stat tiles → `surface-raise` + gold edge· inputs **gold focus glow**·
  time-off list staggered rise-in + hover· remove buttons press-scale.
- **account/* (customer-facing):** `account/page.tsx` — booking cards staggered + **status badges με
  colored dot+ring** (ίδια με dashboard) + price gold chip + logo hover glow· empty → `<EmptyState>`.
  `favorites` + `search` — EmptyState (Heart/MapPin/SearchX), stagger, logo glow, book-button gold glow +
  press. `my-reviews.tsx` — EmptyState, stagger, logo glow, **EditModal animate-pop + backdrop-blur**
  (flex-center restructure), save gold-bright+press. `profile` αμετάβλητο (standard form). **Lint:** 2
  προϋπάρχοντα `Date.now()` purity false-positives σε **server component** (request-time now είναι σωστό)
  → στοχευμένο `eslint-disable` (καμία αλλαγή συμπεριφοράς).
- **QR chrome (`qr-editor.tsx`):** light & ασφαλές πέρασμα — **χρυσό ring στο poster frame**, press-scale +
  ease στα toolbar trigger/option/info/reset buttons (μόνο classes). Τα PNG/PDF/Save χρησιμοποιούν ήδη το
  premium `<Button>`. **Konva/interaction logic ΑΝΕΠΑΦΗ.** ⚠️ Το qr-editor έχει **3 προϋπάρχοντα** lint
  errors (refs @139, set-state-in-effect @2077) σε working logic που ΔΕΝ άγγιξα — δεν προστέθηκαν νέα.
  ⚠️ Pre-existing & άσχετο με redesign: το `qr/page.tsx` έχει **hardcoded ελληνικά** (title/subtitle) — δεν
  διορθώθηκε (out of scope· υποψήφιο για i18n cleanup).
- **⚠️ Οπτική επαλήθευση** εκκρεμεί (PC + mobile). **Φάση 4 ~ολοκληρωμένη** (πλην admin-by-choice & profile).
  Επόμενο: **Φάση 5** — δημόσιες σελίδες (`b/[slug]` + booking flow = μέγιστο sales impact) + marketing + auth.

---

## 2026-06-25 — «Wow» redesign Φάση 4 (συνέχεια): Bookings, Reviews, Reports, Settings ✅ DONE

Συνέχεια της ίδιας μέρας — εφαρμογή του design vocabulary στις υπόλοιπες σελίδες dashboard. **Μηδέν νέα
i18n strings.** tsc EXIT 0 · eslint EXIT 0.

- **Bookings (`bookings-list.tsx`):** status badges με **colored dot + ring** (ανά status), filter tabs με
  smoother transition + gold shadow στο active + `active:scale`, search input με **gold focus glow**, rows
  staggered rise-in (`i*45ms`) + `group`, **price σε gold chip**, action buttons (`ActionBtn`/restore/clear)
  `active:scale-95` + ease. Empty/no-results → `<EmptyState>` (CalendarDays/Search). **Lint fix:** το
  προϋπάρχον `const now = Date.now()` (impure-in-render) → `useState(() => Date.now())` (σταθερό ανά mount,
  ίδια συμπεριφορά).
- **Reviews (`reviews-manager.tsx`):** rows staggered rise-in + `group`, hide/reply buttons **gold-lit hover**
  + `active:scale`, reply save = gold-bright + glow + press, EmptyState (MessageSquare).
- **Reports (`reports/page.tsx`):** τα `Metric` cards → **double-bezel stat cards** (Overview pattern: surface-raise
  tray + gold edge + recessed core + gold icon chip + hover glow/lift + staggered rise-in + Manrope tabular-nums).
  `Panel` → `elev-card` + staggered rise-in. Range tabs → pill με gold ring/glow + press. Source bar gold glow.
  `total===0` → `<EmptyState icon={BarChart3}>`. **`no-show-report.tsx`:** modals → `animate-pop` + backdrop-blur
  (Overlay restructured σε flex-center wrapper για να μη συγκρούεται το pop transform με το centering), trigger +
  report/block/unblock + modal CTAs `active:scale` + gold/danger hover.
- **Settings:** `business-info-editor` → logo-upload & GPS buttons gold hover + `active:scale` (⚠️ **GPS/coords
  logic ΑΝΕΠΑΦΗ** — μόνο classes), public link σε χρυσό. `hours-editor` → open/closed text button γίνεται premium
  **`<Switch>`** (checked=ανοιχτό), staggered rise-in στις μέρες, remove-afternoon press-scale. `category-editor`
  αμετάβλητο (ήδη clean). DnD reorder αμετάβλητο.
- **⚠️ Οπτική επαλήθευση** εκκρεμεί (PC + mobile). Απομένει Φάσης 4: `staff/[id]` (schedule editor), `qr`,
  + `account/*` + `admin/*`. Μετά Φάση 5 (δημόσιες σελίδες + booking flow).

---

## 2026-06-25 — «Wow» redesign Φάση 4: Services & Staff + 2 reusable components ✅ DONE

Συνέχεια του premium «wow» redesign (Φάσεις 1-3 foundation/shell/calendar ✅). Ξεκίνησε η **Φάση 4
(υπόλοιπο dashboard)** με τις δύο σελίδες καθημερινής χρήσης (προτεραιότητα impact). **Μηδέν νέα i18n
strings** (reuse `t.empty`/`t.new` — κανένα bilingual ρίσκο). tsc EXIT 0 · eslint EXIT 0.

- **2 νέα reusable components** (βάση για όλη τη Φάση 4/5):
  - **`components/ui/switch.tsx`** — premium on/off toggle: sliding knob + **gold-lit track με glow** όταν
    ενεργό (`bg-gold` + `[box-shadow:0_0_14px_-3px_var(--gold-glow)]`), `--ease-out`, `active:scale-95`,
    focus ring, `role="switch"`/`aria-checked`. State από τον caller → slide **optimistic/άμεσο**.
  - **`components/ui/empty-state.tsx`** — centered κάρτα: gold icon chip (`size-14 rounded-2xl bg-gold/10
    ring-gold/20`) + faint gold halo στο top edge (`.glow-gold`) + `animate-rise` + optional title/CTA.
- **Services (`services-manager.tsx`):** rows = `group` + **staggered rise-in** (`animationDelay i*55ms`) +
  **χρυσό icon chip** (`Tag`, `group-hover:scale-105`) + duration σε surface pill + **price σε gold chip**
  (`bg-gold/10 ring-gold/20 tabular-nums`). Inline native toggle → `<Switch>`. Edit/delete: `active:scale-95`
  + **gold-lit hover** στο edit. Empty → `<EmptyState icon={Tag}>` + «Νέα υπηρεσία» CTA. Form checkbox
  «Ενεργή» → premium **Switch row** (`justify-between` σε `bg-surface-2/40` κουτί).
- **Staff (`staff-manager.tsx`):** ίδια συνταγή — staggered rise-in, avatar **gold ring + glow στο hover**
  (`group-hover:ring-gold/40`), services-count σε surface pill, **rating σε gold chip**, native toggle →
  `<Switch>`, schedule/edit/delete `active:scale-95` + gold hover. Empty → `<EmptyState icon={Users}>`.
  Form checkbox «Δέχεται online» → Switch row. Service-chips toggles: `active:scale-95` + `glow-nav` όταν
  on + gold hover όταν off.
- **⚠️ Οπτική επαλήθευση** εκκρεμεί από τον χρήστη (PC + mobile· τρέχει μόνος του τον server). Επόμενα Φάσης 4:
  `bookings`, `qr`, `reviews`, `reports`, `settings` + `account/*` + `admin/*`.

---

## 2026-06-21 — About: ενότητα «Η σελίδα σου» + intro + πραγματικό screenshot ✅ DONE

Συνέχεια του messaging. User: άλλαξε το intro του /about (έδωσε ακριβές κείμενο) + δείξε ότι κάθε
κατάστημα αποκτά τη δική του δημόσια σελίδα (έστειλε screenshot του `/b/barber-house`).
- **`(marketing)/about/page.tsx`:** (1) intro hero = ακριβές κείμενο χρήστη (QR = ανακάλυψη, ξανα-κράτηση
  από λογαριασμό/προηγούμενα/αγαπημένα), el+en. (2) Νέα ενότητα «Η σελίδα σου / Κάθε κατάστημα αποκτά τη
  δική του σελίδα» (2-col: copy + εικόνα).
- **Εικόνα:** αρχικά έφτιαξα CSS mockup (responsive/δίγλωσσο) γιατί **δεν μπορώ να σώσω εικόνα από το chat
  στο project**. Ο user ρώτησε γιατί όχι η δική του → εξήγησα + του ζήτησα να τη ρίξει στο `public/`
  (ίδιο μοτίβο με `hero-poster.png`). **Την ανέβασε ως `public/shop-preview.png`** (861×895, καθαρή χωρίς
  localhost). Αντικατέστησα το mockup με `<img src="/shop-preview.png">` (gold glow + border + caption).
  Αφαιρέθηκαν τα πλέον αχρησιμοποίητα imports Scissors/Heart/Star.
- ⚠️ Το screenshot είναι **στατικό (μόνο ελληνικά)** — δεν αλλάζει EL/EN· manual asset (αν αλλάξει το
  design του `/b/[slug]`, θέλει νέο screenshot). tsc EXIT 0.

---

## 2026-06-21 — Messaging: το QR ως first-touch, ο πελάτης επιστρέφει από account ✅ DONE

User (διόρθωση λογικής): το QR δεν είναι μόνο «σκάναρε στην πόρτα & κλείσε» — είναι η **πρώτη γνωριμία**.
Μετά ο πελάτης **επιστρέφει μόνος του** χωρίς νέο σκανάρισμα, από παλιά ραντεβού / αγαπημένα / αναζήτηση.
Ζήτησε να το καταλάβω και να διορθώσω όπου χρειάζεται (όχι αυτολεξεί). Μνήμη: `project_retention_logic`.
- **Landing value-prop κάρτα 6:** «Πελάτες & κριτικές» → **«Πελάτες που επιστρέφουν»** (find you again από
  ραντεβού/αγαπημένα/αναζήτηση, χωρίς ξανα-σκανάρισμα)· icon Star→**Repeat** (el+en).
- **Οθόνη επιτυχίας κράτησης** (`booking-flow` done step): νέο `booking.rebookHint` (el+en) — λέει στον
  πελάτη ότι την επόμενη φορά θα μας βρει από τον λογαριασμό του (ιδανικό σημείο: μόλις έκλεισε, συχνά 1η φορά από QR).
- **About:** +παράγραφος «το QR είναι μόνο η πρώτη γνωριμία…» (el+en inline).
- **for-business** («Online κρατήσεις 24/7»): +σημείο «σε ξαναβρίσκουν χωρίς QR — από ραντεβού/αγαπημένα/
  αναζήτηση» (el+en).
- **qr-editor** («Έξυπνο QR»): +σημείο «με την πρώτη κράτηση σε ξαναβρίσκει μετά από τον λογαριασμό του» (el+en).
- tsc EXIT 0· json el==en **994/994** (+rebookHint). ⚠️ Οπτική επαλήθευση από τον χρήστη.

---

## 2026-06-21 — Footer: σελίδες Σχετικά + QR Editor, αφαίρεση Blog ✅ DONE

Συνέχεια του truth-audit. User: αφαίρεσε Blog (δεν θα γίνει)· φτιάξε Σχετικά + σελίδα QR Editor με πλήρη
περιγραφή.
- **footer.tsx:** αφαιρέθηκε το `/blog` link (το `footer.links.blog` key έμεινε αχρησιμοποίητο στα json
  — αβλαβές). Πλέον **όλα τα footer links δουλεύουν** (Δυνατότητες/Τιμές/QR Editor/Σχετικά/Επικοινωνία/
  Όροι/Απόρρητο/Cookies — μηδέν 404).
- **νέα `(marketing)/about/page.tsx`:** hero + «Γιατί φτιάξαμε το Qlick» (story, χωρίς ψεύτικα stats/team)
  + 6 κάρτες αξιών (QR/Ελληνικά-πρώτα/0% προμήθεια/δεδομένα ΕΕ/κινητό/απλό) + CTA. Inline EL/EN.
- **νέα `(marketing)/qr-editor/page.tsx`:** πλήρης περιγραφή του killer feature — hero + 6 κάρτες
  δυνατοτήτων (πρότυπα/χρώματα+σταγονόμετρο/λογότυπο/πίνακας ωραρίου/έξυπνο QR με tracking/εξαγωγή PDF+PNG)
  + 3 βήματα + ειλικρινής σημείωση «καλύτερα από υπολογιστή». Inline EL/EN.
- tsc EXIT 0. ⚠️ Οπτική επαλήθευση από τον χρήστη.

---

## 2026-06-21 — Landing truth audit: διορθώσεις ώστε να λέει μόνο αλήθεια ✅ DONE

User: «αυτά που γράφουμε ότι προσφέρουμε ισχύουν;» → audit κάθε ισχυρισμού στον πραγματικό κώδικα/βάση.
Βρέθηκαν 4 σημεία· **Αποφάσεις (AskUserQuestion):**
- **Σπασμένος σύνδεσμος «Επικοινωνία»** (CTA + footer → `/contact` = 404): **φτιάχτηκε σελίδα** `(marketing)/
  contact/page.tsx` (επαγγελματική, hero + 3 κάρτες email/υποστήριξη/ώρες + CTA· **placeholder email
  `info@qlick.gr`** να αλλάξει πριν launch). Inline EL/EN (μοτίβο for-business).
- **«Email ειδοποιήσεις»** (pricing Δοκιμή): **μένει** — ο user είπε το site δεν ανεβαίνει χωρίς Resend
  έτοιμο (άρα θα ισχύει στο launch). Καμία αλλαγή.
- **«GDPR / δεδομένα στην ΕΕ»**: το data residency (Φρανκφούρτη) ίσχυε, αλλά έλειπαν νομικές σελίδες →
  **φτιάχτηκαν** `(marketing)/{terms,privacy,cookies}/page.tsx` + κοινός `components/marketing/legal-page.tsx`
  (hero + αριθμημένα sections). Inline EL/EN. ⚠️ **Template — θέλει νομικό έλεγχο + στοιχεία εταιρείας πριν launch.**
- **«Πόσα ραντεβού ήρθαν από QR»**: ο report είχε source breakdown ΑΛΛΑ κάθε online κράτηση γραφόταν 'web'
  (στη βάση 25 web/8 dashboard/**0 qr**). **Διπλό fix:** (α) κείμενο landing «από QR»→«από την Qlick»
  (el+en)· (β) **πραγματικό QR tracking** (migration 046): η `create_booking` πήρε **`p_source`**
  ('web'|'qr', default 'web' → additive, καμία οπισθοδρόμηση)· το poster QR κωδικοποιεί **`?src=qr`**
  (`buildDefaultTemplate` παίρνει `qrUrl`· το saved Barber House template ενημερώθηκε με jsonb update —
  κρατά καθαρό το editor `bookingUrl` για το export-filename slug)· threading `src=qr`: δημόσια
  `/b/[slug]` → κουμπί «Κλείσε» → `/book?src=qr` → `book/page` → `BookingFlow source` → `submitBooking`
  `p_source` (+ social-login `next` κρατά το `?src=qr`, +`AuthStep` source prop). types.ts +p_source.
- **ℹ️ Όρια πλάνων** (3 υπάλληλοι/Custom QR) δεν εφαρμόζονται (δεν υπάρχει Stripe) — μελλοντικές τιμές.
- ⚠️ **Footer ακόμα έχει 404:** `/about`, `/blog`, `/qr-editor` (εκτός scope — ο user ζήτησε μόνο contact+legal).
- tsc EXIT 0· json el==en **993/993**. ⚠️ Οπτική + end-to-end επαλήθευση QR από τον χρήστη.

---

## 2026-06-21 — Landing: εμπλουτισμός (ποικιλία + αξιοπιστία) ✅ DONE

User (screenshot value-props): «κάντο πιο επαγγελματικό/εμπλουτισμένο, να καταλαβαίνει ο επισκέπτης ότι
υπάρχει ποικιλία και αξιοπιστία». **Αποφάσεις (AskUserQuestion, multi):** πλήρες 3×2 πλέγμα καρτών +
ενότητα «Για κάθε επάγγελμα» + λωρίδα αξιοπιστίας· **ΟΧΙ** λωρίδα με νούμερα.
- **`(marketing)/page.tsx`:** (1) **6η value-prop κάρτα** «Πελάτες & κριτικές» (Star) → πλήρες 3×2.
  (2) Νέα ενότητα **INDUSTRIES** «Για κάθε επάγγελμα» — 12 πλακίδια κλάδων με lucide icons (Κουρείο/
  Κομμωτήριο/Νύχια/Spa/Tattoo/Μακιγιάζ/Οδοντίατρος/Ψυχολόγος/Φυσικοθεραπεία/Διατροφολόγος/Personal
  Trainer/Γιατροί) + λεζάντα «+ και πολλά ακόμα». (3) Νέα ενότητα **RELIABILITY** «Φτιαγμένο για να το
  εμπιστεύεσαι» — 6 σημεία (χωρίς διπλές κρατήσεις / GDPR & δεδομένα ΕΕ-Φρανκφούρτη / EL & EN / ασφαλής
  σύνδεση / 0% προμήθεια / κρατήσεις 24-7). **Μόνο αληθινά** (όχι ψεύτικα stats/testimonials).
  (4) Ρυθμός φόντου: how-it-works από `bg-surface/30`→plain ώστε να εναλλάσσεται (value plain → industries
  shaded → how plain → reliability shaded → pricing plain).
- **i18n (bilingual-first):** +`valueProps.items[5]`, νέα `industries` (eyebrow/title/subtitle/more+12),
  νέα `reliability` (eyebrow/title+6) — el+en **993/993** (μαζί με array items). tsc EXIT 0.
  ⚠️ Οπτική επαλήθευση από τον χρήστη (PC + mobile).
- **Follow-up (user): ένωση των 3 σε ΜΙΑ ενότητα `#features`** ώστε το link «Δυνατότητες» (footer, τέρμα
  κάτω) να τα δείχνει όλα μαζί, πιο συγκεντρωμένα. Τα 3 ξεχωριστά `<section>` (py-24/32 + border-t το
  καθένα) έγιναν **ένα** `<section id="features">` με stacked blocks: κύριος τίτλος (valueProps) + κάρτες,
  μετά industries & reliability ως **υπο-ενότητες με μικρότερο h3** (text-2xl/3xl αντί 4xl/5xl) και
  αποστάσεις `mt-20/24` αντί για χωριστά section paddings. **Το «Πώς δουλεύει» μετακινήθηκε** από τη μέση
  → μετά τη `#features` (νέα ροή: Hero → Features[δυνατότητες+κλάδοι+αξιοπιστία] → Πώς δουλεύει → Τιμές →
  CTA)· πήρε πάλι `bg-surface/30` για εναλλαγή. Καθαρά JSX-restructure (καμία αλλαγή json). tsc EXIT 0.

---

## 2026-06-21 — Admin Καταστήματα: στήλη «Τελευταία σύνδεση» (πόσες μέρες έχει να μπει) ✅ DONE

User: στη λίστα `/admin/businesses` να βλέπω πόσες μέρες έχει να συνδεθεί κάποιο κατάστημα.
- **migration 045:** `admin_list_businesses` (drop+recreate) +`owner_last_sign_in_at timestamptz` =
  `auth.users.last_sign_in_at` του owner member· re-grant authenticated.
- **App:** `businesses-table.tsx` νέα στήλη «Τελευταία σύνδεση» + helper `lastSeen()`: null→«Ποτέ»,
  0 ημ.→«Σήμερα», αλλιώς «πριν N ημ.»· **κίτρινο (warning) αν ≥30 ημ.** (κοιμισμένα)· title=πλήρης ημ/ώρα.
  min-width 980→1080. types.ts +owner_last_sign_in_at.
- **i18n:** admin.businesses +4 (`colLastSeen`/`lastSeenToday`/`lastSeenDays`/`lastSeenNever`) el+en — **892/892**.
- ⚠️ **Caveat:** `last_sign_in_at` = τελευταίο πραγματικό login (όχι token refresh)· αν κάποιος μένει
  συνδεδεμένος μπορεί να δείχνει παλιό. Καλός proxy χωρίς ξεχωριστό activity tracking. tsc EXIT 0.
- **Follow-up fix:** ο user είδε «Σήμερα» σε λογαριασμό που είχε μπει **χθες βράδυ** (~21h) — το `lastSeen`
  μετρούσε rolling-24h. Άλλαξε σε **ημερολογιακή** διαφορά (`startOfDay` και των δύο) → χθες = «πριν 1 ημ.»,
  όχι «Σήμερα». (Επιβεβαιώθηκε ότι ΔΕΝ υπάρχει cross-account bug: gmail ενημερώθηκε, live έμεινε χθεσινό —
  κάθε owner μετριέται ξεχωριστά.) Τα 2 draft test χωρίς owner member → «Ποτέ». Καθαρά client-only· tsc EXIT 0.

---

## 2026-06-21 — Admin: ορατότητα δοκιμής/συνδρομής (δοκιμή από δημοσίευση) ✅ DONE

User (στο admin): θέλω να βλέπω πόσα καταστήματα έχουν **μηνιαία συνδρομή** και πόσα είναι ακόμα στη
**δωρεάν δοκιμή**. **Αποφάσεις (AskUserQuestion):** για το «πληρώνει» → **να περιμένουμε το Stripe**
(τώρα μόνο δοκιμή· ο αριθμός συνδρομών = placeholder 0)· έναρξη δοκιμής → **από τη δημοσίευση** (`published_at`).
- **Καμία νέα δομή/πίνακας** — όλα υπολογίζονται από υπάρχουσες στήλες: «πρώτα 1000» = σειρά εγγραφής
  (`row_number() over (order by created_at)` ≤1000 → 90 ημ., αλλιώς 30)· ρολόι δοκιμής ξεκινά στο
  `published_at`· state = `not_started` (αδημοσίευτο) / `trialing` / `expired`.
- **migration 044:** `admin_overview_stats` +`in_trial`/`trial_expired`/`subscribed`(=0)· `admin_list_businesses`
  (drop+recreate — άλλαξε return type) +`published_at`/`trial_state`/`trial_days_left`/`trial_total_days`·
  re-grant authenticated (revoke anon/public, όπως 043).
- **App:** Επισκόπηση (`admin/page.tsx`) νέα ενότητα «Συνδρομές» (Σε δοκιμή / Έληξε / Με συνδρομή + note
  «ενεργοποιείται με Stripe»)· λίστα Καταστημάτων (`businesses-table.tsx`) νέα στήλη «Συνδρομή» με badge
  (Δοκιμή · X ημ. / Έληξε η δοκιμή / Δεν ξεκίνησε), min-width 860→980. types.ts ενημερώθηκε.
- **i18n (bilingual-first):** admin.overview +5, admin.businesses +4 (el+en) — **888/888 συμμετρικά**.
- **email μέσω Resend = ΕΚΚΡΕΜΕΙ (future):** ο user θέλει στο admin μετρητή «πόσα email στάλθηκαν / όριο»
  ώστε να αναβαθμίζει πριν φτάσει το όριο Resend (~3.000/μήνα δωρεάν). ΔΕΝ χτίστηκε — δεν υπάρχει ακόμα
  Resend ούτε `notification_log`. Θα μπει μαζί με το notifications engine (Phase 5).
- Επαλήθευση (SQL χωρίς guard): 2 active=trialing (84/88 ημ., 90άρα)· 2 draft=not_started. tsc EXIT 0.
  ⚠️ Οπτική επαλήθευση από τον χρήστη.

---

## 2026-06-21 — Fix login admin: «Database error querying schema» (NULL token columns) ✅ DONE

Ο χρήστης δοκίμασε login με `admin@qlick.gr` / `12345678` → **«Database error querying schema»**.
- **Ρίζα:** όταν φτιάχνεις χειροκίνητα χρήστη στο `auth.users` (raw insert), κάποιες στήλες token μένουν
  **NULL** ενώ ο GoTrue (Supabase Auth, Go) τις διαβάζει σε **μη-nullable string** → σκάει στο schema query.
  Επιβεβαιώθηκε ότι ήταν NULL: `confirmation_token`, `recovery_token`, `email_change`,
  `email_change_token_new` (οι υπόλοιπες — `email_change_token_current`/`phone_change`/`phone_change_token`/
  `reauthentication_token` — ήταν ήδη `''`).
- **Fix (execute_sql):** `update auth.users set <token cols> = coalesce(col,'')` για τον admin → όλες `''`.
  Επαλήθευση: password_ok=true, confirmed=true, identity_count=1, is_admin=true. Login πλέον δουλεύει.
- ⚠️ **Gotcha για το μέλλον:** όποτε δημιουργείται χρήστης με raw insert στο `auth.users`, **ΠΑΝΤΑ** set
  τις στήλες token σε `''` (όχι NULL). Καλύτερα να αποφεύγεται το raw insert — προτιμότερο
  `auth.admin.createUser` / Supabase dashboard που τις αρχικοποιεί σωστά.

---

## 2026-06-21 — Platform Admin (πίνακας διαχειριστή) — backend + UI + λογαριασμός ✅ DONE

User: «πάμε να φτιάξουμε το admin account όπου θα έχω έλεγχο της σελίδας». **Αποφάσεις (AskUserQuestion):**
modules v1 = **Επισκόπηση + Καταστήματα + Χρήστες + Κατηγορίες** (και τα 4)· identity = **νέος χωριστός
admin λογαριασμός**.
- **Backend (migration 042):** `profiles.is_admin boolean default false`· helper `is_platform_admin(uid)`
  (SECURITY DEFINER)· RLS `for all` policy στις `categories` για admins (public μένει read-only)· RPCs
  (SECURITY DEFINER + admin-checked, join `auth.users` για email): `admin_overview_stats()` (json
  counts + «free_slots_left» = 1000 − active), `admin_list_businesses()`, `admin_set_business_status`,
  `admin_delete_business` (cascade — επιβεβαιώθηκε ότι ΟΛΑ τα children FK είναι ON DELETE CASCADE),
  `admin_list_users()`, `admin_delete_user` (guards: όχι self/άλλον admin/owner καταστήματος).
- **migration 043:** revoke execute από `anon/public`, grant μόνο `authenticated` σε όλες τις admin
  functions (καθαρίζει το security advisor «anon can execute SECURITY DEFINER»).
- **types.ts:** πρόσθεσα τα admin function signatures (από generate_typescript_types). `is_admin` ήταν ήδη.
- **App (`app/[locale]/admin/`):** `lib/admin.ts` `requireAdmin(locale)` (redirect μη-admin στο home —
  το /admin δεν αποκαλύπτεται)· `admin/layout.tsx` (MobileNavProvider + `AdminSidebar` 4 nav items,
  ίδιο desktop-column/mobile-drawer pattern με dashboard)· **Επισκόπηση** (`page.tsx` stat cards via
  RPC)· **Καταστήματα** (`businesses/` table client με αναζήτηση + suspend/activate/delete + view)·
  **Χρήστες** (`users/` table + delete, disabled για admin/owner)· **Κατηγορίες** (`categories/`
  manager: δέντρο parents→children, add top/sub + edit + delete, modal φόρμα, slug auto από EN).
  Reuse του `Topbar` (dashboard). Server actions returns **stable codes** → client μετάφραση μέσω νέου
  `lib/admin-error.ts` `adminErr(errors, code, fallback)`.
- **i18n (bilingual-first):** νέο top-level `admin` section (el+en συμμετρικά, 0 missing) — nav/overview/
  businesses/users/categories/errors.
- **Login redirect:** νέο `lib/auth.ts` `userHome(supabase, locale, userId)` → admins προσγειώνονται
  στο `/admin` (αλλιώς roleHome). Ενημερώθηκαν login action + OAuth callback.
- **Admin λογαριασμός δημιουργήθηκε** (`admin@qlick.gr` / `12345678`): insert σε `auth.users`
  (`extensions.crypt`+`gen_salt('bf')`, email_confirmed_at=now) + `auth.identities` (email provider) +
  `profiles.is_admin=true`. Επαλήθευση: password_ok=true, confirmed=true, is_admin=true, 1 identity.
- **Σελίδα «Λογαριασμός» (`admin/settings`)** — ο user ζήτησε «δυνατότητα να τον αλλάξω»: αλλαγή
  **κωδικού** (new+confirm, min 8) + **email** via `supabase.auth.updateUser` (admin-checked actions),
  νέο nav item (UserCog). i18n `admin.account.*` + error codes `password_short`/`email_invalid`.
- tsc EXIT 0· json συμμετρικά. ✅ Έτοιμο για login & οπτική επαλήθευση από τον χρήστη (τρέχει μόνος του
  τον server). Πιθανά επόμενα: reviews moderation, συνδρομές/Stripe, audit log, login-as-business.

---

## 2026-06-21 — Landing hero = static PNG (νικά το Night Mode) ✅ + σημείωση browser στο QR Poster ✅ DONE

Follow-up της προηγούμενης (Night Mode). Ο χρήστης ζήτησε να δοκιμάσουμε **flat PNG** στο hero — **δούλεψε**
(«τέλεια δούλεψε») σε Brave Night Mode.
- **`(marketing)/page.tsx`:** νέο fallback chain στο hero poster — **(1)** αν υπάρχει
  **`public/hero-poster.png`** (server `existsSync(join(process.cwd(),"public","hero-poster.png"))`) →
  το δείχνει ως **`<img>`** (μία επίπεδη εικόνα → τα night/dark φίλτρα τη χειρίζονται σαν φωτό = σωστά
  χρώματα, όπως Safari)· **(2)** αλλιώς το ζωντανό SVG (`renderDesignToSvg`)· **(3)** αλλιώς `QrPreview`.
  Το PNG (1588×2246 = ακριβώς A4 ratio) μπήκε χειροκίνητα στο `public/` (ο χρήστης το ανέβασε· είχε
  βγει διπλή κατάληξη `.png.png` από το Explorer → rename). `object-cover`, ίδιο rounded πλαίσιο.
  **Προς το παρόν χειροκίνητο** snapshot — μελλοντικά auto-upload από τον editor (`stage.toDataURL`)
  → Storage → `qr_templates.png_url`.
- **Σημείωση στο QR Poster:** εξηγεί ότι **αν το poster δείχνει παραμορφωμένο ή με άλλα χρώματα,
  πιθανότατα φταίνε ρυθμίσεις του δικού τους browser** (dark mode, night mode, φίλτρα/αντιστροφή
  χρωμάτων, reading mode, extensions) — και ότι **το εξαγόμενο PDF/PNG ΔΕΝ επηρεάζεται**. Bilingual:
  `dashboard.qr.browserNoteTitle/browserNoteBody` (el+en συμμετρικά).
  - **Placement (μετά από user feedback):** όχι banner πάνω από τον editor (είχε άνισο padding), αλλά
    **info (i) κουμπί με popover δίπλα στο κουμπί «QR»** στη μπάρα εργαλείων (`qr-editor.tsx`, ίδιο
    overlay-toggle pattern με icon/shape pickers). Το banner + τα `getDictionary`/`Info` imports
    αφαιρέθηκαν από το `page.tsx`. Αφαιρέθηκε το «ή κινητού»/«or phone» (ο editor είναι desktop-only →
    άσκοπη αναφορά κινητού).
- tsc EXIT 0· json συμμετρικά (`dashboard.qr` el==en, 0 missing).

---

## 2026-06-21 — QR poster «χαλάει» σε Brave (όχι Safari): color-scheme για desktop, iOS Night Mode = όχι fixable ⚠️

User (screenshot iPhone): σε **Brave** το saved poster στο landing hero έδειχνε τον **πίνακα ωραρίου +
footer σχεδόν αόρατα** (σκούρα γράμματα σε σκουρεμένο φόντο)· σε **Safari** μια χαρά. «Γιατί;»
- **Γιατί ΜΟΝΟ το poster χαλάει:** render-άρεται ως **υβριδικό inline SVG** (`lib/qr-render.ts`,
  `dangerouslySetInnerHTML` στο `(marketing)/page.tsx`): το **φόντο/τίτλοι** είναι native SVG primitives
  (`<rect>`/`<text>`) ΑΛΛΑ ο **πίνακας ωραρίου/qr/icons/logo** μπαίνουν ως `data:`/external **`<image>`**.
  Κάθε σκούρο-mode φίλτρο **αντιστρέφει τα primitives αλλά αφήνει τις εικόνες** (για να μη χαλάει φωτό)
  → σκούρο ink κείμενο πίνακα πάνω σε σκουρεμένο φόντο = εξαφανίζεται. Η υπόλοιπη σελίδα (κανονικό HTML)
  + η σελίδα κράτησης `/b/[slug]` (ωράριο = HTML, όχι poster) ΔΕΝ επηρεάζονται.
- **2 ΔΙΑΦΟΡΕΤΙΚΟΙ μηχανισμοί — μην τους μπερδεύεις:**
  1. **Chromium auto-dark-mode (desktop Chrome/Edge/Brave):** standard force-dark σε light σελίδες.
     **Opt-out = `color-scheme: dark`** → το δηλώσαμε ⇒ **διορθώθηκε** σε desktop.
  2. **Brave iOS «Night Mode»:** ΞΕΧΩΡΙΣΤΟ feature. Στο iPhone όλοι οι browsers τρέχουν σε **WebKit**
     (Apple), όχι Chromium → το Night Mode είναι **εξαναγκασμένο φίλτρο** που **ΔΕΝ σέβεται** το
     `color-scheme` → **δεν γίνεται opt-out από τη μεριά του site**. (Ο user το επιβεβαίωσε: άλλαξε το
     dark mode → έμενε· φταίει το Night Mode.)
- **Έγινε (πιάνει το #1):** `app/globals.css` `:root` → **`color-scheme: dark;`**· `app/[locale]/layout.tsx`
  → **`export const viewport: Viewport = { colorScheme: "dark" }`** (`<meta name=color-scheme content=dark>`).
- **Για το #2 (iOS Night Mode):** η μόνη αξιόπιστη λύση = το hero poster να γίνει **μία επίπεδη εικόνα PNG**
  (το φίλτρο τη χειρίζεται σαν φωτό → σωστά χρώματα). Ο editor ήδη παράγει το PNG (`stage.toDataURL`,
  qr-editor.tsx:700) — θα χρειαζόταν μόνο upload στο Storage + `qr_templates.png_url` + το hero να
  προτιμά `<img src=png_url>` (το `png_url` υπάρχει ως column αλλά είναι **κενό**). **Απόφαση χρήστη
  (AskUserQuestion): «Άσ' το ως έχει»** — αφορά μόνο το marketing landing hero, μόνο σε όσους έχουν
  Night Mode ON, και είναι συνειδητή επιλογή του επισκέπτη. tsc καθαρό.

---

## 2026-06-21 — Κατηγορίες: +14 νέοι κλάδοι (11 ιατρικές ειδικότητες + 3 ομορφιάς) ✅ DONE

User έδωσε λίστα κλάδων (ιατρικά + ομορφιά/fitness) → «δες τι δεν έχουμε για να τα προσθέσουμε».
Σύγκριση με τον πίνακα `categories` (live DB): ήδη καλύπτονταν Οδοντίατρος/Ψυχολόγος/Φυσικοθεραπεία/
Διατροφολόγος (ιατρικά)· Κουρείο/Κομμωτήριο/Νύχια/Spa/Tattoo + Personal Trainer + Yoga&Pilates (ομορφιά/
fitness). **Λείπανε ξεκάθαρα 14.**
- **Αποφάσεις χρήστη (AskUserQuestion):** «Αισθητικός προσώπου» → **ΔΕΝ** προστέθηκε (καλύπτεται από το
  υπάρχον «Αισθητική»)· «Yoga & Pilates» → **μένει ενιαία** (όχι split).
- **migration 041** (`apply_migration`, idempotent `ON CONFLICT(slug) DO NOTHING`, parents by slug —
  κανένα hardcoded id):
  - **Ιατρικές υπηρεσίες (+11, order 6-16):** Παιδίατρος(pediatrician) · Καρδιολόγος(cardiologist) ·
    Ωτορινολαρυγγολόγος ΩΡΛ(ent) · Οφθαλμίατρος(ophthalmologist) · Δερματολόγος(dermatologist) ·
    Γυναικολόγος(gynecologist) · Ορθοπεδικός(orthopedist) · Ψυχίατρος(psychiatrist) ·
    Λογοθεραπευτής(speech-therapy) · Ενδοκρινολόγος(endocrinologist) · Νευρολόγος(neurologist).
  - **Ομορφιά & Wellness (+3, order 8-10):** Makeup Artist(makeup-artist) · Κέντρο Laser Αποτρίχωσης
    (laser-hair-removal) · Κέντρο Αδυνατίσματος(slimming).
- **Bilingual-first ✓** χωρίς json: τα ονόματα είναι `name_el`+`name_en` στήλες (όχι dictionaries).
  Εμφανίζονται **αυτόματα** σε: business signup wizard (επιλογή κλάδου), Ρυθμίσεις→Κατηγορίες
  (`CategoryPicker`), δημόσια/account αναζήτηση (parent⇒children). Ο picker ΔΕΝ κάνει render το `icon`,
  οπότε τα icon values είναι μόνο metadata (lucide-ish).
- Επαλήθευση: 41 κατηγορίες σύνολο (7 parents + 34 children)· και τα 14 κάτω από σωστό parent με EL+EN.

---

## 2026-06-21 — Signup wizard: hardcoded ελληνικά → bilingual (EL/EN) ✅ DONE

User (EN view): αρκετά strings στον business signup wizard έμεναν hardcoded ελληνικά (bilingual-first
παραβίαση). Εντοπίστηκαν & μεταφράστηκαν **13** keys (όχι μόνο τα ορατά):
- **`lib/i18n-dict.ts`** (`AuthDict` type + EL + EN, συμμετρικά — το tsc εγγυάται και τα δύο):
  `account.emailInvalid/emailTaken`· `business.mobile/mobileInvalid/landline/landlineInvalid/postcode/
  addressHint/addressPlaceholder`· `hours.afternoon/remove/addAfternoon`.
- **`wizard.tsx`**: αντικαταστάθηκαν τα hardcoded → dict refs: «Κινητό»/«Σταθερό (προαιρετικό)» (το 2ο
  = `landline`+`phoneOptional`), τα 2 email errors, τα 2 phone errors, address hint «Γράψε και διάλεξε…»,
  address placeholder «π.χ. Ερμού 10, Αθήνα», «Τ.Κ.», «ΑΠΟΓ.», «Αφαίρεση», «+ Προσθήκη απογευματινού
  ωραρίου». (Τα υπόλοιπα ελληνικά στο αρχείο ήταν ήδη `locale==="el"?..:..` ternaries — ΟΚ.)
- tsc καθαρό· καμία hardcoded label/hint/placeholder ελληνική δεν έμεινε. ⚠️ Οπτική επαλήθευση σε EN.

---

## 2026-06-21 — Signup wizard ωράριο: native time inputs → κοινό themed `TimeSelect` ✅ DONE

User (mobile screenshots EN vs EL): το `<input type="time">` στον wizard εγγραφής (α) σε EN είναι πιο
φαρδύ & «ψιλοφαίνεται» το εικονίδιο ρολογιού· (β) σε EL το tap ΔΕΝ άνοιγε picker· (γ) ο OS picker δεν
είναι στα χρώματα της σελίδας. (Προηγήθηκε responsive fix που έσπασε τις ώρες σε δική τους γραμμή σε
mobile — έμενε η ασυνέπεια του native input.)
- **νέο κοινό `components/ui/time-select.tsx`**: `TimeSelect` (24ωρο, options κάθε 15′ 00:00–23:45) πάνω
  στο themed `SelectMenu` → locale-independent (πάντα «HH:MM», χωρίς AM/PM ή native ρολόι), ανοίγει
  themed dropdown, ίδιο σε EN/EL. Props `disabled/className/triggerClassName` (default `w-24`/`h-9 px-2.5`).
  Κράτημα off-grid value (δεν χάνεται). Extracted από το hours-editor (ήταν local εκεί).
- **`settings/hours-editor.tsx`**: αφαιρέθηκε το local `TimeSelect`+`TIME_OPTIONS`+import `SelectMenu`,
  τώρα import το κοινό `TimeSelect` (συμπεριφορά ίδια — w-24).
- **`signup/business/wizard.tsx`**: και τα 4 native time inputs (πρωί open/close + απόγευμα open2/close2)
  → `TimeSelect` με `className="min-w-0 flex-1 sm:w-28 sm:flex-none"` (mobile flex, desktop w-28). Ίδιες
  τιμές «HH:MM» — καμία αλλαγή backend.
- tsc + eslint καθαρά. Τώρα οι ώρες παντού: themed dropdown, 24ωρο, ίδιες EN/EL. ⚠️ Οπτική επαλήθευση
  από τον χρήστη (mobile EN+EL, tap→dropdown).

---

## 2026-06-21 — QR πρότυπο νέων sites = clone του saved Barber House poster (template cloning) ✅ DONE

User: «πάρε το poster έτσι ακριβώς όπως είναι από τον λογαριασμό giorgakis18os@gmail.com και κάντο
πρότυπο για όλα τα νέα site». (Είχε κάνει ΟΛΗ τη στοίχιση χειροκίνητα στον editor & save — άρα το saved
config είναι το επιθυμητό. Επιβεβαιώθηκε: middle action icon στο κέντρο του QR, ίσες αποστάσεις 84px.)
- **νέο `lib/poster-blueprint.json`**: το ΑΚΡΙΒΕΣ saved config του barber-house (27 elements, ως έχει),
  με κενά placeholders στα per-shop πεδία (`qr.data:""`, `img.src:""`, `table.rows:[]`).
- **`lib/qr-template.ts` `buildDefaultTemplate` ΞΑΝΑΓΡΑΦΤΗΚΕ** (αντικατέστησε το παλιό procedural):
  clone του blueprint (deep copy + regen ids) με per-business substitution:
  - `qr.data` → `b.bookingUrl`
  - `table.rows` → `scheduleRows(b.hours)` (Mon→Sun, split shifts, «ΚΛΕΙΣΤΑ»)
  - `image` → αν `b.logoUrl` βάζει το λογότυπό του· αλλιώς το αντικαθιστά με **text όνομα** (Bebas Neue,
    στη θέση του λογοτύπου). Νέο `BusinessForTemplate.logoUrl?`.
- **`qr/page.tsx`**: +`logo_url` στο business query → περνά `logoUrl` στο buildDefaultTemplate.
- Αφαιρέθηκαν αχρησιμοποίητες theme consts (GOLD/INK2/MUTED/WHITE/HEAD/SERIF) — έμειναν μόνο INK/LOGO_FONT.
- **Επαλήθευση (tsx script):** withLogo→27 els, qr=δικό του link, img.src=δικό του· noLogo→όνομα ως text·
  table rows = δικό του ωράριο. tsc+eslint καθαρά. (Αντικαθιστά τα ενδιάμεσα parametric/alignment edits
  του buildDefaultTemplate — τώρα είναι ακριβές clone.) Τα 2 άλλα businesses (χωρίς saved) + νέα παίρνουν
  αυτό· barber-house κρατά το saved του.

---

## 2026-06-21 — QR table: στρογγυλά fontSize/rowHeight (fix στη ρίζα του resize) ✅ DONE

User: στο QR poster ο πίνακας έδειχνε Text size 20.50075… & Row height 41.0015… (δεκαδικά από scaling).
Ζήτησε 20/41 + «πρότυπο για όλα τα site, όχι μόνο barber house».
- **Ρίζα (`qr-editor.tsx` table `onTransformEnd`, ~γρ.951-952):** `rowHeight/fontSize = el.* * ratio`
  ΧΩΡΙΣ `Math.round` (σε αντίθεση με το text element που κάνει round) → δεκαδικά. **Fix:** τύλιγμα με
  `Math.round(...)`. Πλέον ΚΑΝΕΝΑ site δεν παράγει δεκαδικά σε resize πίνακα.
- **Saved value (Supabase):** το μόνο custom template με πίνακα ήταν του Barber House. `jsonb` update
  στο `qr_templates.config.elements` (το table element) → `fontSize:20, rowHeight:41` (επιβεβαιώθηκε).
- **Διαπίστωση:** biz_count=**3** πλέον (όχι 1)· μόνο barber-house έχει custom template· τα άλλα 2 +
  νέα παίρνουν `buildDefaultTemplate` (render live στον editor όταν δεν υπάρχει saved). Σύγκριση BH vs
  default: **ίδιο design**, με τη μόνη ουσιαστική διαφορά ότι το BH έχει το ωράριο ως **table** (το
  default το είχε ως κείμενο) + uploaded logo image + clustered icons.
- **«Πρότυπο για όλα» (AskUserQuestion → «κάθε ΝΕΟ κατάστημα από αυτό το poster»):** αντί για destructive
  cloning, **παραμετρική αναβάθμιση του `buildDefaultTemplate`**: το ωράριο πλέον φτιάχνεται ως
  **bordered table** (Montserrat, labelColor/valueColor INK, borderColor GOLD, showOuter/showColLine
  false, **fontSize 20 / rowHeight 41**, lineBelow true εκτός τελευταίας) από το `b.hours` κάθε
  καταστήματος (Mon→Sun, split shifts σε γραμμές, «ΚΛΕΙΣΤΑ» στα κλειστά). Τα από-κάτω sections (action
  icons/features/footer) μετατοπίζονται με `lowerShift = max(0, tableY+tableHeight()+24-750)` ώστε να
  χωρά ψηλός πίνακας. Έτσι ΚΑΘΕ νέο κατάστημα ξεκινά με τον πίνακα-ωράριο (δικό του ωράριο/όνομα/QR)·
  τα 2 υπάρχοντα (χωρίς saved) παίρνουν κι αυτά το νέο default· barber-house κρατά το saved του.
  tsc καθαρό. ⚠️ Οπτική επαλήθευση εκκρεμεί (φαίνεται σε νέο/test κατάστημα — το barber-house έχει saved
  poster οπότε δεν δείχνει το default). Logo-as-image για νέα = πιθανό μελλοντικό (τώρα: text όνομα).

---

## 2026-06-20 — Themed number inputs (`NumberField`) + custom scrollbars + CategoryPicker polish ✅ DONE

Συνέχεια του visual-polish (μετά τα dropdowns). 3 follow-ups από screenshots χρήστη:
- **Custom scrollbars (`globals.css`):** το native (άσπρο/χοντρό) scrollbar μέσα στα dropdowns δεν
  ταίριαζε. Καθολικό styling: WebKit `::-webkit-scrollbar*` (10px, inset 2px, στρογγυλό «pill» thumb σε
  `--border-strong`, **gold `--gold-dim` στο hover**, διάφανο track) + Firefox `scrollbar-width:thin`/
  `scrollbar-color`. Πιάνει σελίδα + modals + ΟΛΑ τα dropdowns.
- **`CategoryPicker` (Ρυθμίσεις→Κατηγορίες):** το dropdown του (search + «+») δεν είχε το pill-στυλ του
  `SelectMenu`. Panel `py-1`→`p-1`· κάθε option `rounded-lg` + hover/focus **`bg-gold/10` + gold text**
  (αντί `hover:bg-surface-3`). Ίδιο look με «Είδος υπηρεσίας».
- **Native number spinner (άσπρο OS κουτί) → themed (`NumberField`):**
  - **νέο `components/ui/number-field.tsx`**: input με δικά μας **χρυσά βελάκια ▲▼** δεξιά (γκρι, gold
    στο hover). Τα βελάκια καλούν native `stepUp()/stepDown()` (σέβονται min/max/step) + dispatch
    `input` event ώστε να πυροδοτείται το controlled `onChange` του React. Native spinner κρυμμένο
    (`[appearance:textfield]` + webkit pseudo).
  - **`globals.css`**: καθολική απόκρυψη του native number spinner (webkit + `-moz-appearance`) — φεύγει
    το άσπρο κουτί από ΟΛΑ τα number inputs.
  - Εφαρμογή: **price** (services-manager) + **9 πεδία QR editor** (rotation→`w-20`, fontSize/strokeWidth/
    cornerRadius/rowHeight/borderWidth κ.λπ. → `h-9`). Όλα τα `<input type="number">` → `NumberField`.
- tsc καθαρό. PC + mobile. ⚠️ Εκκρεμεί οπτική επαλήθευση από τον χρήστη.

---

## 2026-06-20 — Custom themed dropdowns (`SelectMenu`) αντί native `<select>` παντού ✅ DONE

User: τα native dropdowns (το open menu που σχεδιάζει το OS/browser) φαίνονται απλά & δεν ταιριάζουν
με το premium dark/gold design. Ζήτησε πρώτα ένα δείγμα στο «Είδος υπηρεσίας» → ενέκρινε («τέλειο»,
με στρογγυλεμένες άκρες στο επιλεγμένο) → μετά εφαρμογή σε ΟΛΑ (PC + mobile).
- **νέο `components/ui/select-menu.tsx`** (`SelectMenu`): themed dropdown — trigger σαν input (h-11
  default, chevron που γυρίζει, gold border/ring όταν ανοιχτό) + panel (bg-surface, border, shadow-2xl,
  `max-h-72` scroll). Κάθε option = **pill** (`rounded-lg`, panel `p-1`) με hover (surface-2 + gold)·
  επιλεγμένο = `bg-gold/10` + gold text + ✓. Outside-click/Escape close, keyboard (↑/↓/Enter/Esc),
  `role=listbox/option`. Props: `value/onChange/options{value,label,indent}`, `disabled`, `className`
  (root width/placement), `triggerClassName` (height/padding override — δουλεύει χάρη στο twMerge στο
  `cn`), `ariaLabel`, `placeholder`. `indent` → υποκατηγορίες με εσοχή.
- **Εφαρμογή σε όλα τα native `<select>`** (9 σημεία):
  - `business-search.tsx` (Είδος υπηρεσίας — parent/child με indent)
  - `calendar-client.tsx` (φίλτρο προσωπικού εβδομάδας· φόρμα νέου ραντεβού: Άτομο + Υπηρεσία —
    τα `<label>` έγιναν `<div>` για να μην κάνει label-forward το click στο trigger)
  - `services-manager.tsx` (Διάρκεια), `reviews-manager.tsx` (φίλτρο), `hours-editor.tsx` (TimeSelect)
  - `qr-editor.tsx` (×3: γραμματοσειρά text, βάρος, γραμματοσειρά table)
  - **`phone-input.tsx`** (κωδικός χώρας — ειδική περίπτωση: inline dropdown μέσα στο σύνθετο πεδίο·
    το panel βγαίνει ΕΞΩ από το `overflow-hidden` container via wrapper `relative` + flag/dial/✓).
- Ίδιο look & συμπεριφορά σε **PC + mobile** (tap targets + scroll). tsc καθαρό. Lint: μόνο pre-existing
  `set-state-in-effect` warnings (όχι νέα). ⚠️ Εκκρεμεί οπτική επαλήθευση από τον χρήστη.
- **Follow-up — themed scrollbars (`globals.css`):** καθολικό styling μπάρας κύλισης (WebKit
  `::-webkit-scrollbar*` + Firefox `scrollbar-width/color`): λεπτή (10px, inset 2px), στρογγυλεμένο
  «pill» thumb σε `--border-strong`, **gold (`--gold-dim`) στο hover**, διάφανο track. Πιάνει αυτόματα
  σελίδα + modals + ΟΛΑ τα dropdowns/menus (το native scrollbar του OS δεν ταίριαζε με το dark theme).

---

## 2026-06-20 — Ημερολόγιο mobile: tap → «Μετακίνηση» + «Αλλαγή διάρκειας» (drag μόνο σε PC) ✅ DONE

User: σε κινητό το drag-drop για μετακίνηση/αλλαγή διάρκειας ραντεβού είναι δύσκολο & επικίνδυνο
(εύκολο λάθος, μπερδεύεται με scroll). Ζήτησε: tap σε ραντεβού → στο popover να προστεθούν «Μετακίνηση»
+ «Αλλαγή διάρκειας», και να αφαιρεθεί το drag από κινητό. **Αποφάσεις (AskUserQuestion):** μετακίνηση =
**από λίστα διαθέσιμων ωρών**· διάρκεια = **κουμπιά −15/+15**· drag = **μόνο σε PC**.
- **`calendar/actions.ts`**: νέα `availableMoveSlots({bookingId, date})` — owner/manager· κρατά τρέχουσα
  διάρκεια & υπάλληλο· επαναχρησιμοποιεί `computeStaffAwareSlots` (ίδια λογική με την online κράτηση:
  ώρες + staff/capacity), **εξαιρώντας το ίδιο το ραντεβού** (bookings query με `.neq("id", …)`).
  Επιστρέφει μόνο ΕΛΕΥΘΕΡΕΣ ώρες → αδύνατη διπλοκράτηση. (Reuse υπαρχόντων `moveBooking`/`resizeBooking`.)
- **νέο `calendar/booking-edit-modal.tsx`** (client): modal με 2 tabs — «Ώρα & μέρα» (day nav ◀▶ +
  native date input + grid διαθέσιμων ωρών → select → «Εφαρμογή» → `moveBooking`) και «Διάρκεια»
  (−15/+15 stepper, min 15΄, live preview νέας λήξης → `resizeBooking`). Σφάλματα μέσω `dashErr`.
- **`calendar-client.tsx`**:
  - **Touch gating (κλειδί):** card `onPointerDown` → `if (e.pointerType !== "mouse") return` (δάχτυλο/
    pen ΔΕΝ ξεκινά drag)· νέο card `onClick` ανοίγει το popover (με `suppressClickRef` guard για να μη
    διπλο-ανοίγει μετά από mouse drag)· ο global drag-`onUp` στο `!moved` πλέον αφήνει το onClick να
    ανοίξει το popover. Card class `touch-none` → **`touch-manipulation`** (επιτρέπει scroll με δάχτυλο
    πάνω στις κάρτες). Resize handle: `pointerType` mouse-only + **`hidden md:flex`** (κρυφό σε mobile).
  - Popover: 2 νέα κουμπιά (gated `!isResolved`) «Μετακίνηση ραντεβού» / «Αλλαγή διάρκειας» → ανοίγουν
    το modal. Optimistic update rows + `router.refresh()` + toast (`movedOk`/`durationOk`).
- **i18n (bilingual-first)**: +16 keys στο `dashboard.calendar` (moveAction/durationAction/editMoveTitle/
  editDurationTitle/tabTime/tabDuration/pickNewTime/loadingSlots/noSlots/keepStaffNote/currentDuration/
  newEnd/apply/movedOk/durationOk) el+en 759/759· ενημερώθηκε `guideTip2` (PC=drag, mobile=tap).
- Drag/resize **σε desktop αμετάβλητα** (mouse). tsc καθαρό· JSON συμμετρικά (759/759).
  ⚠️ Εκκρεμεί οπτική επαλήθευση από τον χρήστη σε πραγματικό κινητό (ο χρήστης τρέχει & ελέγχει μόνος του).

---

## 2026-06-20 — Account mobile nav, card redesign, GPS αναζήτηση, GPS Ρυθμίσεων ✅ DONE

### Account nav mobile: ☰ header (ίδιο pattern με dashboard Topbar) ✅

User: στο mobile `/account` το header έδειχνε το λογότυπο «Qlick» — να αντικατασταθεί με ☰ όπως το Topbar του dashboard.
- `account/layout.tsx`: αντικατάσταση `<Link><Logo/></Link>` με `<AccountMenuButton locale={locale} />` + τύλιγμα με `<MobileNavProvider>` (απαιτείται από `useMobileNav` context).
- `components/account/account-nav.tsx`: drawer έγινε ίδιο με dashboard sidebar:
  - Row 1 (h-16, border-b): `<Logo/>` αριστερά + `<X/>` κλείσιμο δεξιά
  - Row 2 (py-4, border-b): `{d.title}` («Ο λογαριασμός μου»)
  - Nav links `flex-1 space-y-1 overflow-y-auto p-3`
  - `AccountMenuButton` (md:hidden): ☰ + τίτλος τρέχουσας ενότητας.

### Κάρτες καταστημάτων: νέο layout logo+name top / details bottom ✅

User: οι κάρτες (ραντεβού/αναζήτηση/αγαπημένα/κριτικές) να έχουν logo+όνομα πάνω, υπόλοιπα κάτω με border separator.
- Αλλαγές: `account/page.tsx` (BookingCard), `account/favorites/page.tsx`, `account/search/page.tsx`, `(marketing)/search/page.tsx` (×2 instances), `my-reviews.tsx`.
- Δομή: **Top** `flex gap-3` — logo + name + extra action · **Bottom** `border-t pt-3` — date/address/distance/status/price/badge.
- Logo container: **`h-16 w-32`** (64×128, 2:1 ratio) + `object-contain` — ταιριάζει στα 800×400px landscape logos. Προηγουμένως `size-16` (τετράγωνο) έκοβε τη φωτό.

### GPS auto-detect τοποθεσίας στην αναζήτηση (χωρίς κουμπί) ✅

User: αυτόματη ανίχνευση τοποθεσίας χρήστη κατά το άνοιγμα της αναζήτησης — χωρίς κουμπί.
- **`app/api/reverse-geocode/route.ts`** (νέο): Nominatim proxy `/api/reverse-geocode?lat=&lng=&lang=`. Επιστρέφει `{ label: "Suburb, City" }` (suburb/neighbourhood/road + city/town/village fields).
- **`components/account/business-search.tsx`**:
  - Νέο prop `basePath?: string` — fix pre-existing bug: πάντα redirected στο `/account/search` · public `/search` page τώρα περνά `basePath={`/${locale}/search`}`.
  - `useEffect([], [])` — τρέχει μία φορά on mount, μόνο αν δεν υπάρχουν ήδη coords:
    `navigator.geolocation.getCurrentPosition()` → reverse-geocode → `setCoords({lat,lng})` + `setLocText(label)`. Silent fail σε permission denied.
  - Placeholder `t.gpsLocating` ενώ φορτώνει · `gpsLoading` state.
- i18n: +5 keys στο `search` section (`useGps`, `gpsLocating`, `gpsPermissionDenied`, `gpsError`, `myLocation`) el+en.
- **⚠️ Σημαντική ανακάλυψη `AddressAutocomplete`:** `onChange` (→ `setCoords(null)`) καλείται ΜΟΝΟ από physical keyboard input (guard `userTyped.current = true`) — ΟΧΙ από programmatic `value` prop changes. Άρα το `setLocText(label)` από GPS ΔΕΝ σβήνει τα coords. Safe ✓

### GPS «Ορισμός τοποθεσίας» στο Dashboard → Ρυθμίσεις ✅

**Πρόβλημα**: η απόσταση καταστήματος εμφανιζόταν ~865μ ενώ ο χρήστης ήταν 30μ μακριά. Αιτία: το OSM geocoding κατά την εγγραφή τοποθέτησε το Barber House σε λάθος συντεταγμένες (κοινό πρόβλημα για μικρές ελληνικές πόλεις).
- **`business-info-editor.tsx`**:
  - `gpsLoading`, `gpsOk` states + `gpsOkTimer` ref.
  - `handleSetGps()`: `getCurrentPosition()` → (1) αποθηκεύει raw GPS coords στο `coords` state, (2) reverse-geocodes Nominatim → ενημερώνει και το `city` field (coords + city σε συμφωνία — αν δεν reverse-geocode-αρει, κρατά την υπάρχουσα πόλη), (3) «Τοποθεσία ορίστηκε ✓» για 4sec.
  - Κουμπί «📍 Ορισμός τοποθεσίας με GPS» κάτω από το address field + hint «Πάτα μόνο ενώ βρίσκεσαι στο κατάστημά σου με το κινητό σου».
- i18n: +5 keys στο `dashboard.settings.bizInfo` (`gpsSet`, `gpsLocating`, `gpsDone`, `gpsFailed`, `gpsHint`) el+en.
- **⚠️ Ατύχημα + DB fix**: χρήστης πάτησε το κουμπί από PC (Θεσσαλονίκη) → coordinates Θεσσαλονίκης (40.64, 22.93) αποθηκεύτηκαν (το city field δεν ενημερώθηκε ακόμα τότε) → το κατάστημα «χάθηκε» από αναζητήσεις Κομοτηνής. Επαναφορά μέσω Supabase MCP: `UPDATE businesses SET address = jsonb_set(jsonb_set(address, '{lat}', '41.1185163'), '{lng}', '25.3932547') WHERE slug = 'barber-house'`. Η διόρθωση (reverse-geocode + city update) αποτρέπει το ίδιο σφάλμα στο μέλλον — ο χρήστης βλέπει ότι η πόλη αλλάζει και δεν αποθηκεύει αν δεν ταιριάζει.

### iOS GPS permission (ενημέρωση)

iOS Safari: **2 επίπεδα permission** — (1) System: Settings → Privacy → Location Services → Safari → "While Using" + (2) Per-website: Safari tap «AA» → Website Settings → Location → Allow. Και τα δύο πρέπει Allow. Επίσης η σελίδα πρέπει να σερβίρεται σε **HTTPS** (iOS αρνείται GPS σε HTTP).

### Εκκρεμεί: coordinates Barber House

Οι αποθηκευμένες coords Barber House (41.1185163, 25.3932547) έχουν ~865μ σφάλμα λόγω OSM. Μόνιμη λύση: ο ιδιοκτήτης να χρησιμοποιήσει το GPS κουμπί Ρυθμίσεων από κινητό ενώ βρίσκεται στο κατάστημα (αφού λύσει το Safari location permission).

---

## 2026-06-19 — Account nav (mobile) → ίδια λογική με το dashboard Topbar ✅ DONE

User (με screenshots): το mobile trigger του `account-nav.tsx` (full-width «pill» με ☰ δεξιά) να γίνει
σαν το **Topbar** του dashboard. Αλλαγή: αντικαταστάθηκε με **topbar-style row** — **☰ αριστερά**
(ίδιο styling με το topbar: `-ml-1 shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-2`) + τίτλος
**τρέχουσας ενότητας** (`current.label`, π.χ. «Τα ραντεβού μου») + υπότιτλος «Ο λογαριασμός μου»
(`d.title`) — καθρεφτίζει το `[☰] Τίτλος / Υπότιτλος` του Topbar. Ο μεγάλος `<h1>Ο λογαριασμός μου</h1>`
στο `account/layout.tsx` έγινε **`hidden md:block`** (σε mobile ζει ως υπότιτλος στη γραμμή του nav·
desktop αμετάβλητο: h1 + οριζόντια tabs). Επαλήθευση @mobile: ☰ left=20, ανοίγει drawer (left 0), X
κλείνει (drawer unmount), big h1 hidden. tsc καθαρό.

---

## 2026-06-19 — Mobile: «Σύνδεση» ξανά ορατό στο header της αρχικής ✅ DONE

User: σε mobile στην αρχική, το header έδειχνε μόνο EL/EN + «Δωρεάν δοκιμή» — έλειπε το «Σύνδεση».
Αιτία: `components/marketing/header.tsx` (anon branch) το login link ήταν `hidden … md:inline`.
Fix: αφαιρέθηκε το `hidden md:inline` → ορατό παντού. Επαλήθευση (screenshot @~360px): Qlick · EL EN ·
Σύνδεση · Δωρεάν δοκιμή σε μία σειρά, **καμία υπερχείλιση**. tsc καθαρό.
⚠️ Παρόμοιο μοτίβο υπάρχει και στο `b/[slug]/layout.tsx` (login `hidden sm:inline` + **μακρύ** CTA
«Δημιουργία λογαριασμού») — ΔΕΝ πειράχτηκε (θα ήθελε σύντομο CTA σε mobile για να χωρέσει)· εκκρεμεί αν
το ζητήσει ο χρήστης.

---

## 2026-06-19 — 🔑 Η ΠΡΑΓΜΑΤΙΚΗ αιτία «δεν δουλεύουν taps στο κινητό» = `allowedDevOrigins` ✅ FIXED

Ο χρήστης ξανα-σήκωσε τον **dev** server (reset script → `next dev`, Turbopack) και δοκίμασε από το
κινητό → ίδιο πρόβλημα, ΚΑΙ ο server **έσκασε**. Το terminal log αποκάλυψε τη ρίζα:
- **`⚠ Blocked cross-origin request to /_next/webpack-hmr from "192.168.1.74"`** — το **Next 16 μπλοκάρει
  τα dev resources (HMR/`/_next/*`) όταν μπαίνεις από το LAN IP** (όχι localhost). Το μπλοκαρισμένο HMR
  ξαναπροσπαθεί ασταμάτητα → ο client δεν «ζωντανεύει» σωστά → **taps δεν δουλεύουν**. Γι' αυτό η
  **production** δούλευε (δεν έχει dev cross-origin restriction) και η **dev όχι** — ΟΧΙ (μόνο) λόγω
  ταχύτητας, όπως νομίζαμε χθες.
- **`RangeError: Map maximum size exceeded`** (Turbopack dev runtime, `AsyncHook.init` μέσω
  `useActionState` στο LoginForm) → το crash. Επιδεινώνεται από την καταιγίδα retries του μπλοκαρισμένου
  HMR (κάθε αποτυχία = async contexts που γεμίζουν το internal Map).
- **FIX (μία ρύθμιση):** `next.config.ts` → **`allowedDevOrigins: ["192.168.1.74","192.168.1.*",
  "192.168.0.*","10.0.0.*","172.16.0.*"]`** (επιβεβαιώθηκε από bundled Next 16 docs: δέχεται hosts +
  wildcards). Επαλήθευση: μετά το fix, αίτημα με `Origin: http://192.168.1.74:3000` σε dev resource →
  **ΚΑΝΕΝΑ** «Blocked cross-origin» στο log· dev server σταθερός, όλα τα routes 200. Wildcards για να
  μη χαλάει αν αλλάξει το LAN IP (DHCP).
- **Εκκρεμεί/fallback:** αν ξανα-σκάσει το Turbopack (`Map maximum size exceeded` / το παλιό «Jest
  worker»), το `dev` script μπορεί να γίνει **`next dev --webpack`** (πιο σταθερό, λίγο πιο αργό HMR·
  ο `--webpack` flag υπάρχει στο Next 16). Δεν το άλλαξα ακόμα — πρώτα δοκιμάζουμε αν το `allowedDevOrigins`
  σταματά και το crash (πιθανό, αφού κόβει την καταιγίδα HMR retries).
- ⚠️ **Διόρθωση χθεσινής υπόθεσης:** το «πάντα production για κινητό» ΔΕΝ ήταν η ρίζα — με
  `allowedDevOrigins` το **dev δουλεύει κανονικά στο κινητό**. Production παραμένει ο πιο γρήγορος/
  αξιόπιστος τρόπος, αλλά πλέον ΔΕΝ είναι υποχρεωτικός.

---

## 2026-06-19 — Mobile responsive: όλο το dashboard + έλεγχος δημόσιων σελίδων ✅ DONE

User: μπήκε από το κινητό (`192.168.1.74:3000`) — ενώ από υπολογιστή είναι άψογο, στο κινητό είδε
«τουλάχιστον 3 πράγματα» που χαλάνε. Ζήτησε προσαρμογή για κινητά **χωρίς** να χαλάσει το desktop.
**Αποφάσεις χρήστη (AskUserQuestion):** προβλήματα «και στα δύο» (dashboard + δημόσιες)· επαλήθευση
με **test λογαριασμό** (δημιουργήθηκε & διαγράφηκε μετά).
- **Διάγνωση (live preview @375px):** δημόσιες σελίδες (landing/login/`/b/[slug]`/booking flow/
  `/account`) ήταν ήδη ΟΚ. Το **dashboard ήταν σπασμένο**: το sidebar `w-64` πάντα ορατό «έτρωγε»
  ~230/375px → περιεχόμενο κομμένο· topbar `px-8` με 5 στοιχεία ξεχείλιζε· content `p-8` υπερβολικό.
- **Shell (κλειδί — ξεκλειδώνει ΟΛΕΣ τις σελίδες):**
  - **νέο `components/dashboard/mobile-nav.tsx`** (`MobileNavProvider` + `useMobileNav` context, open/setOpen).
  - `dashboard/layout.tsx`: τυλίγει με `MobileNavProvider`· content column `min-w-0`.
  - **`sidebar.tsx`** → mobile drawer: base `fixed inset-y-0 left-0 z-50 ... -translate-x-full`,
    `md:static md:translate-x-0` (desktop αμετάβλητο)· backdrop `md:hidden`· X κουμπί (md:hidden)·
    `onClick={close}` σε όλα τα links (κλείνει μετά την πλοήγηση).
  - **`topbar.tsx`** → hamburger (`Menu`, md:hidden) αριστερά· padding `px-4 sm:px-6 lg:px-8`·
    title `truncate`· σε mobile account+logout **icon-only** (text `hidden lg:inline`, +`LogOut` icon).
  - **Content padding** σε **10 σελίδες**: `p-8`/`space-y-6 p-8` → `p-4 sm:p-6 lg:p-8`.
- **Wide σελίδες:**
  - **Ημερολόγιο** (`calendar-client.tsx`): toolbar `grid-cols-3` (επικαλυπτόταν) → `flex flex-col`
    σε mobile, `md:grid md:grid-cols-3`· view switcher/date-nav/picker στοιβάζονται· px responsive.
  - **QR editor**: εργαλείο ακριβείας — `qr-editor-loader.tsx` media-query gate (`min-width:768px`):
    σε mobile δείχνει κομψό μήνυμα «Καλύτερα από υπολογιστή» (Monitor) **χωρίς** να φορτώνει Konva.
  - **Ραντεβού** (`bookings-list.tsx`): tab bar (520px) ξεχείλιζε → wrap σε `overflow-x-auto` (σκρολάρει
    εσωτερικά, όχι η σελίδα).
  - **past-due-reminder**: 3 κουμπιά `grid-cols-3` (επικάλυψη) → `grid-cols-1 sm:grid-cols-3`.
  - **staff-manager** κάρτα: `flex-wrap` + left `basis-full sm:basis-auto` → όνομα/κουμπιά στοιβάζονται
    σε <640px (όχι πια κομμένο όνομα).
- **i18n (bilingual-first)**: +`dashboard.openMenu` (αριστερό hamburger aria) + `dashboard.qr.mobileTitle`/
  `mobileBody` (μήνυμα QR), el+en συμμετρικά **761/761**.
- **Επαλήθευση (live @375px screenshots):** overview/calendar(day+week)/qr/services/settings(+hours)/
  reports/bookings/staff/account — όλα καθαρά, **καμία οριζόντια υπερχείλιση** (scrollWidth=viewport).
  tsc καθαρό· JSON συμμετρικά. Desktop αμετάβλητο (όλες οι αλλαγές πίσω από `md:`/`sm:`/`lg:`).

**Follow-up — κάρτες λίστας (ραντεβού/αναζήτηση/αγαπημένα/κριτικές):** ο χρήστης συνδέθηκε στον preview
browser (πραγματικός λογαριασμός barber-house) → φάνηκε ότι οι κάρτες με λογότυπο ήταν στριμωγμένες σε
mobile: το thumbnail `h-24 w-48` (192px) + αριστερή ομάδα **χωρίς** `flex-1` → στήλη στοιχείων μόλις
127px → η τιμή **επικάλυπτε** ημ/ώρα και το όνομα κοβόταν σε «Bar...». Διορθώσεις (6 σημεία:
`account/page`, `account/favorites`, `account/search`, `(marketing)/search` ×2, `components/account/
my-reviews`): (1) λογότυπο `h-24 w-48` → **`size-16 sm:h-24 sm:w-48`** (64px τετράγωνο σε mobile, πλατύ
2:1 σε desktop)· (2) αριστερή ομάδα `flex min-w-0 items-center` → **`+flex-1`** (γεμίζει τον χώρο)·
(3) booking card name-row → **`flex-wrap`** ώστε το status badge («Ακυρώθηκε» κ.λπ.) να πέφτει σε 2η
γραμμή σε στενά (το όνομα δεν κόβεται· σε desktop μένει δίπλα). Επαλήθευση @375: name `truncated:false`,
τιμή χωρίς επικάλυψη· πραγματικό ημερολόγιο (Γιώργος + άδεια/ρεπό) καθαρό. tsc καθαρό· desktop αμετάβλητο.

**Follow-up #2 — 3 user-reported bugs (mobile, logged-in):** (α) logout κρυβόταν (ήθελε zoom-out)·
(β) account tabs (5) ήθελαν hamburger όπως το dashboard· (γ) **το X του dashboard drawer ΔΕΝ έκλεινε**.
- **(α) Header overflow:** `account/layout.tsx` + `components/marketing/header.tsx` — «Διαχείριση
  καταστήματος»/«Το κατάστημά μου» + «Αποσύνδεση» icon-only σε <sm (`<span className="hidden sm:inline">`
  + `LogOut`/`Store` icons), gap `gap-1.5 sm:gap-3`. Επαλήθευση: logout right=351<375, overflow=false.
- **(β) Account nav drawer:** `components/account/account-nav.tsx` ξαναγράφτηκε — desktop tabs
  (`hidden md:flex`) + mobile trigger (current tab + `Menu` icon) που ανοίγει left drawer (self-contained
  `useState`). +`account.openMenu` (el+en, 762/762).
- **(γ) ΡΙΖΑ του X-bug (σημαντικό gotcha):** το `transition-transform` του TW v4 περιλαμβάνει την
  ιδιότητα **`translate`**, και η μετάβαση `-translate-x-full` (**-100%**) ↔ `translate-x-0` (**0px**)
  **κολλάει** (mismatch %/px· δοκιμάστηκε και `-translate-x-64` rem↔px → επίσης κολλάει) → το drawer
  έμενε στο translate:-100% παρόλο που η κλάση ήταν `translate-x-0` → δεν άνοιγε/έκλεινε σωστά. **Fix:
  αφαίρεση του `transition-transform` από ΚΑΙ τα δύο drawers** (sidebar + account-nav) → instant
  open/close, αξιόπιστο. (Τα toggle-switches με `translate-x-5`↔`translate-x-0` px↔px ΔΕΝ θίγονται.)
  ⚠️ Μάθημα: για slide-in drawers σε TW v4 **μην** βασίζεσαι σε transition του `translate` property
  μεταξύ % και length· είτε instant, είτε animate με keyframes/`transform`.
- Επαλήθευση μέσω DOM-measurements (τα preview screenshots timed-out όλο το session — tooling, όχι app·
  μηδέν console errors): dashboard drawer closed=-256→open=0→X=-256→backdrop-close=-256 ✓· account-nav
  ίδιο ✓. tsc καθαρό· 762/762· desktop αμετάβλητο.

**Follow-up #3 — iPhone: «δεν δουλεύουν taps» (μενού + επιλογή υπηρεσίας) → ΕΠΙΛΥΘΗΚΕ.** Ο χρήστης
(iPhone 17 Pro Max, Safari **και** Brave) ανέφερε ότι δεν άνοιγε το μενού ΚΑΙ δεν δούλευε το tap σε
υπηρεσία στην κράτηση. Η επιλογή υπηρεσίας είναι κανονικό `<button>` σε σελίδα **χωρίς** drawer →
απέκλεισε overlay/element-type· console καθαρό· κανένα global CSS (touch-action/user-select) πρόβλημα.
- **Σκλήρυνση μενού (robust):** και τα δύο drawers (`sidebar.tsx`, `account-nav.tsx`) ξαναγράφτηκαν με
  **conditional rendering** — desktop = μόνιμη στήλη (`hidden md:flex`)· mobile drawer **μπαίνει στο DOM
  ΜΟΝΟ όταν `open`** (`{open && <div className="md:hidden">…backdrop+aside…</div>}`). Όταν κλειστό →
  **δεν υπάρχει καθόλου** → αδύνατο να μπλοκάρει taps σε οποιονδήποτε browser (κανένα off-screen fixed
  element). Επαλήθευση @375 με `elementFromPoint` (πραγματικό tap, όχι `.click()`): closed→1 aside μόνο
  (desktop hidden), hamburger reachable· open→drawer left=0, X reachable· σάρωση ΟΛΩΝ των κουμπιών = 0
  blocked.
- **iOS tap optimization:** `globals.css` → `button,a,[role=button],label,input,select,textarea {
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; }` (όχι 300ms double-tap delay).
- **🔑 ΡΙΖΑ (μεγάλο μάθημα):** το πρόβλημα ΗΤΑΝ η **dev build πάνω σε κινητό μέσω LAN** — βαριά/αργή,
  η σελίδα φαινόταν αλλά αργούσε πολύ να γίνει interactive (hydrate) → taps «δεν δούλευαν». **Λύση:
  production build** (`npm run build` → `npx next start -H 0.0.0.0 -p 3000`) στο ίδιο `192.168.1.74:3000`
  → hydrate ακαριαίο → **«επιτέλους δούλεψαν όλα»** (μενού + κράτηση). ⚠️ **Για mobile testing πάντα
  production build, ΟΧΙ dev.** Μνήμη: `feedback_mobile_verification`.

---

## 2026-06-19 — Επισκόπηση: «σήμερα» widgets + celebration μόνο 48h ✅ DONE

User: η `/dashboard` (πρώτη οθόνη στη σύνδεση) να είναι πιο χρήσιμη — τα στατικά Υπηρεσίες/QR δεν
χρειάζονται καθημερινά. **Αποφάσεις χρήστη (AskUserQuestion):** stat cards = **Ραντεβού σήμερα**,
**Υπάλληλοι σήμερα**, **Έσοδα σήμερα (ενδεικτικά)**. Επίσης το «Συγχαρητήρια…» card να εμφανίζεται
**μόνο τις πρώτες 48 ώρες** μετά τη δημοσίευση.
- **migration 040**: `businesses.published_at timestamptz`· το `maybe_activate_business` το γεμίζει
  (`coalesce(published_at, now())`) τη στιγμή της go-live· backfill υπαρχόντων active = `created_at`
  (ώστε παλιά καταστήματα να είναι >48h → χωρίς celebration). types.ts +published_at.
- **`dashboard/page.tsx`** (πλήρης ανασχεδιασμός των cards): αντικαταστάθηκαν τα Υπηρεσίες/Ραντεβού
  σύνολο/QR με 3 «σήμερα» cards: **Ραντεβού σήμερα** (count μη-ακυρωμένων + subtitle «{n} απομένουν»/
  «Κανένα για σήμερα», →/bookings)· **Υπάλληλοι σήμερα** (ενεργοί που είναι σε βάρδια σήμερα — custom
  staff_hours για το weekday αλλιώς business open· εξαιρεί full-day time-off· χρησιμοποιεί
  `buildDayWindow`+`dayOfWeekInZone`, →/staff)· **Έσοδα σήμερα** (άθροισμα price_cents pending/confirmed/
  completed, ενδεικτικά, →/reports). Today range με `todayInZone`+`dayRangeUtc` (tz-aware). `StatCard`
  επεκτάθηκε με optional `sub` + optional `href`.
- **Celebration 48h**: το `PublishedCard` εμφανίζεται μόνο αν `published && now-published_at ≤ 48h`.
  Συνθήκη: draft → checklist· active & <48h → celebration· active & >48h → τίποτα (μόνο τα cards).
- **i18n (bilingual-first)**: dashboard +7 keys (`today*`, el+en 72/72).
- tsc καθαρό· JSON συμμετρικά· barber-house: published_at=14/6 (within_48h=false → χωρίς celebration,
  σωστό)· /el/dashboard 200 (authed, μετά το γνωστό hot-reload transient που αυτο-διορθώθηκε).

---

## 2026-06-19 — Συγχαρητήρια card → αναφορά ημερολογίου + καθησυχαστικό «χωρίς διπλές» ✅ DONE

User: στο «Συγχαρητήρια! Το κατάστημά σου δημοσιεύθηκε» να αναφερθούν και οι οδηγίες του ημερολογίου
+ ότι μπορεί να παγώσει τις online κρατήσεις μέχρι να περάσει τα ραντεβού του· και στις οδηγίες του
ημερολογίου να μπει καθησυχαστικό μήνυμα ότι δεν γίνεται να μπουν 2 ραντεβού την ίδια ώρα στον ίδιο
υπάλληλο, ούτε στο «Χωρίς ανάθεση» αν δεν υπάρχει διαθέσιμος.
- **Επαλήθευση μηχανισμού** (για να είναι αληθές το μήνυμα): `create_booking` RPC — specific staff →
  `slot_taken` σε overlap/time-off· any/unassigned → `free = capable − busy − unassigned`, αν <1 →
  `slot_taken`. `createWalkin`/`peakOverCapacity` → ίδια προστασία στα χειροκίνητα. ✅ ισχύει.
- **`dashboard/page.tsx` `PublishedCard`**: grid 2→3 στήλες· νέα **3η κάρτα «Ημερολόγιο & ραντεβού»**
  (CalendarDays): αναφορά στις οδηγίες + δυνατότητα παγώματος online κρατήσεων + γραμμή καθησύχασης
  (ShieldCheck, success) + link → `/dashboard/calendar`.
- **`calendar-client.tsx`** (πάνελ «Οδηγίες»): νέο πράσινο box κάτω από τις 2 στήλες — **«Χωρίς διπλές
  κρατήσεις»** (ShieldCheck): εξηγεί ότι ποτέ 2 ραντεβού ίδια ώρα/ίδιος υπάλληλος, ούτε στο «Χωρίς
  ανάθεση» χωρίς διαθέσιμο, και ότι ισχύει για online + χειροκίνητα.
- **i18n (bilingual-first)**: dashboard +4 (`nextCalTitle/Body/Reassure/Cta`, 65/65)· dashboard.calendar
  +2 (`guideNoDoubleTitle/guideNoDouble`, 70/70). tsc καθαρό· JSON συμμετρικά· /el/dashboard→307.

---

## 2026-06-19 — Ημερολόγιο: οδηγίες + προσωρινό πάγωμα online κρατήσεων ✅ DONE

User: στο `dashboard/calendar` να μπουν οδηγίες/ενημέρωση (πώς δουλεύει + πώς να περάσει υπάρχοντα
ραντεβού) και ένα κουμπί «προσωρινό πάγωμα» όλων των online κρατήσεων μέχρι να περάσει τα ραντεβού
που ήδη είχε. **Αποφάσεις (defaults, ο χρήστης δεν απάντησε στις ερωτήσεις):** παύση **μόνο** online
κρατήσεων πελατών (ο ιδιοκτήτης συνεχίζει από το ημερολόγιο)· οδηγίες σε **κουμπί toggle** «Οδηγίες».
- **migration 039**: `businesses.bookings_paused boolean default false`. `create_booking` RPC →
  νέος guard: αν `bookings_paused` ⇒ `raise bookings_paused`. Τα walk-ins (createWalkin) κάνουν
  **direct insert**, ΔΕΝ περνούν από το RPC → ο ιδιοκτήτης συνεχίζει να περνά ραντεβού κανονικά.
- **calendar/actions.ts**: νέα `setBookingsPaused(locale, paused)` (owner/manager· update flag).
- **calendar/page.tsx** + **calendar-client.tsx**: prop `bookingsPaused`. Νέα δευτερεύουσα μπάρα κάτω
  από το toolbar με 2 κουμπιά: **«Οδηγίες»** (toggle πάνελ) + **«Πάγωμα/Συνέχιση online κρατήσεων»**
  (optimistic + revert σε σφάλμα). Όταν paused → κίτρινο banner («σε προσωρινή παύση…»). Το πάνελ
  οδηγιών: 2 στήλες — «Πώς λειτουργεί» (4 tips: click κενό για νέο, drag/resize, click για έκβαση/
  αναφορά, εναλλαγή προβολών) + «Έχεις ήδη ραντεβού;» (3 βήματα: πάγωσε → πέρασέ τα ένα-ένα → συνέχισε).
- **Δημόσια πλευρά**: `submitBooking` μαπάρει τον κωδικό `bookings_paused`· booking-flow τον μεταφράζει
  (`booking.bookingsPaused`). Public `/b/[slug]`: φέρνει `bookings_paused` → κίτρινο notice πάνω από
  τις υπηρεσίες + το κουμπί «Κλείσε» γίνεται disabled «Παύση κρατήσεων» (`shop.bookingsPaused*`).
- **i18n (bilingual-first)**: dashboard.calendar +13 keys (guide* + pause*/resume*/pausedBanner,
  el+en 68/68)· booking +`bookingsPaused` (63/63)· shop +2 (12/12). types.ts: businesses +bookings_paused.
- tsc καθαρό· JSON συμμετρικά· calendar→307, public shop (el+en)→200· end-to-end επιβεβαίωση:
  paused=true ⇒ το notice + disabled κουμπί εμφανίζονται στο HTML (μετά επαναφορά σε false).

---

## 2026-06-19 — Onboarding «Ξεκίνημα»: υπάλληλος + υπηρεσία → δημοσίευση + συγχαρητήρια ✅ DONE

User: στο dashboard overview το «Ξεκίνημα» να έχει βήμα «Πρόσθεσε υπάλληλο» (λειτουργικό) + «Πρόσθεσε
υπηρεσίες» (λειτουργικό)· η αυτόματη δημοσίευση να ολοκληρώνεται όταν υπάρχει **και** υπάλληλος **και**
υπηρεσία· μόλις ολοκληρωθούν όλα, το «Ξεκίνημα» να εξαφανίζεται και να εμφανίζεται μήνυμα συγχαρητηρίων
+ mini οδηγός (φωτό καταστήματος στις Ρυθμίσεις, έκδοση QR Poster για την πόρτα).
- **migration 038**: νέα `maybe_activate_business(business)` (draft→active ΜΟΝΟ αν υπάρχει active+
  bookable service ΚΑΙ ≥1 active staff). Ο παλιός trigger `services_activate_business` (AFTER INSERT,
  «active με 1η υπηρεσία») ξαναγράφτηκε να καλεί την κοινή function + έγινε **AFTER INSERT OR UPDATE**·
  νέος **`staff_activate_business`** (AFTER INSERT OR UPDATE) ώστε και η προσθήκη υπαλλήλου να
  ολοκληρώνει τη δημοσίευση. Όλες οι functions SECURITY DEFINER + `search_path=public` (κανένα νέο
  advisor lint). Επιβεβαιώθηκε με controlled test (auto-rollback μέσω exception): create→draft,
  service-only→draft, +staff→**active**. (Υπάρχοντα active καταστήματα δεν θίγονται — ο trigger μόνο
  ενεργοποιεί.)
- **`dashboard/page.tsx`**: +query active staff count → `hasStaff`. Νέο checklist 4 βημάτων
  (create→**staff**→services→publish), τα staff/services με link («Πάμε»). Όταν `business.status==='active'`
  → το checklist **αντικαθίσταται** από νέα `<PublishedCard>` (πράσινη, PartyPopper): τίτλος
  συγχαρητηρίων + 2 κάρτες «Επόμενα βήματα» — (α) Φωτογραφία καταστήματος → Ρυθμίσεις, (β) QR Poster
  με **4-step mini οδηγό** → QR editor.
- **i18n (bilingual-first)**: 14 νέα keys στο `dashboard` (el+en συμμετρικά 61/61): `stepStaff`,
  `publishedTitle/Body`, `nextStepsTitle`, `nextPhoto*` (×3), `nextQr*` (title/body/step1-4/cta).
  Ενημερώθηκαν `welcomeBody` + `stepPublish` (αναφορά σε υπάλληλο+υπηρεσία).
- tsc καθαρό· JSON συμμετρικά· /el/dashboard → 307 (auth, υγιές)· καθαρό dev log.

---

## 2026-06-19 — Κριτικές: παράθυρο 48 ωρών από την ολοκλήρωση ✅ DONE

User: ο πελάτης να μπορεί να καταχωρήσει κριτική **εντός 48 ωρών** από τη στιγμή που ο ιδιοκτήτης
πάτησε «Ολοκληρώθηκε». Αν ακυρώθηκε ή δεν εμφανίστηκε → **κανένα** δικαίωμα κριτικής.
- **migration 036**: νέα στήλη `bookings.completed_at timestamptz` + trigger **`tg_set_completed_at`**
  (BEFORE INSERT/UPDATE) που τη γεμίζει με `now()` όταν το status μπαίνει σε `completed` (φρέσκο
  παράθυρο σε κάθε (re)mark· καλύπτει ΟΛΑ τα paths: bookings-list, ημερολόγιο, past-due reminder,
  walk-in). Backfill υπαρχόντων completed από `updated_at` (παλιά >48h μένουν εκτός, πρόσφατα παίρνουν
  παράθυρο). **`create_review`** RPC: νέος έλεγχος → `review_window_closed` αν `completed_at` null ή
  `now() > completed_at + interval '48 hours'`. (Τα cancelled/no_show ήδη κόβονται από
  `booking_not_completed`.) **migration 037**: pin `search_path` στο trigger function (advisor lint).
- **UI** (`account/page.tsx` + `review-button.tsx`): φέρνω `completed_at`, υπολογίζω `canReview`
  (status=completed ΚΑΙ εντός 48h). Κουμπί «Άσε κριτική» **μόνο** εντός παραθύρου· εμφανίζω deadline
  («Μπορείς να αξιολογήσεις έως {date}», tz-aware). Εκτός παραθύρου χωρίς κριτική → muted
  «Έληξε το διάστημα αξιολόγησης (48 ώρες)». Υπάρχουσα κριτική → πάντα ορατή + **edit** (το edit ΔΕΝ
  περιορίζεται από το παράθυρο). Server-side διπλό-protected.
- **i18n (bilingual-first)**: `create_review`/`update_review` actions γυρνούν πλέον **σταθερούς
  κωδικούς** (αντί ελληνικών strings — διόρθωση παλιού tech debt)· νέο helper **`lib/review-error.ts`**
  `reviewError(acc, code)` (όπως το `dashErr`), χρήση σε review-button + my-reviews. 7 νέοι κωδικοί
  στο `account` dict (el+en συμμετρικά 86/86): `reviewUntil`, `reviewWindowExpired`,
  `errReviewNotCompleted`, `errReviewWindowClosed`, `errAlreadyReviewed`, `errBookingNotFound`,
  `errReviewNotFound`.
- types.ts: bookings +`completed_at`. tsc καθαρό· JSON συμμετρικά· trigger επιβεβαιώθηκε (tx+rollback)·
  backfill 21 completed (15 εντός παραθύρου)· advisor lint καθαρό· /el/account → 307 (auth, υγιές).

---

## 2026-06-19 — Ραντεβού: αναζήτηση με όνομα ή κινητό ✅ DONE

User: όταν πελάτης που είχε ραντεβού άλλη μέρα έρθει σήμερα, ο ιδιοκτήτης να βρίσκει γρήγορα το
ραντεβού του με **όνομα ή αριθμό κινητού** — στο `dashboard/bookings`, στα Επερχόμενα.
- **`bookings-list.tsx`** (client, όλα τα δεδομένα ήδη client-side): νέο state `query` + πεδίο
  αναζήτησης (lucide `Search` icon + κουμπί καθαρισμού × + Escape για clear) πάνω από τη λίστα,
  εμφανίζεται όταν υπάρχουν ραντεβού. Φιλτράρει την τρέχουσα καρτέλα (δουλεύει σε Επερχόμενα/
  Προηγούμενα/Ακυρωμένα/Όλα).
- **Matching**: όνομα **accent-insensitive** (`normalize("NFD")` → strip combining marks →
  lowercase, ώστε «γιωργος»≈«Γιώργος») · τηλέφωνο **digits-only** (αγνοεί κενά/+/-, ώστε
  «6912345678» να ταιριάζει με «+30 691 234 5678»). Όνομα OR κινητό. Οι μετρητές των tabs μένουν
  σύνολα (δεν επηρεάζονται από το query).
- Empty state: αν υπάρχει ενεργό query → `searchNoResults` («Δεν βρέθηκαν ραντεβού για «{q}».»),
  αλλιώς το κανονικό `empty`.
- **i18n (bilingual-first)**: 3 νέοι κωδικοί στο `dashboard.bookings` (el+en συμμετρικά 26/26):
  `searchPlaceholder`, `searchClear`, `searchNoResults`.
- tsc καθαρό· JSON έγκυρα & συμμετρικά· /el/dashboard/bookings → 307 (auth guard, υγιές).

---

## 2026-06-18 — Υπενθύμιση: ραντεβού που πέρασαν & μένουν χωρίς έκβαση ✅ DONE

User: όταν περάσει η ώρα ενός ραντεβού και ο ιδιοκτήτης δεν έχει δηλώσει την έκβαση, να εμφανίζεται
παράθυρο που τον ενημερώνει ποια ραντεβού πέρασαν και να δηλώνει για το καθένα ξεχωριστά
Ολοκληρώθηκε/Δεν εμφανίστηκε/Ακυρώθηκε. **Αποφάσεις χρήστη (AskUserQuestion):** αυτόματο παράθυρο
στην είσοδο · σε όλες τις σελίδες του Πίνακα · όλα τα εκκρεμή παρελθόντα (χωρίς χρονικό όριο).
- **`dashboard/layout.tsx`** (server): query bookings `status in (pending,confirmed)` & `ends_at < now()`
  για το business (+timezone από `businesses`), map → `PastDueBooking[]`, render `<PastDueReminder>`.
  Το layout τρέχει μία φορά ανά είσοδο στον Πίνακα (persist σε client-side navigation) → «αυτόματο
  στην είσοδο» χωρίς να ξανανοίγει σε κάθε αλλαγή σελίδας.
- **`components/dashboard/past-due-reminder.tsx`** (νέο, client): auto-open modal (αν >0), λίστα
  (ημ/ώρα tz-aware, όνομα, τηλ, υπηρεσία) με 3 κουμπιά ανά ραντεβού (πράσινο/πορτοκαλί/κόκκινο).
  Επαναχρήση **`updateBookingStatus`** (bookings/actions). Optimistic remove· σε σφάλμα επαναφορά +
  μήνυμα (dashErr)· σε επιτυχία `router.refresh()` (sync ημερολόγιο/αναφορές/μετρητές). «Αργότερα»
  κλείνει → μένει floating **badge** «Ραντεβού προς ενημέρωση: {n}» που ξανανοίγει. Όταν αδειάσει η
  λίστα → «Όλα ενημερώθηκαν!».
- **i18n (bilingual-first)**: νέο section **`dashboard.pastDue.*`** (el+en, 9 keys συμμετρικά).
- tsc καθαρό· JSON συμμετρικά· dashboard routes (el+en) 200· επιβεβαιώθηκε στη βάση ότι υπάρχουν 11
  εκκρεμή παρελθόντα (barber-house) → η λίστα θα εμφανιστεί.

---

## 2026-06-18 — i18n rollout #5: μηνύματα σφαλμάτων dashboard server-actions (EL/EN) ✅ DONE

User: «τα μηνύματα λάθους από τον server στο dashboard να είναι κι αυτά μεταφρασμένα ανάλογα με
τη γλώσσα». Εφαρμογή του ίδιου pattern με τα πελατικά: ο server γυρνά **σταθερό κωδικό**, ο client
τον μεταφράζει.
- **Νέα υποδομή**:
  - dict section **`dashboard.errors.*`** (el+en, 39 κωδικοί συμμετρικοί) — π.χ. `no_permission`,
    `not_authenticated`, `business_not_found`, `save_failed`/`create_failed`/`move_failed`/`resize_failed`,
    `staff_busy`, `no_capacity`, `outside_hours`, `booking_not_found`, `duration_too_short`,
    `enter_*`/`invalid_*` (φόρμες), `report_failed`/`block_failed`/`unblock_failed`, `generic`.
  - helper **`lib/dash-error.ts`** → `dashErr(errors, code, fallback)` (επιστρέφει `errors[code]`
    ή το ήδη μεταφρασμένο fallback).
- **8 action files → κωδικοί** (καμία ελληνική συμβολοσειρά πια): calendar (createWalkin/moveBooking/
  resizeBooking — incl. NO_CAPACITY const + 3 «εκτός ωραρίου» variants → `outside_hours`, raw DB →
  create/move/resize_failed), settings (saveBusinessCategories/saveBusinessInfo/saveHours — όλα τα
  πεδία + raw DB → save_failed), reports (report/block/unblock), services (validate() + raw DB),
  staff (validate + syncServices raw DB → save_failed), staff/[id] (saveStaffHours/addTimeOff/
  deleteTimeOff), bookings, qr.
- **Warning με interpolation**: `addTimeOff` πλέον γυρνά **`warningCount?: number`** (αντί ελληνικού
  string)· ο client (schedule-editor) χτίζει το μήνυμα από `dashboard.staff.bookingsInRange` με
  `.replace("{count}", …)` (el+en).
- **10 clients** μεταφράζουν τον κωδικό μέσω `dashErr(dd.errors, res.error, <fallback>)`:
  services-manager, staff-manager, no-show-report, customer-actions-modal, category-editor,
  business-info-editor, hours-editor, calendar-client (5 σημεία), schedule-editor (+warning),
  qr-editor (save). (bookings-list αγνοεί ήδη το res.error — optimistic· καμία αλλαγή UI.)
- tsc καθαρό· JSON έγκυρα & συμμετρικά (39/39 errors)· **0 ελληνικά literals** στα actions (μόνο ένα
  σχόλιο κώδικα). dashboard routes (el+en: settings/calendar/services/staff/reports) → 200.
- **i18n rollout STATUS: ✅ FULLY COMPLETE** — κάθε σελίδα ΚΑΙ κάθε μήνυμα σφάλματος server EL/EN.
  Pattern για νέα server-actions: γύρνα κωδικό → πρόσθεσέ τον στο `dashboard.errors` (2 json) →
  `dashErr(dd.errors, res.error, fallback)` στον client.

---

## 2026-06-18 — i18n rollout #4: QR editor internals → ΟΛΟΚΛΗΡΩΘΗΚΕ η μετάφραση ✅ DONE

Το τελευταίο κομμάτι του i18n rollout. Συνδέθηκαν ΟΛΑ τα internals του `dashboard/qr/qr-editor.tsx`
(2189 γρ.) με το ήδη υπάρχον dict `dashboard.qr.*` (el+en). **Πλέον κάθε σελίδα της εφαρμογής
μεταφράζεται EL/EN.**
- **Τι έγινε:** κάθε subcomponent πήρε `const t = useDict().dashboard.qr;` και τα ελληνικά literals
  αντικαταστάθηκαν με `t.<key>`:
  - **Toolbar** (QrEditor): Κείμενο/Λογότυπο-Εικόνα/Εικονίδιο/Σχήματα + 4 shape labels/Πίνακας/
    QR titles (qrExists/qrAdd)/Save↔Saved.
  - **PropertiesPanel**: Παλέτες/Φόντο/«N στοιχεία επιλεγμένα»/multi-select hints/no-selection hints/
    Συντομεύσεις (10 shortcut labels)/front-back-delete titles/Περιστροφή/Διαφάνεια.
  - **TextProps** (+ WEIGHTS): το module `WEIGHTS` (GR labels) αντικαταστάθηκε με `WEIGHT_VALUES`
    + `weightLabels(t)` helper (χτίζει τα labels Κανονικό…Πολύ-έντονα από dict). Text/Μέγεθος/Χρώμα/
    Γραμματοσειρά/Βάρος.
  - **RectProps/EllipseProps/QrProps/LineProps/IconProps**: fill/stroke/thickness/cornerRadius/
    qrLinkAuto/qrColor/qrBg/strokeThickness/lineColor/iconColor/circleBg/borderColor/changeIcon.
  - **TableProps**: loadFromSettings/tableRows/hints/dayPlaceholder/rowLineTitle/deleteRow/
    hoursPlaceholder/addRow/outerBorder/colLine/dayColor/hoursColor/lineColor/textSize/rowHeight/
    font· default row label "ΗΜΕΡΑ" → `t.dayRow`.
  - **ColorInput**: eyedropper title/aria + enableColor/noColor.
  - **labelForType(type, t)**: παίρνει πλέον dict (typeText/typeShape/typeImage/typeIcon/typeCircle/
    typeLine/typeTable/typeElement· "QR Code" μένει literal).
- **Νέο dict key**: `dashboard.qr.dragKey` (el «σύρσιμο» / en «drag») για το shortcut «Shift + σύρσιμο»
  (το `scNoMagnet` label υπήρχε ήδη). el/en συμμετρικά (0 missing keys).
- tsc καθαρό· JSON έγκυρα· **0 ελληνικά literals** πλέον στο qr-editor.tsx (grep). Χρειάστηκε clear
  `.next` + restart (το γνωστό Turbopack «Jest worker exceeding retry limit» wedge μετά τα edits — όχι
  bug)· /el+/en /dashboard/qr → 307→login→200 (healthy· απαιτεί auth).
- **i18n rollout STATUS: ✅ COMPLETE** (marketing/auth · shop · booking · search · account · dashboard
  100% · QR editor). Εκκρεμεί μόνο (non-blocking): μερικές dashboard server-actions επιστρέφουν ακόμα
  ελληνικά strings (τα client-set errors είναι μεταφρασμένα).

---

## 2026-06-18 — Όνομα/Επίθετο (split) + υποχρεωτική διεύθυνση επιχείρησης ✅ DONE

User: το «Ονοματεπώνυμο» (εγγραφές + Ρυθμίσεις) να γίνει ξεχωριστό **Όνομα + Επίθετο**· η
επιχείρηση να βάζει **υποχρεωτικά** Διεύθυνση/Πόλη/Τ.Κ. + νέα **Περιοχή/Γειτονιά** (προαιρετική).
- **migration 034**: `profiles.full_name` → **drop**, νέες στήλες `first_name` + `last_name`
  (backfill split από full_name· single-word → όνομα μόνο). `handle_new_user` διαβάζει
  first_name/last_name από metadata, **με fallback split** του `full_name` (το in-booking guest
  signup στέλνει ακόμα ενιαίο όνομα). `create_review`/`update_review` παράγουν το εμφανιζόμενο
  customer_name από first/last (full → «Όνομα Επίθετο», first → first_name, anonymous → null·
  create_review κρατά fallback στο booking snapshot).
- **Όνομα/Επίθετο σε 4 σημεία**: εγγραφή πελάτη (customer-form/actions), wizard επιχείρησης
  (business step: 2 πεδία), Ρυθμίσεις (business-info-editor: 2 πεδία «δικό σου»), Προφίλ πελάτη
  (profile-form). Όλα τα metadata/profile updates → first_name+last_name. `DashboardContext`
  +firstName/lastName (η σελίδα Ρυθμίσεων αντλεί τα ξεχωριστά). Display name (layout/booking/
  dashboard) = `[first,last].filter(Boolean).join(" ")`.
- **Υποχρεωτική διεύθυνση επιχείρησης** (μόνο business): wizard + Ρυθμίσεις απαιτούν
  Διεύθυνση+Πόλη+Τ.Κ. (client `canAdvance`/validate + server validation, μήνυμα ανά πεδίο).
  Νέο πεδίο **Περιοχή/Γειτονιά** (προαιρετικό) → αποθηκεύεται στο `businesses.address.area`
  (jsonb, χωρίς migration). Πελάτης: διεύθυνση παραμένει **προαιρετική**, χωρίς area.
- types.ts: profiles +first_name/last_name −full_name. tsc καθαρό· /el, signup/customer,
  signup/business (el+en), account/profile, dashboard/settings, b/.../book → 200 (μετά clear .next:
  τα αρχικά 500 ήταν το γνωστό Turbopack «Jest worker» wedge, όχι του κώδικα).

**Follow-up — email επιχείρησης (υποχρεωτικό):** Απόφαση χρήστη: το email της επιχείρησης =
**ίδιο με του λογαριασμού** (πελάτης ήδη OK). Στην εγγραφή επιχείρησης το account email
αποθηκεύεται και στο `businesses.email` (authenticated path → `existingUser.email`). Στις
Ρυθμίσεις νέο **υποχρεωτικό** πεδίο «Email καταστήματος» (editable, isValidEmail, default =
business.email ή account email). Backfill `businesses.email` υπαρχόντων από owner auth email.
tsc καθαρό· signup/business + settings (el+en) 200.
- **Fix ορατότητας email στο wizard**: όταν ο χρήστης είναι **ήδη συνδεδεμένος**, το βήμα
  «Λογαριασμός» (με το email) **παραλείπεται** → δεν φαινόταν πεδίο email. Προστέθηκε
  ορατό **υποχρεωτικό** «Email καταστήματος» στο βήμα «Κατάστημα» **μόνο όταν isAuthenticated**
  (prefill `userEmail` από session, editable). `canAdvance` απαιτεί isValidEmail· payload
  `businessEmail`· action: ownerEmail = authenticated ? businessEmail||session : account email,
  +validation. (Μη-συνδεδεμένος: email παραμένει στο βήμα «Λογαριασμός».)

**Follow-up — auth-aware marketing header:** το header της αρχικής έδειχνε πάντα «Σύνδεση/
Δωρεάν δοκιμή» ακόμα κι όταν ο χρήστης ήταν συνδεδεμένος. `components/marketing/header.tsx`
→ **async server component**: `getUser()` + έλεγχος `my_businesses`. Συνδεδεμένος → «Ο
λογαριασμός μου» (→/account) + κουμπί «Πίνακας» (→/dashboard αν owns business, αλλιώς /account)·
ανώνυμος → login + signupCta (ως πριν). +nav i18n `account`/`dashboard` (el+en). Το header
γίνεται dynamic (cookies) — αποδεκτό. tsc καθαρό· /el /en /for-business /search 200.
- **Follow-up 2 (header actions)**: αντί «Πίνακας» → **«Το κατάστημά μου»** (→/dashboard, μόνο
  αν owns business)· προστέθηκε **«Αποσύνδεση»** (POST form /auth/logout) δίπλα. +nav i18n
  `myBusiness`/`logout`.
- **Follow-up 3 (συμμετρία + όνομα→προφίλ)**: dashboard `Topbar` πήρε κουμπί **«Διαχείριση
  λογαριασμού»** (→/account, UserCircle) — καθρέφτης του account «Διαχείριση καταστήματος».
  Το εμφανιζόμενο **όνομα** (account header + dashboard topbar) έγινε **link → /account/profile**
  (hover, title «Ρυθμίσεις προφίλ»). tsc καθαρό· account/profile + dashboard/settings 200.

## 2026-06-18 — Fix: owner «έχασε» πρόσβαση στο κατάστημα (διπλό business) ✅ DONE

User: «ξαφνικά ο λογαριασμός δεν έχει πρόσβαση στο κατάστημα που είχε πριν».
- **Αιτία**: ο owner (`giorgakis18os@gmail.com`) είχε αποκτήσει **2 Barber House** — το αρχικό
  `barber-house` (active, 2 υπηρεσίες/26 ραντεβού/1 QR) **και** ένα κενό `barber-house-1`
  (draft, 0 δεδομένα) που δημιουργήθηκε όταν πέρασε ξανά το /signup/business ενώ ήταν ήδη
  συνδεδεμένος. Το `loadDashboardContext` έκανε `my_businesses … limit(1)` **χωρίς order** →
  διάλεγε κατά τύχη το άδειο draft.
- **Fix**: (1) διαγραφή του draft διπλότυπου + εξαρτημένων (business_categories/hours/members).
  (2) `loadDashboardContext`: `.order("status").order("created_at")` (active/παλαιότερο πρώτα) →
  ντετερμινιστική επιλογή. (3) Guard κατά διπλών: `createAccountAndBusiness` redirect→dashboard
  αν ο συνδεδεμένος έχει ήδη business· **και** `signup/business/page` redirect→dashboard πριν
  καν δείξει τον wizard. tsc καθαρό· dashboard/settings/account/signup 200.

## 2026-06-18 — Έλεγχος ασφάλειας: μοναδικό email + ένα κατάστημα/owner ✅ DONE

User: να μην μπορεί να ξανασυμβεί διπλό κατάστημα, και να μην γίνεται 2ος λογαριασμός με ίδιο
email — «έλεγξέ τα όλα σε αυτόν τον τομέα».
- **Διπλό email**: ήδη ασφαλές — Supabase Auth = μοναδικό email (case-insensitive)· `email_available`
  RPC κάνει `lower(trim())`· και τα 3 signup paths (πελάτης/επιχείρηση/guest στο booking) πιάνουν
  το «already» με φιλικό μήνυμα. Δεν δημιουργείται ποτέ 2ος λογαριασμός. (Καμία αλλαγή.)
- **Διπλό κατάστημα — κλείσιμο στη ρίζα**: επιβεβαιώθηκε ότι το `businesses` **δεν έχει INSERT
  policy** → η μόνη οδός είναι το RPC `create_business_with_owner`. **migration 035**: φραγμός
  μέσα στο RPC — αν ο χρήστης έχει ήδη `business_members.role='owner'` → `raise already_owns_business`.
  Έτσι ακόμα κι αν παρακαμφθεί το UI, αδύνατο 2ο κατάστημα. Το action μαπάρει το error → redirect
  dashboard. (Συν τις app-guards του προηγούμενου session: page + action redirect.)
- tsc καθαρό· signup (business/customer) + dashboard + account 200.

## 2026-06-18 — i18n rollout #3: ΟΛΟ το dashboard (εκτός QR editor internals) 🟡 ~95% DONE

Συνέχεια του i18n rollout — μεταφράστηκε ΟΛΟ το dashboard EL/EN με το ίδιο pattern (dict
section `dashboard` με nested υπο-ενότητες· `useDict()` σε client, `getDictionary` σε server).
- **Υποδομή Topbar**: το `components/dashboard/topbar.tsx` έγινε **client** ("use client") για
  να χρησιμοποιεί `useDict` (παίρνει `action` ως ReactNode prop από server pages — ΟΚ).
- **✅ Μεταφρασμένα πλήρως** (dict nested keys σε `dashboard.*`):
  - Πλοήγηση: `sidebar.tsx`, `topbar.tsx` (nav/status/logout/manageAccount).
  - **Επισκόπηση** `dashboard/page.tsx` (welcome/steps/stats).
  - **Υπηρεσίες** `services-manager.tsx` + page (`dashboard.services.*`).
  - **Ραντεβού** `bookings-list.tsx` + page (`dashboard.bookings.*`, tabs/status/clear/actions).
  - **Κριτικές** `reviews-manager.tsx` + page (`dashboard.reviews.*`).
  - **Ρυθμίσεις** `business-info-editor.tsx` (`dashboard.settings.bizInfo.*`), `hours-editor.tsx`,
    `category-editor.tsx`, page (`dashboard.settings.*`). +κατηγορίες δίγλωσσες (name_el/name_en).
  - **Προσωπικό** `staff-manager.tsx`, `schedule-editor.tsx` (`dashboard.staff.*`), page + [id] page.
  - **Αναφορές** `reports/page.tsx`, `no-show-report.tsx` (`dashboard.reports.*` + reuse `dashboard.report`).
  - **Ημερολόγιο** `calendar-client.tsx` (~67 strings, `dashboard.calendar.*`) + page.
  - Components: `customer-actions-modal.tsx` (`dashboard.report.*`), `coming-soon.tsx` (→client),
    `category-picker.tsx` (`dashboard.picker.*`).
- **Server-action codes**: `account/actions` (cancel/reschedule/updateProfile), `submitBooking` →
  κωδικοί (έγινε στο rollout #2). Dashboard server-actions επιστρέφουν ακόμα ελληνικά μηνύματα
  σε μερικά σημεία, αλλά τα client-set errors είναι μεταφρασμένα.
- **🟡 ΑΠΟΜΕΝΕΙ — QR editor** (`app/[locale]/dashboard/qr/qr-editor.tsx`, 2182 γρ., ~80 strings):
  - dict **`dashboard.qr.*`** ΕΧΕΙ προστεθεί πλήρως (el+en).
  - Έγινε: import `useDict`, `const t = useDict().dashboard.qr` στο `QrEditor`, μετάφραση
    `newText`/`uploadFailed`/`saveFailed` (alerts + default κειμένου).
  - **ΔΕΝ έγινε ακόμα** (compiles, δείχνει ελληνικά): toolbar buttons (Κείμενο/Λογότυπο/Εικονίδιο/
    Σχήματα/shape labels/Πίνακας/QR titles/Save), `PropertiesPanel` (Παλέτες/Φόντο/multi-select
    hints/shortcuts list/reorder-delete titles/Περιστροφή/Διαφάνεια), `labelForType()` (να πάρει
    dict), `TextProps` (+ module `WEIGHTS` να ξαναχτιστεί από dict μέσα στο TextProps), `RectProps`,
    `QrProps`, `EllipseProps`, `TableProps` (+default row "ΗΜΕΡΑ"), `LineProps`, `IconProps`, `ColorInput`.
  - **Resume**: κάθε subcomponent παίρνει `const t = useDict().dashboard.qr;` και αντικαθιστά τα
    literals με `t.<key>`. Τα keys υπάρχουν ΗΔΗ στο dict (weightNormal…, text, logoImage, icon,
    shapes, shapeRect…, table, qrExists, qrAdd, save, palettes, background, elementsSelected,
    deleteAll, multiHint1/2, noSelHint1/2a/2b, shortcuts, scCopy…, front/back/delete, rotation,
    opacity, size, color, font, weight, fill, stroke, thickness, cornerRadius, qrLinkAuto, qrColor,
    qrBg, strokeThickness, dayRow, loadFromSettings, tableRows, tableRowsHint1/2, dayPlaceholder,
    rowLineTitle, deleteRow, hoursPlaceholder, addRow, outerBorder, colLine, dayColor, hoursColor,
    lineColor, textSize, rowHeight, lineColorLabel, iconColor, circleBg, borderColorLabel, changeIcon,
    eyedropper, eyedropperAria, enableColor, noColor, typeText…typeElement). qr/page subtitle → `dashboard.qr.subtitle`.
- tsc καθαρό· JSON έγκυρα· dashboard routes (el+en: calendar/services/staff/reports/qr/settings/
  bookings) → 200. Η εφαρμογή μεταγλωττίζει & τρέχει· μόνο το QR editor δείχνει ακόμα ελληνικά εσωτερικά.

## 2026-06-18 — i18n rollout #1: υποδομή + πελατικές σελίδες (shop + booking) 🟡 IN PROGRESS

User: «να μεταφράζονται όλες οι σελίδες, σταδιακά». Χαρτογράφηση: μόνο marketing/auth ήταν
μεταφρασμένα· public booking + account + dashboard ήταν hardcoded ελληνικά (~700 σημεία).
- **Υποδομή (foundation)**: `i18n/shared.ts` (Dictionary type χωρίς server-only), `i18n/provider.tsx`
  (`DictProvider` + **`useDict()`** client hook), mount στο **root `[locale]/layout.tsx`** με
  `getDictionary(locale)`. Έτσι client components παντού → `useDict()`, server → `getDictionary`.
- **Μεταφρασμένα (στάδιο 1 — πελατικά)**:
  - **Δημόσια σελίδα καταστήματος** `b/[slug]/page.tsx` (server) → dict section **`shop`**
    (υπηρεσίες/ωράριο/ημέρες/κριτικές/«Κλείσε»…).
  - **Διαδικασία κράτησης** `booking-flow.tsx` (client, 3 subcomponents BookingFlow/StepBar/
    AuthStep, ~50 strings) → dict section **`booking`**. Τα module weekday/month arrays έγιναν
    dict arrays. `submitBooking` (actions.ts) γυρίζει πλέον **σταθερούς κωδικούς**
    (slot_taken/slot_in_past/service_unavailable/blocked/failed) → ο client τους μεταφράζει
    (αντί ελληνικά server strings· διορθώνει & το `.includes("κλείστηκε")`).
- tsc καθαρό· /el+/en /b/barber-house + /book 200 (EN: «Services/Choose a service», EL ελληνικά).

**Στάδιο 2 — αναζήτηση + λογαριασμός πελάτη (2026-06-18):**
- dict sections **`search`** + **`account`** (el+en). Κατηγορίες αναζήτησης πλέον δίγλωσσες
  (`name_el`/`name_en` ανά locale).
- Μεταφράστηκαν: public `/search` + `/account/search` + `business-search.tsx`· account
  `layout/page/favorites/reviews` (server) + `account-nav`, `profile-form`, `my-reviews`,
  `booking-actions`, `review-button`, `name-visibility-picker`, `favorite-button`,
  `star-rating-input` (client, `useDict`).
- **Server-action codes**: `submitBooking`, `cancel_booking`/`reschedule_booking` (account/actions),
  `updateProfile` γυρίζουν πλέον **κωδικούς** (slot_taken, cannot_modify, enter_first_name…) →
  ο client τους μεταφράζει. Καμία ελληνική συμβολοσειρά από server σε client error path (πελατικά).
- tsc καθαρό· /en+/el /search + account (favorites/reviews/profile/search) 200.
- **Απομένει**: όλο το **dashboard** (~500 σημεία) + οι server-actions του dashboard.
  ⚠️ Pre-existing: `business-search` κάνει router.push πάντα σε `/account/search` (anonymous
  public search → login). Δεν είναι μεταφραστικό· να διορθωθεί ξεχωριστά (basePath prop).

## 2026-06-18 — Δημόσια σελίδα `/b/[slug]`: top bar με brand + auth ✅ DONE

User: στη δημόσια σελίδα καταστήματος να εμφανίζεται πάνω-πάνω το brand μας + auth-aware
(συνδεδεμένος πελάτης / δημιουργία λογαριασμού).
- **`b/[slug]/page.tsx`**: νέο sticky `<header>` (Logo→home· δεξιά: συνδεδεμένος → «Ο λογαριασμός
  μου»→/account + «Αποσύνδεση» (POST /auth/logout)· ανώνυμος → «Σύνδεση» + κουμπί «Δημιουργία
  λογαριασμού»→/signup). Επαναχρήση του ήδη υπάρχοντος `user` (getUser). Labels δίγλωσσα
  (isEl). tsc καθαρό· /el + /en /b/barber-house 200 (anon δείχνει Create account/Log in).
- **Follow-up — LanguageSwitcher + shared layout (& booking)**: ξεχάστηκε ο επιλογέας EL/EN
  και έπρεπε να ισχύει και στο booking. Το header μετακινήθηκε σε **νέο shared
  `b/[slug]/layout.tsx`** (brand + `LanguageSwitcher current=loc` + auth actions) → εμφανίζεται
  **και** στη σελίδα καταστήματος **και** στο `/book`. Αφαιρέθηκε το διπλό header (+unused
  imports) από το `page.tsx`. tsc καθαρό· /el + /en /b/barber-house + /book 200· booking έχει EL/EN.
- **Follow-up 2 — EL/EN σε dashboard & account**: `LanguageSwitcher` προστέθηκε στο
  `components/dashboard/topbar.tsx` (καλύπτει και τις 10 dashboard σελίδες — όλες χρησιμοποιούν
  Topbar) και στο `account/layout.tsx` header (καλύπτει account + search/favorites/reviews/profile).
  `current={locale as Locale}`. tsc καθαρό· dashboard/calendar/services + account/search/favorites
  (el+en) 200. ⚠️ Το **περιεχόμενο** dashboard/account είναι ακόμα hardcoded ελληνικά — ο επιλογέας
  αλλάζει το locale/URL αλλά δεν μεταφράζει τα εσωτερικά strings (ξεχωριστή μελλοντική εργασία i18n).

---

## 2026-06-17 — Ημερολόγιο: rounded border & σε Ημερήσιο/Εβδομαδιαίο ✅ DONE

User: το μηνιαίο έχει premium καμπυλωτό περίγραμμα — βάλ' το και στα άλλα δύο.
- Το day/week scroll container `flex-1 overflow-auto` → +`m-4 rounded-lg border border-border`
  (ίδιο look με το μηνιαίο grid). Sticky rail/headers (bg-background) δουλεύουν μέσα στο rounded
  frame. tsc καθαρό· day/week/month 200.
- **Fix (δεξί/κάτω περίγραμμα δεν «έκλεινε»)**: το bordered scroll container ως flex child φούσκωνε
  πέρα από το viewport (min-width:auto με πλατύ περιεχόμενο) → δεξί/κάτω border εκτός ορατού.
  Προστέθηκε `min-w-0` σε root + container ώστε να συρρικνώνεται και να σκρολάρει εσωτερικά. tsc καθαρό.
- **Fix v2 (border σε όλο το πλάτος, κενό δεξιά)**: το border ήταν στο scroll viewport (full width)
  ενώ οι στήλες πιάνουν μόνο αριστερά. Μεταφέρθηκε το `rounded-lg border` από το scroll container
  **στο ίδιο το περιεχόμενο** (`flex w-max`) ώστε να **αγκαλιάζει στήλες × ώρες λειτουργίας**
  (κλείνει στον τελευταίο υπάλληλο & την τελευταία ώρα). Sticky rail/headers δουλεύουν (scroll
  ancestor = outer overflow-auto). tsc καθαρό· day/week 200.
- **Fix v3 (γωνίες κόβονταν)**: οι τετράγωνες sticky κεφαλίδες/rail πατούσαν πάνω στις καμπύλες.
  `overflow-clip` στο `flex w-max` → clip στο rounded σχήμα **χωρίς** scroll container (sticky ΟΚ,
  αντίθετα με overflow-hidden). tsc καθαρό· day/week 200.
- **Fix v4 (πάνω border/γωνίες εξαφανίζονταν στο κάθετο scroll)**: το border ήταν στο
  scrolling content → η πάνω γραμμή έφευγε. Αναδιάρθρωση σε **κάρτα με εσωτερικό scroll**:
  AREA (`flex min-h-0 min-w-0 flex-1 items-start`) → FRAME (`max-h-full max-w-full overflow-clip
  rounded-lg border`, **δεν σκρολάρει** → border/γωνίες σταθερά, αγκαλιάζει στήλες×ώρες) →
  SCROLL (`overflow-auto`) → CONTENT (`flex w-max`, sticky rail/headers). tsc καθαρό· 3 όψεις 200.

---

## 2026-06-17 — Ημερολόγιο: σταθερή οριζόντια μπάρα κύλισης (fill height) ✅ DONE

User: η οριζόντια μπάρα (αριστερά/δεξιά για μέρες) έπρεπε να σκρολάρεις τέρμα κάτω για να φανεί.
- Αιτία: το calendar root είχε `h-[calc(100vh-4rem)]` αλλά ο Topbar είναι ~5.8rem (py-5 + τίτλος +
  υπότιτλος) → υπερχείλιζε το viewport, σκρόλαρε η σελίδα εξωτερικά, η εσωτερική οριζόντια μπάρα
  έπεφτε κάτω από το fold.
- Fix: root `h-[calc(100vh-4rem)]` → **`min-h-0 flex-1`** ώστε να γεμίζει ακριβώς τον υπόλοιπο χώρο
  κάτω από τον Topbar (ο dashboard content column είναι ήδη `flex flex-col`). Έτσι το εσωτερικό
  `flex-1 overflow-auto` έχει σωστά φραγμένο ύψος → η οριζόντια μπάρα μένει πάντα ορατή, η κάθετη
  κύλιση γίνεται εσωτερικά. tsc καθαρό· day/week 200.

---

## 2026-06-17 — Εβδομαδιαίο ημερολόγιο: rolling (σήμερα + 6 επόμενες) ✅ DONE

User: η εβδομαδιαία να ξεκινά από **σήμερα** (όχι Δευτέρα) και να δείχνει 7 συνεχόμενες μέρες.
- **calendar.ts**: νέα `rollingWeekDays(date)` = 7 μέρες από `date`. (Η `weekDays`/`startOfWeekStr`
  Δευτέρα-first μένουν για το month grid.)
- **calendar/page.tsx**: week branch → `rollingWeekDays(date)` αντί `weekDays(date)`. Label
  (days[0]–days[6]) & nav (±7) ήδη συμβατά. tsc καθαρό· day/week/month 200.

---

## 2026-06-17 — Δημόσια αναζήτηση καταστημάτων (/search, χωρίς login) ✅ DONE

User: header «Βρες καταστήματα» → νέα + δημόσια `/search`· landing «9€» χρυσά· hero subtitle reframe.
- **`(marketing)/search/page.tsx`** (νέα, δημόσια): ίδια λογική με `/account/search` (BusinessSearch +
  haversine 30km + business_categories filter) αλλά **χωρίς auth** — αν συνδεδεμένος, prefill home +
  favorites· αλλιώς ανώνυμα (FavoriteButton `isAuthed={!!user}` → καρδιά ζητά login). Παίρνει
  header/footer από marketing layout· Container + heading.
- **header nav**: +«Βρες καταστήματα» → `/search` (i18n nav.findBusinesses el+en).
- (`/account/search` παραμένει για συνδεδεμένους — tab λογαριασμού.)
- tsc καθαρό· /search el+en 200 (render χωρίς login).
- **Follow-up**: empty state (πριν την αναζήτηση) δείχνει τα **3 νεότερα ενεργά καταστήματα**
  («Νέα στο Qlick», order created_at desc limit 3) για να μη φαίνεται άδεια· favSet ανέβηκε top-level.
- **Follow-up 2 (φωτό καταστήματος σε όλες τις λίστες)**: thumbnail λογότυπου `h-24 w-48 object-cover
  rounded-lg` (γεμίζει 2:1, στρογγυλεμένες γωνίες) + κενό όνομα/τοποθεσία, σε: `/search` (results +
  newest), `/account/search`, `/account` (ραντεβού), `/account/favorites`, `/account/reviews`
  (+businessLogo στο MyReview). Όλα τα queries +logo_url. tsc καθαρό· routes 200.

- i18n el+en: `oldPrice` σε όλα τα plans (Δοκιμή ""· Basic "18€"/"€18"). Pricing card (landing +
  for-business) δείχνει διαγραμμένη παλιά τιμή πριν την τρέχουσα. tsc/JSON καθαρά· 200.

---

## 2026-06-17 — Landing: ευθυγράμμιση με υλοποιημένα (OSM, χωρίς notifications/Pro) ✅ DONE

User: η αρχική να μη διαφημίζει features που δεν υπάρχουν.
- **i18n el+en**: «Google» → «OpenStreetMap» (valueProp «Έξυπνη εγγραφή», howItWorks βήμα 1,
  trial feature). Αφαιρέθηκε ο valueProp **«Ειδοποιήσεις παντού»** (Email/SMS/WhatsApp/Viber).
  Αφαιρέθηκε το **Pro plan** (SMS/WhatsApp/Viber credits, AI receptionist) — μένουν Δοκιμή + Basic.
- **landing page.tsx**: `valuePropIcons` -Bell (5 items)· pricing grid `md:grid-cols-3 max-w-5xl`
  → `md:grid-cols-2 max-w-3xl` (2 πλάνα). Ίδιο grid & στο for-business.
- (Σχόλιο χρήστη: Google API & Pro/notifications θα μπουν αργότερα όταν μεγαλώσει/έρθουν έσοδα.)
- tsc καθαρό· /el /en /for-business 200· «Ειδοποιήσεις/Google/Pro» έφυγαν από την αρχική.

---

## 2026-06-17 — Γρήγορη εγγραφή: autofill επιχείρησης από OpenStreetMap (δωρεάν) ✅ DONE

User: άντληση δεδομένων επιχείρησης για γρήγορη εγγραφή, **χωρίς πληρωμένο Google** → δωρεάν OSM.
- **`/api/place-search`** (νέο): Nominatim search με `extratags=1&namedetails=1` → επιστρέφει
  name/street/city/postcode/lat/lng + **phone/website/openingHours** (όπου υπάρχουν στο OSM).
  Server-side User-Agent, countrycodes gr,cy.
- **`lib/osm-hours.ts`** (νέο): parser OSM `opening_hours` → DayHour[7] (split shifts, ranges,
  Mo-Fr/Sa/Su off, 24/7), best-effort· null αν δεν παρσάρεται.
- **wizard**: νέο **πρώτο βήμα «Βρες την επιχείρησή σου»** (StepKey "place"): debounced search →
  λίστα αποτελεσμάτων (badges τηλ/ωράριο) → `applyPlace` συμπληρώνει όνομα/διεύθυνση/συντεταγμένες/
  τηλέφωνο (mobile ή landline ανά getType)/ωράριο, μετά goNext. Skip με «Επόμενο».
- Επιβεβαιώθηκε live: «Σκλαβενίτης Αθήνα» → πλήρη στοιχεία + opening_hours. tsc καθαρό· signup 200.
- ⚠️ Κάλυψη OSM για μικρές ελληνικές επιχειρήσεις ποικίλλει (συχνά μόνο όνομα+διεύθυνση).

User: οι κατηγορίες στην εγγραφή να είναι ίδιας λογικής με τις Ρυθμίσεις (πολλαπλές εξαρχής).
- **νέο `components/dashboard/category-picker.tsx`** (controlled searchable multi-select: chips + search +
  grouped dropdown). Settings `CategoryEditor` ξαναγράφτηκε να το χρησιμοποιεί (κρατά save).
- **wizard**: single `<select>` → `CategoryPicker` (state `categoryIds: string[]`). canAdvance ≥1.
- **createAccountAndBusiness**: payload `categoryIds`· RPC `p_category_id = categoryIds[0]` (primary)·
  **insert ΟΛΩΝ στο `business_categories`** (capture business_id από RPC return). Διορθώνει & λανθάνον
  κενό: νέες επιχειρήσεις δεν έμπαιναν καθόλου στο business_categories → δεν εμφανίζονταν σε
  category search.
- tsc καθαρό· signup/business + settings + search 200.

User: το ίδιο και στην εγγραφή επιχείρησης.
- **wizard**: το «Ονοματεπώνυμο» μετακινήθηκε από το account step → στο **business step**, μαζί με
  «Όνομα καταστήματος (brand)» (labels +«(δικό σου)»/«(brand)» + hints). account step = email+κωδικός.
  `canAdvance` ενημερώθηκε (fullName πλέον στο business step). Καλύπτει & authenticated path (που
  παρέκαμπτε το account step → πριν δεν ζητούσε καθόλου προσωπικό όνομα).
- **createAccountAndBusiness**: μετά το RPC, αποθηκεύει `profiles.full_name` + auth metadata του owner
  (για new & existing/OAuth). tsc καθαρό· signup/business 200.

User: στις Ρυθμίσεις υπήρχε μόνο «Όνομα» (= brand). Αφού ο ενιαίος λογαριασμός κλείνει & ραντεβού
αλλού, χρειάζεται και προσωπικό ονοματεπώνυμο.
- **business-info-editor**: «Όνομα» → «Όνομα καταστήματος (brand)» + νέο πεδίο «Ονοματεπώνυμο
  (δικό σου)» (required, hint). +prop `initial.ownerName`.
- **saveBusinessInfo** (+`BusinessInfoInput.ownerFullName`): μετά το business update, ενημερώνει
  `profiles.full_name` + auth metadata του τρέχοντος χρήστη.
- **settings/page**: `ownerName: fullName` (από requireBusiness). tsc καθαρό· settings 200.

---

## 2026-06-17 — Σελίδα «Για επιχειρήσεις» (/for-business) ✅ DONE

User: το /for-business έβγαζε 404 (link στο header χωρίς σελίδα).
- **`(marketing)/for-business/page.tsx`** (νέα): hero (business-focused) + valueProps + howItWorks +
  pricing (#pricing) + final CTA. Επαναχρήση dict (valueProps/howItWorks/pricing/cta/hero) → δίγλωσσο,
  μηδέν νέα strings. Παίρνει Header/Footer από το marketing layout. tsc καθαρό· /el+/en 200.
- ⚠️ **Εκκρεμεί**: `/contact` (κουμπί «Επικοινωνία» στο final CTA της αρχικής) επίσης 404 — δεν φτιάχτηκε.
- **Follow-up**: προστέθηκε αναλυτική ενότητα «Αναλυτικά» με 6 ομάδες πραγματικών δυνατοτήτων
  (online κρατήσεις, ημερολόγιο, QR poster, προσωπικό, πελάτες/κριτικές, αναφορές), inline δίγλωσσο
  (el/en) βάσει όσων έχουν χτιστεί. tsc καθαρό· /el+/en 200.
- **Follow-up 2**: αφαιρέθηκε το `valueProps` section από το for-business (περιείχε μη-υλοποιημένα:
  SMS/WhatsApp/Viber, Google autofill) — μένει η αληθινή «Αναλυτικά» ενότητα. Hero h1 άλλαξε σε
  inline («Γέμισε το πρόγραμμά σου με ραντεβού»). Καθαρίστηκαν unused imports. tsc καθαρό· 200.

User: στις Ρυθμίσεις upload λογότυπου/φωτό → εμφάνιση πάνω δεξιά στο `/b/{slug}`.
- **business-info-editor**: νέο control upload (preview κύκλος/τετράγωνο + Ανέβασμα/Αλλαγή/Αφαίρεση)
  στο Storage `business-assets` path `${businessId}/logo/…` (ίδιο pattern με staff avatar). +props
  `businessId`, `initial.logoUrl`. Save περνά `logoUrl`.
- **saveBusinessInfo** (+`BusinessInfoInput.logoUrl`): update `businesses.logo_url`.
- **settings/page**: select +`logo_url`, pass businessId + logoUrl.
- **public `/b/[slug]`**: select +`logo_url`· hero → flex (περιεχόμενο αριστερά, **λογότυπο πάνω
  δεξιά** `<img>` rounded, md+ visible). tsc καθαρό· settings/public 200.

User: αν σβήσει το QR και πατήσει Αποθήκευση, πού θα το ξαναβρεί;
- **qr-editor**: νέα `addQr()` (QrEl με `data = bookingUrl` → σύνδεσμος καταστήματος, size 230,
  ink/white) + κουμπί **«QR»** (lucide `QrCode`) στη γραμμή εργαλείων δίπλα στο «Πίνακας».
  **Disabled** όταν υπάρχει ήδη QR (αποφυγή διπλού). tsc καθαρό· qr 200.

User: στο qr editor (παλέτα/φόντο) σταγονόμετρο για αντιγραφή χρώματος (π.χ. από λογότυπο σε
μη-λευκό φόντο).
- **qr-editor `ColorInput`**: κουμπί σταγονόμετρου (lucide `Pipette`) με **EyeDropper API** —
  `new EyeDropper().open()` → εφαρμόζει το `sRGBHex` (onChange) + το αντιγράφει στο clipboard
  (Check feedback 1.5s). Feature-detect (`'EyeDropper' in window` σε useEffect) → εμφανίζεται μόνο
  σε Chromium (Chrome/Edge). Ισχύει σε ΟΛΑ τα χρώματα (φόντο/QR/στοιχεία) αφού είναι στο ColorInput.
- tsc καθαρό· qr 200.

---

## 2026-06-17 — Calendar popover: κεντράρισμα «Επαναφορά» + «Αναφορά πελάτη» ✅ DONE

- «Επαναφορά (ενεργό)» στο booking popover → `justify-center` (κεντραρισμένο).
- Νέο **`customer-actions-modal.tsx`** (κοινό): δείχνει στοιχεία πελάτη + «Αναφορά λογαριασμού»
  (αιτία) και «Αποκλεισμός & ακύρωση / διατήρηση» (reuse `reportAccount`/`blockCustomer`).
- **calendar-client**: κουμπί **«Αναφορά πελάτη»** στο popover (μόνο όταν `customerId` και ≠ owner
  → όχι walk-ins) → ανοίγει το modal. +prop `ownerUserId`. `CalBooking.customerId` (page select +map).
- tsc καθαρό· calendar day/week 200.

---

## 2026-06-17 — Αναφορές: μη εμφανίσεις → αναφορά/αποκλεισμός λογαριασμού ✅ DONE

User: «No-show» στα ελληνικά + κουμπί «Αναφορά» με τους λογαριασμούς που απουσίασαν, με
δικαίωμα **αναφοράς** λογαριασμού στο Qlick και **αποκλεισμού** από νέες κρατήσεις.
- **migration 033**: `business_blocked_customers` (PK business+customer, RLS owner) + `account_reports`
  (RLS owner) + **trigger `trg_block_booking`** (BEFORE INSERT bookings → raise 'blocked' αν ο
  πελάτης είναι μπλοκαρισμένος). Types +2 tables.
- **reports/actions.ts**: `reportAccount` (insert account_reports), `blockCustomer(cancelFuture)`
  (upsert block· αν cancelFuture → ακυρώνει μελλοντικά pending/confirmed του πελάτη εδώ),
  `unblockCustomer`.
- **no-show-report.tsx** (client): κουμπί **«Αναφορά»** (+badge) → modal με όλους τους λογαριασμούς
  απουσιών (most-recent-first, πλήθος/τελευταία/τηλ). Ανά λογαριασμό: «Αναφορά λογαριασμού»
  (modal με αιτία) + «Αποκλεισμός» (modal: ακύρωση μελλοντικών ή διατήρηση) / «Άρση αποκλεισμού».
- **reports/page.tsx**: metric «No-show» → **«Μη εμφανίσεις»**· φορτώνει all-time no-show accounts
  (εξαιρεί owner walk-ins, customer_id===userId) + blocks· κουμπί δίπλα στις περιόδους.
- **submitBooking**: μήνυμα «Το κατάστημα δεν δέχεται κρατήσεις από τον λογαριασμό σου» στο 'blocked'.
- tsc καθαρό· reports/book 200· advisors καμία νέα (νέοι πίνακες με RLS).

---

## 2026-06-17 — Αναφορές / Analytics (dashboard/reports) ✅ DONE

Αντικατάσταση του ComingSoon με πραγματικές αναφορές (frontend-only, από `bookings`).
- **`dashboard/reports/page.tsx`** (server): επιλογέας περιόδου (Αυτός ο μήνας / 30 ημέρες / Φέτος
  via `?range=`), φορτώνει bookings ≥ from + staff names. Aggregates: **έσοδα** (sum price_cents
  completed, «ενημερωτικά»), σύνολο κρατήσεων, **no-show rate** (noShow/(completed+noShow)),
  ακυρώσεις· **πηγή κρατήσεων** (web/qr/dashboard/phone bars), **δημοφιλείς υπηρεσίες** & **ανά
  υπάλληλο** (top-6 completed, bars), σύνοψη status. Premium dark cards + gold bars, empty state.
- Καθαρά server-side· καμία εξωτερική υπηρεσία. tsc καθαρό· reports (3 περίοδοι) 200.

---

## 2026-06-17 — Ωράριο: 24ωρη μορφή (TimeSelect) αντί native time input ✅ DONE

User: το `<input type="time">` έδειχνε 12ωρη μορφή (locale) και το εικονίδιο ρολογιού κοβόταν.
- **hours-editor**: νέο `TimeSelect` (native `<select>`, options ανά 15′ 00:00–23:45, **24ωρο**,
  locale-independent, χωρίς native clock icon). Κρατά off-grid υπάρχουσα τιμή ως option. Αντικατέστησε
  και τα 4 time inputs (πρωινό + απογευματινό). Αφαιρέθηκε το unused `Input` import.
- tsc καθαρό· settings 200.

---

## 2026-06-17 — Πολλαπλά «Είδη υπηρεσίας» ανά κατάστημα + στις Ρυθμίσεις ✅ DONE

User: μια επιχείρηση κάνει πολλά (νύχια/αισθητική/φρύδια/μακιγιάζ· κομμωτήριο≈κουρείο) → να
επιλέγει πολλά είδη και να εμφανίζεται στην αναζήτηση για καθένα.
- **migration 032**: `business_categories(business_id, category_id)` many-to-many + RLS (public read
  ενεργών / member read / owner write) + index + **backfill** από `businesses.category_id`. Types +table.
- **Ρυθμίσεις**: νέο `category-editor.tsx` (chips ανά ομάδα γονέα· toggle πολλαπλών) + action
  `saveBusinessCategories` (owner/manager· replace set· κρατά primary `category_id`=πρώτο). page
  φορτώνει categories + business_categories, χτίζει groups.
- **Αναζήτηση** (`/account/search`): φίλτρο μέσω `business_categories` (parent ⇒ + children),
  βρίσκει business_ids → `.in("id", …)` (αντί `businesses.category_id`). Έτσι ένα κατάστημα με
  π.χ. Κουρείο+Κομμωτήριο εμφανίζεται και στις δύο αναζητήσεις.
- tsc καθαρό· routes 200· advisors καμία νέα (business_categories με RLS).
- **UI follow-up**: ο chips-wall αντικαταστάθηκε με **searchable picker** (αναζήτηση + dropdown
  ομαδοποιημένο ανά κλάδο + «+» / επιλεγμένα ως chips με ×) ώστε να κλιμακώνει σε πολλούς κλάδους
  χωρίς τεράστια κάρτα. Το `category-editor.tsx` κρατά ίδια props (καμία αλλαγή στη σελίδα).

---

## 2026-06-17 — Προφίλ πελάτη: κινητό υποχρεωτικό + προαιρετική διεύθυνση (αποστάσεις) ✅ DONE

- **migration 031**: `profiles.address jsonb` (ίδιο shape με businesses.address). Types +address.
- **profile-form**: κινητό **required** (αστεράκι) + προαιρετικά **Πόλη** (autocomplete kind=city)
  & **Διεύθυνση** (scoped στην πόλη) & **Τ.Κ.** — κρατά lat/lng (επαναχρήση AddressAutocomplete,
  pattern business-info-editor).
- **updateProfile**: κινητό υποχρεωτικό (reject κενό)· αποθηκεύει address jsonb (null αν κενό).
- **search**: αν δεν υπάρχει τοποθεσία στο URL, **προεπιλέγει τη δηλωμένη διεύθυνση** του προφίλ
  (lat/lng + label) → δείχνει αποστάσεις καταστημάτων από το «σπίτι» χωρίς να ξαναγράψει περιοχή.
- **Signup πελάτη**: παραμένει απλό (όνομα/email/κινητό/κωδικός — **χωρίς** διεύθυνση).
- tsc καθαρό· routes 200 (χρειάστηκε 2ο clear .next — transient wedge).

---

## 2026-06-17 — Ημερολόγιο: τα ακυρωμένα φεύγουν (μένουν μόνο στη λίστα Ραντεβού) ✅ DONE

User: τα ακυρωμένα να μη φαίνονται στο `dashboard/calendar` (μπερδεύουν), να μένουν μόνο στο
`dashboard/bookings`.
- **calendar/page.tsx**: `.neq("status","cancelled")` στο fetch → δεν φορτώνονται καθόλου
  (αναιρεί το 4.1e που τα κρατούσε κόκκινα). Καλύπτει & customer-cancel & owner-cancel.
- **calendar-client `changeStatus`**: όταν status='cancelled' → **αφαιρείται** από τα rows
  (optimistic) αντί να ξαναχρωματίζεται. Τα completed/no_show παραμένουν (recolor in place).
- Restore ακυρωμένων γίνεται από τη λίστα Ραντεβού (όχι από το ημερολόγιο πια). Capacity/conflict
  logic ανέπαφο (ήδη αγνοούσε cancelled). tsc καθαρό· calendar 200.

---

## 2026-06-17 — Πελάτης: ακύρωση & αλλαγή (μέρα/ώρα) επερχόμενου ραντεβού ✅ DONE

Στα «Επερχόμενα» του `/account` ο πελάτης μπορεί να **ακυρώσει** ή να **αλλάξει μέρα/ώρα**.
- **migration 030**: `cancel_booking(p_booking_id)` (owner=customer, status pending/confirmed,
  μελλοντικό → cancelled + cancelled_by='customer') και `reschedule_booking(p_booking_id,
  p_starts_at, p_staff_id)` — re-validate διαθεσιμότητας **mirror του create_booking**
  (conflict/capacity, **exclude self** `bk.id<>p_booking_id`), recompute ends_at από τη διάρκεια
  υπηρεσίας, update starts/ends/staff. Types: +cancel_booking/+reschedule_booking.
- **actions** (`account/actions.ts`): `cancelBooking`, `rescheduleBooking` (μηνύματα slot_taken/
  cannot_modify/…).
- **`booking-actions.tsx`** (νέο client): κουμπιά «Αλλαγή ημέρας & ώρας» (modal με μηνιαίο calendar
  + slots, επαναχρήση `getAvailableSlots`, ίδια υπηρεσία+προτίμηση υπαλλήλου) και «Ακύρωση»
  (confirm). Optimistic→`router.refresh()`. Μπαίνει στις κάρτες **μόνο για upcoming** (account
  page: +service_id/staff_id στο select· prop `upcoming`).
- **Απόφαση/scope**: η αλλαγή κρατά ίδια υπηρεσία & υπάλληλο/προτίμηση (άλλος υπάλληλος → ακύρωση
  + νέα κράτηση). Επιτρέπεται όσο starts_at > now().
- **Refinement**: σε αποτυχία reschedule (π.χ. «Η ώρα μόλις κλείστηκε»), το modal **ξαναφορτώνει
  αυτόματα** τις διαθέσιμες ώρες της ημέρας (η πιασμένη φεύγει) μαζί με το μήνυμα.
- tsc καθαρό· routes 200· advisors καμία νέα.

---

## 2026-06-17 — Fix μισά αστέρια στην εμφάνιση + καρδιά σε ραντεβού/αναζήτηση ✅ DONE

User: το 4.5 έδειχνε 5 γεμάτα αστέρια (η εμφάνιση έκανε `Math.round`)· και τα κάρτες ραντεβού/
αναζήτησης να έχουν καρδιά αγαπημένων.
- **`star-rating-display.tsx`** (νέο, read-only fractional fill — overlay clip· `showValue`).
  Αντικατέστησε τη στρογγυλοποιημένη εμφάνιση σε **my-reviews list**, **review-button** («Αξιολόγησες»),
  **dashboard reviews-manager** (τοπικό `Stars` → fractional). Τώρα 4.5 = 4 γεμάτα + 1 μισό.
- **Καρδιά (FavoriteButton icon)**: στις κάρτες ραντεβού (`/account` Επερχόμενα+Ιστορικό — +business_id
  στο select, favorites set) και στα αποτελέσματα `/account/search`. Optimistic toggle.
- **Σημαντικό**: το Supabase επιστρέφει το `numeric rating` ως **string** → επιβεβαιώθηκε ότι το
  αμυντικό `Number()` (arithmetic/`.toFixed`) ήταν απαραίτητο· όλα τα display paths παίρνουν number.
- tsc καθαρό· routes 200 (μετά από clear .next — transient Turbopack JSON-parse wedge).

---

## 2026-06-17 — Κριτικές: μισά αστέρια (4.5) + επιλογή εμφάνισης ονόματος ✅ DONE

User: στο «Άσε κριτική» να μπορεί ανώνυμα / μόνο μικρό όνομα / πλήρες, και μισά αστέρια.
- **migration 029**: `reviews.rating` → **numeric(2,1)** (half-step check 1..5, `rating*2=floor`).
  `staff_ratings` view drop/recreate (security_invoker) γιατί εξαρτιόταν. `create_review` &
  `update_review` recreated (rating numeric + νέο **p_name_visibility** 'full'|'first'|'anonymous'):
  το εμφανιζόμενο `customer_name` υπολογίζεται **server-side** από το profile.full_name (anonymous→null,
  first→split_part, full→ολόκληρο) — anti-spoof. update_review ενημερώνει & το customer_name.
  Types: RPC args + p_name_visibility.
- **Νέα components**: `star-rating-input.tsx` (μισά αστέρια — αριστερό μισό=.5, δεξί=1, overlay
  clip + numeric) και `name-visibility-picker.tsx` (3 chips + `inferNameVisibility`).
- **review-button** (Άσε κριτική) & **my-reviews EditModal**: χρησιμοποιούν τα νέα components,
  στέλνουν `nameVisibility`· edit κάνει infer από το αποθηκευμένο όνομα. ExistingReview/MyReview
  +customerName (select +customer_name).
- **Εμφάνιση**: anonymous → «Ανώνυμος» (public + dashboard)· stars στρογγυλοποιούν + δείχνουν
  αριθμητικό (π.χ. 4.5)· public Stars ήδη fractional. Αμυντικό `Number(rating)` σε arithmetic/toFixed.
- tsc καθαρό· routes 200· advisors καμία νέα.

---

## 2026-06-17 — «Βρες καταστήματα» (discovery με απόσταση) + fix tabs ✅ DONE

- **AccountNav**: αφαιρέθηκε το `overflow-x-auto` (ενοχλητική μπάρα scroll) → `flex-wrap`
  (τα tabs αναδιπλώνονται). Νέα καρτέλα **«Βρες καταστήματα»** (Search icon, 2η θέση).
- **`account/search`** (νέα): discovery με **autocomplete πόλη/περιοχή (OSM) + απόσταση**.
  - `business-search.tsx` (client): dropdown **είδος υπηρεσίας** (κατηγορίες, parents+children
    με indent) + AddressAutocomplete `kind=city` → κρατά lat/lng → «Αναζήτηση» κάνει
    router.push με `?cat&lat&lng&q`.
  - `page.tsx` (server): haversine (RADIUS_KM=30), φέρνει active businesses (φίλτρο κατηγορίας —
    parent ματσάρει & τα children μέσω `.in`), υπολογίζει απόσταση, φιλτράρει ≤30χλμ, sort
    πλησιέστερα πρώτα. Κάρτες: όνομα/περιγραφή/διεύθυνση/απόσταση + «Κλείσε».
  - Λύνει το «περιοχή για μεγάλη πόλη» φυσικά (γράφεις γειτονιά → ό,τι είναι κοντά).
- tsc καθαρό· /account/search 200· geocode city OK (Κομοτηνή/Αθήνα/Κουκάκι επιστρέφουν coords).

---

## 2026-06-17 — Φάση C: Λογαριασμός πελάτη (προφίλ + κριτικές + αγαπημένα) ✅ DONE

Ο customer λογαριασμός απέκτησε δικό του χώρο με tabs.
- **migration 028**: πίνακας `favorites` (customer_id→profiles, business_id→businesses, PK ζεύγος)
  + RLS (own select/insert/delete) + indexes. Types updated (favorites + regenerated).
- **Account area refactor**: νέο `account/layout.tsx` (κοινό header: logo/όνομα/«Διαχείριση
  καταστήματος» αν owns business/Αποσύνδεση + `AccountNav` tabs) → `page.tsx` κράτησε μόνο το
  περιεχόμενο ραντεβού. 4 tabs: Ραντεβού / Αγαπημένα / Κριτικές / Προφίλ.
- **Προφίλ** (`account/profile`): `profile-form.tsx` — όνομα + κινητό (PhoneInput, parse E.164)
  → `updateProfile`· αλλαγή κωδικού (νέος+επιβεβαίωση) → `changePassword` (auth.updateUser)·
  email read-only.
- **Οι κριτικές μου** (`account/reviews`): `my-reviews.tsx` — συγκεντρωτική λίστα (κατάστημα,
  αστέρια, σχόλιο, απάντηση καταστήματος, ημ/νία) + edit modal (`updateReview`).
- **Αγαπημένα** (`account/favorites`): λίστα ενεργών καταστημάτων + «Κλείσε» + αφαίρεση.
  `FavoriteButton` (client, optimistic, button/icon variants) στη **δημόσια σελίδα hero** (καρδιά·
  anon→login) και στη λίστα. Server action `toggleFavorite`.
- tsc καθαρό· routes 200 (account/profile/reviews/favorites + public hero heart)· advisors καμία νέα.

**Φάσεις A→C ΟΛΟΚΛΗΡΩΘΗΚΑΝ:** 2 τύποι λογαριασμού (ενιαίο μοντέλο), 2 δρόμοι εγγραφής,
πλήρης χώρος πελάτη.

---

## 2026-06-17 — Αλλαγή μοντέλου: ενιαίος λογαριασμός (business ΚΑΙ πελάτης) ✅ DONE

User: «θέλω με το ίδιο email να κλείνω και ραντεβού σαν πελάτης». Το Supabase Auth κλειδώνει
το email ως μοναδικό → **αδύνατο 2 ξεχωριστοί λογαριασμοί ίδιου email**. Απόφαση: **ενιαίος
λογαριασμός που κάνει και τα δύο** (αναίρεση του αυστηρού διαχωρισμού της Φάσης A).
- **migration 027**: αφαιρέθηκε το `business_cannot_book` guard από το `create_booking` →
  οι business λογαριασμοί κλείνουν κανονικά ραντεβού.
- **`/account`**: έφυγε το redirect business→dashboard· ανοίγει για όλους. Όταν ο χρήστης
  έχει κατάστημα (`my_businesses`), header δείχνει «Διαχείριση καταστήματος» → `/dashboard`.
- **Dashboard sidebar**: νέο link «Τα ραντεβού μου» → `/account` (εναλλαγή ρόλου).
- **`submitBooking`**: αφαιρέθηκε το νεκρό business_cannot_book μήνυμα.
- **Εγγραφή πελάτη**: **κινητό υποχρεωτικό** (ήταν optional)· βελτιωμένο μήνυμα όταν το email
  υπάρχει ήδη («Κάνε σύνδεση — μπορείς να κλείνεις ραντεβού από εκεί»).
- `account_type` παραμένει **μόνο** ως «προεπιλεγμένο home» για το login routing (όχι hard gate).
- tsc καθαρό· routes 200· καθαρό restart dev (clear .next).

**Σημείωση:** ένας business owner δεν χρειάζεται 2η εγγραφή — κάνει login, και από το sidebar
«Τα ραντεβού μου» κλείνει/βλέπει ραντεβού σαν πελάτης.

---

## 2026-06-17 — Φάση B: Δύο δρόμοι εγγραφής (chooser + πελάτης) ✅ DONE

Soft entry: κουμπί «Εγγραφή» → σελίδα επιλογής με 2 κάρτες (πελάτης / επιχείρηση).
- **`/signup`** (νέα, chooser): 2 κάρτες (User→`/signup/customer`, Store→`/signup/business`),
  premium dark, hover gold. + «Έχεις λογαριασμό; Σύνδεση».
- **`/signup/customer`** (νέα): `page.tsx` (Card, back→chooser, «Είσαι επιχείρηση;» link) +
  `customer-form.tsx` (client: Social buttons χωρίς next, Όνομα, Email, **PhoneInput κινητό
  optional**, Κωδικός· useTransition) + `actions.ts` `createCustomerAccount` (validate, signUp
  με full_name+preferred_language· account_type μένει **customer** μέσω trigger default·
  αποθηκεύει phone στο profile· redirect `/account`· needsEmailConfirmation handled για prod).
- **i18n** (`i18n-dict.ts`): νέα sections `chooser` + `customer` (EL/EN).
- **Σύνδεσμοι**: login «Δεν έχεις λογαριασμό;» → `/signup`· marketing header CTA → `/signup`.
  Τα hero/pricing CTAs μένουν `/signup/business` (business-focused conversion).
- tsc καθαρό· routes 200 (signup/customer/business, EL+EN)· περιεχόμενο render σωστά.

**Επόμενο (Φάση C):** customer account — προφίλ edit, οι κριτικές μου, αγαπημένα καταστήματα.

---

## 2026-06-17 — Φάση A: Δύο τύποι λογαριασμού (ρόλοι & routing) ✅ DONE

Θεμέλιο για «2 τρόπους εγγραφής» (πελάτης / επιχείρηση). Αποφάσεις χρήστη: soft entry
(κουμπί «Εγγραφή» → σελίδα επιλογής — Φάση B)· **αυστηρά χωριστοί τύποι** (business ΔΕΝ
κλείνει ραντεβού σαν πελάτης)· customer account = προφίλ + κριτικές + αγαπημένα (Φάση C).

- **migration 026**: `profiles.account_type` (`customer` default | `business`, check).
  Backfill → `business` όπου υπάρχει `business_members` row (μόνο ο Barber House owner).
  `create_business_with_owner` θέτει `account_type='business'` στον owner. `create_booking`
  **απορρίπτει** business accounts (`raise 'business_cannot_book'`). Types regenerated
  (account_type σε profiles Row/Insert/Update).
- **`lib/auth.ts`** (νέο): `roleHome(locale, type)` (business→/dashboard, customer→/account)
  + `getAccountType(supabase, userId)`.
- **Έξυπνο redirect**: `loginAction` & OAuth `callback` δρομολογούν βάσει `account_type`
  (ο callback τιμά deep-link `next` π.χ. επιστροφή σε booking, αλλιώς role home).
  `SocialAuthButtons.next` έγινε **optional**· login page δεν επιβάλλει πια `/dashboard`.
- **Guards**: `requireBusiness` → πελάτης χωρίς business πάει `/account` (όχι signup/business)·
  `account/page` → business account ανακατευθύνεται στο `/dashboard`. `DashboardContext`
  +`accountType`.
- **Booking**: `submitBooking` δείχνει φιλικό μήνυμα στο `business_cannot_book`.
- tsc καθαρό· routes 200 (login/account/dashboard/public/book)· advisors: καμία νέα.

**Επόμενο (Φάση B):** `/signup` chooser + `/signup/customer` + σύνδεσμοι. (Φάση C: customer
profile/reviews/favorites.)

---

## 2026-06-16 — Δύο τηλέφωνα: Κινητό (υποχρ.) + Σταθερό (προαιρ.) ✅ DONE

Σε Ρυθμίσεις & εγγραφή νέου καταστήματος: ξεχωριστά πεδία **Κινητό** (υποχρεωτικό) και
**Σταθερό** (προαιρετικό).
- **DB migration 025**: `businesses.landline text`· `create_business_with_owner` +`p_landline`
  (drop παλιού 6-arg overload για αποφυγή ασάφειας — 025b). `phone` = κινητό, `landline` = σταθερό.
  Types regenerated (landline + p_landline).
- **validation.ts**: νέα `isMobilePhone` (valid && type !== FIXED_LINE).
- **Settings** (`saveBusinessInfo` + `business-info-editor`): κινητό required (isMobilePhone) +
  σταθερό optional (isValidPhone)· δύο PhoneInput. page select `landline`.
- **Signup wizard** (`wizard.tsx` + `actions.ts`): δύο πεδία· `canAdvance` business step απαιτεί
  έγκυρο κινητό. RPC παίρνει `p_landline`.
- **Δημόσια σελίδα**: εμφανίζει και τα δύο τηλέφωνα (tel: links).
- tsc καθαρό· public/signup 200. (Barber House phone = κινητό → περνά.)

**Fix (type detection):** το «Σταθερό» δεχόταν κινητό. Αιτία: `getType()` επέστρεφε **undefined**
με το default `libphonenumber-js` (min metadata). Λύση: `isMobilePhone`/`isLandlinePhone`
χρησιμοποιούν `parsePhoneNumberFromString` από **`libphonenumber-js/max`** (πλήρη metadata) +
νέα `isLandlinePhone` (valid && type !== MOBILE) στο σταθερό (Settings + wizard + actions).
Verified: 6912345678→MOBILE (reject σταθερό), 2101234567→FIXED_LINE (reject κινητό).

User: «Νικολάου Πλαστήρα 3» έβγαζε Αθήνα/Θεσσαλονίκη όχι Κομοτηνή (έπρεπε να γράψει & πόλη).
- **`/api/geocode`**: νέα params `kind=city` (Nominatim `featuretype=settlement`, dedupe ανά
  όνομα πόλης) και `city` (structured query `street`+`city` → περιορισμός στην πόλη). City
  fallback σε `name`/πρώτο κομμάτι display_name.
- **AddressAutocomplete**: props `kind?: "address"|"city"` & `city?` (scope), μπαίνουν στο
  fetch URL· deps `[value, kind, city]`. Backward compatible (wizard αμετάβλητο).
- **business-info-editor**: πεδίο **Πόλη (autocomplete, kind=city)** πρώτα → μετά **Διεύθυνση**
  (scoped στην πόλη) → Τ.Κ. Verified live: Κομοτηνή + «Νικολάου Πλαστήρα 3» → σωστή διεύθυνση.
- tsc καθαρό. (Το signup wizard μπορεί να πάρει το ίδιο αργότερα.)

**Follow-up fixes:** (α) Τ.Κ. αυτο-συμπληρώνεται και από την επιλογή πόλης (`onCitySelect` →
`setPostcode`)· παραμένει editable. (β) Το dropdown **άνοιγε μόνο του σε refresh** γιατί το
debounced search έτρεχε σε mount με την προ-συμπληρωμένη τιμή — προστέθηκε `userTyped` ref:
ψάχνει **μόνο όταν πληκτρολογεί ο χρήστης** (όχι σε mount ούτε σε προγραμματιστική αλλαγή
value/city). Reset σε `pick`. Διορθώνει και το «η διεύθυνση άνοιγε όταν άλλαζε η πόλη».

Τα στοιχεία καταστήματος (όνομα/τηλέφωνο/διεύθυνση) ήταν read-only — τώρα editable.
- **actions.ts**: νέα `saveBusinessInfo(locale, input)` (owner/manager). Validate όνομα non-empty·
  τηλέφωνο optional → `normalizePhone` (E.164 ή reject)· address jsonb `{street,city,postcode,
  lat,lng}` (ίδιο shape με signup). Update `businesses` + revalidate settings/dashboard/public.
  **Ο slug δεν αλλάζει** (σταθερά URL/QR/σύνδεσμοι).
- **business-info-editor.tsx** (νέο client): Όνομα + PhoneInput (parse υπάρχοντος E.164 →
  national+country) + AddressAutocomplete (OSM, επαναχρήση) + Πόλη/Τ.Κ. Read-only context:
  σύνδεσμος + κατάσταση. Success/error states, useTransition.
- **page.tsx**: αντικατέστησε το read-only `<dl>` με τον editor. tsc καθαρό.

User: μετά το «Η ώρα μόλις κλείστηκε» οι ώρες δεν ανανεώνονταν (ήθελε page refresh). Δύο αιτίες:
- **Engine**: `computeStaffAwareSlots` στο **specific-staff** branch έδειχνε διαθέσιμη μια ώρα αν
  ο υπάλληλος ήταν ελεύθερος — χωρίς να αφαιρεί τα overlapping **unassigned** (όπως κάνει το
  «any»). Άρα refetch με staffId ξανάδειχνε την κλεισμένη ώρα. Fix: αν ελεύθερος, απαιτεί
  `freeOthers ≥ unassigned` (mirror του migration 024). Τώρα η ώρα δεν εμφανίζεται καθόλου.
- **Client race**: στο confirm-rejection γινόταν χειροκίνητο `getAvailableSlots` (any) **+** το
  datetime `useEffect` (με staffId) ταυτόχρονα → όποιο τέλειωνε τελευταίο κέρδιζε. Fix:
  `setSlot(null)` + `backToDatetime()` (reset staffId=null) → μόνο το effect κάνει refetch
  (single source, no race). Συνεπές «any» view με σωστές ώρες χωρίς manual refresh. tsc καθαρό.

---

## 2026-06-16 — Fix: online κράτηση σε συγκεκριμένο υπάλληλο αγνοούσε capacity ✅ DONE

User race: υπήρχε «χωρίς ανάθεση» 19:00, online κράτηση στις 20:00 (μόνο 1 ελεύθερος →
αυτο-ανάθεση), έμεινε στην Επιβεβαίωση, μετακινήθηκε στο dashboard το unassigned στις 20:00,
υποβλήθηκε η online → ο 1 υπάλληλος βρέθηκε με 2 ραντεβού (δικό του + το unassigned).
- **Αιτία**: το `create_booking` RPC στο **specific-staff** branch έλεγχε μόνο τον δικό του
  conflict/time-off — όχι αν αναθέτοντάς τον στερεί τον τελευταίο ελεύθερο από υπάρχοντα
  unassigned. (Το dashboard `peakOverCapacity` ήδη το έπιανε.)
- **migration 024**: στο specific-staff branch, αν υπάρχουν overlapping unassigned (>0),
  ελέγχει `(capable − busy_others − 1) ≥ unassigned` (busy = booking ή time-off, εξαιρώντας
  τον υπό-ανάθεση)· αλλιώς `slot_taken`. Defense-in-depth: ακόμα κι αν το client auto-assign
  ήταν stale, το RPC απορρίπτει στο submit → client δείχνει «Η ώρα μόλις κλείστηκε».

---

## 2026-06-16 — Online κράτηση: αναδιάταξη ροής → υπηρεσία → ώρα → άτομο ✅ DONE

User: το βήμα «άτομο» να έρχεται **μετά** την ώρα, ώστε να δείχνει μόνο όσους είναι όντως
ελεύθεροι εκείνη τη στιγμή (όχι όποιος έχει άδεια/είναι κλεισμένος).
- **actions.ts**: extract `loadSlotInputs` (κοινό loading) από `getAvailableSlots`. Νέα action
  `getAvailableStaffForSlot(business, service, date, startsAtIso)` → τρέχει `computeStaffAwareSlots`
  ανά ικανό υπάλληλο και κρατά όσους έχουν το slot διαθέσιμο (ωράριο + booking + time-off aware).
- **booking-flow.tsx**: Step order service → **datetime** → **staff** → auth → confirm. Οι ώρες
  υπολογίζονται «Οποιοσδήποτε» (staffId=null) όταν ≥2 ικανοί· με 1 ικανό κλείνει κατευθείαν εκείνον
  (skip staff step)· 0 → business-level. Μετά την επιλογή ώρας: fetch διαθέσιμων ατόμων (loading
  «Έλεγχος διαθεσιμότητας…») → λίστα μόνο ελεύθερων + «Οποιοσδήποτε διαθέσιμος» πρώτο. «Πίσω» από
  άτομο → datetime ως «any» (`backToDatetime` reset staffId). StepBar/back links/υπότιτλοι ενημερώθηκαν.
- Public booking page 200· tsc καθαρό.

**Απόφαση:** «Οποιοσδήποτε διαθέσιμος» παραμένει ως πρώτη επιλογή στο βήμα άτομο.

**Refinement (same day):** αν στη συγκεκριμένη ώρα είναι ελεύθερος **μόνο ένας** (ή κανένας),
το βήμα «άτομο» **παρακάμπτεται** — `pickSlot` ελέγχει `getAvailableStaffForSlot` και με ≤1
αναθέτει αυτόματα (ή null) → κατευθείαν auth/confirm. Το «Πίσω» από confirm/auth πάει στις ώρες
όταν το βήμα παρακάμφθηκε (`staffStepActive`/`backFromAfterStaff`). tsc καθαρό· page 200.

**Race handling:** αν στο 2ο έλεγχο (`getAvailableStaffForSlot`) βγουν **0** ελεύθεροι (η ώρα
κλείστηκε στο ενδιάμεσο από άλλον πελάτη / προστέθηκε άδεια), ο πελάτης γυρίζει **αμέσως** στο
βήμα ωρών με μήνυμα «Η ώρα μόλις κλείστηκε. Διάλεξε άλλη.» (αντί να αποτύχει στο τέλος στο RPC).
Error banner στο datetime step· καθαρίζει σε αλλαγή μέρας/slot.

---

## 2026-06-16 — Fix: χωρητικότητα αγνοούσε τις άδειες (dashboard) ✅ DONE

User: ραντεβού «χωρίς ανάθεση» περνούσε ενώ ο μόνος διαθέσιμος ήταν σε άδεια. Αιτία:
`peakOverCapacity` (calendar/actions.ts) όριζε capacity = πλήθος ενεργών υπαλλήλων **χωρίς**
να αφαιρεί όσους έχουν time-off. Fix: φορτώνει `staff_time_off` που επικαλύπτει το διάστημα
(ενεργοί μόνο)· ανά χρονική στιγμή `available = capacity − offCount`, block όταν
`demand > available`. Sample points += starts των time-off. Καλύπτει createWalkin/move/resize.
Το **online** RPC `create_booking` ήταν ήδη σωστό (busy_cap μετρά booking **ή** άδεια). tsc καθαρό.

---

## 2026-06-16 — Ημερολόγιο/Εβδομαδιαία: υποστήλες ανά υπάλληλο ✅ DONE

Η Εβδομαδιαία άλλαξε από 7 στήλες-μέρες → **κάθε μέρα σπάει σε υποστήλες ανά υπάλληλο**
(+ πάντα «Χωρίς ανάθεση»), με **2-σειρών header** (ζώνη μέρας πάνω, mini staff sub-header κάτω).
- **Πλάτος μέρας προσαρμοζόμενο**: κάθε υποστήλη υπολογίζει πλάτος από το μήκος ονόματος
  (`subColWidth` clamp 122–232), και το πλάτος της μέρας = άθροισμα υποστηλών.
- **Ανά υπάλληλο ωράριο/άδειες**: page φορτώνει staff_hours + staff_time_off για ΟΛΗ την
  εβδομάδα και τα κλειδώνει ανά `${date}|${staffId}` (ενοποιημένο με το Day view). Κάθε
  υποστήλη σκιάζει ώρες εκτός ατομικού ωραρίου + δείχνει ρεπό/άδειες (κίτρινες ριγέ ζώνες).
- **Refactor**: εξήχθη `renderColumn(col)` (header+body) ώστε Day (flat) & Week (nested) να
  μοιράζονται τον ίδιο κώδικα στήλης. Κάρτες week δείχνουν πλέον πελάτη/υπηρεσία (όχι όνομα
  υπαλλήλου, αφού η στήλη ΕΙΝΑΙ ο υπάλληλος). **Bonus**: drag&drop στην εβδομάδα μετακινεί
  πλέον και σε άλλον υπάλληλο (colId = `date|staffId`). Φίλτρο προσωπικού κρατά πάντα τα
  «Χωρίς ανάθεση».
- ColumnDef: +`staffId`, +`width`· kind «day» καταργήθηκε. tsc καθαρό.

**Αποφάσεις:** πάντα υποστήλη «Χωρίς ανάθεση» ανά μέρα· ναι σε ανά-υπάλληλο ωράριο/άδειες.

---

## 2026-06-16 — Άδειες: 4 τύποι + στατιστικά + ώρες εργασίας ✅ DONE

Ολοκλήρωση μισοτελειωμένου (το migration 022 είχε ήδη στήλη `type`, αλλά το UI δεν την
άνοιγε & το `submitOff` δεν περνούσε `type` → mismatch).
- **4 τύποι άδειας** (επιλογέας chips στη φόρμα): Ρεπό (μπλε), Άδεια (χρυσό), Αναρρωτική
  (κόκκινο), **Άνευ αποδοχών** (μωβ). `addTimeOff` whitelist + `unpaid`. page φορτώνει `type`·
  optimistic insert + badge τύπου σε κάθε γραμμή λίστας. fmtRange: αφαιρέθηκε το «· ρεπό»
  suffix (ο τύπος φαίνεται πια ως badge)· πολυήμερο full-day δείχνει «N μέρες».
- **Κάρτα «Σύνοψη»** (πάνω-πάνω, νέο component state/useMemo):
  - **Ώρες εργασίας** Εβδομάδα/Μήνας/Έτος — προβολή του εβδομαδιαίου ωραρίου στις πραγματικές
    ημερομηνίες της περιόδου, **μείον** την επικάλυψη των αδειών με το ωράριο (per-day, tz-aware
    overlap). **Toggle** «Αφαίρεση πληρωμένων αδειών/ρεπό»: off = μετρούν ως δουλειά (default),
    on = αφαιρούνται· **άνευ αποδοχών αφαιρείται πάντα**.
  - **Άδειες έτους {τρέχον}** — 4 κουτάκια (μέρες/τύπο για ολόκληρες μέρες· «+Xώ μερικώς» για
    μερικές ώρες). Περίοδος = τρέχον ημερολογιακό έτος.
- tsc καθαρό.

**User decisions:** 4 τύποι (πρόσθεσε άνευ αποδοχών)· ώρες = επιλογή ιδιοκτήτη αν μετρούν οι
πληρωμένες άδειες (άνευ αποδοχών ποτέ)· περίοδος αδειών = τρέχον έτος.

---

## 2026-06-16 — Προσωπικό: ατομικά ωράρια & άδειες/ρεπό ✅ DONE

Αποφάσεις: πλήρες (ωράρια + άδειες)· ολόκληρες μέρες + μερικές ώρες· προειδοποίηση όχι block.
- **migration 022**: `staff_hours` (per-staff weekly· ANY row = custom schedule, μέρα χωρίς row =
  ρεπό· κανένα = κληρονομεί κατάστημα) + `staff_time_off` (interval, reason). RLS public/member/
  owner. `get_staff_busy_intervals` **UNION staff_time_off** → άδειες μετράνε ως busy παντού.
  `create_booking` ελέγχει & time-off (specific reject + capacity). Types updated.
- **UI** `dashboard/staff/[id]` (link «Ωράριο & άδειες» από κάρτα): `schedule-editor.tsx` —
  εβδομαδιαίο ωράριο (toggle «Προσαρμοσμένο», per-day windows split shifts, prefill από
  κατάστημα) + λίστα αδειών (προσθήκη ολόκληρες μέρες ή μερικές ώρες· **προειδοποίηση** αν
  υπάρχουν ραντεβού στο διάστημα). actions: saveStaffHours/addTimeOff/deleteTimeOff (owner-only).
- **Online availability** (`computeStaffAwareSlots`): per-staff `worksAt` (custom hours ή inherit)·
  time-off ήδη ως busy. `getAvailableSlots` φορτώνει staff_hours. → Specific & «Οποιοσδήποτε»
  σέβονται ωράριο+ρεπό.
- **Calendar (Day view)**: στήλη υπαλλήλου σκιάζει ώρες εκτός ατομικού ωραρίου (closed tint) +
  **time-off blocks** (κίτρινες ριγέ ζώνες με αιτία). page φορτώνει staffSchedule + staffTimeOff.
- Seed: time-off Γιώργος σήμερα 13:00-21:00. tsc καθαρό· book 200.

**Future:** time-off visual στο Week/Month (τώρα μόνο Day)· DB-level hours check στο create_booking.

---

## 2026-06-16 — Fix: μισά αστέρια στη συνολική βαθμολογία ✅ DONE

Public page: 4.5 έδειχνε 5 γεμάτα αστέρια (λόγω `Math.round(reviewAvg)`). `Stars` →
fractional fill (overlay clipped width ανά αστέρι)· overall περνά `reviewAvg` ως έχει. tsc καθαρό· 200.

---

## 2026-06-16 — Κριτικές: επεξεργασία (πελάτης + ιδιοκτήτης) ✅ DONE

- **migration 021**: RPC `update_review(review_id, rating, comment)` (μόνο ο πελάτης-ιδιοκτήτης
  της κριτικής, ενημερώνει rating+comment). Types updated.
- **Πελάτης** `/account`: η κριτική δείχνει πλέον **«Επεξεργασία»** → ίδιο modal προ-συμπληρωμένο
  → `updateReview`. `createReview` επιστρέφει id ώστε να επεξεργαστείς και μόλις-υποβληθείσα.
  `ReviewButton` δέχεται `existingReview {id,rating,comment}` (αντί μόνο rating).
- **Ιδιοκτήτης**: η απάντηση ήταν ήδη επεξεργάσιμη (openReply προ-συμπληρώνει)· το κουμπί δείχνει
  «Επεξεργασία απάντησης» + χρυσό όταν υπάρχει απάντηση.
- tsc καθαρό.

---

## 2026-06-16 — Κριτικές ανά υπάλληλο ✅ DONE (end-to-end)

Αποφάσεις: σχόλιο προαιρετικό· ξεχωριστή σελίδα «Κριτικές»· απάντηση ιδιοκτήτη ναι.
- **migration 020**: `reviews`(business_id, staff_id, staff_name snapshot, booking_id UNIQUE,
  customer_id, customer_name snapshot, rating 1-5, comment, business_reply, status
  published|hidden) + RLS (public published / customer own / member read / owner update).
  RPC `create_review(booking_id,rating,comment)` (own + completed booking, one/booking,
  snapshots). View `staff_ratings` (avg+count published, security_invoker). Types updated.
- **Πελάτης** `/account`: completed bookings → «Άσε κριτική» (αστέρια + προαιρετικό σχόλιο,
  modal) → `createReview` action. Δείχνει «Αξιολόγησες» αν υπάρχει.
- **Owner** `dashboard/reviews` (νέο, sidebar «Κριτικές» ⭐): λίστα + φίλτρο ανά υπάλληλο +
  **απόκρυψη/εμφάνιση** + **απάντηση** (inline). `setReviewStatus`/`replyToReview` actions.
  Μέσος όρος ⭐ ανά κάρτα στο «Προσωπικό» (από `staff_ratings`).
- **Δημόσια** `/b/[slug]`: section «Κριτικές» (overall avg + count, chips ανά υπάλληλο,
  λίστα δημοσιευμένων με απάντηση), σέβεται `show_reviews`.
- Seed: 2 κριτικές (Γιώργος 5.0, Νίκος 4.0). tsc καθαρό· public 200· advisors καμία νέα.

---

## 2026-06-16 — Booking: skip βήματος ατόμου με 1 υπάλληλο ✅ DONE

- `showStaffStep` ≥1 → **≥2**. `pickService`: 1 ικανός → auto-assign σε εκείνον + κατευθείαν
  «Ώρα»· 0 → datetime (any/business-level)· ≥2 → βήμα επιλογής. tsc καθαρό· 200.

**Future (user):** άδειες/ρεπό προσωπικού (staff time-off) → θα επηρεάζουν διαθεσιμότητα.

---

## 2026-06-16 — Booking: ξεκινά πάντα από «Διάλεξε υπηρεσία» ✅ DONE

User: στο refresh το πήγαινε στο 2ο βήμα με προεπιλεγμένη υπηρεσία. Αιτία: η business page
συνέδεε `/book?service=ID` → preselect + skip· στο refresh ίδιου URL ξαναπροεπιλεγόταν.
- `booking-flow.tsx`: αφαιρέθηκε όλη η preselection (preselected/preCap)· `serviceId=""`,
  `step="service"` πάντα. Datetime «Πίσω» → staff (αν showStaffStep) αλλιώς service.
- `book/page.tsx`: αφαιρέθηκε searchParams/preselectedServiceId prop.
- `b/[slug]/page.tsx`: το per-service «Κλείσε» → `/book` (χωρίς `?service=`).
- Αποτέλεσμα: η ροή ξεκινά **πάντα** από Υπηρεσία, predictable σε refresh/direct link.
- tsc καθαρό· booking page 200.

---

## 2026-06-16 — Booking: phone prefill + κεντράρισμα όλων των σταδίων ✅ DONE

- **Phone prefill σαν το όνομα**: `submitBooking` αποθηκεύει το (normalized) τηλέφωνο στο
  `profiles.phone` μετά την κράτηση, **μόνο αν είναι κενό** (`.is("phone", null)`). RLS
  `profiles_self_update` (auth.uid()=id) το επιτρέπει. Επόμενη κράτηση → προσυμπληρώνεται
  (το `defaultPhone` φορτώνεται ήδη). Λόγος που φαινόταν κενό: το προφίλ δεν είχε τηλέφωνο
  (δεν ζητείται στο signup).
- **Κεντράρισμα ΟΛΩΝ των σταδίων** (ομοιομορφία): service/staff/auth/confirm → headings
  `text-center`, περιεχόμενο `mx-auto max-w-md` (cards κρατούν εσωτερικό layout). Το datetime
  ήταν ήδη κεντραρισμένο.
- tsc καθαρό· booking page 200.

---

## 2026-06-16 — Booking flow fixes (staff πάντα, fetch bug, κεντράρισμα) ✅ DONE

User feedback:
- **Πάντα βήμα «Άτομο»**: `showStaffStep` threshold ≥2 → **≥1** (κάθε υπηρεσία με ≥1 ικανό
  δείχνει «Οποιοσδήποτε» + κάρτες). pickService δεν auto-pick· staffId init = null.
- **Bug «Δεν υπάρχουν ώρες» στο σήμερα με Οποιοσδήποτε**: αιτία — το slots `useEffect` δεν
  ξανάτρεχε όταν date/staffId δεν άλλαζαν τιμή (ήταν ήδη σήμερα/null) μετά το `setSlots([])`.
  Fix: το fetch δένεται στο **step** (`if (step !== "datetime") return` + `step` στα deps),
  ώστε κάθε είσοδος στην «Ώρα» να ξαναϋπολογίζει. Αφαιρέθηκε το χειροκίνητο `setSlots([])`.
- **Κεντράρισμα**: heading/subtitle `text-center`, calendar `mx-auto`, slots `mx-auto max-w-lg
  text-center`.
- tsc καθαρό· booking page 200.

---

## 2026-06-16 — Online κράτηση: μηνιαίο ημερολόγιο επιλογής μέρας ✅ DONE

Αντικατάσταση της λωρίδας 14 ημερών με πλήρες μηνιαίο calendar στο `booking-flow.tsx`.
- **Σημερινή μέρα προεπιλεγμένη** (`date` init = `todayIso()`· reset σε σήμερα όταν αλλάζει
  staff). Grid Δευτέρα-first (`CAL_WEEKDAYS`), leading blanks, παρελθόντικες μέρες disabled,
  σήμερα ring, επιλεγμένη χρυσή.
- **Πλοήγηση μηνών** ◀ ▶ (`cur` state {y,m})· prev disabled στον τρέχοντα μήνα, next ελεύθερο
  (επόμενοι μήνες). `selectedDateLabel` υπολογίζεται από το date string (όχι από λίστα ημερών).
- Αφαιρέθηκε το `nextDays`. tsc καθαρό· booking page 200.

---

## 2026-06-16 — Online κράτηση staff-aware ✅ DONE

Ο πελάτης (online) επιλέγει υπάλληλο ή «Οποιοσδήποτε διαθέσιμος» + DB-level guards.
- **migration 019**: νέο RPC `get_staff_busy_intervals` (staff_id+ranges, SECURITY DEFINER,
  anon). Recreate `create_booking(..., p_staff_id default null)`: validate staff bookable+capable,
  **per-staff conflict** (staff chosen) ή **capacity** (any: capable bookable staff − busy −
  unassigned ≥ 1), set `no_staff_preference = (staff is null)`. Regenerated types (RPC sig + νέο RPC).
- **`lib/availability.ts` → `computeStaffAwareSlots`**: specific staff free, ή any = ελεύθερος
  ικανός μείον unassigned. `book/actions.ts getAvailableSlots(staffId)` (get_staff_busy_intervals
  + capable bookable staff μέσω service_staff embed). `submitBooking` περνά `p_staff_id`.
- **booking-flow.tsx**: νέο βήμα **«Άτομο»** (μόνο όταν ≥2 ικανοί· «Οποιοσδήποτε» πρώτο +
  κάρτες φωτό/όνομα/ειδικότητα). Επιλογή → staff-aware ώρες. StepBar +«Άτομο». Confirm + done
  δείχνουν το άτομο. Auto-skip βήματος όταν 0/1 ικανός (0→any, 1→αυτός). `book/page.tsx` φορτώνει
  bookable staff + serviceStaff map.
- **Verify**: migration ok, `get_staff_busy_intervals` → 8 rows, public booking page 200, tsc καθαρό.

**Πλέον το overbooking κλείνεται και από την online μεριά** (DB RPC). Pending: εφαρμογή
ωραρίου-check μέσα στο RPC (τώρα στηρίζεται στη μηχανή διαθεσιμότητας) — προαιρετικό hardening.

---

## 2026-06-16 — `no_staff_preference` column (μένει & μετά την ανάθεση) ✅ DONE

Supabase MCP **επανήλθε** → καθαρή λύση.
- **migration 018**: `bookings.no_staff_preference boolean not null default false` + backfill
  (`true` όπου `staff_id is null`). Regenerated types (`lib/supabase/types.ts`).
- `createWalkin`: θέτει `no_staff_preference = !staffId`. `moveBooking`/`assignTo` **δεν** το
  αλλάζουν → η σημαία διατηρείται μετά την ανάθεση.
- `CalBooking.noStaffPreference` (page select + map). Popover: η ένδειξη «Χωρίς προτίμηση
  υπαλλήλου» (Info, gold) δείχνει όταν `noStaffPreference` **ανεξάρτητα** αν έχει ανατεθεί·
  τα κουμπιά «Ανάθεση σε» μόνο όταν unassigned.
- Επιβεβαίωση δεδομένων: unassigned→true, assigned→false. tsc καθαρό· authenticated 200
  (μετά από restart dev server λόγω EPIPE wedge).

**Online side (pending):** όταν χτιστεί η online κράτηση πελάτη, να θέτει `no_staff_preference=true`
στο «οποιοσδήποτε διαθέσιμος» (DB RPC `create_booking` / νέο RPC).

---

## 2026-06-16 — «Χωρίς προτίμηση υπαλλήλου» ένδειξη ✅ DONE

- Popover unassigned: γραμμή με Info icon «Ο πελάτης δεν έχει προτίμηση υπαλλήλου» (πάνω
  από «Ανάθεση σε»).
- Day ghost: 2η γραμμή → «χωρίς προτίμηση · κλικ για ανάθεση» (italic).
- tsc καθαρό.

---

## 2026-06-16 — Unassigned: προτεινόμενοι υπάλληλοι + ανάθεση ✅ DONE

Για «Χωρίς ανάθεση»: εμφάνιση διαθέσιμων υπαλλήλων & ανάθεση με ένα κλικ.
- `CalBooking.serviceId` (page select + map) ώστε να ξέρουμε ποια υπηρεσία → ποιοι staff
  μπορούν (service_staff).
- `recommendedStaffFor(b)`: staff που (α) κάνουν την υπηρεσία ΚΑΙ (β) είναι ελεύθεροι όλο το
  διάστημα (κανένα overlapping active booking). `assignTo(b,staffId)` → `moveBooking`
  (ίδιος χρόνος, set staff· περνά conflict+capacity). Optimistic.
- **Popover** unassigned booking: section «Ανάθεση σε» με κουμπιά ανά διαθέσιμο υπάλληλο
  (χρωματιστή κουκίδα)· αν κανένας → «Κανένας διαθέσιμος υπάλληλος αυτή την ώρα».
- **Day view ghosts**: το unassigned booking εμφανίζεται ως faint dashed «σκιά» στις στήλες
  των διαθέσιμων υπαλλήλων (παραμένει & στο «Χωρίς ανάθεση») → βλέπεις ποιος μπορεί να το
  αναλάβει· κλικ στη σκιά = ανάθεση σε εκείνον. Καλύπτει το σενάριο «9:45 και οι 2 κλεισμένοι»
  → καμία σκιά + popover «κανένας διαθέσιμος».
- tsc καθαρό· authenticated GET 200.

---

## 2026-06-16 — Phase 4.5: Resize διάρκειας ✅ DONE (Phase 4 calendar ολοκληρώθηκε)

Τράβηγμα κάτω άκρης κάρτας → αλλαγή διάρκειας.
- **`calendar/actions.ts` → `resizeBooking`** (owner/manager): κρατά start, νέο end (min 5′),
  re-check ωραρίου + staff conflict (exclude self) + capacity. Update ends_at.
- **calendar-client**: resize handle (`h-2.5` strip + grip στο bottom, `cursor-ns-resize`,
  `pointerdown` stopPropagation ώστε να μην ξεκινά move). `resizeRef` + `resizeState` →
  **live** ύψος/ώρα λήξης κατά το σύρσιμο (gold ring). Drop → optimistic + `resizeBooking`·
  αποτυχία → center toast + refresh. Snap 15′, clamp [start+15′, ωράριο].
- Ξεχωριστό window pointer-effect από το move· suppressClickRef αποτρέπει openNew.
- tsc καθαρό· authenticated GET 200.

**Phase 4 (Ημερολόγιο) ΟΛΟΚΛΗΡΩΘΗΚΕ:** Day/Week/Month, walk-in quick add, status actions
(+restore), drag&drop move (με confirmation), resize, staff columns/φίλτρο, business hours,
conflict + capacity guards (app-level), center toasts. Premium dark UI, χρυσά accents.

**Εκκρεμότητες/μελλοντικά:** (α) μετάφραση των app-level guards σε **DB RPC** (όταν επανέλθει
Supabase MCP) — και staff-aware **online** availability/`create_booking`. (β) Reviews ανά
υπάλληλο (Phase 8 spec, αποφασισμένο). (γ) Month: chips χωρίς drag (μόνο preview).

---

## 2026-06-16 — Center-screen toast (αντί alert) ✅ DONE

Οι απορρίψεις drag/status έβγαζαν browser `alert()`. Νέο `toast` state + κεντραρισμένο
overlay (fixed inset-0 flex center, danger border + AlertCircle, αυτόματη απόκρυψη 4.5s +
κουμπί X). Αντικαταστάθηκαν τα `alert()` σε `confirmMove` (π.χ. capacity/conflict/ωράριο) και
`changeStatus`. Η φόρμα νέου ραντεβού κρατά inline error (newErr) γιατί το modal είναι ήδη ανοιχτό.
tsc καθαρό.

---

## 2026-06-16 — Capacity guard (anti-overbooking) ✅ DONE

User εντόπισε: «Χωρίς ανάθεση» ραντεβού 9:45 ενώ **και οι 2 υπάλληλοι** απασχολημένοι →
κανείς να εξυπηρετήσει. Νέος έλεγχος χωρητικότητας.
- `actions.ts → peakOverCapacity(start,end,newStaffId,exclude?)`: capacity = πλήθος active
  staff. Φέρνει overlapping active bookings, προσθέτει το νέο, και σε κάθε boundary υπολογίζει
  concurrency = (distinct busy staff) + (unassigned count). Αν peak > capacity → overbooking.
- Καλείται μετά τον per-staff conflict σε **createWalkin** + **moveBooking** → μήνυμα
  «Δεν υπάρχει διαθέσιμο προσωπικό για αυτή την ώρα — όλοι οι υπάλληλοι είναι κλεισμένοι.»
- Έτσι ένα unassigned δεν περνά αν δεν υπάρχει ελεύθερος υπάλληλος για όλο το διάστημα·
  ομοίως δεν μετακινείται drag σε γεμάτη ώρα.
- tsc καθαρό.

⚠️ Καλύπτει το **dashboard** (walk-in + drag). Το **online customer booking** (RPC
`create_booking` + `availability.ts` business-level) χρειάζεται την ίδια λογική σε DB/engine →
pending μέχρι να επανέλθει Supabase MCP. Το ήδη υπάρχον 9:45 booking (προ-ελέγχου) μένει·
ακύρωσέ το/ανάθεσέ το.

---

## 2026-06-16 — Week cards show staff (capacity view) ✅ DONE

Στην εβδομαδιαία οι κάρτες δείχνουν πλέον **όνομα υπαλλήλου** (όχι πελάτη/τηλ/υπηρεσία) →
ξεκάθαρη εικόνα ποιος είναι απασχολημένος & πότε / αν υπάρχει διαθέσιμο προσωπικό για νέο
ραντεβού. Card content branch σε `isWeek` (time + `staffName(b.staffId)`)· title επίσης
staff-focused. Day view αμετάβλητη (πλήρεις λεπτομέρειες). Χρώμα κάρτας = staff color. tsc καθαρό.

---

## 2026-06-16 — Phase 4.4c: Move confirmation ✅ DONE

Το drop **δεν εφαρμόζεται πια αμέσως** — ανοίγει modal επιβεβαίωσης (αποφυγή κατά λάθος
μετακίνησης). Δείχνει **Από → Προς**: μέρα + ώρα + άτομο (η αρχική θέση παραμένει μέχρι
επιβεβαίωση, ώστε να φαίνεται πού ήταν). `pendingMove` state· `confirmMove` εφαρμόζει
optimistic + `moveBooking`. «Άκυρο» αφήνει το ραντεβού στη θέση του. Unchanged drop → καμία
επιβεβαίωση. tsc καθαρό.

---

## 2026-06-16 — Phase 4.4b: Drag visual feedback ✅ DONE

- Όταν σέρνεις: η **αρχική κάρτα ξεθωριάζει** (`opacity-30` + gold ring) σαν κενή θέση.
- Το **ghost** έγινε κανονικό μίνι-αντίγραφο της κάρτας (χρώμα booking, ώρα/όνομα/υπηρεσία,
  ελαφρά rotate-2 + scale-105 + shadow-2xl + gold ring) που ακολουθεί τον κέρσορα →
  «σηκωμένο» αίσθημα. `dragPreview` κρατά πλέον booking + accent.
- tsc καθαρό.

---

## 2026-06-16 — Phase 4.2(Month) + 4.4 (Drag & drop) ✅ DONE

### Μηνιαία προβολή
- `lib/calendar.ts`: `startOfMonthStr`, `addMonthsStr`, `monthGridDays` (42 κελιά, 6 εβδ.).
- `page.tsx`: `?view=month` → 42ήμερο grid range· skip time-windows (διαφορετικό layout).
- `calendar-client`: month branch — grid 7×6, headers ημερών, αριθμός ημέρας (σήμερα σε
  χρυσό κύκλο), έως 3 chips/μέρα (ώρα + όνομα, χρώμα status/υπηρεσίας) + «+N ακόμη», dim
  εκτός-μήνα, κλικ σε μέρα → Ημερήσια. Nav ±μήνα, label «Μήνας Έτος». Switcher «Μηνιαία»
  πλέον ενεργό.

### 4.4 Drag & drop reschedule (day + week)
- **`calendar/actions.ts` → `moveBooking`** (owner/manager): κρατά διάρκεια, re-check
  **ωραρίου** + **staff conflict** (exclude self), update starts/ends/staff_id. (App-level —
  DB RPC guard όταν επανέλθει Supabase MCP.)
- **calendar-client**: pointer-based drag (όχι HTML5 DnD). PointerDown σε κάρτα → session·
  move > 5px → drag (ghost δείχνει νέα ώρα)· κάθετα = ώρα (snap 15′), οριζόντια = άλλος
  υπάλληλος (day) / άλλη μέρα (week). `document.elementFromPoint` + `[data-colbody]` για
  target column. Drop → optimistic update + `moveBooking`· σε αποτυχία alert + `router.refresh`.
  Κλικ χωρίς drag → άνοιγμα popover (όπως πριν)· `suppressClickRef` αποτρέπει το άνοιγμα
  φόρμας νέου ραντεβού μετά από click/drag σε κάρτα.
- tsc καθαρό· authenticated GET 200 (day/week/month compile).

**Επόμενο:** 4.5 resize διάρκειας (drag κάτω άκρης). Όταν επανέλθει Supabase MCP:
SECURITY DEFINER RPC για conflict (αντικατάσταση app-level ελέγχων), + reviews (Phase 8 spec).

---

## 2026-06-16 — Phase 4.2: Week view ✅ DONE

Ενεργοποίηση «Εβδομαδιαία». **Γενίκευση** του CalendarClient αντί για duplication: ένα
`ColumnDef` abstraction οδηγεί και τις δύο όψεις (στήλες = staff για day, = 7 μέρες για week).
Έτσι κάθε μελλοντικό visual tweak ισχύει αυτόματα και στις δύο.

- **lib/calendar.ts**: `startOfWeekStr` (Δευτέρα), `weekDays(date)→7`, `localDateInZone(iso,tz)`.
- **page.tsx**: `?view=day|week`. Week → 7ήμερο εύρος (Δευ–Κυρ), fetch bookings+closures
  εύρους, per-day `buildDayWindow` → `dayMeta` (open/isClosed ανά μέρα) + combined `win`
  (min start / max end ώστε να ευθυγραμμίζονται οι στήλες). Πάντα περνά `view/days/dayMeta`.
- **calendar-client.tsx** (generalized):
  - `columns`: day = staff(+«Χωρίς ανάθεση»)· week = 7 μέρες (header: ημέρα + αριθμός,
    σημερινή σε χρυσό + ελαφρύ tint στήλης).
  - Grouping: day κατά `staffId`, week κατά τοπική ημερομηνία. Accent booking: service color
    → staff color (lookup) → default.
  - **Staff filter** (μόνο week, client-side): «Όλο το προσωπικό» ή συγκεκριμένος.
  - Per-column closed tint (ανά μέρα ωράριο). Now-line μόνο στη σημερινή στήλη.
  - View switcher: Ημερήσια/Εβδομαδιαία πραγματικά links (`?view=`), ενεργή χρυσό διάφανο.
    Date nav ±1 (day) / ±7 (week)· label = μέρα ή εύρος εβδομάδας. Μηνιαία ακόμη «Σύντομα».
  - **New-booking modal**: προστέθηκε επιλογή **Άτομο** (staff select) — δουλεύει και στις δύο
    όψεις· στο week το κλικ σε κενό προ-επιλέγει το φιλτραρισμένο άτομο/ημέρα.
- tsc καθαρό· authenticated GET 200 (day & week).

**Επόμενο:** Μηνιαία προβολή · 4.4 drag&drop reschedule (+ staff-aware conflict RPC όταν
επανέλθει Supabase MCP) · 4.5 resize.

---

## 2026-06-15 — Phase 4.3d: Toolbar 3-col + view switcher (UI) ✅ DONE

- Μπάρα σε `grid grid-cols-3`: **αριστερά** view switcher, **κέντρο** ◀ ημερομηνία ▶
  (πραγματικά κεντραρισμένο), **δεξιά** date picker.
- View switcher (segmented): **Ημερήσια** ενεργή με χρυσό διάφανο φόντο (`bg-gold/15`).
  Εβδομαδιαία/Μηνιαία = disabled «Σύντομα» (placeholder μέχρι 4.2/Month).
- tsc καθαρό.

**Επόμενο:** 4.2 — υλοποίηση Week view (ενεργοποίηση «Εβδομαδιαία»), μετά Μηνιαία.

---

## 2026-06-15 — Phase 4.3c: Toolbar redesign ✅ DONE

- Αφαιρέθηκε το κουμπί «Σήμερα».
- Βελάκια ◀ ▶ εκατέρωθεν της ημερομηνίας με **χρυσό φόντο** (solid gold, μαύρο icon).
- Σημερινή ημερομηνία ξεχωρίζει με **χρυσό διάφανο φόντο** (`bg-gold/15` + gold text).
  Όταν δεν είναι σήμερα, η ετικέτα είναι Link στο `base` (επιστροφή στο σήμερα) — διατηρεί
  το quick-jump χωρίς ξεχωριστό κουμπί. Date picker (δεξιά) παραμένει για άλμα σε οποιαδήποτε.
- tsc καθαρό.

---

## 2026-06-15 — Phase 4.3b: New-booking polish (πλάτος + τηλέφωνο) ✅ DONE

- Modal `w-[340px]→w-[400px]` (+ `max-w-[calc(100vw-2rem)]`). Time/Service grid
  `grid-cols-2 → grid-cols-[1fr_2fr]` (η Υπηρεσία παίρνει διπλό πλάτος) + `truncate` στο
  select (ellipsis «…» για μεγάλα ονόματα υπηρεσιών).
- **Phone validation**: το τηλέφωνο παραμένει προαιρετικό, αλλά αν συμπληρωθεί περνά από
  `normalizePhone` (libphonenumber-js, default GR) στο `createWalkin` → απορρίπτει
  «asdf»/μη έγκυρα με «Μη έγκυρος αριθμός τηλεφώνου», αλλιώς αποθηκεύει E.164. Το action
  επιστρέφει το normalized phone → optimistic card consistent.
- tsc καθαρό.

---

## 2026-06-15 — Phase 4.3: Walk-in quick add (click κενό slot) ✅ DONE

Κλικ σε κενό σημείο στήλης → φόρμα νέου ραντεβού → δημιουργία με ανάθεση υπαλλήλου.
**Χωρίς migration** (Supabase MCP αποσυνδεδεμένο) — γίνεται με server action που γράφει
απευθείας (περνά RLS με `customer_id = owner uid` μέσω `bookings_customer_insert`).

- **`calendar/actions.ts` → `createWalkin`** (owner/manager only): validate service+staff
  ανήκουν στο business· ends = start + duration· **έλεγχος ωραρίου** (`isWithinOpenHours` —
  πρέπει να τελειώνει εντός ωραρίου)· **staff-level conflict** (overlap query ίδιου staff,
  status pending/confirmed/completed)· insert status=confirmed, source=dashboard, snapshots.
  Επιστρέφει id/endsAtIso/serviceName/color. (DB-level RPC guard → Phase 4.4.)
- **page.tsx**: φορτώνει active services (id,name,duration,price,color) + `service_staff`
  → `staffServices` map· pass στο client.
- **calendar-client**: click column body → `openNew` (snap στα 15′, υπολογισμός ώρας από
  click Y) → modal (ώρα time-input, υπηρεσία filtered ανά staff, διάρκεια+λήξη preview,
  όνομα*/τηλέφωνο/σημειώσεις) → `createWalkin` → optimistic add στο `rows`. Cards
  `stopPropagation`· closed tint `pointer-events-none`· cursor-copy στο body.
- Unassigned column: όλες οι υπηρεσίες διαθέσιμες (καμία ανάθεση staff).
- tsc καθαρό· dev log: authenticated GET 200 στο /dashboard/calendar.

**Επόμενο:** 4.2 Week view + φίλτρα · 4.4 drag&drop reschedule + staff-aware conflict RPC
(όταν επανέλθει το Supabase MCP) · 4.5 resize.

---

## 2026-06-15 — Phase 4.1e: Status colors + keep visible + restore ✅ DONE

User: τα completed/no_show/cancelled να ΜΕΝΟΥΝ στο ημερολόγιο με χρωματιστό διάφανο φόντο.
- **page.tsx**: αφαιρέθηκε το `.in("status", ACTIVE_STATUSES)` → φορτώνονται ΟΛΑ τα statuses
  της ημέρας (τα ακυρωμένα ξαναεμφανίζονται).
- **calendar-client**: `STATUS_STYLE` → completed=πράσινο `rgba(16,185,129,.18)`,
  no_show=πορτοκαλί `rgba(245,158,11,.18)`, cancelled=κόκκινο `rgba(239,68,68,.18)`
  (translucent bg + matching border). pending/confirmed κρατούν service/staff color.
  cancelled → `line-through`. `changeStatus` δεν φιλτράρει πια (μόνο update status).
- **Popover**: νέο κουμπί **«Επαναφορά (ενεργό)»** (→ confirmed) όταν status is resolved·
  τα 3 κουμπιά disabled όταν ταιριάζουν με το τρέχον status· statusLabel + no_show/cancelled.
- tsc καθαρό.

⚠️ **Supabase MCP αποσυνδέθηκε** σε αυτό το session → δεν έγινε seed νέων demo bookings
(δεν υπάρχει service-role key τοπικά, μόνο publishable → RLS μπλοκάρει anon insert). Λύση
που δόθηκε: τα ακυρωμένα ξαναφαίνονται (κόκκινα) → «Επαναφορά» τα ενεργοποιεί. Για fresh
seed χρειάζεται reconnect του Supabase MCP.

---

## 2026-06-15 — Phase 4.1d: Booking status actions + wider columns ✅ DONE

- **Φαρδύτερες στήλες**: `COL_WIDTH 200→248` για να χωράνε όλες οι λεπτομέρειες.
- **Κουμπιά κατάστασης ανά ραντεβού**: κλικ σε κάρτα → popover (anchored σε click x/y,
  clamped στο viewport) με στοιχεία (ώρα/όνομα/τηλέφωνο ως `tel:` link/υπηρεσία/status)
  + 3 ενέργειες: **Ολοκληρώθηκε** (emerald), **Δεν εμφανίστηκε** (amber), **Ακυρώθηκε** (red).
  - Επαναχρήση `updateBookingStatus` από `dashboard/bookings/actions.ts` (πρόσθεσα revalidate
    του calendar path εκεί). Optimistic: completed → μένει & μαρκάρεται (✓ + opacity-70)·
    no_show/cancelled → φεύγει από το grid (το server query τα φιλτράρει ούτως ή άλλως).
    On error → alert + `router.refresh()`.
  - `bookings` lifted σε `rows` state (`useEffect` sync με props για date navigation).
- tsc καθαρό· dev server OK (calendar 307 σε curl = auth redirect).

---

## 2026-06-15 — Phase 4.1c: Calendar polish #2 (user feedback) ✅ DONE

- **Τηλέφωνο πελάτη στην κάρτα** (με `Phone` icon, truncate → μένει εντός ορίων):
  `CalBooking.customerPhone`, select `customer_phone` στο page, εμφάνιση στην κάρτα.
  Σειρά γραμμών: ώρα / όνομα / τηλέφωνο / υπηρεσία. `compact` (<64px) → τηλ·υπηρεσία
  σε μία γραμμή. `HOUR_HEIGHT 90→100` για να χωράνε. Demo bookings πήραν τηλέφωνα.
- **«Χωρίς ανάθεση» πάντα ορατή** (όχι μόνο όταν υπάρχουν unassigned bookings) — πελάτης
  μπορεί να κλείσει χωρίς να επιλέξει άτομο. Empty-state τώρα στο `staff.length === 0`.
- **Διαχωριστικό** στη στήλη «Χωρίς ανάθεση»: `border-r` + ελαφρύ `bg-surface/20`.
- **Συνεπές εικονίδιο/στοίχιση**: η «Χωρίς ανάθεση» χρησιμοποιεί `Users` icon στον ίδιο
  size-7 κύκλο (ίδιο μέγεθος/στοίχιση με τα avatar υπαλλήλων), αντί για γράμμα.
- tsc καθαρό.

---

## 2026-06-15 — Phase 4.1b: Calendar polish (user feedback) ✅ DONE

Feedback μετά το πρώτο screenshot:
- **Πρώτη ώρα (09:00) κρυβόταν** κάτω από την κεφαλίδα → νέο `TOP_PAD=12` offset σε
  hour-rail labels, gridlines (backgroundPosition), closed tint, now-line, booking cards.
  `bodyHeight = gridHeight + TOP_PAD + 12`.
- **Δεν φαινόταν η υπηρεσία στις κοντές κάρτες (30′)** → `HOUR_HEIGHT 64→90` (30′ = 45px).
  Κάρτες: πάντα γραμμή ώρας· `compact` (<54px) → όνομα · υπηρεσία σε μία γραμμή· αλλιώς
  3 γραμμές (ώρα / πελάτης / υπηρεσία).
- **Κανόνας ωραρίου στη δημιουργία** (user): αν το κατάστημα κλείνει 17:00, υπηρεσία 45′
  δεν επιτρέπεται με έναρξη 16:30 (τέλος 17:15 > κλείσιμο). → Προστέθηκε helper
  `isWithinOpenHours(startMin,endMin,win)` στο `lib/calendar.ts` έτοιμος για 4.3/4.4/4.5.
  Σημείωση: το **online customer booking ΗΔΗ** το τηρεί (`availability.ts`:
  `t + durationMs <= closeUtc`). Θα μπει ο ίδιος έλεγχος στα walk-in/drag/resize RPCs.
- tsc καθαρό.

---

## 2026-06-15 — Phase 4.1: Calendar Day view (read-only) ✅ DONE

Πρώτη λειτουργική όψη ημερολογίου — ημερήσια, στήλες ανά υπάλληλο, read-only.

**Code:**
- `lib/calendar.ts` (pure, reuse availability.ts tz helpers): `HOUR_HEIGHT=64`, `PX_PER_MIN`,
  `SNAP_MIN=15`. `minutesFromMidnight`, `todayInZone`, `addDaysStr`, `dayRangeUtc`,
  `buildDayWindow` (window από business_hours/closures + bookings, fallback 09–21, σπαστό
  ωράριο = πολλαπλά open intervals), `closedSegments` (συμπλήρωμα για σκίαση κλειστών),
  `layoutColumn` (overlap → side-by-side lanes, greedy interval coloring), `hourMarks`, `minLabel`.
- `dashboard/calendar/page.tsx` (server): διαβάζει `?date=` (default σήμερα στο tz),
  φορτώνει active staff + business_hours + closures(ημέρας) + bookings(εύρους ημέρας,
  status pending/confirmed/completed) με embedded `service:services(color)`.
- `dashboard/calendar/calendar-client.tsx` (client): toolbar (◀ ▶ Σήμερα + date input +
  ελληνική ετικέτα ημέρας + badge «Κλειστά»), grid με sticky hour-rail (αριστερά) + sticky
  staff headers (avatar+όνομα), gridlines (repeating-linear-gradient), closed tint, **now
  indicator** (κόκκινη γραμμή, live tick/60s, μόνο όταν date=σήμερα), booking cards
  (απόλυτη θέση, χρώμα = service color ?? staff color, ώρα+πελάτης+υπηρεσία, dashed για
  pending). Στήλη «Χωρίς ανάθεση» όταν υπάρχουν bookings χωρίς staff. Empty state →
  link στο Προσωπικό.
- Sidebar «Ημερολόγιο» δείχνει ήδη εδώ (placeholder αντικαταστάθηκε).

**Demo data:** 4 ραντεβού σήμερα (2026-06-15) στο Barber House (Γιώργος 10:00/12:30,
Νίκος 11:00/16:00, «Ανδρικό κούρεμα» 30′) για να φαίνεται το grid.

**Verify:** tsc καθαρό. Τα μόνα dev-log errors ήταν stale «Can't resolve ./calendar-client»
(πριν δημιουργηθεί το αρχείο), resolved. Route 307 σε curl = auth redirect (ΟΚ).

**Επόμενο:** 4.2 Week view + φίλτρα staff · 4.3 walk-in quick add (click κενό slot →
create, θέτει staff_id) · 4.4 drag&drop + staff-aware conflict RPC.

---

## 2026-06-15 — Phase 4.0b: Staff avatar (φωτό) ✅ DONE

Προσθήκη φωτογραφίας ανά υπάλληλο (το `staff.avatar_url` υπήρχε ήδη από το 017).
- `staff-manager.tsx`: file input → client-side upload στο Storage bucket `business-assets`
  path `${businessId}/staff/${uuid}.${ext}` (ίδιο pattern με το logo upload του QR editor),
  getPublicUrl → preview κύκλος. Validation: image/* + ≤5MB. Κουμπί «Αλλαγή/Αφαίρεση φωτό».
- `actions.ts`: `StaffInput.avatarUrl` → insert/update `avatar_url`.
- `page.tsx`: select `avatar_url`, pass `businessId` στον manager. Λίστα δείχνει avatar
  εικόνα (αλλιώς αρχικό γράμμα στο χρώμα του).
- tsc καθαρό. Route 200/307 (307 = auth redirect σε curl, ΟΚ).

**Reviews ανά υπάλληλο — αποφάσεις (2026-06-15), υλοποίηση ΜΕΤΑ το ημερολόγιο:**
- **Timing:** μετά το calendar (χρειάζεται `bookings.staff_id` γεμάτο για per-staff attribution).
- **Ποιος:** μόνο πελάτης με ραντεβού σε status `completed` (verified, anti-spam).
- **Moderation:** auto-publish + ο ιδιοκτήτης μπορεί να κρύψει + να απαντήσει.
- **Σχέδιο schema (μελλοντικό):** `reviews(id, business_id, staff_id, booking_id UNIQUE,
  customer_id, rating 1-5, comment, business_reply, status published|hidden, created_at)`.
  Aggregate rating ανά staff (+ προαιρετικά ανά business). Εμφάνιση: σελίδα Προσωπικό
  (owner) + public page. Customer flow: /account → «Άσε κριτική» σε completed ραντεβού.

---

## 2026-06-15 — Phase 4.0: Staff foundation ✅ DONE

Πρώτο θεμέλιο για τις staff columns. Ολοκληρώθηκε.

**DB (migration `017_staff_and_service_staff`):**
- Νέος πίνακας `staff` = calendar resource (id, business_id, **user_id NULL** προαιρετικό
  login link, name, title, **color**, avatar_url, is_active, **is_bookable**, order_index,
  timestamps). Decoupled από auth → προσθέτεις άτομα χωρίς να τους καλέσεις με email.
- Νέος πίνακας `service_staff` (service_id, staff_id) PK — ποιος κάνει τι.
- **Repoint** `bookings.staff_id` FK: ήταν → `business_members.id`, τώρα → `staff.id`
  (on delete set null). Index `bookings(staff_id, starts_at)`.
- RLS (mirror των services): public read ενεργών+bookable staff ενεργών businesses·
  member read· owner/manager all. Ίδια λογική για `service_staff` μέσω parent service.
- `tg_staff_updated_at` trigger.

**Seed (Barber House):** 2 staff — **Γιώργος** (#d4a857, linked στον owner) & **Νίκος**
(#5b9bd5). Όλες οι ενεργές υπηρεσίες ανατέθηκαν και στους δύο.

**Code:**
- `app/[locale]/dashboard/staff/{page.tsx, staff-manager.tsx, actions.ts}` — CRUD
  προσωπικού + ανάθεση υπηρεσιών (chips) + επιλογή χρώματος (8-χρωμη παλέτα) +
  toggle ενεργό / online. Mirror του services-manager pattern (optimistic UI, useTransition).
- `components/dashboard/sidebar.tsx` — νέο nav item «Προσωπικό» (UserCog), μεταξύ
  Ραντεβού & QR Poster.
- `lib/supabase/types.ts` — regenerated (staff, service_staff, νέο bookings FK).

**Verify:** `npx tsc --noEmit` καθαρό. `get_advisors(security)` → καμία νέα προειδοποίηση
από τους νέους πίνακες (RLS με policies σε όλους). Pre-existing warnings μόνο.

**Επόμενο:** Φάση 4.1 — read-only Day grid με staff columns.

---

## 2026-06-15 — Phase 4: Calendar module (planning)

**Στόχος:** Fresha-style calendar στο `dashboard/calendar` (σήμερα placeholder/ComingSoon).
Απαιτήσεις: Day & Week view, staff columns, drag & drop reschedule, resize duration,
business hours, appointment conflict prevention.

### Ανάλυση υπάρχοντος (από live DB + docs)
- `bookings`: έχει ΗΔΗ `staff_id uuid NULL` (αχρησιμοποίητο), `service_id`, `starts_at`/`ends_at`
  (timestamptz), `status`, `source`, snapshots (`service_name`, `price_cents`, `customer_*`,
  `internal_notes`).
- `services`: έχει ΗΔΗ στήλη `color` (για calendar χρωματισμό), `duration_minutes`, `buffer_minutes`.
- `business_hours`: πολλαπλές γραμμές/ημέρα (split shifts), `order_index`.
- `business_members`: owner|manager|staff|receptionist → `user_id`.
- **Gaps:** ΔΕΝ υπάρχει `service_staff`, ΔΕΝ υπάρχει per-staff ωράριο, conflict είναι
  **business-level** (RPC `create_booking`), ΔΕΝ υπάρχει reschedule/resize RPC.

### Αποφάσεις (user, 2026-06-15)
1. **Staff μοντέλο:** Πλήρες multi-staff ΤΩΡΑ (service_staff, ατομικά ωράρια, πολλαπλές staff
   columns, ανάθεση staff ανά ραντεβού, staff-level conflict).
2. **Library:** Custom build — CSS grid + `@dnd-kit` + `date-fns`/`date-fns-tz`. Όχι FullCalendar
   premium (αποφυγή ετήσιου license + πλήρης έλεγχος premium styling).
3. **Grid:** 15′ snap, προεπιλεγμένη όψη **Day**.

### Σχεδιαζόμενη δομή
```
dashboard/calendar/{page.tsx, calendar-client.tsx, actions.ts}
  components/{calendar-toolbar, time-grid, staff-column, booking-card,
             new-booking-popover, now-indicator}.tsx
lib/calendar.ts   (grid math: time↔pixel, 15′ snap, overlap layout, conflict helpers)
```
Migrations (Supabase MCP): `017_service_staff`, `018_staff_hours_+_staff_color`,
`019_reschedule_resize_rpcs`, `020_staff_aware_conflict`.
Τροπ/σεις: `lib/availability.ts` (staff-aware), `lib/supabase/types.ts` (regen),
`i18n/dictionaries/{el,en}.json`, πιθανώς `services/actions.ts` (staff assignment).

### Φάσεις
- 4.1 Read-only grid (Day, staff columns, render bookings, now-line, business hours) — Μέτρια
- 4.2 Week view + toolbar + staff φίλτρα — Μέτρια
- 4.3 Walk-in quick add (click κενό slot) — Μικρή-μέτρια
- 4.4 Drag & drop reschedule + staff-aware conflict RPC + optimistic UI — Υψηλή
- 4.5 Resize duration + business-hours/closure validation — Μέτρια-υψηλή
- 4.6 Staff schema/ωράρια/χρώματα + polish — Μέτρια

**Status:** _Σχέδιο εγκρίθηκε ως προς τις 3 αποφάσεις· αναμονή τελικού «GO» πριν την κωδικοποίηση._
