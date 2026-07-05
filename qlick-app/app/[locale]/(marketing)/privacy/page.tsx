import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

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
