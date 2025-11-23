/**
 * TIPTIP - Main Application JavaScript
 * Faza 1: Javna stranica sa TOP 30 liga
 */

// ========================================
// KONFIGURACIJA
// ========================================

const CONFIG = {
  API_BASE: 'http://localhost:8000',
  WIDGET_REFRESH: 30, // sekunde
  DEFAULT_SPORT: 'football'
};

// ========================================
// GLOBALNE PROMENLJIVE
// ========================================

let currentUser = null;
let authToken = null;
let currentSport = CONFIG.DEFAULT_SPORT;
let widgetLoadedCount = 0;
let totalWidgets = 0;

// ========================================
// INICIJALIZACIJA
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 TipTip inicijalizacija...');
  
  checkAuthStatus();
  setupEventListeners();
  initializeAccordeon();
  updateUI();
  
  // Count total widgets
  totalWidgets = document.querySelectorAll('api-sports-widget[data-type="games"]').length;
  console.log(`📊 Ukupno widgeta za učitavanje: ${totalWidgets}`);
  
  // Setup widget observers
  setupWidgetObservers();
  
  // Hide loading after reasonable time (widgets need time to load)
  setTimeout(() => {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('leagues-accordion').style.display = 'flex';
    console.log('✅ Prikaz liga omogućen');
  }, 2000);
});

// ========================================
// WIDGET OBSERVERS
// ========================================

function setupWidgetObservers() {
  const widgets = document.querySelectorAll('api-sports-widget[data-type="games"]');
  
  widgets.forEach(widget => {
    // Create mutation observer za svaki widget
    const observer = new MutationObserver((mutations) => {
      // Proveri da li widget ima sadržaj
      if (widget.shadowRoot || widget.innerHTML.length > 0) {
        widgetLoadedCount++;
        console.log(`✓ Widget učitan (${widgetLoadedCount}/${totalWidgets})`);
        
        // Update match count za roditeljsku sekciju
        updateSectionMatchCount(widget);
        
        observer.disconnect();
      }
    });
    
    observer.observe(widget, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    // Backup: check after 3 seconds
    setTimeout(() => {
      if (widget.shadowRoot || widget.innerHTML.length > 0) {
        updateSectionMatchCount(widget);
      }
    }, 3000);
  });
  
  // Global check after all widgets should be loaded
  setTimeout(() => {
    updateAllMatchCounts();
  }, 5000);
}

function updateSectionMatchCount(widget) {
  try {
    // Find parent league section
    const section = widget.closest('.league-section');
    if (!section) return;
    
    const countElement = section.querySelector('.league-count');
    if (!countElement) return;
    
    // Try to count games from shadow DOM
    let gameCount = 0;
    
    if (widget.shadowRoot) {
      const games = widget.shadowRoot.querySelectorAll('.game, .match, [class*="fixture"]');
      gameCount = games.length;
    }
    
    // Fallback: check for "No games" text
    const widgetText = widget.textContent || widget.innerText || '';
    if (widgetText.includes('No games') || widgetText.includes('Nema utakmica')) {
      gameCount = 0;
    }
    
    // Update display
    updateCountDisplay(countElement, gameCount);
    
  } catch (error) {
    console.error('Greška pri ažuriranju broja utakmica:', error);
  }
}

function updateCountDisplay(element, count) {
  if (count === 0) {
    element.textContent = 'Nema utakmica danas';
    element.style.color = '#94a3b8';
  } else if (count === 1) {
    element.textContent = '1 utakmica';
    element.style.color = '#22c55e';
  } else {
    element.textContent = `${count} utakmica`;
    element.style.color = '#22c55e';
  }
}

function updateAllMatchCounts() {
  const sections = document.querySelectorAll('.league-section');
  
  sections.forEach(section => {
    const wrapper = section.querySelector('.widget-wrapper');
    const countElement = section.querySelector('.league-count');
    
    if (!wrapper || !countElement) return;
    
    const widgets = wrapper.querySelectorAll('api-sports-widget[data-type="games"]');
    let totalGames = 0;
    
    widgets.forEach(widget => {
      if (widget.shadowRoot) {
        const games = widget.shadowRoot.querySelectorAll('.game, .match, [class*="fixture"]');
        totalGames += games.length;
      }
    });
    
    updateCountDisplay(countElement, totalGames);
  });
  
  console.log('📊 Svi brojevi utakmica ažurirani');
}

// ========================================
// AUTENTIKACIJA
// ========================================

function checkAuthStatus() {
  authToken = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (authToken && userStr) {
    try {
      currentUser = JSON.parse(userStr);
      console.log('✅ Korisnik prijavljen:', currentUser.email || currentUser);
    } catch (e) {
      console.error('Greška pri parsiranju korisnika:', e);
      logout();
    }
  }
}

function updateUI() {
  const authButtons = document.getElementById('auth-buttons');
  const userInfo = document.getElementById('user-info');
  const queriesCount = document.getElementById('queries-count');
  const userEmail = document.getElementById('user-email');
  
  if (currentUser && authToken) {
    // Prijavljen
    if (authButtons) authButtons.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (queriesCount) queriesCount.textContent = currentUser.remainingQueries || 5;
    if (userEmail) userEmail.textContent = currentUser.email || '';
  } else {
    // Nije prijavljen
    if (authButtons) authButtons.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  authToken = null;
  currentUser = null;
  updateUI();
  showNotification('👋 Uspešno ste se odjavili', 'info');
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Login
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', showLoginModal);
  }
  
  // Register
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', showRegisterModal);
  }
  
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Sport Tabs
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const sport = tab.getAttribute('data-sport');
      
      // Ignore coming soon tabs
      if (tab.classList.contains('coming-soon-tab')) {
        showNotification('🎾 Tenis statistika uskoro!', 'info');
        return;
      }
      
      switchSport(sport);
    });
  });
  
  // Premium upgrade
  const upgradeBtn = document.getElementById('upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', handleUpgrade);
  }
}

