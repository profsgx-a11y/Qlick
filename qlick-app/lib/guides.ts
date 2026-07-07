/**
 * Content for the guides/blog (`/[locale]/blog`). Kept as a typed data module
 * (no CMS) — each guide is bilingual and rendered as simple sections.
 */

export interface GuideSection {
  h?: string;
  p: string[];
}
export interface GuideLocale {
  title: string;
  excerpt: string;
  sections: GuideSection[];
}
export interface Guide {
  slug: string;
  date: string; // ISO date of publication
  el: GuideLocale;
  en: GuideLocale;
}

export const guides: Guide[] = [
  {
    slug: "online-randevou-epixeirisi",
    date: "2026-07-07",
    el: {
      title: "Πώς να δέχεσαι online ραντεβού στο κατάστημά σου",
      excerpt:
        "Οδηγός για επαγγελματίες: πώς να ανοίξεις online κρατήσεις 24/7, να μειώσεις τα τηλέφωνα και να γεμίσεις το ημερολόγιό σου.",
      sections: [
        {
          p: [
            "Οι πελάτες σήμερα θέλουν να κλείνουν ραντεβού όποια ώρα τους βολεύει — συχνά αργά το βράδυ, εκτός ωραρίου. Αν το μόνο κανάλι σου είναι το τηλέφωνο, χάνεις κρατήσεις κάθε μέρα. Οι online κρατήσεις λύνουν ακριβώς αυτό το πρόβλημα.",
          ],
        },
        {
          h: "1. Στήσε τις υπηρεσίες και το ωράριό σου",
          p: [
            "Το πρώτο βήμα είναι να καταχωρήσεις τις υπηρεσίες σου (με διάρκεια και τιμή) και το ωράριο λειτουργίας. Έτσι το σύστημα ξέρει πότε είσαι διαθέσιμος και πόσο διαρκεί κάθε ραντεβού, ώστε να μη γίνονται διπλοκρατήσεις.",
          ],
        },
        {
          h: "2. Μοιράσου τον σύνδεσμο και το QR σου",
          p: [
            "Με το Qlick αποκτάς έναν προσωπικό σύνδεσμο κράτησης και ένα QR poster που μπορείς να βάλεις στην πόρτα ή στα social σου. Ο πελάτης σκανάρει, βλέπει διαθεσιμότητα και κλείνει σε δευτερόλεπτα — χωρίς τηλέφωνο.",
          ],
        },
        {
          h: "3. Διαχειρίσου τα πάντα από ένα ημερολόγιο",
          p: [
            "Κάθε online ραντεβού εμφανίζεται αμέσως στο ημερολόγιό σου, μαζί με τα ραντεβού που περνάς εσύ χειροκίνητα. Βλέπεις όλη τη μέρα ανά υπάλληλο και αποφεύγεις τις επικαλύψεις.",
          ],
        },
        {
          h: "Ξεκίνα δωρεάν",
          p: [
            "Με το Qlick οι πρώτοι τρεις μήνες είναι δωρεάν. Φτιάχνεις λογαριασμό, στήνεις υπηρεσίες και ωράριο, και αρχίζεις να δέχεσαι online ραντεβού την ίδια μέρα.",
          ],
        },
      ],
    },
    en: {
      title: "How to take online bookings at your business",
      excerpt:
        "A guide for professionals: how to open 24/7 online booking, cut down phone calls and fill your calendar.",
      sections: [
        {
          p: [
            "Customers today want to book whenever it suits them — often late at night, outside opening hours. If your only channel is the phone, you lose bookings every day. Online booking solves exactly that.",
          ],
        },
        {
          h: "1. Set up your services and hours",
          p: [
            "The first step is to add your services (with duration and price) and your opening hours. That way the system knows when you're available and how long each appointment takes, so double bookings never happen.",
          ],
        },
        {
          h: "2. Share your link and QR",
          p: [
            "With Qlick you get a personal booking link and a QR poster you can put on your door or your socials. Customers scan, see availability and book in seconds — no phone call.",
          ],
        },
        {
          h: "3. Manage everything from one calendar",
          p: [
            "Every online booking appears instantly in your calendar, alongside the appointments you enter manually. You see the whole day per staff member and avoid overlaps.",
          ],
        },
        {
          h: "Start free",
          p: [
            "With Qlick the first three months are free. Create an account, set up services and hours, and start taking online bookings the same day.",
          ],
        },
      ],
    },
  },
  {
    slug: "qr-kratiseis-odigos",
    date: "2026-07-07",
    el: {
      title: "QR κρατήσεις: τι είναι και πώς βοηθούν την επιχείρησή σου",
      excerpt:
        "Πώς ένα απλό QR στην πόρτα σου μετατρέπει περαστικούς σε ραντεβού — και γιατί είναι το πιο εύκολο κανάλι κράτησης.",
      sections: [
        {
          p: [
            "Το QR είναι ένας κώδικας που ο πελάτης σκανάρει με την κάμερα του κινητού και ανοίγει κατευθείαν τη σελίδα κράτησής σου. Καμία εφαρμογή, καμία αναζήτηση — ένα σκανάρισμα και κλείνει ραντεβού.",
          ],
        },
        {
          h: "Γιατί δουλεύει τόσο καλά",
          p: [
            "Ο περαστικός που βλέπει το κατάστημά σου κλειστό ή γεμάτο, αντί να φύγει, σκανάρει το QR και κλείνει για αργότερα. Μετατρέπεις μια χαμένη ευκαιρία σε επιβεβαιωμένο ραντεβού.",
          ],
        },
        {
          h: "Πού να το βάλεις",
          p: [
            "Στην πόρτα ή τη βιτρίνα, στο ταμείο, στην καρέκλα αναμονής, αλλά και ψηφιακά: στο Instagram bio, στο Facebook και στο Google προφίλ σου.",
          ],
        },
        {
          h: "Και μετά την πρώτη φορά;",
          p: [
            "Το QR είναι η πρώτη γνωριμία. Μετά, ο πελάτης σε ξαναβρίσκει από τον λογαριασμό του, τα αγαπημένα ή την αναζήτηση — χωρίς να χρειάζεται να ξανασκανάρει.",
          ],
        },
      ],
    },
    en: {
      title: "QR bookings: what they are and how they help your business",
      excerpt:
        "How a simple QR on your door turns passers-by into appointments — and why it's the easiest booking channel.",
      sections: [
        {
          p: [
            "A QR is a code the customer scans with their phone camera, opening your booking page directly. No app, no searching — one scan and they book.",
          ],
        },
        {
          h: "Why it works so well",
          p: [
            "A passer-by who finds you closed or busy, instead of leaving, scans the QR and books for later. You turn a lost opportunity into a confirmed appointment.",
          ],
        },
        {
          h: "Where to put it",
          p: [
            "On your door or window, at the till, on the waiting chair — and digitally: your Instagram bio, Facebook and Google profile.",
          ],
        },
        {
          h: "And after the first time?",
          p: [
            "The QR is the first introduction. After that, the customer finds you again from their account, favorites or search — no need to re-scan.",
          ],
        },
      ],
    },
  },
  {
    slug: "meiose-no-show-randevou",
    date: "2026-07-07",
    el: {
      title: "5 τρόποι να μειώσεις τα no-show ραντεβού",
      excerpt:
        "Τα ραντεβού που δεν εμφανίζονται κοστίζουν χρόνο και χρήμα. Πέντε πρακτικοί τρόποι να τα περιορίσεις.",
      sections: [
        {
          p: [
            "Ένα no-show — πελάτης που κλείνει και δεν εμφανίζεται — αφήνει ένα κενό που δύσκολα γεμίζει την τελευταία στιγμή. Δες πώς να τα μειώσεις.",
          ],
        },
        {
          h: "1. Επιβεβαιωμένο email σε κάθε κράτηση",
          p: [
            "Όταν κάθε ραντεβού συνδέεται με πραγματικό, επιβεβαιωμένο email, μειώνονται οι ψεύτικες ή κατά λάθος κρατήσεις.",
          ],
        },
        {
          h: "2. Εύκολη ακύρωση & αλλαγή ώρας",
          p: [
            "Αν ο πελάτης μπορεί να ακυρώσει ή να αλλάξει ώρα με ένα κλικ, θα το κάνει — και εσύ ελευθερώνεις τη θέση για κάποιον άλλο, αντί για ένα no-show.",
          ],
        },
        {
          h: "3. Όριο στα ενεργά online ραντεβού",
          p: [
            "Ένα λογικό όριο ταυτόχρονων online ραντεβού ανά πελάτη περιορίζει τις υπερβολικές, μη σοβαρές κρατήσεις.",
          ],
        },
        {
          h: "4. Ιστορικό & αναφορά προβληματικών πελατών",
          p: [
            "Με ιστορικό πελάτη βλέπεις ποιος εμφανίζεται συνεπώς και ποιος όχι, και μπορείς να αναφέρεις ή να αποκλείσεις όσους κάνουν συστηματικά no-show.",
          ],
        },
        {
          h: "5. Ξεκάθαρες πληροφορίες ραντεβού",
          p: [
            "Όταν ο πελάτης βλέπει καθαρά υπηρεσία, ημέρα, ώρα και διεύθυνση, μειώνονται τα «το ξέχασα» και οι παρεξηγήσεις.",
          ],
        },
      ],
    },
    en: {
      title: "5 ways to reduce no-show appointments",
      excerpt:
        "No-shows cost time and money. Five practical ways to cut them down.",
      sections: [
        {
          p: [
            "A no-show — a customer who books and doesn't turn up — leaves a gap that's hard to fill last minute. Here's how to reduce them.",
          ],
        },
        {
          h: "1. Confirmed email on every booking",
          p: [
            "When every appointment is tied to a real, confirmed email, fake or accidental bookings drop.",
          ],
        },
        {
          h: "2. Easy cancel & reschedule",
          p: [
            "If customers can cancel or reschedule in one click, they will — freeing the slot for someone else instead of a no-show.",
          ],
        },
        {
          h: "3. A cap on active online bookings",
          p: [
            "A sensible limit on simultaneous online bookings per customer curbs excessive, non-serious bookings.",
          ],
        },
        {
          h: "4. History & reporting of problem customers",
          p: [
            "With customer history you see who shows up reliably and who doesn't, and you can report or block repeat no-shows.",
          ],
        },
        {
          h: "5. Clear appointment details",
          p: [
            "When customers clearly see the service, day, time and address, 'I forgot' and misunderstandings go down.",
          ],
        },
      ],
    },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
