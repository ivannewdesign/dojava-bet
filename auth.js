// API Base URL
const API_BASE = 'http://localhost:8000/api';

// Provjeri da li je korisnik ulogovan
function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    showDashboard();
    loadUserQueries();
  } else {
    showAuth();
  }
}

// Prikazi auth formu
function showAuth() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('dashboard-section').style.display = 'none';
}

// Prikazi dashboard
function showDashboard() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  
  // Ukloni blur overlay
  const blurOverlay = document.querySelector('.blur-overlay');
  if (blurOverlay) {
    blurOverlay.classList.remove('blurred');
  }
}

// Registracija
async function register() {
  const email = document.getElementById('register-email').value;
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  if (!email || !password || !passwordConfirm) {
    alert('Popunite sva polja!');
    return;
  }

  if (password !== passwordConfirm) {
    alert('Lozinke se ne slažu!');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, passwordConfirm })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Registracija uspješna! Sada se možete ulogovat.');
      toggleAuthForm();
    } else {
      alert(data.error || 'Greška kod registracije');
    }
  } catch (error) {
    console.error('Greška:', error);
    alert('Greška na serveru');
  }
}

// Login
async function login() {
  const user = document.getElementById('login-user').value;
  const password = document.getElementById('login-password').value;

  if (!user || !password) {
    alert('Popunite sva polja!');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('plan', data.plan);
      localStorage.setItem('remainingQueries', data.remainingQueries);
      
      showDashboard();
      loadUserQueries();
    } else {
      alert(data.error || 'Greška kod logina');
    }
  } catch (error) {
    console.error('Greška:', error);
    alert('Greška na serveru');
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('plan');
  localStorage.removeItem('remainingQueries');
  showAuth();
}

// Učitaj broj preostalih upita
async function loadUserQueries() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE}/user/queries`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('remainingQueries', data.remainingQueries);
      updateQueriesDisplay(data.remainingQueries);
    }
  } catch (error) {
    console.error('Greška kod učitavanja upita:', error);
  }
}

// Updateuj prikaz broja upita
function updateQueriesDisplay(queries) {
  const queriesElement = document.getElementById('queries-count');
  if (queriesElement) {
    queriesElement.textContent = queries;
  }
}

// Toggle između login i register forme
function toggleAuthForm() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

// Inicijalizacija
document.addEventListener('DOMContentLoaded', checkAuth);
