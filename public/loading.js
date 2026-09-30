// Show the circular brand while the initial page resources are loading.
const splash = document.createElement('div');
splash.id = 'site-splash';
splash.setAttribute('role', 'status');
splash.setAttribute('aria-live', 'polite');
splash.innerHTML = '<div class="splash-inner"><div class="splash-logo"><img src="/assets/brand-logo.svg" alt="Awl Lahza / أول لحظة"></div><div class="splash-name">Awl Lahza</div><div class="splash-sub" lang="ar" dir="rtl">أول لحظة</div><p class="loading-caption">Loading… · جارٍ التحميل…</p></div>';
document.body.append(splash);
document.body.classList.add('is-loading');
let finished = false;
function dismissSplash() {
  if (finished) return;
  finished = true;
  clearTimeout(fallback);
  document.body.classList.remove('is-loading');
  splash.remove();
}
// An unavailable map or other external resource must not block the application.
const fallback = setTimeout(dismissSplash, 5000);
if (document.readyState === 'complete') dismissSplash();
else window.addEventListener('load', dismissSplash, { once: true });