// ========================================
// ACCORDEON FUNKCIONALNOST
// ========================================

function initializeAccordeon() {
  const leagueHeaders = document.querySelectorAll('.league-header');
  
  // Collapse all except first 2
  leagueHeaders.forEach((header, index) => {
    if (index > 1) {
      header.parentElement.classList.add('collapsed');
    }
    
    header.addEventListener('click', () => {
      const section = header.parentElement;
      const isCollapsed = section.classList.contains('collapsed');
      
      // Toggle collapse
      if (isCollapsed) {
        section.classList.remove('collapsed');
      } else {
        section.classList.add('collapsed');
      }
      
      // Smooth scroll into view if expanding
      if (isCollapsed) {
        setTimeout(() => {
          header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });
  });
}

// ========================================
// SPORT SWITCHING
// ========================================

function switchSport(sport) {
  currentSport = sport;
  
  // Update tabs
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-sport') === sport) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Show/hide content
  const accordion = document.getElementById('leagues-accordion');
  const tennisPlaceholder = document.getElementById('tennis-placeholder');
  
  if (sport === 'tennis') {
    accordion.style.display = 'none';
    tennisPlaceholder.style.display = 'block';
  } else {
    accordion.style.display = 'flex';
    tennisPlaceholder.style.display = 'none';
    
    // Update widget config
    updateWidgetSport(sport);
  }
}

function updateWidgetSport(sport) {
  const config = document.querySelector('api-sports-widget[data-type="config"]');
  if (config) {
    config.setAttribute('data-sport', sport);
  }
  
  // Show loading
  document.getElementById('loading-state').style.display = 'flex';
  
  // Reload widgets
  const widgets = document.querySelectorAll('api-sports-widget[data-type="games"]');
  widgets.forEach(widget => {
    widget.innerHTML = '';
    widget.setAttribute('data-sport', sport);
  });
  
  // Reset counters
  widgetLoadedCount = 0;
  
  // Re-setup observers
  setTimeout(() => {
    setupWidgetObservers();
    document.getElementById('loading-state').style.display = 'none';
  }, 1500);
}

// ========================================
// MODAL - LOGIN
// ========================================

function showLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'login-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>🔐 Prijavi se</h2>
        <span class="close">&times;</span>
      </div>
      <form id="login-form">
        <input 
          type="email" 
          id="login-email" 
          placeholder="Email adresa" 
          required
          autocomplete="email"
        >
        <input 
          type="password" 
          id="login-password" 
          placeholder="Lozinka" 
          required
          autocomplete="current-password"
        >
        <button type="submit">Prijavi se</button>
      </form>
      <p class="error-message" id="login-error"></p>
      <div class="modal-footer">
        Nemate nalog? <a href="#" id="switch-to-register">Registrujte se besplatno</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Close handlers
  modal.querySelector('.close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  // Switch to register
  document.getElementById('switch-to-register').onclick = (e) => {
    e.preventDefault();
    modal.remove();
    showRegisterModal();
  };
  
  // Login form submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(modal);
  });
  
  // Focus email input
  setTimeout(() => {
    document.getElementById('login-email').focus();
  }, 100);
}

async function handleLogin(modal) {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = modal.querySelector('button[type="submit"]');
  
  // Disable button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Prijavljivanje...';
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Save auth data
      localStorage.setItem('token', data.token);
      
      const userObj = {
        email: email,
        plan: data.plan || 'free',
        remainingQueries: data.remainingQueries || 5
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      
      // Update global state
      authToken = data.token;
      currentUser = userObj;
      
      // Close modal and update UI
      modal.remove();
      updateUI();
      showNotification('✅ Uspešno ste prijavljeni!', 'success');
      
      // Reload page to show protected content
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      errorEl.textContent = data.error || 'Pogrešan email ili lozinka';
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Prijavi se';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorEl.textContent = 'Greška pri povezivanju sa serverom. Proverite da li je backend pokrenut.';
    errorEl.classList.add('show');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Prijavi se';
  }
}

// ========================================
// MODAL - REGISTER
// ========================================

function showRegisterModal() {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'register-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📝 Registruj se</h2>
        <span class="close">&times;</span>
      </div>
      <form id="register-form">
        <input 
          type="email" 
          id="register-email" 
          placeholder="Email adresa" 
          required
          autocomplete="email"
        >
        <input 
          type="password" 
          id="register-password" 
          placeholder="Lozinka (minimum 6 karaktera)" 
          required 
          minlength="6"
          autocomplete="new-password"
        >
        <input 
          type="password" 
          id="register-confirm" 
          placeholder="Potvrdite lozinku" 
          required
          autocomplete="new-password"
        >
        <button type="submit">Kreiraj nalog</button>
      </form>
      <p class="error-message" id="register-error"></p>
      <div class="modal-footer">
        Već imate nalog? <a href="#" id="switch-to-login">Prijavite se</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Close handlers
  modal.querySelector('.close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  // Switch to login
  document.getElementById('switch-to-login').onclick = (e) => {
    e.preventDefault();
    modal.remove();
    showLoginModal();
  };
  
  // Register form submit
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister(modal);
  });
  
  // Focus email input
  setTimeout(() => {
    document.getElementById('register-email').focus();
  }, 100);
}

