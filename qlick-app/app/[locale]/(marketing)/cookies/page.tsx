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
    "/cookies",
    isEl ? "Πολιτική cookies" : "Cookie Policy",
    isEl
      ? "Πώς το Qlick χρησιμοποιεί cookies και παρόμοιες τεχνολογίες."
      : "How Qlick uses cookies and similar technologies.",
  );
}

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
            "Χάρτης τρίτου (Google Maps): στις σελίδες καταστημάτων ενσωματώνεται χάρτης της Google, ο οποίος μπορεί να ορίσει cookies. Φορτώνει ΜΟΝΟ αν δώσεις τη συγκατάθεσή σου («Αποδοχή όλων»)· αν επιλέξεις «Μόνο απαραίτητα», δεν φορτώνει.",
            "Δεν χρησιμοποιούμε διαφημιστικά cookies, analytics ή cookies τρίτων για στόχευση.",
          ],
        },
        {
          heading: "Διαχείριση cookies",
          body: [
            "Μπορείς να αλλάξεις τη συγκατάθεσή σου οποιαδήποτε στιγμή από τον σύνδεσμο «Ρυθμίσεις cookies» στο κάτω μέρος κάθε σελίδας.",
            "Μπορείς επίσης να διαγράψεις ή να αποκλείσεις τα cookies από τις ρυθμίσεις του browser σου. Αν αποκλείσεις τα απαραίτητα cookies, ορισμένες λειτουργίες (όπως η σύνδεση) δεν θα δουλεύουν.",
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
            "Third-party map (Google Maps): shop pages embed a Google Map that may set cookies. It loads ONLY if you give your consent (\"Accept all\"); if you choose \"Essential only\", it does not load.",
            "We do not use advertising cookies, analytics, or third-party targeting cookies.",
          ],
        },
        {
          heading: "Managing cookies",
          body: [
            "You can change your consent at any time via the \"Cookie settings\" link at the bottom of every page.",
            "You can also delete or block cookies from your browser settings. If you block essential cookies, some features (such as signing in) will not work.",
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
      updated={isEl ? "Τελευταία ενημέρωση: Ιούλιος 2026" : "Last updated: July 2026"}
      intro={
        isEl
          ? "Εδώ εξηγούμε ποια cookies χρησιμοποιεί το Qlick και πώς μπορείς να τα διαχειριστείς."
          : "Here we explain which cookies Qlick uses and how you can manage them."
      }
      sections={sections}
    />
  );
}
