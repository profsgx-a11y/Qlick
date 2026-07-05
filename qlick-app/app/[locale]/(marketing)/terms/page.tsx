import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export default async function TermsPage({
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
          heading: "Η υπηρεσία",
          body: [
            "Το Qlick είναι μια πλατφόρμα online κρατήσεων για επιχειρήσεις που λειτουργούν με ραντεβού. Επιτρέπει στις επιχειρήσεις να δέχονται κρατήσεις, να διαχειρίζονται το ημερολόγιό τους και να δημιουργούν QR poster, και στους πελάτες να κλείνουν ραντεβού online.",
            "Το Qlick δεν διαχειρίζεται πληρωμές μεταξύ πελάτη και επιχείρησης· οι πελάτες πληρώνουν απευθείας στο κατάστημα.",
          ],
        },
        {
          heading: "Λογαριασμοί",
          body: [
            "Για να χρησιμοποιήσεις τις περισσότερες λειτουργίες χρειάζεσαι λογαριασμό. Είσαι υπεύθυνος/η για την ακρίβεια των στοιχείων σου και για την ασφάλεια του κωδικού σου.",
            "Οι επαγγελματικοί λογαριασμοί είναι υπεύθυνοι για το περιεχόμενο που δημοσιεύουν (στοιχεία καταστήματος, υπηρεσίες, τιμές) και για την εξυπηρέτηση των ραντεβού που δέχονται.",
          ],
        },
        {
          heading: "Συνδρομές & δοκιμή",
          body: [
            "Προσφέρουμε δωρεάν δοκιμαστική περίοδο και, στη συνέχεια, συνδρομή επί πληρωμή. Οι τρέχουσες τιμές αναγράφονται στη σελίδα τιμολόγησης.",
            "Η χρέωση της συνδρομής, οι ακυρώσεις και οι επιστροφές θα διέπονται από τους όρους που θα ισχύουν κατά την ενεργοποίηση των πληρωμών.",
          ],
        },
        {
          heading: "Αποδεκτή χρήση",
          body: [
            "Δεν επιτρέπεται η χρήση της πλατφόρμας για παράνομες ενέργειες, για ανάρτηση ψευδών στοιχείων ή για παρενόχληση άλλων χρηστών.",
            "Διατηρούμε το δικαίωμα να αναστείλουμε ή να διαγράψουμε λογαριασμούς που παραβιάζουν τους παρόντες όρους.",
          ],
        },
        {
          heading: "Διαθεσιμότητα & ευθύνη",
          body: [
            "Καταβάλλουμε εύλογες προσπάθειες ώστε η υπηρεσία να είναι διαθέσιμη, χωρίς όμως να εγγυόμαστε αδιάλειπτη λειτουργία.",
            "Το Qlick δεν ευθύνεται για χαμένα ραντεβού, διαφορές μεταξύ πελάτη και επιχείρησης ή έμμεσες ζημίες που προκύπτουν από τη χρήση της υπηρεσίας.",
          ],
        },
        {
          heading: "Επικοινωνία",
          body: [
            "Για οποιαδήποτε ερώτηση σχετικά με τους όρους, επικοινώνησε μαζί μας στο info@qlick.gr.",
          ],
        },
      ]
    : [
        {
          heading: "The service",
          body: [
            "Qlick is an online booking platform for appointment-based businesses. It lets businesses take bookings, manage their calendar and create QR posters, and lets customers book appointments online.",
            "Qlick does not handle payments between customer and business; customers pay directly at the shop.",
          ],
        },
        {
          heading: "Accounts",
          body: [
            "Most features require an account. You are responsible for the accuracy of your details and for keeping your password secure.",
            "Business accounts are responsible for the content they publish (business details, services, prices) and for honoring the bookings they accept.",
          ],
        },
        {
          heading: "Subscriptions & trial",
          body: [
            "We offer a free trial period followed by a paid subscription. Current prices are shown on the pricing page.",
            "Subscription billing, cancellations and refunds will be governed by the terms in force when paid billing is activated.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "You may not use the platform for unlawful activity, to post false information, or to harass other users.",
            "We reserve the right to suspend or delete accounts that violate these terms.",
          ],
        },
        {
          heading: "Availability & liability",
          body: [
            "We make reasonable efforts to keep the service available, but we do not guarantee uninterrupted operation.",
            "Qlick is not liable for missed appointments, disputes between customer and business, or indirect damages arising from use of the service.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "For any question about these terms, contact us at info@qlick.gr.",
          ],
        },
      ];

  return (
    <LegalPage
      eyebrow={isEl ? "Όροι Χρήσης" : "Terms of Service"}
      title={isEl ? "Όροι Χρήσης" : "Terms of Service"}
      updated={isEl ? "Τελευταία ενημέρωση: Ιούνιος 2026" : "Last updated: June 2026"}
      intro={
        isEl
          ? "Οι παρόντες όροι διέπουν τη χρήση του Qlick. Χρησιμοποιώντας την πλατφόρμα, συμφωνείς με αυτούς."
          : "These terms govern your use of Qlick. By using the platform, you agree to them."
      }
      sections={sections}
    />
  );
}
