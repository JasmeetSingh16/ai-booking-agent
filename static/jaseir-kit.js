// GENERATED — edit in dashboard/, then run scripts/sync-shared.mjs

/* ------------------------------------------------------------------ */
/* JASEIR KIT (static) — header behaviour for non-React pages:         */
/* scroll state, AI Agents mega-menu, full-screen mobile menu, and the */
/* footer year. Mirrors components/layout/SiteHeader.tsx.             */
/* SOURCE OF TRUTH: edit in dashboard/static-kit/, then run            */
/* `node scripts/sync-shared.mjs`.                                     */
/* ------------------------------------------------------------------ */

(function () {
  var header = document.querySelector(".jk-header");
  if (!header) return;

  var trigger = header.querySelector(".jk-nav-trigger");
  var mega = header.querySelector(".jk-mega");
  var wrap = header.querySelector(".jk-mega-wrap");
  var burger = header.querySelector(".jk-header-actions .jk-burger");
  var mobile = header.querySelector(".jk-mobile");
  var mobileClose = header.querySelector(".jk-mobile-close");
  var root = document.documentElement;

  /* Background + border once the page has scrolled. */
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8 || !mobile.hidden);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mega-menu */
  var hoverTimer;
  var hoverOpenedAt = 0;
  function setMega(open) {
    mega.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  }
  trigger.addEventListener("click", function () {
    clearTimeout(hoverTimer);
    if (!mega.hidden && Date.now() - hoverOpenedAt < 500) return;
    setMega(mega.hidden);
  });
  if (window.matchMedia("(hover: hover)").matches) {
    wrap.addEventListener("mouseenter", function () {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        hoverOpenedAt = Date.now();
        setMega(true);
      }, 60);
    });
    wrap.addEventListener("mouseleave", function () {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        setMega(false);
      }, 160);
    });
  }
  wrap.addEventListener("focusout", function (e) {
    if (!wrap.contains(e.relatedTarget)) setMega(false);
  });
  document.addEventListener("pointerdown", function (e) {
    if (!mega.hidden && !wrap.contains(e.target)) setMega(false);
  });

  /* Mobile menu */
  function setMobile(open, returnFocus) {
    mobile.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    root.classList.toggle("jk-scroll-lock", open);
    onScroll();
    if (open) mobileClose.focus();
    else if (returnFocus) burger.focus();
  }
  burger.addEventListener("click", function () {
    setMobile(true);
  });
  mobileClose.addEventListener("click", function () {
    setMobile(false, true);
  });
  mobile.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMobile(false);
  });
  window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) {
    if (e.matches && !mobile.hidden) setMobile(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!mobile.hidden) setMobile(false, true);
    else if (!mega.hidden) {
      setMega(false);
      trigger.focus();
    }
  });

  /* Footer year (the markup is rendered at build time). */
  var bottom = document.querySelector(".jk-footer-bottom p");
  if (bottom) bottom.innerHTML = bottom.innerHTML.replace(/© \d{4}/, "© " + new Date().getFullYear());
})();
