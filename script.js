// =============================================
// js/script.js — Shared UI Logic
// ICT Club Uganda
// =============================================

// ---- Scroll Progress Bar ----
(function initProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? (window.scrollY / total * 100) + '%' : '0';
  }, { passive: true });
})();

// ---- Scroll-to-Top Button ----
(function initScrollTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ---- Dark Mode ----
(function initDarkMode() {
  const btn = document.getElementById('modeBtn');
  const body = document.body;
  const saved = localStorage.getItem('ict-theme');
  if (saved === 'dark') body.classList.add('dark-mode');

  function updateLabel() {
    if (!btn) return;
    btn.textContent = body.classList.contains('dark-mode') ? '☀️ Light' : '🌙 Dark';
  }
  updateLabel();

  if (btn) {
    btn.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      localStorage.setItem('ict-theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
      updateLabel();
    });
  }
})();

// ---- Hamburger Menu ----
(function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const icon = hamburger.querySelector('i');
    if (icon) {
      icon.className = navLinks.classList.contains('open') ? 'fas fa-times' : 'fas fa-bars';
    }
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const icon = hamburger.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    });
  });

  // Active link highlight
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  navLinks.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

// ---- AOS Init ----
(function initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 700, once: true, offset: 60 });
  }
})();

// ---- Animated Counters ----
function animateCounters() {
  document.querySelectorAll('.counter').forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target') || 0);
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = Math.floor(current).toLocaleString();
    }, 16);
  });
}

// Trigger counters when stats section is visible
(function() {
  const stats = document.querySelector('.stats-strip, .stats');
  if (!stats) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(stats);
})();

// ---- Toast Notification ----
window.showToast = function(message, type = 'success', duration = 3500) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  const icons = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    warning: '⚠️'
  };

  const colors = {
    success: { bg: '#f0fff4', border: '#68d391', color: '#276749' },
    error:   { bg: '#fff5f5', border: '#fc8181', color: '#9b2c2c' },
    info:    { bg: '#ebf8ff', border: '#90cdf4', color: '#2c5282' },
    warning: { bg: '#fffbeb', border: '#fbd38d', color: '#744210' }
  };

  const c = colors[type] || colors.info;
  toast.style.background = c.bg;
  toast.style.border = `1px solid ${c.border}`;
  toast.style.color = c.color;
  toast.innerHTML = `<span style="font-size:1.1rem">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  toast.classList.add('show');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
};

// ---- Loading State helpers ----
window.showLoading = function(containerId, message = 'Loading…') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="loading-wrap">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>`;
};

window.showEmpty = function(containerId, title = 'Nothing here yet', msg = 'Content will appear here when added.', icon = 'fa-inbox') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <i class="fas ${icon}"></i>
      <h4>${title}</h4>
      <p>${msg}</p>
    </div>`;
};

// ---- Format Date ----
window.formatDate = function(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });
};

window.formatDateShort = function(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ---- Relative time ----
window.timeAgo = function(ts) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 2)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return formatDateShort(ts);
};

// ---- Lightbox ----
(function initLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  const img   = lb.querySelector('#lightboxImg');
  const close = lb.querySelector('.lightbox-close');

  document.querySelectorAll('.gallery-item[data-src]').forEach(item => {
    item.addEventListener('click', () => {
      img.src = item.dataset.src;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLB() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    img.src = '';
  }

  if (close) close.addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });
})();

// ---- Modal helpers ----
window.openModal = function(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
};

document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.modalClose || btn.closest('.modal-overlay')?.id;
    if (target) closeModal(target);
  });
});

// ---- Escape closes modals ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ---- Tab system ----
window.initTabs = function(tabsSelector, tabClass, panelClass, activeTab) {
  const tabs = document.querySelectorAll(tabsSelector);
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove(tabClass));
      tab.classList.add(tabClass);
      document.querySelectorAll(`.${panelClass}`).forEach(p => p.classList.remove('active'));
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
  if (activeTab) {
    const first = document.querySelector(`[data-tab="${activeTab}"]`);
    if (first) first.click();
  } else if (tabs.length > 0) {
    tabs[0].click();
  }
};

// ---- Simple client-side search helper ----
window.filterCards = function(inputId, cardSelector) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll(cardSelector).forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
};
