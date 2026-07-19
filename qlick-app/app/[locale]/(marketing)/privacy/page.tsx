import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEl = locale !== "en";
  return pageMetadata(
    locale,
    "/privacy",
    isEl ? "Πολιτική απορρήτου" : "Privacy Policy",
    isEl
      ? "Πώς το Qlick συλλέγει, χρησιμοποιεί και προστατεύει τα προσωπικά σου δεδομένα."
      : "How Qlick collects, uses and protects your personal data.",
  );
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isEl = locale === "el";

  const sections: LegalSection[] = isEl
    ? [
        {
          heading: "Ποια δεδομένα συλλέγουμε",
          body: [
            "Στοιχεία λογαριασμού: όνομα, email, τηλέφωνο και (για επαγγελματίες) στοιχεία καταστήματος.",
            "Δεδομένα κρατήσεων: υπηρεσία, ημερομηνία/ώρα, υπάλληλος και τυχόν σημειώσεις που καταχωρείς.",
            "Τεχνικά δεδομένα: βασικά στοιχεία χρήσης που χρειάζονται για τη λειτουργία και την ασφάλεια της υπηρεσίας.",
          ],
        },
        {
          heading: "Πώς τα χρησιμοποιούμε",
          body: [
            "Για να παρέχουμε την υπηρεσία κρατήσεων, να εμφανίζουμε τα ραντεβού στο ημερολόγιο και να ειδοποιούμε εσένα και τους πελάτες σου.",
            "Για την ασφάλεια, την υποστήριξη και τη βελτίωση της πλατφόρμας. Δεν πουλάμε τα προσωπικά σου δεδομένα.",
          ],
        },
        {
          heading: "Πού φυλάσσονται",
          body: [
            "Τα δεδομένα φιλοξενούνται σε servers εντός της Ευρωπαϊκής Ένωσης (Φρανκφούρτη, Γερμανία) μέσω του παρόχου υποδομής μας.",
          ],
        },
        {
          heading: "Google Calendar (προαιρετική σύνδεση για επαγγελματίες)",
          body: [
            "Αν συνδέσεις το Google Calendar σου, το Qlick: (α) δημιουργεί/ενημερώνει/διαγράφει στο ημερολόγιό σου ένα event για κάθε ραντεβού του Qlick, (β) εφόσον το ενεργοποιήσεις, διαβάζει ποιες ώρες είσαι απασχολημένος ώστε να μην δέχεσαι online κρατήσεις εκείνες τις ώρες, και (γ) σου επιτρέπει μια εφάπαξ εισαγωγή των προσεχών ραντεβού σου από το Google στο Qlick.",
            "Αποθηκεύουμε μόνο: κρυπτογραφημένα διακριτικά πρόσβασης (tokens), το αναγνωριστικό του ημερολογίου που επέλεξες και τις ώρες έναρξης/λήξης των απασχολημένων διαστημάτων — όχι τίτλους, περιγραφές, τοποθεσίες ή συμμετέχοντες. Μπορείς να αποσυνδέσεις το ημερολόγιο ανά πάσα στιγμή από τις Ρυθμίσεις· τότε διαγράφουμε τα tokens και τα αποθηκευμένα διαστήματα.",
            "Η χρήση δεδομένων που λαμβάνονται από Google APIs συμμορφώνεται με την Πολιτική Δεδομένων Χρήστη των Υπηρεσιών Google API (Google API Services User Data Policy), συμπεριλαμβανομένων των απαιτήσεων Περιορισμένης Χρήσης (Limited Use). Δεν πωλούνται, δεν χρησιμοποιούνται για διαφημίσεις και δεν χρησιμοποιούνται για εκπαίδευση μοντέλων.",
          ],
        },
        {
          heading: "Τα δικαιώματά σου (GDPR)",
          body: [
            "Έχεις δικαίωμα πρόσβασης, διόρθωσης, διαγραφής και φορητότητας των δεδομένων σου, καθώς και δικαίωμα εναντίωσης στην επεξεργασία.",
            "Για να ασκήσεις οποιοδήποτε δικαίωμα, επικοινώνησε μαζί μας στο info@qlick.gr.",
          ],
        },
        {
          heading: "Διατήρηση",
          body: [
            "Διατηρούμε τα δεδομένα σου όσο είναι ενεργός ο λογαριασμός σου και όσο απαιτείται για νόμιμους ή λειτουργικούς λόγους. Μετά τη διαγραφή του λογαριασμού, τα δεδομένα διαγράφονται ή ανωνυμοποιούνται.",
          ],
        },
        {
          heading: "Επικοινωνία",
          body: [
            "Για θέματα απορρήτου, επικοινώνησε στο info@qlick.gr.",
          ],
        },
      ]
    : [
        {
          heading: "What data we collect",
          body: [
            "Account details: name, email, phone and (for businesses) shop details.",
            "Booking data: service, date/time, staff member and any notes you enter.",
            "Technical data: basic usage information needed to run and secure the service.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To provide the booking service, show appointments in the calendar and notify you and your customers.",
            "For security, support and improving the platform. We do not sell your personal data.",
          ],
        },
        {
          heading: "Where it is stored",
          body: [
            "Data is hosted on servers within the European Union (Frankfurt, Germany) through our infrastructure provider.",
          ],
        },
        {
          heading: "Google Calendar (optional connection for businesses)",
          body: [
            "If you connect your Google Calendar, Qlick: (a) creates/updates/deletes an event in your calendar for every Qlick appointment, (b) if you enable it, reads which hours you are busy so online bookings are blocked for those hours, and (c) lets you run a one-time import of your upcoming appointments from Google into Qlick.",
            "We store only: encrypted access tokens, the ID of the calendar you chose, and the start/end times of busy intervals — no titles, descriptions, locations or attendees. You can disconnect the calendar at any time from Settings; we then delete the tokens and the stored intervals.",
            "Qlick's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Google user data is never sold, never used for advertising, and never used to train models.",
          ],
        },
        {
          heading: "Your rights (GDPR)",
          body: [
            "You have the right to access, correct, delete and port your data, as well as to object to processing.",
            "To exercise any right, contact us at info@qlick.gr.",
          ],
        },
        {
          heading: "Retention",
          body: [
            "We keep your data while your account is active and as required for legal or operational reasons. After account deletion, data is deleted or anonymized.",
          ],
        },
        {
          heading: "Contact",
          body: ["For privacy matters, contact info@qlick.gr."],
        },
      ];

  return (
    <LegalPage
      eyebrow={isEl ? "Πολιτική Απορρήτου" : "Privacy Policy"}
      title={isEl ? "Πολιτική Απορρήτου" : "Privacy Policy"}
      updated={isEl ? "Τελευταία ενημέρωση: Ιούνιος 2026" : "Last updated: June 2026"}
      intro={
        isEl
          ? "Σεβόμαστε τα προσωπικά σου δεδομένα. Εδώ εξηγούμε τι συλλέγουμε, γιατί και ποια δικαιώματα έχεις."
          : "We respect your personal data. Here we explain what we collect, why, and what rights you have."
      }
      sections={sections}
    />
  );
}
