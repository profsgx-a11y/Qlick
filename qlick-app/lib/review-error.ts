import type { Dictionary } from "@/i18n/shared";

/**
 * Maps a stable review error code (returned by createReview/updateReview) to a
 * localized message from the account dictionary. Mirrors the dashboard's
 * dashErr() pattern so the server never sends locale-specific strings.
 */
export function reviewError(
  acc: Dictionary["account"],
  code: string | undefined,
): string {
  switch (code) {
    case "booking_not_completed":
      return acc.errReviewNotCompleted;
    case "review_window_closed":
      return acc.errReviewWindowClosed;
    case "already_reviewed":
      return acc.errAlreadyReviewed;
    case "booking_not_found":
      return acc.errBookingNotFound;
    case "review_not_found":
      return acc.errReviewNotFound;
    case "invalid_rating":
      return acc.pickRating;
    default:
      return acc.genericError;
  }
}
