const lengthSlider = document.getElementById('lengthSlider');
const lengthValue = document.getElementById('lengthValue');
const chkUpper = document.getElementById('chkUpper');
const chkLower = document.getElementById('chkLower');
const chkNumbers = document.getElementById('chkNumbers');
const chkSymbols = document.getElementById('chkSymbols');
const chkAmbiguous = document.getElementById('chkAmbiguous');
const passwordDisplay = document.getElementById('passwordDisplay');
const strengthBar = document.getElementById('strengthBar');
const strengthLabel = document.getElementById('strengthLabel');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'il1Lo0O';

lengthSlider.addEventListener('input', () => {
  lengthValue.textContent = lengthSlider.value;
});

generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyPassword);

document.addEventListener('DOMContentLoaded', generatePassword);

function generatePassword() {
  let chars = '';
  if (chkUpper.checked) chars += UPPER;
  if (chkLower.checked) chars += LOWER;
  if (chkNumbers.checked) chars += NUMBERS;
  if (chkSymbols.checked) chars += SYMBOLS;

  if (chars.length === 0) {
    passwordDisplay.value = 'Selecciona al menos una opción';
    updateStrength(0);
    return;
  }

  let pool = chars;
  if (chkAmbiguous.checked) {
    pool = [...chars].filter(c => !AMBIGUOUS.includes(c)).join('');
  }
  if (pool.length === 0) {
    passwordDisplay.value = 'Demasiados caracteres excluidos';
    updateStrength(0);
    return;
  }

  const length = parseInt(lengthSlider.value);
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += pool[array[i] % pool.length];
  }

  passwordDisplay.value = password;
  updateStrength(calculateStrength(password, length, chars.length > 0));

  if (window.PriqurAnalytics) {
    window.PriqurAnalytics.trackOperation('password_generator', { length });
  }
}

function calculateStrength(password, length, hasChars) {
  if (!hasChars || length === 0) return 0;
  let score = 0;

  score += Math.min(length / 64, 1) * 25;

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  if (length >= 12) score += 15;
  if (length >= 16) score = Math.min(score, 100);

  return Math.min(score, 100);
}

function updateStrength(score) {
  const pct = Math.round(score);
  strengthBar.style.width = pct + '%';

  if (pct < 25) {
    strengthBar.style.background = '#ff6b6b';
    strengthLabel.textContent = 'Débil';
  } else if (pct < 50) {
    strengthBar.style.background = '#ffa94d';
    strengthLabel.textContent = 'Regular';
  } else if (pct < 75) {
    strengthBar.style.background = '#f7dc6f';
    strengthLabel.textContent = 'Buena';
  } else {
    strengthBar.style.background = '#22c98a';
    strengthLabel.textContent = 'Fuerte';
  }
}

function copyPassword() {
  if (!passwordDisplay.value || passwordDisplay.value === 'Selecciona al menos una opción') return;
  navigator.clipboard.writeText(passwordDisplay.value).then(() => {
    const orig = copyBtn.innerHTML;
    copyBtn.innerHTML = '✓ Copiada';
    setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
  });
}

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => item.classList.toggle('open'));
});
