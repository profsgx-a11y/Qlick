/**
 * Auth dictionary — strings used in /login and /signup pages.
 * Will be merged into the main JSON dictionaries in a follow-up.
 */
export interface AuthDict {
  social: {
    googleLogin: string;
    facebookLogin: string;
    googleSignup: string;
    facebookSignup: string;
    or: string;
  };
  passwordStrength: {
    length: string;
    uppercase: string;
    number: string;
    symbol: string;
    weak: string;
    medium: string;
    strong: string;
  };
  forgot: {
    title: string;
    subtitle: string;
    email: string;
    submit: string;
    submitting: string;
    sent: string;
    back: string;
  };
  reset: {
    title: string;
    subtitle: string;
    newPassword: string;
    confirmPassword: string;
    submit: string;
    submitting: string;
    mismatch: string;
    tooShort: string;
    failed: string;
    noSession: string;
    noSessionCta: string;
  };
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    submitting: string;
    noAccount: string;
    signUp: string;
    oauthError: string;
    forgotPassword: string;
    backHome: string;
    error: string;
  };
  chooser: {
    title: string;
    subtitle: string;
    customerTitle: string;
    customerDesc: string;
    customerCta: string;
    businessTitle: string;
    businessDesc: string;
    businessCta: string;
    haveAccount: string;
    logIn: string;
  };
  customer: {
    title: string;
    subtitle: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneOptional: string;
    password: string;
    passwordHint: string;
    submit: string;
    submitting: string;
    haveAccount: string;
    logIn: string;
    isBusiness: string;
    businessLink: string;
  };
  signup: {
    title: string;
    subtitle: string;
    stepOf: string;
    steps: {
      account: string;
      business: string;
      hours: string;
      finish: string;
    };
    account: {
      title: string;
      firstName: string;
      lastName: string;
      email: string;
      emailInvalid: string;
      emailTaken: string;
      password: string;
      passwordHint: string;
    };
    business: {
      title: string;
      name: string;
      nameHint: string;
      category: string;
      categoryPlaceholder: string;
      phone: string;
      phoneOptional: string;
      city: string;
      area: string;
      address: string;
      addressHint: string;
      addressPlaceholder: string;
      mobile: string;
      mobileInvalid: string;
      landline: string;
      landlineInvalid: string;
      postcode: string;
    };
    hours: {
      title: string;
      subtitle: string;
      closed: string;
      open: string;
      copyToAll: string;
      afternoon: string;
      remove: string;
      addAfternoon: string;
    };
    finish: {
      title: string;
      subtitle: string;
    };
    next: string;
    back: string;
    submit: string;
    submitting: string;
    haveAccount: string;
    logIn: string;
    errorEmailTaken: string;
    errorSlugTaken: string;
    errorGeneric: string;
  };
  days: readonly [string, string, string, string, string, string, string];
}

