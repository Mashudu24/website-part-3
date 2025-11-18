/**
 * Petal Whisper - script.js
 * Fixed: syntax errors, template literal usage, label selection, and toast call.
 */

// --- GLOBAL CONSTANTS & UTILITIES ---
const CART_KEY = 'pw_cart';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (e) {
    console.error('Error loading cart:', e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Error saving cart:', e);
  }
  updateCartBadge(cart);
}

function updateCartBadge(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const count = items.reduce((s, i) => s + (i.quantity || 0), 0);
  let badge = document.querySelector('.cart-badge');

  if (!badge) {
    const cartLink = document.querySelector('nav a[href*="cart"]');
    if (cartLink) {
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      cartLink.appendChild(badge);
    }
  }

  if (badge) {
    badge.textContent = count > 0 ? String(count) : '';
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function showToast(message) {
  let t = document.querySelector('.pw-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'pw-toast';
    Object.assign(t.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      background: '#8d4f3a',
      color: '#eaded4',
      padding: '10px 15px',
      borderRadius: '5px',
      zIndex: 9999,
      opacity: '0',
      transition: 'opacity 200ms ease-in-out',
      fontFamily: 'sans-serif',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    });
    document.body.appendChild(t);
  }

  t.textContent = message;
  t.style.visibility = 'visible';
  requestAnimationFrame(() => (t.style.opacity = '1'));

  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => (t.style.visibility = 'hidden'), 250);
  }, 1800);
}


// --- FORM VALIDATION ---
function validateField(input, pattern, errorMessage) {
  if (!input) return true;

  const errorId = input.id + '-error';
  let errorEl = document.getElementById(errorId);

  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.id = errorId;
    errorEl.className = 'validation-error';
    errorEl.style.cssText = 'color: #D8000C; font-size: 0.85em; display: block; margin-top: 5px;';
    const td = input.closest('td');
    if (td) {
      td.appendChild(errorEl);
    } else {
      input.insertAdjacentElement('afterend', errorEl);
    }
  }

  const labelText = document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || input.name || input.id || 'This field';

  if (input.required && input.value.trim() === '') {
    errorEl.textContent = `${labelText.replace(':', '')} is required.`;
    input.classList.add('input-error');
    return false;
  }

  if (input.value.trim() !== '' && pattern && !pattern.test(input.value)) {
    errorEl.textContent = errorMessage;
    input.classList.add('input-error');
    return false;
  }

  errorEl.textContent = '';
  input.classList.remove('input-error');
  return true;
}

