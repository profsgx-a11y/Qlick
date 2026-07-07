/**
 * Copy engine for the per-industry SEO landing pages (`/[locale]/gia/[slug]`).
 * A quality bilingual template interpolates the category name; each page is
 * further differentiated by the real businesses it lists, so pages stay unique.
 */

export interface IndustryCopy {
  /** <h1> and document title base (without the "· Qlick" suffix). */
  heading: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  benefits: { title: string; body: string }[];
  forOwners: string;
  faqs: { q: string; a: string }[];
}

// Genitive-friendly phrasing is avoided; we use "σε {name}" which reads
// naturally for every category ("ραντεβού σε Κομμωτήρια", "σε Δερματολόγους").
export function industryCopy(
  locale: string,
  nameEl: string,
  nameEn: string,
): IndustryCopy {
  const isEl = locale !== "en";
  const name = isEl ? nameEl : nameEn;

  if (isEl) {
    return {
      heading: `Online ραντεβού σε ${name}`,
      metaTitle: `Online ραντεβού σε ${name}`,
      metaDescription: `Κλείσε online ραντεβού σε ${name} κοντά σου, 24/7 και χωρίς τηλέφωνα. Δες διαθεσιμότητα σε πραγματικό χρόνο και κλείσε με ένα κλικ μέσω Qlick.`,
      intro: `Ψάχνεις να κλείσεις ραντεβού σε ${name}; Με το Qlick το κάνεις σε δευτερόλεπτα — online, όποια ώρα θέλεις, χωρίς τηλέφωνα και αναμονή. Βλέπεις τις διαθέσιμες ώρες σε πραγματικό χρόνο και επιβεβαιώνεις το ραντεβού σου με ένα κλικ.`,
      benefits: [
        {
          title: "Κράτηση 24/7",
          body: `Κλείσε ραντεβού σε ${name} οποιαδήποτε ώρα, ακόμα κι εκτός ωραρίου — χωρίς να πάρεις τηλέφωνο.`,
        },
        {
          title: "Διαθεσιμότητα σε πραγματικό χρόνο",
          body: "Βλέπεις μόνο τις πραγματικά ελεύθερες ώρες, χωρίς διπλοκρατήσεις και παρεξηγήσεις.",
        },
        {
          title: "Υπενθυμίσεις & ιστορικό",
          body: "Κρατάς το ραντεβού σου στον λογαριασμό σου και ξαναβρίσκεις εύκολα το κατάστημα — χωρίς να ξανασκανάρεις QR.",
        },
      ],
      forOwners: `Έχεις επιχείρηση στον χώρο «${name}»; Με το Qlick δέχεσαι online ραντεβού 24/7, διαχειρίζεσαι το ημερολόγιο και το προσωπικό σου, και μοιράζεσαι τον σύνδεσμο ή το QR σου — 3 μήνες δωρεάν.`,
      faqs: [
        {
          q: `Πώς κλείνω online ραντεβού σε ${name};`,
          a: `Βρίσκεις το κατάστημα στο Qlick, διαλέγεις υπηρεσία, ημέρα και ώρα, και επιβεβαιώνεις. Το ραντεβού μπαίνει αμέσως στο ημερολόγιο του καταστήματος.`,
        },
        {
          q: "Κοστίζει κάτι για τον πελάτη;",
          a: "Όχι. Η κράτηση ραντεβού μέσω Qlick είναι εντελώς δωρεάν για τον πελάτη.",
        },
        {
          q: `Είμαι επαγγελματίας στον χώρο «${name}» — πώς δέχομαι online ραντεβού;`,
          a: "Φτιάχνεις δωρεάν λογαριασμό επιχείρησης, στήνεις υπηρεσίες και ωράριο, και οι πελάτες κλείνουν μόνοι τους online. Οι πρώτοι 3 μήνες είναι δωρεάν.",
        },
        {
          q: "Χρειάζεται λογαριασμός για να κλείσω ραντεβού;",
          a: "Ναι, ένας γρήγορος λογαριασμός με επιβεβαιωμένο email — έτσι κρατάς το ιστορικό σου και ξαναβρίσκεις εύκολα τα καταστήματα.",
        },
      ],
    };
  }

  return {
    heading: `Book ${name} online`,
    metaTitle: `Book ${name} online`,
    metaDescription: `Book an appointment with ${name} near you, 24/7 and without phone calls. See real-time availability and book in one click with Qlick.`,
    intro: `Looking to book an appointment with ${name}? With Qlick it takes seconds — online, any time, no phone calls or waiting. See available slots in real time and confirm your appointment in one click.`,
    benefits: [
      {
        title: "Book 24/7",
        body: `Book with ${name} any time, even after hours — without picking up the phone.`,
      },
      {
        title: "Real-time availability",
        body: "You only see genuinely free slots — no double bookings, no misunderstandings.",
      },
      {
        title: "Reminders & history",
        body: "Keep your appointment in your account and find the business again easily — no need to re-scan a QR.",
      },
    ],
    forOwners: `Run a ${name} business? With Qlick you take online bookings 24/7, manage your calendar and staff, and share your link or QR — 3 months free.`,
    faqs: [
      {
        q: `How do I book ${name} online?`,
        a: `Find the business on Qlick, pick a service, day and time, and confirm. The appointment lands straight in the business's calendar.`,
      },
      {
        q: "Does it cost anything for the customer?",
        a: "No. Booking through Qlick is completely free for customers.",
      },
      {
        q: `I'm a ${name} professional — how do I take online bookings?`,
        a: "Create a free business account, set up your services and hours, and customers book themselves online. The first 3 months are free.",
      },
      {
        q: "Do I need an account to book?",
        a: "Yes, a quick account with a confirmed email — so you keep your history and find businesses again easily.",
      },
    ],
  };
}