export const authDict: Record<"el" | "en", AuthDict> = {
  el: {
    social: {
      googleLogin: "Σύνδεση με Google",
      facebookLogin: "Σύνδεση με Facebook",
      googleSignup: "Εγγραφή με Google",
      facebookSignup: "Εγγραφή με Facebook",
      or: "ή",
    },
    passwordStrength: {
      length: "Τουλάχιστον 8 χαρακτήρες",
      uppercase: "Ένα κεφαλαίο γράμμα",
      number: "Έναν αριθμό",
      symbol: "Ένα σύμβολο (π.χ. !@#)",
      weak: "Αδύναμος κωδικός",
      medium: "Μέτριος κωδικός",
      strong: "Ισχυρός κωδικός",
    },
    forgot: {
      title: "Ξέχασες τον κωδικό;",
      subtitle: "Γράψε το email σου και θα σου στείλουμε σύνδεσμο για να ορίσεις νέο κωδικό.",
      email: "Email",
      submit: "Στείλε μου σύνδεσμο",
      submitting: "Αποστολή...",
      sent: "Αν υπάρχει λογαριασμός με αυτό το email, σου στείλαμε σύνδεσμο επαναφοράς. Έλεγξε τα εισερχόμενα και τα ανεπιθύμητα.",
      back: "Πίσω στη σύνδεση",
    },
    reset: {
      title: "Νέος κωδικός",
      subtitle: "Όρισε τον νέο κωδικό του λογαριασμού σου.",
      newPassword: "Νέος κωδικός",
      confirmPassword: "Επιβεβαίωση κωδικού",
      submit: "Αποθήκευση κωδικού",
      submitting: "Αποθήκευση...",
      mismatch: "Οι κωδικοί δεν ταιριάζουν.",
      tooShort: "Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες.",
      failed: "Η αλλαγή κωδικού δεν ολοκληρώθηκε. Δοκίμασε ξανά.",
      noSession: "Ο σύνδεσμος έληξε ή δεν είναι έγκυρος. Ζήτησε νέο σύνδεσμο επαναφοράς.",
      noSessionCta: "Ζήτησε νέο σύνδεσμο",
    },
    login: {
      title: "Καλώς ήρθες πίσω",
      subtitle: "Συνδέσου στον λογαριασμό σου",
      email: "Email",
      password: "Κωδικός",
      submit: "Σύνδεση",
      submitting: "Σύνδεση...",
      noAccount: "Δεν έχεις λογαριασμό;",
      signUp: "Δημιούργησε λογαριασμό",
      oauthError: "Η σύνδεση δεν ολοκληρώθηκε. Δοκίμασε ξανά.",
      forgotPassword: "Ξέχασες τον κωδικό;",
      backHome: "Επιστροφή στην αρχική",
      error: "Λάθος email ή κωδικός. Δοκίμασε ξανά.",
    },
    chooser: {
      title: "Πώς θες να ξεκινήσεις;",
      subtitle: "Διάλεξε τι ταιριάζει σε εσένα.",
      customerTitle: "Είμαι πελάτης",
      customerDesc: "Κλείσε ραντεβού στα αγαπημένα σου καταστήματα και δες το ιστορικό σου.",
      customerCta: "Εγγραφή ως πελάτης",
      businessTitle: "Είμαι επιχείρηση",
      businessDesc: "Διαχειρίσου ραντεβού, προσωπικό και QR poster — 3 μήνες δωρεάν.",
      businessCta: "Εγγραφή επιχείρησης",
      haveAccount: "Έχεις ήδη λογαριασμό;",
      logIn: "Σύνδεση",
    },
    customer: {
      title: "Φτιάξε λογαριασμό πελάτη",
      subtitle: "Λίγα δευτερόλεπτα — και κλείνεις ραντεβού με ένα κλικ.",
      firstName: "Όνομα",
      lastName: "Επίθετο",
      email: "Email",
      phone: "Κινητό τηλέφωνο",
      phoneOptional: "(προαιρετικό)",
      password: "Κωδικός",
      passwordHint: "Τουλάχιστον 8 χαρακτήρες",
      submit: "Δημιουργία λογαριασμού",
      submitting: "Δημιουργία...",
      haveAccount: "Έχεις ήδη λογαριασμό;",
      logIn: "Σύνδεση",
      isBusiness: "Είσαι επιχείρηση;",
      businessLink: "Εγγραφή επιχείρησης",
    },
    signup: {
      title: "Ξεκίνα με το Qlick",
      subtitle: "Φτιάξε λογαριασμό και κατάστημα — 3 μήνες δωρεάν",
      stepOf: "Βήμα {current} από {total}",
      steps: {
        account: "Λογαριασμός",
        business: "Κατάστημα",
        hours: "Ωράριο",
        finish: "Τέλος",
      },
      account: {
        title: "Φτιάξε λογαριασμό",
        firstName: "Όνομα",
        lastName: "Επίθετο",
        email: "Email",
        emailInvalid: "Μη έγκυρο email (π.χ. name@example.com)",
        emailTaken: "Αυτό το email χρησιμοποιείται ήδη.",
        password: "Κωδικός",
        passwordHint: "Τουλάχιστον 8 χαρακτήρες",
      },
      business: {
        title: "Στοιχεία καταστήματος",
        name: "Όνομα καταστήματος",
        nameHint: "Π.χ. Barber House",
        category: "Κατηγορία",
        categoryPlaceholder: "Διάλεξε κατηγορία",
        phone: "Τηλέφωνο",
        phoneOptional: "(προαιρετικό)",
        city: "Πόλη",
        area: "Περιοχή / Γειτονιά",
        address: "Διεύθυνση",
        addressHint: "Γράψε και διάλεξε από τις προτάσεις",
        addressPlaceholder: "π.χ. Ερμού 10, Αθήνα",
        mobile: "Κινητό",
        mobileInvalid: "Μη έγκυρος αριθμός κινητού",
        landline: "Σταθερό",
        landlineInvalid: "Μη έγκυρος αριθμός σταθερού",
        postcode: "Τ.Κ.",
      },
      hours: {
        title: "Ωράριο λειτουργίας",
        subtitle: "Μπορείς να το αλλάξεις οποτεδήποτε από το dashboard.",
        closed: "Κλειστά",
        open: "Ανοιχτά",
        copyToAll: "Αντιγραφή σε όλες",
        afternoon: "Απόγ.",
        remove: "Αφαίρεση",
        addAfternoon: "+ Προσθήκη απογευματινού ωραρίου",
      },
      finish: {
        title: "Έτοιμο!",
        subtitle: "Το κατάστημά σου είναι έτοιμο. Πάμε στο dashboard.",
      },
      next: "Επόμενο",
      back: "Πίσω",
      submit: "Δημιουργία λογαριασμού",
      submitting: "Δημιουργία...",
      haveAccount: "Έχεις ήδη λογαριασμό;",
      logIn: "Σύνδεση",
      errorEmailTaken: "Αυτό το email χρησιμοποιείται ήδη.",
      errorSlugTaken: "Αυτό το όνομα καταστήματος υπάρχει ήδη — δοκίμασε άλλο.",
      errorGeneric: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
    },
    days: ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"],
  },
  en: {
    social: {
      googleLogin: "Continue with Google",
      facebookLogin: "Continue with Facebook",
      googleSignup: "Sign up with Google",
      facebookSignup: "Sign up with Facebook",
      or: "or",
    },
    passwordStrength: {
      length: "At least 8 characters",
      uppercase: "One uppercase letter",
      number: "One number",
      symbol: "One symbol (e.g. !@#)",
      weak: "Weak password",
      medium: "Medium password",
      strong: "Strong password",
    },
    forgot: {
      title: "Forgot your password?",
      subtitle: "Enter your email and we'll send you a link to set a new password.",
      email: "Email",
      submit: "Send me a link",
      submitting: "Sending...",
      sent: "If an account exists with this email, we've sent a reset link. Check your inbox and spam folder.",
      back: "Back to log in",
    },
    reset: {
      title: "New password",
      subtitle: "Set the new password for your account.",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      submit: "Save password",
      submitting: "Saving...",
      mismatch: "Passwords don't match.",
      tooShort: "The password needs at least 8 characters.",
      failed: "The password change didn't go through. Try again.",
      noSession: "This link has expired or is invalid. Request a new reset link.",
      noSessionCta: "Request a new link",
    },
    login: {
      title: "Welcome back",
      subtitle: "Log in to your account",
      email: "Email",
      password: "Password",
      submit: "Log in",
      submitting: "Logging in...",
      noAccount: "Don't have an account?",
      signUp: "Create one",
      oauthError: "Sign-in didn't complete. Please try again.",
      forgotPassword: "Forgot password?",
      backHome: "Back to home",
      error: "Invalid email or password. Try again.",
    },
    chooser: {
      title: "How would you like to start?",
      subtitle: "Pick what fits you.",
      customerTitle: "I'm a customer",
      customerDesc: "Book appointments at your favorite places and track your history.",
      customerCta: "Sign up as a customer",
      businessTitle: "I'm a business",
      businessDesc: "Manage bookings, staff and your QR poster — 3 months free.",
      businessCta: "Sign up your business",
      haveAccount: "Already have an account?",
      logIn: "Log in",
    },
    customer: {
      title: "Create a customer account",
      subtitle: "A few seconds — then book in one click.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Mobile phone",
      phoneOptional: "(optional)",
      password: "Password",
      passwordHint: "At least 8 characters",
      submit: "Create account",
      submitting: "Creating...",
      haveAccount: "Already have an account?",
      logIn: "Log in",
      isBusiness: "Are you a business?",
      businessLink: "Sign up your business",
    },
    signup: {
      title: "Get started with Qlick",
      subtitle: "Create your account and business — 3 months free",
      stepOf: "Step {current} of {total}",
      steps: {
        account: "Account",
        business: "Business",
        hours: "Hours",
        finish: "Done",
      },
      account: {
        title: "Create your account",
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        emailInvalid: "Invalid email (e.g. name@example.com)",
        emailTaken: "This email is already in use.",
        password: "Password",
        passwordHint: "At least 8 characters",
      },
      business: {
        title: "Business details",
        name: "Business name",
        nameHint: "e.g. Barber House",
        category: "Category",
        categoryPlaceholder: "Choose a category",
        phone: "Phone",
        phoneOptional: "(optional)",
        city: "City",
        area: "Area / Neighborhood",
        address: "Address",
        addressHint: "Type and pick from the suggestions",
        addressPlaceholder: "e.g. 10 Ermou St, Athens",
        mobile: "Mobile",
        mobileInvalid: "Invalid mobile number",
        landline: "Landline",
        landlineInvalid: "Invalid landline number",
        postcode: "Postcode",
      },
      hours: {
        title: "Opening hours",
        subtitle: "You can change these anytime from your dashboard.",
        closed: "Closed",
        open: "Open",
        copyToAll: "Copy to all",
        afternoon: "Aftn.",
        remove: "Remove",
        addAfternoon: "+ Add afternoon hours",
      },
      finish: {
        title: "All set!",
        subtitle: "Your business is ready. Let's go to the dashboard.",
      },
      next: "Next",
      back: "Back",
      submit: "Create account",
      submitting: "Creating...",
      haveAccount: "Already have an account?",
      logIn: "Log in",
      errorEmailTaken: "This email is already in use.",
      errorSlugTaken: "This business name is taken — try another.",
      errorGeneric: "Something went wrong. Please try again.",
    },
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
};