function setupSubscriptionFormValidation() {
  const form = document.getElementById('subscribe-form');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('telephone');
  const firstNameInput = document.getElementById('first_name');

  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  const phonePattern = /^(?:\+27|0)?\d{9,10}$/;

  emailInput?.addEventListener('blur', () => validateField(emailInput, emailPattern, 'Please enter a valid email address.'));
  phoneInput?.addEventListener('blur', () => {
    if (phoneInput.value.trim()) {
      validateField(phoneInput, phonePattern, 'Please enter a valid 10-digit phone number (e.g., 0821234567).');
    } else {
      const err = document.getElementById(phoneInput.id + '-error');
      if (err) err.textContent = '';
      phoneInput.classList.remove('input-error');
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const isEmailValid = validateField(emailInput, emailPattern, 'Please enter a valid email address.');
    const isFirstNameValid = validateField(firstNameInput, null, 'First Name is required.');
    const isPhoneValid = !phoneInput.value.trim() || validateField(phoneInput, phonePattern, 'Please enter a valid 10-digit phone number.');

    if (isEmailValid && isFirstNameValid && isPhoneValid) {
      showToast('Submitting your subscription...');
      setTimeout(() => {
        console.log('Subscription Success:', { name: firstNameInput?.value, email: emailInput?.value });
        showToast('🎉 Thank you for subscribing! We will keep you updated.');
        form.reset();
      }, 500);
    } else {
      showToast('Please correct the highlighted errors in the form.');
      document.querySelector('.input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function setupContactFormValidation() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');

  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  form.addEventListener('submit', function (e) {
    const isNameValid = validateField(nameInput, null, 'Your Name is required.');
    const isEmailValid = validateField(emailInput, emailPattern, 'Please enter a valid email address.');
    const isSubjectValid = validateField(subjectInput, null, 'Please select a message subject.');
    const isMessageValid = validateField(messageInput, null, 'A message is required.');

    if (!(isNameValid && isEmailValid && isSubjectValid && isMessageValid)) {
      e.preventDefault();
      showToast('Please correct the highlighted errors in the form.');
      document.querySelector('.input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showToast('Compiling your email...');
    }
  });
}


// --- MAP (LEAFLET) ---

function initLeafletMap() {
  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;
  if (typeof L === 'undefined') {
    console.warn('Leaflet library not loaded yet.');
    return;
  }

  // If map already created, just invalidate size (useful if container was hidden)
  if (mapEl._pwMap) {
    try { mapEl._pwMap.invalidateSize(); } catch (e) { /* ignore */ }
    return;
  }

  // Coordinates: change to your shop location
  const coords = [-26.2041, 28.0473];

  // create map and save instance on element so we don't recreate it
  const map = L.map(mapEl, { scrollWheelZoom: false }).setView(coords, 13);
  mapEl._pwMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Add marker with popup
  const marker = L.marker(coords).addTo(map);
  marker.bindPopup('<strong>Petal Whisper</strong><br>Our shop (placeholder)').openPopup();

  // Optional: add a small circle showing approximate area
  L.circle(coords, { radius: 150 }).addTo(map);
}
// ...existing code...

// --- LIGHTBOX ---
function setupLightbox() {
  let lightbox = document.getElementById('lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:none;justify-content:center;align-items:center;cursor:pointer;';
    lightbox.innerHTML = '<img id="lightbox-image" style="max-width:90%;max-height:90%;object-fit:contain;">';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', () => (lightbox.style.display = 'none'));
  }

  const images = document.querySelectorAll('.product-card img, main img:not(.leaflet-marker-icon):not([width="25"])');
  const lightboxImage = document.getElementById('lightbox-image');
  images.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', e => {
      e.stopPropagation();
      if (lightboxImage) {
        lightboxImage.src = img.src;
        lightboxImage.alt = img.alt || '';
        lightbox.style.display = 'flex';
      }
    });
  });
}


// --- PRODUCT FILTER ---
function setupProductFiltering() {
  const searchInput = document.getElementById('product-search');
  const productGrid = document.querySelector('.product-grid');
  if (!searchInput || !productGrid) return;

  const productCards = productGrid.querySelectorAll('.product-card');
  searchInput.addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase().trim();
    productCards.forEach(card => {
      const textContent = card.textContent.toLowerCase();
      card.style.display = textContent.includes(searchTerm) ? 'block' : 'none';
    });
  });
}


// --- INITIALIZE ON DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('nav');
  const ul = document.querySelector('nav ul');
  let menuToggle = document.querySelector('.menu-toggle');
  if (nav && ul) {
    if (!menuToggle) {
      menuToggle = document.createElement('button');
      menuToggle.className = 'menu-toggle';
      menuToggle.type = 'button';
      menuToggle.innerHTML = '<i class="fas fa-bars"></i> Menu';
      nav.insertAdjacentElement('beforebegin', menuToggle);
    }
    menuToggle.setAttribute('aria-expanded', 'false');
    ul.classList.add('nav-closed');
    menuToggle.addEventListener('click', function () {
      const closed = ul.classList.toggle('nav-closed');
      menuToggle.setAttribute('aria-expanded', String(!closed));
    });
  }

  setupSubscriptionFormValidation();
  setupContactFormValidation();

  const imagesToAnimate = document.querySelectorAll('p img, .product-container img, .product-card img, main img:not(.leaflet-marker-icon):not([width="25"])');
  imagesToAnimate.forEach(img => {
    img.style.transition = 'all 0.3s ease-in-out';
    img.addEventListener('mouseover', () => {
      img.style.opacity = '0.9';
      img.style.transform = 'scale(1.02)';
    });
    img.addEventListener('mouseout', () => {
      img.style.opacity = '1';
      img.style.transform = 'scale(1)';
    });
  });

  document.querySelector('.shop-button')?.addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'Products.html'; // <- change target here
  });

  setupProductFiltering();
  setupLightbox();

  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    const card = btn.closest('.product-card');
    if (!card) return;

    const title = card.querySelector('.product-title')?.textContent?.trim() || 'Product';
    const priceText = card.querySelector('.product-price')?.textContent || '';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const img = card.querySelector('img')?.getAttribute('src') || '';

    const cart = loadCart();
    const existing = cart.find(p => p.title === title);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + 1;
    } else {
      cart.push({ title, price, img, quantity: 1 });
    }
    saveCart(cart);
    showToast(`${title} added to cart`);
  });

  // Try to initialize map (Leaflet must be loaded before this script or on window load)
  try { initLeafletMap(); } catch (e) { /* ignore */ }

  updateCartBadge(loadCart());
});

// ...existing code...
window.addEventListener('load', function () {
  try { initLeafletMap(); } catch (e) { /* ignore */ }
});