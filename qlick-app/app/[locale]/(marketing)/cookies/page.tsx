import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export default async function CookiesPage({
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
          heading: "Τι είναι τα cookies",
          body: [
            "Τα cookies είναι μικρά αρχεία που αποθηκεύονται στη συσκευή σου και βοηθούν έναν ιστότοπο να λειτουργεί και να σε θυμάται μεταξύ των επισκέψεων.",
          ],
        },
        {
          heading: "Ποια χρησιμοποιούμε",
          body: [
            "Απαραίτητα cookies: χρειάζονται για τη σύνδεση στον λογαριασμό σου και την ασφάλεια. Χωρίς αυτά η πλατφόρμα δεν λειτουργεί.",
            "Προτιμήσεις: θυμούνται επιλογές όπως η γλώσσα (Ελληνικά/Αγγλικά).",
            "Προς το παρόν δεν χρησιμοποιούμε διαφημιστικά cookies ούτε cookies τρίτων για στόχευση.",
          ],
        },
        {
          heading: "Διαχείριση cookies",
          body: [
            "Μπορείς να διαγράψεις ή να αποκλείσεις τα cookies από τις ρυθμίσεις του browser σου. Αν αποκλείσεις τα απαραίτητα cookies, ορισμένες λειτουργίες (όπως η σύνδεση) δεν θα δουλεύουν.",
          ],
        },
        {
          heading: "Επικοινωνία",
          body: [
            "Για ερωτήσεις σχετικά με τα cookies, επικοινώνησε στο info@qlick.gr.",
          ],
        },
      ]
    : [
        {
          heading: "What cookies are",
          body: [
            "Cookies are small files stored on your device that help a website function and remember you between visits.",
          ],
        },
        {
          heading: "Which we use",
          body: [
            "Essential cookies: needed to sign in to your account and for security. The platform does not work without them.",
            "Preferences: remember choices such as language (Greek/English).",
            "We currently do not use advertising cookies or third-party targeting cookies.",
          ],
        },
        {
          heading: "Managing cookies",
          body: [
            "You can delete or block cookies from your browser settings. If you block essential cookies, some features (such as signing in) will not work.",
          ],
        },
        {
          heading: "Contact",
          body: ["For questions about cookies, contact info@qlick.gr."],
        },
      ];

  return (
    <LegalPage
      eyebrow="Cookies"
      title={isEl ? "Πολιτική Cookies" : "Cookie Policy"}
      updated={isEl ? "Τελευταία ενημέρωση: Ιούνιος 2026" : "Last updated: June 2026"}
      intro={
        isEl
          ? "Εδώ εξηγούμε ποια cookies χρησιμοποιεί το Qlick και πώς μπορείς να τα διαχειριστείς."
          : "Here we explain which cookies Qlick uses and how you can manage them."
      }
      sections={sections}
    />
  );
}
