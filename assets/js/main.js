(() => {
  const header = document.querySelector(".site-header");
  const navLinks = [...document.querySelectorAll('nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const cleanUrl = () => {
    try {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    } catch {
      // Real fragment links remain a functional fallback when history is unavailable.
    }
  };

  const destinationFor = (target) => {
    if (target.id === "top") return 0;
    const headerHeight = header?.offsetHeight ?? 0;
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight - 12);
  };

  document
    .querySelectorAll('.site-header a[href^="#"], .footer-wordmark[href^="#"], .back-to-top[href^="#"]')
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;

        event.preventDefault();
        window.scrollTo({
          top: destinationFor(target),
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
        cleanUrl();
      });
    });

  let scrollFrame;
  const updateActiveLink = () => {
    const threshold = (header?.offsetHeight ?? 0) + 32;
    let current = sections[0]?.id;

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= threshold) current = section.id;
    });

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const queueActiveUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateActiveLink();
      scrollFrame = undefined;
    });
  };

  window.addEventListener("scroll", queueActiveUpdate, { passive: true });
  window.addEventListener("resize", queueActiveUpdate);

  const alignHashTarget = () => {
    if (!window.location.hash) return;
    const initialTarget = document.querySelector(window.location.hash);
    if (initialTarget) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: destinationFor(initialTarget), behavior: "auto" });
        cleanUrl();
        updateActiveLink();
      });
    }
  };

  window.addEventListener("hashchange", alignHashTarget);
  alignHashTarget();
  updateActiveLink();
})();
