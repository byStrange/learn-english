/**
 * Runs `update` inside a view transition when the browser has one and the
 * learner has not asked for reduced motion; otherwise just runs it.
 */
export function withViewTransition(update: () => void): void {
  const doc = typeof document !== 'undefined' ? (document as Document & {startViewTransition?: (cb: () => void) => unknown}) : null;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (doc?.startViewTransition && !reduced) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
