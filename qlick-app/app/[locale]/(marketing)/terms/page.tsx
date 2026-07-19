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
    "/terms",
    isEl ? "Όροι χρήσης" : "Terms of Service",
    isEl
      ? "Οι όροι χρήσης της πλατφόρμας online ραντεβού Qlick για επιχειρήσεις και πελάτες."
      : "The terms of service for the Qlick online booking platform, for businesses and customers.",
  );
}

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
          heading: "Εισαγωγή & αποδοχή των όρων",
          body: [
            "Οι παρόντες Όροι Χρήσης (εφεξής οι «Όροι») διέπουν την πρόσβαση και τη χρήση του διαδικτυακού τόπου qlick.gr, καθώς και κάθε συναφούς υπηρεσίας που παρέχεται μέσω αυτού (εφεξής συνολικά η «Πλατφόρμα» ή το «Qlick»).",
            "Για τους σκοπούς των παρόντων Όρων: «Επιχείρηση» ή «Συνεργάτης» είναι κάθε επαγγελματίας ή επιχείρηση που διατηρεί επαγγελματικό λογαριασμό και προβάλλει τις υπηρεσίες της μέσω της Πλατφόρμας· «Πελάτης» είναι κάθε φυσικό πρόσωπο που χρησιμοποιεί την Πλατφόρμα για την αναζήτηση επιχειρήσεων και την πραγματοποίηση κρατήσεων· «Χρήστης» είναι κάθε πρόσωπο που αποκτά πρόσβαση στην Πλατφόρμα, ανεξαρτήτως ιδιότητας.",
            "Η πρόσβαση και η χρήση της Πλατφόρμας συνεπάγεται την πλήρη και ανεπιφύλακτη αποδοχή των παρόντων Όρων. Εάν δεν συμφωνείτε με οποιονδήποτε από τους Όρους, οφείλετε να απέχετε από τη χρήση της Πλατφόρμας.",
            "Διατηρούμε το δικαίωμα να τροποποιούμε τους παρόντες Όρους οποτεδήποτε, με ανάρτηση της εκάστοτε ισχύουσας έκδοσης στην παρούσα σελίδα. Η συνέχιση της χρήσης της Πλατφόρμας μετά την ανάρτηση τροποποιήσεων συνιστά αποδοχή τους.",
          ],
        },
        {
          heading: "Αντικείμενο της υπηρεσίας",
          body: [
            "Το Qlick είναι μια διαδικτυακή πλατφόρμα διαμεσολάβησης για online κρατήσεις σε επιχειρήσεις που λειτουργούν με ραντεβού. Παρέχει στις Επιχειρήσεις εργαλεία διαχείρισης κρατήσεων, ημερολογίου, υπηρεσιών, προσωπικού και προωθητικού υλικού (όπως QR poster), και στους Πελάτες τη δυνατότητα αναζήτησης επιχειρήσεων και πραγματοποίησης κρατήσεων.",
            "Το Qlick ενεργεί αποκλειστικά ως τεχνικός διαμεσολαβητής μεταξύ Πελατών και Επιχειρήσεων. Οι υπηρεσίες που προβάλλονται στην Πλατφόρμα (π.χ. κούρεμα, περιποίηση, θεραπείες) παρέχονται αποκλειστικά από τις Επιχειρήσεις, με δική τους ευθύνη. Το Qlick δεν αποτελεί συμβαλλόμενο μέρος στη σχέση μεταξύ Πελάτη και Επιχείρησης και δεν φέρει ευθύνη για την ποιότητα, την καταλληλότητα ή τη νομιμότητα των παρεχόμενων υπηρεσιών.",
            "Το Qlick δεν διενεργεί ούτε διαχειρίζεται πληρωμές μεταξύ Πελατών και Επιχειρήσεων. Η εξόφληση των υπηρεσιών γίνεται απευθείας στην Επιχείρηση, με τους τρόπους που αυτή ορίζει.",
          ],
        },
        {
          heading: "Λογαριασμοί & ασφάλεια",
          body: [
            "Η χρήση των περισσότερων λειτουργιών της Πλατφόρμας προϋποθέτει τη δημιουργία λογαριασμού. Κατά την εγγραφή οφείλετε να παρέχετε αληθή, ακριβή και επικαιροποιημένα στοιχεία και να επιβεβαιώσετε τη διεύθυνση ηλεκτρονικού ταχυδρομείου σας. Λογαριασμοί με ψευδή ή παραπλανητικά στοιχεία ενδέχεται να τεθούν σε αναστολή ή να διαγραφούν.",
            "Κάθε φυσικό πρόσωπο επιτρέπεται να διατηρεί έναν (1) μόνο λογαριασμό. Ο λογαριασμός είναι προσωπικός και αμεταβίβαστος· δεν επιτρέπεται η πώληση, η παραχώρηση ή η κοινή χρήση του με τρίτους.",
            "Είστε αποκλειστικά υπεύθυνοι για τη διαφύλαξη της εμπιστευτικότητας των κωδικών πρόσβασής σας και για κάθε δραστηριότητα που πραγματοποιείται μέσω του λογαριασμού σας. Σε περίπτωση μη εξουσιοδοτημένης χρήσης ή παραβίασης ασφάλειας, οφείλετε να μας ενημερώσετε αμελλητί στο info@qlick.gr.",
          ],
        },
        {
          heading: "Ηλικιακό όριο",
          body: [
            "Η χρήση της Πλατφόρμας επιτρέπεται μόνο σε πρόσωπα που έχουν συμπληρώσει το 18ο έτος της ηλικίας τους. Ανήλικοι δύνανται να χρησιμοποιούν την Πλατφόρμα μόνο με τη συναίνεση και υπό την εποπτεία του ασκούντος τη γονική μέριμνα, ο οποίος φέρει την ευθύνη για τη δραστηριότητά τους.",
          ],
        },
        {
          heading: "Κρατήσεις",
          body: [
            "Η πραγματοποίηση κράτησης μέσω της Πλατφόρμας προϋποθέτει λογαριασμό με επιβεβαιωμένο email. Με την κράτηση, ο Πελάτης δεσμεύεται να προσέλθει στο ραντεβού την προγραμματισμένη ώρα ή να το ακυρώσει εγκαίρως, ώστε η Επιχείρηση να μπορεί να διαθέσει τον χρόνο σε άλλον πελάτη.",
            "Για την προστασία των Επιχειρήσεων από καταχρηστικές κρατήσεις, η Πλατφόρμα εφαρμόζει εύλογα όρια χρήσης (ενδεικτικά: ανώτατο πλήθος ενεργών μελλοντικών κρατήσεων ανά Πελάτη και αποκλεισμό αλληλεπικαλυπτόμενων ραντεβού). Τα όρια αυτά ενδέχεται να αναπροσαρμόζονται κατά την κρίση μας.",
            "Οι Επιχειρήσεις οφείλουν να τιμούν τις κρατήσεις που αποδέχονται μέσω της Πλατφόρμας. Οι Επιχειρήσεις διατηρούν το δικαίωμα να αποκλείουν συγκεκριμένους πελάτες από κρατήσεις στο κατάστημά τους (π.χ. λόγω επανειλημμένης μη προσέλευσης).",
            "Η συστηματική μη προσέλευση σε ραντεβού, οι εικονικές κρατήσεις και κάθε άλλη καταχρηστική χρήση του συστήματος κρατήσεων συνιστούν παραβίαση των παρόντων Όρων.",
          ],
        },
        {
          heading: "Υποχρεώσεις Επιχειρήσεων",
          body: [
            "Οι Επιχειρήσεις ευθύνονται αποκλειστικά για το σύνολο του περιεχομένου που δημοσιεύουν στην Πλατφόρμα, συμπεριλαμβανομένων ενδεικτικά της επωνυμίας, της περιγραφής, των φωτογραφιών, των υπηρεσιών, των τιμών, του ωραρίου και των στοιχείων του προσωπικού τους. Το περιεχόμενο αυτό πρέπει να είναι αληθές, ακριβές, επικαιροποιημένο και σύννομο.",
            "Οι Επιχειρήσεις εγγυώνται ότι λειτουργούν νόμιμα, ότι διαθέτουν όλες τις κατά νόμο απαιτούμενες άδειες και εγκρίσεις για τις υπηρεσίες που προσφέρουν και ότι συμμορφώνονται με την ισχύουσα νομοθεσία, ιδίως σε θέματα υγιεινής, ασφάλειας, προστασίας καταναλωτή και προσωπικών δεδομένων.",
            "Απαγορεύεται η καταχώριση εικονικών, ψευδών ή παραπλανητικών επιχειρήσεων ή υπηρεσιών, καθώς και η χρήση της Πλατφόρμας για την προβολή υπηρεσιών που αντίκεινται στον νόμο ή στα χρηστά ήθη. Τέτοιες καταχωρίσεις αφαιρούνται και οι σχετικοί λογαριασμοί τίθενται σε αναστολή ή διαγράφονται.",
          ],
        },
        {
          heading: "Αποδεκτή χρήση — απαγορευμένες συμπεριφορές",
          body: [
            "Η Πλατφόρμα επιτρέπεται να χρησιμοποιείται αποκλειστικά για νόμιμους σκοπούς και σύμφωνα με τους παρόντες Όρους. Ενδεικτικά και όχι περιοριστικά, απαγορεύεται: (α) η χρήση της Πλατφόρμας για παράνομες, δόλιες ή καταχρηστικές ενέργειες· (β) η καταχώριση ψευδών, προσβλητικών, υβριστικών, δυσφημιστικών, άσεμνων, απειλητικών ή ρατσιστικών στοιχείων και περιεχομένου· (γ) η πλαστοπροσωπία ή η ψευδής δήλωση σχέσης με οποιοδήποτε πρόσωπο ή φορέα· (δ) η παρενόχληση, ο εκφοβισμός ή η εξαπάτηση άλλων Χρηστών· (ε) η αποστολή ανεπιθύμητων ή μαζικών μηνυμάτων (spam)· (στ) η μετάδοση ιών ή άλλου κακόβουλου κώδικα· (ζ) η αυτοματοποιημένη άντληση δεδομένων (scraping), η χρήση bots και κάθε ενέργεια που επιβαρύνει ή παρεμποδίζει την ομαλή λειτουργία της Πλατφόρμας· (η) η απόπειρα μη εξουσιοδοτημένης πρόσβασης στην Πλατφόρμα, στους διακομιστές ή στα συστήματά της· (θ) η αντιγραφή, αναπαραγωγή ή εκμετάλλευση της Πλατφόρμας ή τμήματός της για εμπορικούς σκοπούς χωρίς την προηγούμενη έγγραφη συναίνεσή μας.",
            "Διατηρούμε το δικαίωμα, χωρίς σχετική υποχρέωση, να ελέγχουμε το περιεχόμενο που δημοσιεύεται στην Πλατφόρμα και να αφαιρούμε, κατά την απόλυτη κρίση μας και χωρίς προηγούμενη ειδοποίηση, κάθε περιεχόμενο που παραβιάζει τους παρόντες Όρους ή τον νόμο.",
          ],
        },
        {
          heading: "Αναστολή & διαγραφή λογαριασμών",
          body: [
            "Σε περίπτωση παραβίασης των παρόντων Όρων ή της κείμενης νομοθεσίας από οποιονδήποτε Χρήστη (Επιχείρηση ή Πελάτη), το Qlick διατηρεί το δικαίωμα, κατά την απόλυτη διακριτική του ευχέρεια, να θέσει σε προσωρινή αναστολή ή να διαγράψει οριστικά τον σχετικό λογαριασμό, με ή χωρίς προηγούμενη ειδοποίηση, καθώς και να αφαιρέσει το σύνολο ή μέρος του δημοσιευμένου περιεχομένου του.",
            "Κατά τη διάρκεια της αναστολής, ο λογαριασμός δεν δύναται να πραγματοποιεί νέες κρατήσεις και, προκειμένου για Επιχειρήσεις, το κατάστημα παύει να εμφανίζεται στην Πλατφόρμα και να δέχεται κρατήσεις.",
            "Εάν θεωρείτε ότι η αναστολή ή η διαγραφή του λογαριασμού σας έγινε εκ παραδρομής, μπορείτε να επικοινωνήσετε μαζί μας στο info@qlick.gr, προκειμένου να επανεξετάσουμε την περίπτωσή σας.",
            "Η αναστολή ή διαγραφή λογαριασμού δεν θίγει τυχόν λοιπά δικαιώματα ή αξιώσεις του Qlick που απορρέουν από τον νόμο ή τους παρόντες Όρους.",
          ],
        },
        {
          heading: "Συνδρομές & δοκιμαστική περίοδος",
          body: [
            "Η χρήση της Πλατφόρμας από Επιχειρήσεις παρέχεται με δωρεάν δοκιμαστική περίοδο και, στη συνέχεια, με συνδρομή επί πληρωμή. Η διάρκεια της δοκιμαστικής περιόδου και οι εκάστοτε ισχύουσες τιμές αναγράφονται στη σελίδα τιμολόγησης της Πλατφόρμας.",
            "Η χρέωση των συνδρομών, οι ανανεώσεις, οι ακυρώσεις και οι τυχόν επιστροφές διέπονται από τους όρους που ισχύουν κατά τον χρόνο ενεργοποίησης της εκάστοτε συνδρομής. Μετά τη λήξη της δοκιμαστικής περιόδου ή της συνδρομής, ορισμένες λειτουργίες ενδέχεται να περιορίζονται έως την ενεργοποίηση συνδρομής.",
          ],
        },
        {
          heading: "Πνευματική ιδιοκτησία & περιεχόμενο χρηστών",
          body: [
            "Η Πλατφόρμα, συμπεριλαμβανομένων ενδεικτικά του λογισμικού, του σχεδιασμού, των γραφικών, των κειμένων, των λογοτύπων και των διακριτικών γνωρισμάτων του Qlick, αποτελεί πνευματική ιδιοκτησία του Qlick ή των δικαιοπαρόχων του και προστατεύεται από την ισχύουσα νομοθεσία. Κανένα δικαίωμα επί αυτών δεν μεταβιβάζεται στους Χρήστες διά της χρήσης της Πλατφόρμας.",
            "Το περιεχόμενο που αναρτούν οι Επιχειρήσεις (π.χ. επωνυμία, λογότυπο, φωτογραφίες, περιγραφές) παραμένει ιδιοκτησία τους. Με την ανάρτησή του, οι Επιχειρήσεις παραχωρούν στο Qlick μη αποκλειστική, ατελή άδεια χρήσης, αναπαραγωγής και προβολής του περιεχομένου αυτού, στο μέτρο που απαιτείται για τη λειτουργία και την προώθηση της Πλατφόρμας.",
            "Οι Χρήστες εγγυώνται ότι το περιεχόμενο που αναρτούν δεν προσβάλλει δικαιώματα τρίτων, συμπεριλαμβανομένων δικαιωμάτων πνευματικής ιδιοκτησίας και προσωπικών δεδομένων.",
          ],
        },
        {
          heading: "Διαθεσιμότητα & αποποίηση εγγυήσεων",
          body: [
            "Η Πλατφόρμα παρέχεται «ως έχει» και «ως διατίθεται». Καταβάλλουμε κάθε εύλογη προσπάθεια για την απρόσκοπτη και ασφαλή λειτουργία της, χωρίς ωστόσο να εγγυόμαστε αδιάλειπτη διαθεσιμότητα, απουσία σφαλμάτων ή καταλληλότητα για συγκεκριμένο σκοπό.",
            "Διατηρούμε το δικαίωμα να τροποποιούμε, να αναστέλλουμε ή να διακόπτουμε, προσωρινά ή οριστικά, το σύνολο ή μέρος των λειτουργιών της Πλατφόρμας, με ή χωρίς προηγούμενη ειδοποίηση, χωρίς να γεννάται εξ αυτού του λόγου οποιαδήποτε αξίωση σε βάρος μας.",
          ],
        },
        {
          heading: "Περιορισμός ευθύνης",
          body: [
            "Στον μέγιστο βαθμό που επιτρέπεται από την ισχύουσα νομοθεσία, το Qlick δεν ευθύνεται για: (α) την ποιότητα, την εκτέλεση ή τη ματαίωση των υπηρεσιών που παρέχουν οι Επιχειρήσεις· (β) διαφορές που ανακύπτουν μεταξύ Πελατών και Επιχειρήσεων· (γ) χαμένα, ακυρωμένα ή μη τηρηθέντα ραντεβού· (δ) την ακρίβεια του περιεχομένου που αναρτούν οι Χρήστες· (ε) έμμεσες, παρεπόμενες ή αποθετικές ζημίες, συμπεριλαμβανομένου του διαφυγόντος κέρδους, που απορρέουν από τη χρήση ή την αδυναμία χρήσης της Πλατφόρμας.",
            "Ο ανωτέρω περιορισμός δεν θίγει τυχόν ευθύνη που δεν μπορεί να περιοριστεί ή να αποκλειστεί κατά τον νόμο, ιδίως ευθύνη από δόλο ή βαριά αμέλεια.",
          ],
        },
        {
          heading: "Προσωπικά δεδομένα, τροποποιήσεις & εφαρμοστέο δίκαιο",
          body: [
            "Η επεξεργασία των προσωπικών δεδομένων των Χρηστών διέπεται από την Πολιτική Απορρήτου της Πλατφόρμας, η οποία αποτελεί αναπόσπαστο μέρος των παρόντων Όρων, καθώς και από τον Γενικό Κανονισμό Προστασίας Δεδομένων (ΕΕ) 2016/679 και την εθνική νομοθεσία.",
            "Εάν οποιοσδήποτε όρος κριθεί άκυρος ή ανεφάρμοστος, οι λοιποί όροι παραμένουν σε πλήρη ισχύ. Η τυχόν μη άσκηση δικαιώματος από το Qlick δεν συνιστά παραίτηση από αυτό.",
            "Οι παρόντες Όροι διέπονται από το ελληνικό δίκαιο. Για κάθε διαφορά που ανακύπτει από ή σε σχέση με τους παρόντες Όρους ή τη χρήση της Πλατφόρμας, αρμόδια ορίζονται τα καθ' ύλην αρμόδια δικαστήρια της Ελλάδας, με την επιφύλαξη αναγκαστικού χαρακτήρα διατάξεων περί δικαιοδοσίας για καταναλωτές.",
          ],
        },
        {
          heading: "Επικοινωνία",
          body: [
            "Για οποιαδήποτε ερώτηση, διευκρίνιση ή αίτημα σχετικά με τους παρόντες Όρους, μπορείτε να επικοινωνείτε μαζί μας στο info@qlick.gr. Καταβάλλουμε προσπάθεια να απαντούμε το συντομότερο δυνατόν.",
          ],
        },
      ]
    : [
        {
          heading: "Introduction & acceptance of the terms",
          body: [
            "These Terms of Use (the “Terms”) govern access to and use of the website qlick.gr and any related services provided through it (collectively the “Platform” or “Qlick”).",
            "For the purposes of these Terms: a “Business” or “Partner” is any professional or business that maintains a business account and offers its services through the Platform; a “Customer” is any natural person who uses the Platform to discover businesses and make bookings; a “User” is any person who accesses the Platform, in any capacity.",
            "By accessing or using the Platform you fully and unconditionally accept these Terms. If you do not agree with any of the Terms, you must refrain from using the Platform.",
            "We reserve the right to amend these Terms at any time by posting the current version on this page. Continued use of the Platform after changes are posted constitutes acceptance of those changes.",
          ],
        },
        {
          heading: "Scope of the service",
          body: [
            "Qlick is an online intermediary platform for bookings with appointment-based businesses. It provides Businesses with tools to manage bookings, calendars, services, staff and promotional material (such as QR posters), and provides Customers with the ability to discover businesses and make bookings.",
            "Qlick acts solely as a technical intermediary between Customers and Businesses. The services listed on the Platform (e.g. haircuts, grooming, treatments) are provided exclusively by the Businesses, at their own responsibility. Qlick is not a party to the relationship between Customer and Business and bears no responsibility for the quality, suitability or legality of the services provided.",
            "Qlick does not process or handle payments between Customers and Businesses. Services are paid directly to the Business, using the payment methods the Business accepts.",
          ],
        },
        {
          heading: "Accounts & security",
          body: [
            "Most features of the Platform require an account. When registering, you must provide true, accurate and up-to-date information and confirm your email address. Accounts with false or misleading information may be suspended or deleted.",
            "Each natural person may maintain only one (1) account. Accounts are personal and non-transferable; selling, assigning or sharing an account with third parties is not permitted.",
            "You are solely responsible for keeping your login credentials confidential and for all activity carried out through your account. In the event of unauthorised use or a security breach, you must notify us without delay at info@qlick.gr.",
          ],
        },
        {
          heading: "Age requirement",
          body: [
            "Use of the Platform is permitted only to persons who are at least 18 years old. Minors may use the Platform only with the consent and under the supervision of a parent or legal guardian, who is responsible for their activity.",
          ],
        },
        {
          heading: "Bookings",
          body: [
            "Making a booking through the Platform requires an account with a confirmed email address. By making a booking, the Customer undertakes to attend the appointment at the scheduled time or to cancel it in good time, so the Business can offer the slot to another customer.",
            "To protect Businesses from abusive bookings, the Platform applies reasonable usage limits (for example: a maximum number of active upcoming bookings per Customer and the prevention of overlapping appointments). These limits may be adjusted at our discretion.",
            "Businesses must honor the bookings they accept through the Platform. Businesses retain the right to block specific customers from booking at their store (e.g. due to repeated no-shows).",
            "Systematic failure to attend appointments, fictitious bookings and any other abusive use of the booking system constitute a violation of these Terms.",
          ],
        },
        {
          heading: "Business obligations",
          body: [
            "Businesses are solely responsible for all content they publish on the Platform, including without limitation their name, description, photos, services, prices, opening hours and staff details. This content must be true, accurate, up-to-date and lawful.",
            "Businesses warrant that they operate lawfully, that they hold all licences and approvals required by law for the services they offer, and that they comply with applicable legislation, in particular regarding hygiene, safety, consumer protection and personal data.",
            "Listing fictitious, false or misleading businesses or services is prohibited, as is using the Platform to promote services that are unlawful or contrary to public morals. Such listings are removed and the related accounts are suspended or deleted.",
          ],
        },
        {
          heading: "Acceptable use — prohibited conduct",
          body: [
            "The Platform may be used only for lawful purposes and in accordance with these Terms. Without limitation, the following are prohibited: (a) using the Platform for unlawful, fraudulent or abusive activity; (b) posting false, offensive, abusive, defamatory, obscene, threatening or discriminatory information or content; (c) impersonating any person or misrepresenting your affiliation with any person or entity; (d) harassing, intimidating or defrauding other Users; (e) sending unsolicited or bulk messages (spam); (f) transmitting viruses or other malicious code; (g) automated data extraction (scraping), the use of bots, and any activity that burdens or disrupts the proper operation of the Platform; (h) attempting to gain unauthorised access to the Platform, its servers or its systems; (i) copying, reproducing or commercially exploiting the Platform or any part of it without our prior written consent.",
            "We reserve the right, without any obligation, to review content published on the Platform and to remove, at our sole discretion and without prior notice, any content that violates these Terms or the law.",
          ],
        },
        {
          heading: "Account suspension & deletion",
          body: [
            "If any User (Business or Customer) violates these Terms or applicable law, Qlick reserves the right, at its sole discretion, to temporarily suspend or permanently delete the relevant account, with or without prior notice, and to remove all or part of its published content.",
            "While an account is suspended, it cannot make new bookings and, in the case of Businesses, the store is no longer visible on the Platform and cannot accept bookings.",
            "If you believe your account was suspended or deleted in error, you may contact us at info@qlick.gr so we can review your case.",
            "Suspension or deletion of an account is without prejudice to any other rights or claims of Qlick arising from the law or these Terms.",
          ],
        },
        {
          heading: "Subscriptions & trial period",
          body: [
            "Use of the Platform by Businesses is provided with a free trial period, followed by a paid subscription. The duration of the trial period and the current prices are shown on the Platform's pricing page.",
            "Subscription billing, renewals, cancellations and any refunds are governed by the terms in force at the time the relevant subscription is activated. After the trial period or subscription expires, certain features may be limited until a subscription is activated.",
          ],
        },
        {
          heading: "Intellectual property & user content",
          body: [
            "The Platform, including without limitation its software, design, graphics, texts, logos and the distinctive signs of Qlick, is the intellectual property of Qlick or its licensors and is protected by applicable law. No rights in them are transferred to Users through the use of the Platform.",
            "Content uploaded by Businesses (e.g. name, logo, photos, descriptions) remains their property. By uploading it, Businesses grant Qlick a non-exclusive, royalty-free licence to use, reproduce and display that content to the extent necessary for the operation and promotion of the Platform.",
            "Users warrant that the content they upload does not infringe the rights of third parties, including intellectual property rights and personal data rights.",
          ],
        },
        {
          heading: "Availability & disclaimer of warranties",
          body: [
            "The Platform is provided “as is” and “as available”. We make every reasonable effort to keep it operating smoothly and securely, but we do not guarantee uninterrupted availability, freedom from errors or fitness for a particular purpose.",
            "We reserve the right to modify, suspend or discontinue, temporarily or permanently, all or part of the Platform's features, with or without prior notice, without any claim arising against us as a result.",
          ],
        },
        {
          heading: "Limitation of liability",
          body: [
            "To the maximum extent permitted by applicable law, Qlick is not liable for: (a) the quality, performance or cancellation of the services provided by Businesses; (b) disputes arising between Customers and Businesses; (c) missed, cancelled or unfulfilled appointments; (d) the accuracy of content posted by Users; (e) indirect, incidental or consequential damages, including loss of profit, arising from the use of or inability to use the Platform.",
            "The above limitation does not affect any liability that cannot be limited or excluded by law, in particular liability arising from intent or gross negligence.",
          ],
        },
        {
          heading: "Personal data, amendments & governing law",
          body: [
            "The processing of Users' personal data is governed by the Platform's Privacy Policy, which forms an integral part of these Terms, as well as by the General Data Protection Regulation (EU) 2016/679 and national legislation.",
            "If any provision of these Terms is held invalid or unenforceable, the remaining provisions remain in full force. Any failure by Qlick to exercise a right does not constitute a waiver of that right.",
            "These Terms are governed by Greek law. Any dispute arising out of or in connection with these Terms or the use of the Platform is subject to the jurisdiction of the competent courts of Greece, without prejudice to mandatory consumer jurisdiction provisions.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "For any question, clarification or request regarding these Terms, you can contact us at info@qlick.gr. We make every effort to respond as soon as possible.",
          ],
        },
      ];

  return (
    <LegalPage
      eyebrow={isEl ? "Όροι Χρήσης" : "Terms of Service"}
      title={isEl ? "Όροι Χρήσης" : "Terms of Service"}
      updated={isEl ? "Τελευταία ενημέρωση: Ιούλιος 2026" : "Last updated: July 2026"}
      intro={
        isEl
          ? "Οι παρόντες Όροι Χρήσης διέπουν την πρόσβαση και τη χρήση της πλατφόρμας Qlick. Παρακαλούμε διαβάστε τους προσεκτικά· η χρήση της πλατφόρμας συνεπάγεται την αποδοχή τους."
          : "These Terms of Use govern access to and use of the Qlick platform. Please read them carefully; by using the platform you agree to be bound by them."
      }
      sections={sections}
    />
  );
}
