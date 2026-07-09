// Ready-made notification emails the platform admin copies and sends
// manually (from info@qlick.gr) when suspending or deleting an account
// that violated the Terms of Use.

export type AdminEmailKind = "suspend" | "delete";
export type AdminEmailLang = "el" | "en";

export interface AdminEmailOptions {
  /** Recipient's display name (person). */
  recipientName?: string | null;
  /** Present when the action concerns a business account/store. */
  businessName?: string | null;
}

const SUPPORT_EMAIL = "info@qlick.gr";
const SITE = "www.qlick.gr";

function termsUrl(lang: AdminEmailLang) {
  return `https://www.qlick.gr/${lang}/terms`;
}

export function buildAdminEmail(
  kind: AdminEmailKind,
  lang: AdminEmailLang,
  opts: AdminEmailOptions = {},
): { subject: string; body: string } {
  const name = opts.recipientName?.trim();
  const biz = opts.businessName?.trim();

  if (lang === "el") {
    const greeting = name ? `Αγαπητέ/ή ${name},` : "Αγαπητέ/ή χρήστη,";
    if (kind === "suspend") {
      return {
        subject: "Qlick — Ο λογαριασμός σας τέθηκε σε αναστολή",
        body: `${greeting}

Σας ενημερώνουμε ότι ο λογαριασμός σας στο Qlick τέθηκε σε αναστολή, καθώς διαπιστώθηκε παραβίαση των Όρων Χρήσης της πλατφόρμας.
${
  biz
    ? `
Όσο ισχύει η αναστολή, το κατάστημά σας «${biz}» δεν εμφανίζεται στην πλατφόρμα και δεν δέχεται κρατήσεις.
`
    : `
Όσο ισχύει η αναστολή, δεν είναι δυνατή η πραγματοποίηση νέων κρατήσεων μέσω της πλατφόρμας.
`
}
Μπορείτε να διαβάσετε τους Όρους Χρήσης εδώ:
${termsUrl("el")}

Εάν θεωρείτε ότι πρόκειται για λάθος ή χρειάζεστε διευκρινίσεις, επικοινωνήστε μαζί μας στο ${SUPPORT_EMAIL} και θα εξετάσουμε το αίτημά σας.

Με εκτίμηση,
Η ομάδα του Qlick
${SITE}`,
      };
    }
    return {
      subject: "Qlick — Ο λογαριασμός σας διαγράφηκε",
      body: `${greeting}

Σας ενημερώνουμε ότι ο λογαριασμός σας στο Qlick${biz ? ` και το κατάστημα «${biz}»` : ""} διαγράφηκαν οριστικά, καθώς διαπιστώθηκε παραβίαση των Όρων Χρήσης της πλατφόρμας.

Μπορείτε να διαβάσετε τους Όρους Χρήσης εδώ:
${termsUrl("el")}

Εάν θεωρείτε ότι πρόκειται για λάθος ή χρειάζεστε διευκρινίσεις, επικοινωνήστε μαζί μας στο ${SUPPORT_EMAIL} και θα εξετάσουμε το αίτημά σας.

Με εκτίμηση,
Η ομάδα του Qlick
${SITE}`,
    };
  }

  const greeting = name ? `Dear ${name},` : "Dear user,";
  if (kind === "suspend") {
    return {
      subject: "Qlick — Your account has been suspended",
      body: `${greeting}

We are writing to inform you that your Qlick account has been suspended due to a violation of the platform's Terms of Use.
${
  biz
    ? `
While the suspension is in effect, your store "${biz}" is not visible on the platform and cannot accept bookings.
`
    : `
While the suspension is in effect, you cannot make new bookings through the platform.
`
}
You can read the Terms of Use here:
${termsUrl("en")}

If you believe this is a mistake or you need any clarification, please contact us at ${SUPPORT_EMAIL} and we will review your case.

Kind regards,
The Qlick team
${SITE}`,
    };
  }
  return {
    subject: "Qlick — Your account has been deleted",
    body: `${greeting}

We are writing to inform you that your Qlick account${biz ? ` and your store "${biz}"` : ""} have been permanently deleted due to a violation of the platform's Terms of Use.

You can read the Terms of Use here:
${termsUrl("en")}

If you believe this is a mistake or you need any clarification, please contact us at ${SUPPORT_EMAIL} and we will review your case.

Kind regards,
The Qlick team
${SITE}`,
  };
}