async function handleRegister(modal) {
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const errorEl = document.getElementById('register-error');
  const submitBtn = modal.querySelector('button[type="submit"]');
  
  // Validate passwords match
  if (password !== confirm) {
    errorEl.textContent = 'Lozinke se ne poklapaju!';
    errorEl.classList.add('show');
    return;
  }
  
  // Validate password length
  if (password.length < 6) {
    errorEl.textContent = 'Lozinka mora imati najmanje 6 karaktera!';
    errorEl.classList.add('show');
    return;
  }
  
  // Disable button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Kreiranje naloga...';
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password, 
        passwordConfirm: confirm 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      modal.remove();
      showNotification('✅ Uspešno ste registrovani! Molimo prijavite se.', 'success');
      
      // Auto-open login modal
      setTimeout(() => {
        showLoginModal();
      }, 500);
    } else {
      errorEl.textContent = data.error || 'Greška pri registraciji. Email možda već postoji.';
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kreiraj nalog';
    }
  } catch (error) {
    console.error('Register error:', error);
    errorEl.textContent = 'Greška pri povezivanju sa serverom. Proverite da li je backend pokrenut.';
    errorEl.classList.add('show');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kreiraj nalog';
  }
}

// ========================================
// PREMIUM UPGRADE
// ========================================

function handleUpgrade() {
  if (!authToken) {
    showNotification('⚠️ Prijavite se da biste videli Premium opcije', 'info');
    showLoginModal();
    return;
  }
  
  // Za sada samo info notifikacija
  showNotification('💎 Premium funkcionalnost uskoro dostupna! PayPal integracija u razvoju.', 'info');
  
  // TODO: Implementirati PayPal checkout flow
}

// ========================================
// NOTIFICATIONS
// ========================================

function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelectorAll('.notification');
  existing.forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Show with animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Auto-hide after 4 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatDate(date) {
  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
}

function formatTime(time) {
  return new Intl.DateTimeFormat('sr-RS', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time));
}

// ========================================
// PERIODIC REFRESH
// ========================================

// Refresh match counts every 60 seconds
setInterval(() => {
  console.log('🔄 Osvježavanje brojeva utakmica...');
  updateAllMatchCounts();
}, 60000);

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// ========================================
// DEBUG MODE
// ========================================

if (window.location.hostname === 'localhost') {
  console.log('%c🚀 TipTip Debug Mode', 'color: #667eea; font-size: 16px; font-weight: bold;');
  console.log('Current user:', currentUser);
  console.log('Auth token:', authToken ? 'Present' : 'None');
  console.log('API Base:', CONFIG.API_BASE);
}

// Export for potential use in other scripts
window.TipTip = {
  currentUser,
  authToken,
  showNotification,
  logout,
  updateAllMatchCounts
};
