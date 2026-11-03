/** A Birthday Bridge page's content is visible once it is unlocked or its unlock time has passed. */
export function isPageOpen(page: { isLocked: boolean; unlockAt: Date }, now = new Date()) {
  return !page.isLocked || page.unlockAt.getTime() <= now.getTime();
}

/** Only a reviewed (approved) or already-delivered speech may be shown on a page. */
export function isSurprisePublishable(surprise: { status: string; soft_delete?: boolean } | null | undefined) {
  if (!surprise || surprise.soft_delete) return false;
  return surprise.status === "approved" || surprise.status === "sent";
}
