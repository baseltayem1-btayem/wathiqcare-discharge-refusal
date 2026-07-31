export type FilledDraftStatus = "idle" | "loading" | "current" | "stale" | "error";

/**
 * The filled-preview review action is available only when the generated filled
 * draft is current and actually displayed.
 */
export function isFilledDraftReviewable(
  filledDraftStatus: FilledDraftStatus,
  draftPdfUrl: string | undefined,
  filledDraftReviewed: boolean,
): boolean {
  return filledDraftStatus === "current" && Boolean(draftPdfUrl) && !filledDraftReviewed;
}
