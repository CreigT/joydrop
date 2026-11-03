/** A Birthday Bridge page's content is visible once it is unlocked or its unlock time has passed. */
export function isPageOpen(page: { isLocked: boolean; unlockAt: Date }, now = new Date()) {
  return !page.isLocked || page.unlockAt.getTime() <= now.getTime();
}
