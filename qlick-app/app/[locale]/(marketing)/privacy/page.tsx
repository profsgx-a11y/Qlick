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
            "Αν συνδέσεις το Google Calendar σου, το Qlick: (α) δημιουργεί, ενημερώνει και διαγράφει στο ημερολόγιό σου ένα event για κάθε ραντεβού του Qlick, και (β) όταν πατήσεις εσύ «Συγχρονισμός», διαβάζει τα προσεχή events του ημερολογίου που επέλεξες, ώστε να μπορείς να εισαγάγεις στο Qlick ραντεβού που δεν έχουν καταχωρηθεί. Η ανάγνωση γίνεται μόνο κατόπιν δικής σου ενέργειας.",
            "Αποθηκεύουμε μόνο: κρυπτογραφημένα διακριτικά πρόσβασης (tokens), το αναγνωριστικό και το όνομα του ημερολογίου που επέλεξες και —αποκλειστικά για όσα events επιλέξεις να εισαγάγεις— την ώρα έναρξης/λήξης και τον τίτλο τους. Δεν αποθηκεύουμε περιγραφές, τοποθεσίες ή συμμετέχοντες. Μπορείς να αποσυνδέσεις το ημερολόγιο ανά πάσα στιγμή από τις Ρυθμίσεις· τότε ανακαλούμε την πρόσβαση και διαγράφουμε τα tokens.",
            "Η χρήση και μεταφορά δεδομένων που λαμβάνονται από Google APIs συμμορφώνεται με την Πολιτική Δεδομένων Χρήστη των Υπηρεσιών Google API (Google API Services User Data Policy), συμπεριλαμβανομένων των απαιτήσεων Περιορισμένης Χρήσης (Limited Use). Δεν πωλούνται, δεν χρησιμοποιούνται για διαφημίσεις και δεν χρησιμοποιούνται για εκπαίδευση μοντέλων τεχνητής νοημοσύνης ή μηχανικής μάθησης.",
          ],
        },
        {
          heading: "Με ποιους μοιραζόμαστε δεδομένα",
          body: [
            "Δεν πουλάμε, δεν ενοικιάζουμε και δεν κοινοποιούμε προσωπικά δεδομένα ή δεδομένα χρήστη Google (Google user data) σε τρίτους για διαφημιστικούς ή εμπορικούς σκοπούς.",
            "Δεδομένα χρήστη Google δεν μεταφέρονται σε κανέναν τρίτο, με μοναδική εξαίρεση τους παρόχους υποδομής που ενεργούν ως εκτελούντες την επεξεργασία για λογαριασμό μας, αποκλειστικά για να λειτουργήσει η υπηρεσία: Supabase (βάση δεδομένων και ταυτοποίηση, servers στην ΕΕ — Φρανκφούρτη), Vercel (φιλοξενία της εφαρμογής) και Resend (αποστολή email της υπηρεσίας, π.χ. επιβεβαιώσεις ραντεβού).",
            "Οι πάροχοι αυτοί δεσμεύονται συμβατικά να επεξεργάζονται τα δεδομένα μόνο κατ' εντολή μας και δεν τους επιτρέπεται να τα χρησιμοποιήσουν για δικούς τους σκοπούς. Δεν κοινοποιούμε δεδομένα σε τρίτους διαφημιστές, μεσίτες δεδομένων ή για εκπαίδευση μοντέλων ΤΝ. Ενδέχεται να κοινοποιήσουμε δεδομένα μόνο εφόσον απαιτηθεί από τον νόμο ή αρμόδια αρχή.",
          ],
        },
        {
          heading: "Χάρτες (Google Maps & OpenStreetMap)",
          body: [
            "Στη δημόσια σελίδα κάθε καταστήματος ενσωματώνουμε χάρτη της Google (Google Maps), ώστε να βλέπεις πού βρίσκεται. Μόλις φορτώσει ο χάρτης, η Google λαμβάνει τη διεύθυνση IP σου και ενδέχεται να χρησιμοποιήσει cookies. Η Google ενεργεί ως ανεξάρτητος υπεύθυνος επεξεργασίας, βάσει της δικής της πολιτικής απορρήτου — εμείς δεν της αποστέλλουμε τα προσωπικά σου στοιχεία ούτε τα ραντεβού σου.",
            "Στο περιβάλλον διαχείρισης, για την αναζήτηση διεύθυνσης και τον χάρτη ορισμού τοποθεσίας χρησιμοποιούμε OpenStreetMap (υπηρεσία Nominatim) και πλακίδια χάρτη CARTO. Σε αυτές αποστέλλονται μόνο η διεύθυνση ή οι συντεταγμένες που αναζητά ο ιδιοκτήτης, μαζί με τη διεύθυνση IP του.",
            "Οι χάρτες φορτώνουν μόνο στις σελίδες όπου εμφανίζονται και δεν χρησιμοποιούνται για παρακολούθηση ή διαφήμιση.",
          ],
        },
        {
          heading: "Πώς προστατεύουμε τα δεδομένα σου",
          body: [
            "Όλη η επικοινωνία με το Qlick γίνεται κρυπτογραφημένα μέσω HTTPS/TLS. Τα δεδομένα φυλάσσονται κρυπτογραφημένα κατά την αποθήκευση (encryption at rest) από τον πάροχο υποδομής μας.",
            "Τα διακριτικά πρόσβασης (OAuth tokens) του Google Calendar αποθηκεύονται επιπλέον κρυπτογραφημένα με AES-256-GCM. Το κλειδί κρυπτογράφησης φυλάσσεται χωριστά από τη βάση, σε ασφαλείς μεταβλητές περιβάλλοντος του διακομιστή.",
            "Τα tokens και τα ευαίσθητα δεδομένα είναι προσβάσιμα μόνο από τον διακομιστή: δεν αποστέλλονται ποτέ στον browser και δεν εκτίθενται μέσω δημόσιου API. Η βάση δεδομένων προστατεύεται με Row Level Security, ώστε κάθε κατάστημα και κάθε χρήστης να έχει πρόσβαση αποκλειστικά στα δικά του δεδομένα.",
            "Η πρόσβαση του προσωπικού μας περιορίζεται στο ελάχιστο αναγκαίο. Μπορείς να ανακαλέσεις την πρόσβαση στο Google Calendar οποιαδήποτε στιγμή, είτε από τις Ρυθμίσεις του Qlick είτε από τις ρυθμίσεις ασφαλείας του Λογαριασμού σου Google.",
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
            "If you connect your Google Calendar, Qlick: (a) creates, updates and deletes an event in your calendar for every Qlick appointment, and (b) when you press “Sync”, reads upcoming events from the calendar you selected so you can import appointments that are not yet recorded in Qlick. Reading only ever happens as a result of your own action.",
            "We store only: encrypted access tokens, the ID and name of the calendar you chose, and — solely for the events you choose to import — their start/end time and title. We do not store descriptions, locations or attendees. You can disconnect the calendar at any time from Settings; we then revoke access and delete the tokens.",
            "Qlick's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Google user data is never sold, never used for advertising, and never used to train artificial intelligence or machine learning models.",
          ],
        },
        {
          heading: "Who we share data with",
          body: [
            "We do not sell, rent or disclose personal data or Google user data to third parties for advertising or commercial purposes.",
            "Google user data is not transferred to any third party, with the sole exception of the infrastructure providers that act as data processors on our behalf, exclusively to operate the service: Supabase (database and authentication, servers in the EU — Frankfurt), Vercel (application hosting) and Resend (sending service emails, e.g. appointment confirmations).",
            "These providers are contractually bound to process the data only on our instructions and may not use it for their own purposes. We do not share data with advertisers, data brokers, or for training AI models. We may disclose data only where required by law or a competent authority.",
          ],
        },
        {
          heading: "Maps (Google Maps & OpenStreetMap)",
          body: [
            "Each public shop page embeds a Google Map so you can see where the business is. Once the map loads, Google receives your IP address and may use cookies. Google acts as an independent controller under its own privacy policy — we do not send it your personal details or your appointments.",
            "Inside the dashboard, address search and the location picker use OpenStreetMap (the Nominatim service) and CARTO map tiles. Only the address or coordinates the owner is looking up is sent to them, together with the owner's IP address.",
            "Maps load only on the pages where they appear and are never used for tracking or advertising.",
          ],
        },
        {
          heading: "How we protect your data",
          body: [
            "All communication with Qlick is encrypted using HTTPS/TLS. Data is stored encrypted at rest by our infrastructure provider.",
            "Google Calendar access tokens (OAuth tokens) are additionally encrypted with AES-256-GCM before being stored. The encryption key is kept separately from the database, in secure server-side environment variables.",
            "Tokens and other sensitive data are accessible only from the server: they are never sent to the browser and are never exposed through a public API. The database is protected with Row Level Security, so each business and each user can access only their own data.",
            "Internal staff access is limited to the minimum necessary. You can revoke Qlick's access to your Google Calendar at any time, either from Qlick Settings or from your Google Account security settings.",
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
      updated={isEl ? "Τελευταία ενημέρωση: Ιούλιος 2026" : "Last updated: July 2026"}
      intro={
        isEl
          ? "Σεβόμαστε τα προσωπικά σου δεδομένα. Εδώ εξηγούμε τι συλλέγουμε, γιατί και ποια δικαιώματα έχεις."
          : "We respect your personal data. Here we explain what we collect, why, and what rights you have."
      }
      sections={sections}
    />
  );
}
