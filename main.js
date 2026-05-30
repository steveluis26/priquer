// Priquer — main.js
// Navegación, animaciones y tracking de eventos base

document.addEventListener('DOMContentLoaded', () => {

  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 40
      ? 'rgba(8,8,16,0.95)'
      : 'rgba(8,8,16,0.8)';
  });

  // Animación de entrada para tool cards
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

  // Helper para disparar animación
  const style = document.createElement('style');
  style.textContent = '.card-visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

});

// Tracking de eventos para Google Analytics
// Llamar desde cualquier herramienta con: trackEvent('categoria', 'accion', 'etiqueta')
function trackEvent(category, action, label = '') {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}

// Trackear tipo de dispositivo
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Exportar para uso en otras páginas
window.PriqurAnalytics = {
  trackEvent,
  getDeviceType,
  trackOperation: (toolName) => {
    trackEvent('herramienta', 'operacion_completada', toolName);
    if (typeof gtag !== 'undefined') {
      gtag('event', 'operacion', {
        tool_name: toolName,
        device_type: getDeviceType()
      });
    }
  }
};
