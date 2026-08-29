(() => {
  const root = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const siteReducedMotion = root.classList.contains("a11y-reduce-motion") || body?.classList.contains("a11y-reduce-motion");

  if (prefersReducedMotion || siteReducedMotion) return;

  window.requestAnimationFrame(() => root.classList.add("journey-arrived"));
})();
