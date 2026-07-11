// Data for the public "live example" storefront shown at /[locale]/demo.
// It mirrors the shape a real business would have in the database, but is
// fully static — no Supabase, no real bookings, no emails. Placeholder visuals
// are branded SVGs (see components/marketing/demo-*), swap for real photos later.

export type DemoService = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  durationMinutes: number;
  priceCents: number;
};

export type DemoHours = {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  isClosed: boolean;
  open?: string;
  close?: string;
};

export type DemoReview = {
  id: string;
  customerName: string;
  staffName: string;
  rating: number;
  comment: string;
  commentEn: string;
  reply?: string;
  replyEn?: string;
  daysAgo: number;
};

export type DemoStaff = {
  id: string;
  name: string;
  color: string;
  avg: number;
  count: number;
};

export const DEMO_SLUG = "demo";

export const demoShop = {
  name: "Barber House",
  description:
    "Κλασικό κούρεμα, περιποίηση γενιού και ζεστό ξύρισμα στο κέντρο της πόλης.",
  descriptionEn:
    "Classic cuts, beard grooming and hot-towel shaves in the heart of town.",
  addressEl: "Ερμού 24, Αθήνα, 105 63",
  addressEn: "24 Ermou St, Athens, 105 63",
  phone: "+30 210 000 0000",
  ratingAvg: 4.9,
  ratingCount: 312,
  services: [
    {
      id: "svc-1",
      name: "Ανδρικό κούρεμα",
      nameEn: "Men's haircut",
      description: "Κούρεμα με ψαλίδι & μηχανή, φινίρισμα και styling.",
      descriptionEn: "Scissor & clipper cut, finish and styling.",
      durationMinutes: 30,
      priceCents: 1500,
    },
    {
      id: "svc-2",
      name: "Κούρεμα & περιποίηση γενιού",
      nameEn: "Haircut & beard trim",
      description: "Ολοκληρωμένη περιποίηση: κούρεμα και σχηματισμός γενιού.",
      descriptionEn: "The full package: haircut plus beard shaping.",
      durationMinutes: 45,
      priceCents: 2200,
    },
    {
      id: "svc-3",
      name: "Ζεστό ξύρισμα",
      nameEn: "Hot-towel shave",
      description: "Παραδοσιακό ξύρισμα με ζεστή πετσέτα και λάδια.",
      descriptionEn: "Traditional shave with hot towel and oils.",
      durationMinutes: 30,
      priceCents: 1400,
    },
    {
      id: "svc-4",
      name: "Παιδικό κούρεμα",
      nameEn: "Kids haircut",
      description: "Υπομονετικό κούρεμα για τους μικρούς πελάτες.",
      descriptionEn: "A patient cut for the little ones.",
      durationMinutes: 20,
      priceCents: 1200,
    },
    {
      id: "svc-5",
      name: "Λούσιμο & styling",
      nameEn: "Wash & styling",
      description: "Λούσιμο, μασάζ κεφαλής και styling.",
      descriptionEn: "Wash, scalp massage and styling.",
      durationMinutes: 20,
      priceCents: 1000,
    },
  ] satisfies DemoService[],
  hours: [
    { dayOfWeek: 1, isClosed: false, open: "09:00", close: "20:00" },
    { dayOfWeek: 2, isClosed: false, open: "09:00", close: "20:00" },
    { dayOfWeek: 3, isClosed: false, open: "09:00", close: "20:00" },
    { dayOfWeek: 4, isClosed: false, open: "09:00", close: "21:00" },
    { dayOfWeek: 5, isClosed: false, open: "09:00", close: "21:00" },
    { dayOfWeek: 6, isClosed: false, open: "09:00", close: "18:00" },
    { dayOfWeek: 0, isClosed: true },
  ] satisfies DemoHours[],
  staff: [
    { id: "st-1", name: "Γιώργος", color: "#c8a24a", avg: 4.9, count: 187 },
    { id: "st-2", name: "Νίκος", color: "#7c9cb5", avg: 4.8, count: 96 },
    { id: "st-3", name: "Άλεξ", color: "#b57c9c", avg: 4.9, count: 29 },
  ] satisfies DemoStaff[],
  reviews: [
    {
      id: "rv-1",
      customerName: "Δημήτρης Κ.",
      staffName: "Γιώργος",
      rating: 5,
      comment: "Ακριβώς στην ώρα του και άψογο κούρεμα. Το κλείσιμο ραντεβού με το QR πήρε 10 δευτερόλεπτα.",
      commentEn: "Right on time and a spotless cut. Booking with the QR took 10 seconds.",
      reply: "Ευχαριστούμε Δημήτρη, σε περιμένουμε ξανά!",
      replyEn: "Thanks Dimitris, see you again soon!",
      daysAgo: 3,
    },
    {
      id: "rv-2",
      customerName: "Αντώνης Π.",
      staffName: "Νίκος",
      rating: 5,
      comment: "Το ζεστό ξύρισμα είναι άλλο επίπεδο. Πλέον κλείνω online χωρίς τηλέφωνα.",
      commentEn: "The hot-towel shave is another level. I book online now, no phone calls.",
      daysAgo: 8,
    },
    {
      id: "rv-3",
      customerName: "Στέλιος Μ.",
      staffName: "Γιώργος",
      rating: 5,
      comment: "Καθαρός χώρος, φιλικό προσωπικό. Βλέπω τη διαθεσιμότητα και διαλέγω ώρα μόνος μου.",
      commentEn: "Clean place, friendly staff. I see availability and pick my own slot.",
      daysAgo: 12,
    },
    {
      id: "rv-4",
      customerName: "Μαρία Ι.",
      staffName: "Άλεξ",
      rating: 4,
      comment: "Πήγα τον γιο μου για παιδικό κούρεμα, πολλή υπομονή. Θα ξανάρθουμε.",
      commentEn: "Took my son for a kids cut, so much patience. We'll be back.",
      daysAgo: 19,
    },
    {
      id: "rv-5",
      customerName: "Κώστας Β.",
      staffName: "Νίκος",
      rating: 5,
      comment: "Σκάναρα το QR στη βιτρίνα ενώ ήταν κλειστά και έκλεισα για το επόμενο πρωί.",
      commentEn: "Scanned the QR in the window while closed and booked for the next morning.",
      daysAgo: 24,
    },
    {
      id: "rv-6",
      customerName: "Γιάννης Θ.",
      staffName: "Γιώργος",
      rating: 5,
      comment: "Σταθερά καλό αποτέλεσμα εδώ και μήνες. Το προτείνω ανεπιφύλακτα.",
      commentEn: "Consistently great results for months now. Highly recommend.",
      daysAgo: 31,
    },
  ] satisfies DemoReview[],
} as const;
