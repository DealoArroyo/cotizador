// Re-run Lucide on mutations for dynamic icon rendering
const iconObserver = new MutationObserver(() => {
  if (window.lucide) {
    const newIcons = document.querySelectorAll('i[data-lucide]:not([data-rendered])');
    if (newIcons.length) {
      newIcons.forEach(el => el.setAttribute('data-rendered', '1'));
      lucide.createIcons({ nodes: [...newIcons].map(el => el.parentElement).filter(Boolean) });
    }
  }
});
iconObserver.observe(document.body, { childList: true, subtree: true });

// Mobile overlay
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('mobile-menu-btn');
  if (sidebar?.classList.contains('sidebar--open') && !sidebar.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    sidebar.classList.remove('sidebar--open');
  }
});
