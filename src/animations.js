(() => {
  const motion = window.Motion;
  if (!motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { animate, stagger, hover } = motion;
  const ease = [0.22, 1, 0.36, 1];

  function animatePage(page) {
    if (!page) return;
    const heading = page.querySelector('.panel-header');
    const items = page.querySelectorAll('.mode-card, .version-card, .settings-box, .loader-glass-card, .step-card, .security-banner, .content-item, .empty-state-card');
    if (heading) animate(heading, { opacity: [0, 1], y: [8, 0] }, { duration: 0.28, ease });
    if (items.length) animate(items, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, delay: stagger(0.025), ease });
  }

  function animateSelect(root) {
    if (!root?.classList.contains('open')) return;
    const panel = root.querySelector('.select-content');
    const options = root.querySelectorAll('.select-option');
    if (panel) animate(panel, { opacity: [0, 1], y: [4, 0] }, { duration: 0.14, ease });
    if (options.length) animate(options, { opacity: [0, 1] }, { duration: 0.14, delay: stagger(0.012), ease });
  }

  requestAnimationFrame(() => {
    // Initial entrance animations
    animate('.nav-dock', { opacity: [0, 1], x: [-14, 0] }, { duration: 0.35, ease });
    animate('.nav-item', { opacity: [0, 1] }, { duration: 0.25, delay: stagger(0.02), ease });
    animate('.topbar', { opacity: [0, 1] }, { duration: 0.3, ease });
    animate('.hero-top-badge', { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, delay: 0.08, ease });
    animate('.hero-title', { opacity: [0, 1], y: [12, 0] }, { duration: 0.35, delay: 0.12, ease });
    animate('.hero-desc', { opacity: [0, 1], y: [10, 0] }, { duration: 0.32, delay: 0.16, ease });
    animate('.hero-cta-group', { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, delay: 0.2, ease });
    animate('.quick-config-bar', { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, delay: 0.24, ease });
    animate('.hero-ticker', { opacity: [0, 1], y: [6, 0] }, { duration: 0.3, delay: 0.28, ease });
  });

  // Page switch animation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      requestAnimationFrame(() => animatePage(document.querySelector('.page.active')));
    });
  });

  // Custom Select Animations
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.select-trigger');
    if (trigger) requestAnimationFrame(() => animateSelect(trigger.closest('.custom-select')));
  });

  // Content items mutation observer
  const contentObserver = new MutationObserver(records => {
    const added = records.flatMap(record => [...record.addedNodes]).filter(node => node.nodeType === 1 && node.classList?.contains('content-item'));
    if (added.length) animate(added, { opacity: [0, 1], y: [6, 0] }, { duration: 0.22, delay: stagger(0.02), ease });
  });
  const contentList = document.querySelector('#contentList');
  if (contentList) contentObserver.observe(contentList, { childList: true });

  // Subtle tactile hover (No scale grow)
  hover('.btn-play, .btn-primary-purple', element => {
    animate(element, { y: -1 }, { duration: 0.12, ease });
    return () => animate(element, { y: 0 }, { duration: 0.14, ease });
  });

  hover('.mode-card, .version-card, .content-item', element => {
    animate(element, { y: -1 }, { duration: 0.12, ease });
    return () => animate(element, { y: 0 }, { duration: 0.14, ease });
  });
})();
