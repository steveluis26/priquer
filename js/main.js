document.addEventListener('DOMContentLoaded', () => {

  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 40
      ? 'rgba(8,8,16,0.95)'
      : 'rgba(8,8,16,0.8)';
  });

  // Hamburger menu
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  const navOverlay = document.querySelector('.nav-overlay');

  function toggleNav() {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    if (navOverlay) navOverlay.classList.toggle('show');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', toggleNav);
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', toggleNav);
  }

  // Close nav on link click (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (navLinks.classList.contains('open')) toggleNav();
    });
  });

  // Card entrance animation
  const cards = document.querySelectorAll('.tool-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${i * 0.07}s`;
        entry.target.classList.add('card-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });

  const style = document.createElement('style');
  style.textContent = '.card-visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  // Fetch counters from API
  fetchCounters();
});

async function fetchCounters() {
  const els = document.querySelectorAll('[data-counter]');
  if (!els.length) return;

  const tools = [...new Set(Array.from(els).map(el => el.dataset.counter))];

  if (tools.includes('total')) {
    try {
      const res = await fetch('/api/counter');
      if (res.ok) {
        const all = await res.json();
        const totalAll = Object.values(all).reduce((s, d) => s + (d.all || 0), 0);
        const key = getMonthKey();
        const totalMonth = Object.values(all).reduce((s, d) => s + (d.monthly?.[key] || 0), 0);

        document.querySelectorAll('[data-counter="total"]').forEach(el => {
          if (el.dataset.type === 'all') el.textContent = totalAll.toLocaleString();
          else if (el.dataset.type === 'month') el.textContent = totalMonth.toLocaleString();
        });
      }
    } catch (_) {}
  }

  for (const tool of tools) {
    if (tool === 'total') continue;
    try {
      const res = await fetch(`/api/counter/${tool}`);
      if (!res.ok) continue;
      const data = await res.json();
      const items = document.querySelectorAll(`[data-counter="${tool}"]`);

      items.forEach(el => {
        const type = el.dataset.type;
        if (type === 'all') el.textContent = (data.all || 0).toLocaleString();
        else if (type === 'month') {
          const key = getMonthKey();
          el.textContent = (data.monthly?.[key] || 0).toLocaleString();
        }
      });
    } catch (_) {}
  }
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function incrementCounter(toolName) {
  try {
    await fetch(`/api/counter/${toolName}/increment`, { method: 'POST' });
  } catch (_) {}
}

// --- Analytics ---
function trackEvent(category, action, label = '') {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return 'mobile';
  return 'desktop';
}

window.PriqurAnalytics = {
  trackEvent,
  getDeviceType,
  trackView: (toolName) => {
    trackEvent('herramienta', 'vista', toolName);
  },
  trackOperation: (toolName, meta = {}) => {
    trackEvent('herramienta', 'operacion_completada', toolName);
    if (typeof gtag !== 'undefined') {
      gtag('event', 'operacion', {
        tool_name: toolName,
        device_type: getDeviceType(),
        ...meta
      });
    }
    incrementCounter(toolName);
  },
  trackDownload: (toolName) => {
    trackEvent('herramienta', 'descarga', toolName);
  },
  trackError: (toolName, error) => {
    trackEvent('herramienta', 'error', `${toolName}: ${error}`);
  }
};
