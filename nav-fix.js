// ── SHARED CART STATE ──
const Cart = {
  get count() { return parseInt(localStorage.getItem('ug_cart_count') || '0'); },
  set count(n) { localStorage.setItem('ug_cart_count', n); Cart.updateBadge(); },
  add(name) { Cart.count = Cart.count + 1; return Cart.count; },
  updateBadge() {
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => b.textContent = Cart.count > 0 ? `(${Cart.count})` : '');
  }
};

// ── SHARED USER STATE ──
const User = {
  get name() { return localStorage.getItem('ug_user_name') || ''; },
  get loggedIn() { return !!localStorage.getItem('ug_user_name'); },
  login(name) { localStorage.setItem('ug_user_name', name); User.updateNav(); },
  logout() { localStorage.removeItem('ug_user_name'); User.updateNav(); },
  updateNav() {
    const loginLinks = document.querySelectorAll('.nav-login-link');
    loginLinks.forEach(el => {
      if(User.loggedIn) {
        el.textContent = `👤 ${User.name.split(' ')[0]}`;
        el.href = 'profile.html';
      } else {
        el.textContent = '👤 Login';
        el.href = 'auth.html';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  User.updateNav();
});
