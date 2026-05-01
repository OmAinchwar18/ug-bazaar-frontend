// ═══════════════════════════════════════════════════
// UG BAZAAR — Frontend Integration Examples
// Har page mein api.js include karo aur yeh code use karo
// ═══════════════════════════════════════════════════

// ════════════════════════════════════════
// 1. AUTH PAGE (auth.html)
// ════════════════════════════════════════
async function handleEmailLogin() {
  const mobile   = document.getElementById('login-mobile').value;
  const password = document.getElementById('login-pass').value;

  const r = await AuthAPI.login(mobile, password);
  if (r.success) {
    showSuccess('Login ho gaya! 🎉');
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    setTimeout(() => window.location.href = redirect || 'index.html', 800);
  } else {
    showError(r.error);
  }
}

async function handleRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const mobile   = document.getElementById('reg-mobile').value.trim();
  const password = document.getElementById('reg-pass').value;

  const r = await AuthAPI.register(name, mobile, password);
  if (r.success) {
    showSuccess('Account ban gaya! 🎉');
    setTimeout(() => window.location.href = 'index.html', 1000);
  } else {
    showError(r.error);
  }
}

async function handleOTPLogin() {
  const mobile = document.getElementById('login-mobile').value;
  const otp    = [...document.querySelectorAll('#login-otp-section .otp-box')]
                  .map(b => b.value).join('');

  const r = await AuthAPI.verifyOTP(mobile, otp);
  if (r.success) {
    showSuccess('Login ho gaya!');
    setTimeout(() => window.location.href = 'index.html', 800);
  } else {
    showError(r.error);
  }
}

async function sendOTP(prefix) {
  const mobile = document.getElementById(prefix + '-mobile').value;
  const r = await AuthAPI.sendOTP(mobile);
  if (r.success) showSuccess('OTP bheja gaya!');
  else showError(r.error);
}

// ════════════════════════════════════════
// 2. HOMEPAGE (index.html)
// ════════════════════════════════════════
async function loadProducts(cat = 'all') {
  const dept = cat === 'all' ? '' : cat;
  const r = await ProductAPI.getAll({ dept });

  if (!r.success) { showError(r.error); return; }

  const grid = document.getElementById('products-grid');
  grid.innerHTML = r.data.products.map(p => `
    <div class="product-card fade-in visible"
         onclick="window.location='product.html?id=${p._id}'"
         style="cursor:pointer">
      <div class="product-img">
        <span style="font-size:3.8rem">${p.emoji || '🛍'}</span>
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-cat">${p.dept.toUpperCase()}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-marathi">${p.nameHindi || ''}</div>
        <div class="product-price-row">
          <div>
            <span class="product-price">₹${p.price}</span>
            <span class="product-old">₹${p.mrp}</span>
          </div>
          <button class="add-to-cart"
            onclick="event.stopPropagation(); addToCart('${p._id}', '${p.name}', ${p.price})">
            + Add
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function addToCart(productId, name, price) {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'auth.html?redirect=' + encodeURIComponent(window.location.href);
    return;
  }
  const r = await CartAPI.add(productId);
  if (r.success) {
    Cart.count = Cart.count + 1;
    showSuccess(`✅ ${name} cart mein add hua!`);
  } else {
    showError(r.error);
  }
}

// ════════════════════════════════════════
// 3. PRODUCT DETAIL PAGE (product.html)
// ════════════════════════════════════════
async function loadProduct() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'index.html'; return; }

  const r = await ProductAPI.getById(id);
  if (!r.success) { showError(r.error); return; }

  const p = r.data.product;
  document.getElementById('main-emoji').textContent = p.emoji || '🛍';
  document.querySelector('.info-name').textContent   = p.name;
  document.querySelector('.info-marathi').textContent = p.nameHindi || '';
  document.querySelector('.price-main').textContent  = `₹${p.price}`;
  document.querySelector('.price-old').textContent   = `₹${p.mrp}`;
  document.querySelector('.img-badge').textContent   = `-${Math.round((1 - p.price/p.mrp)*100)}% OFF`;

  // Load reviews
  const rev = await ReviewAPI.getByProduct(id);
  if (rev.success) {
    document.getElementById('tab-reviews').innerHTML = rev.data.reviews
      .map(r => `
        <div class="review-card">
          <div class="rev-head">
            <div class="rev-user">
              <div class="rev-avatar">${r.user.name[0]}</div>
              <div>
                <div class="rev-name">${r.user.name}
                  ${r.verified ? '<span class="verified-pill">✅ Verified</span>' : ''}
                </div>
              </div>
            </div>
            <div class="rev-stars">${'★'.repeat(r.rating)}${'★'.repeat(5-r.rating).split('').map(()=>'<span style="opacity:0.3">★</span>').join('')}</div>
          </div>
          <div class="rev-title">${r.title}</div>
          <div class="rev-text">${r.text}</div>
        </div>`).join('');
  }
}

async function addToCartFromProduct() {
  const id = new URLSearchParams(window.location.search).get('id');
  const qty = parseInt(document.getElementById('qty').textContent) || 1;
  if (!Auth.isLoggedIn()) { window.location.href = 'auth.html'; return; }

  const r = await CartAPI.add(id, qty);
  if (r.success) showSuccess('Cart mein add hua! 🛒');
  else showError(r.error);
}

// ════════════════════════════════════════
// 4. CART PAGE (cart.html)
// ════════════════════════════════════════
async function loadCart() {
  if (!Auth.isLoggedIn()) { window.location.href = 'auth.html'; return; }

  const r = await CartAPI.get();
  if (!r.success) { showError(r.error); return; }

  const cart = r.data.cart;
  const container = document.getElementById('cart-items-container');

  if (!cart.items || cart.items.length === 0) {
    container.innerHTML = `<div class="empty-cart">
      <div class="empty-icon">🛒</div>
      <h3>Cart Khali Hai!</h3>
      <a href="index.html" class="btn-orange" style="...">Shopping Karo →</a>
    </div>`;
    return;
  }

  container.innerHTML = cart.items.map(item => `
    <div class="cart-item">
      <div class="item-emoji">${item.emoji || '🛍'}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">₹${item.price}</div>
      </div>
      <div class="item-actions">
        <button class="qty-btn" onclick="updateQty('${item.product}', ${item.qty - 1})">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="updateQty('${item.product}', ${item.qty + 1})">+</button>
        <button class="remove-btn" onclick="removeItem('${item.product}')">🗑</button>
      </div>
    </div>
  `).join('');

  updateSummary(cart);
}

async function updateQty(productId, qty) {
  if (qty <= 0) { await removeItem(productId); return; }
  const r = await CartAPI.update(productId, qty);
  if (r.success) loadCart();
  else showError(r.error);
}

async function removeItem(productId) {
  const r = await CartAPI.update(productId, 0);
  if (r.success) { showSuccess('Item remove hua!'); loadCart(); }
  else showError(r.error);
}

async function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim();
  const cart = await CartAPI.get();
  const total = cart.data?.cart?.items?.reduce((s,i) => s + i.price*i.qty, 0) || 0;

  const r = await CartAPI.validateCoupon(code, total);
  if (r.success) {
    showSuccess(`Coupon applied! ₹${r.data.discount} bachaye`);
    window._couponDiscount = r.data.discount;
    window._couponCode = code;
  } else {
    showError(r.error);
  }
}

// ════════════════════════════════════════
// 5. CHECKOUT — Place Order
// ════════════════════════════════════════
async function placeOrder() {
  const cart = await CartAPI.get();
  const items = cart.data?.cart?.items?.map(i => ({ productId: i.product, name: i.name, qty: i.qty }));
  const user  = Auth.getUser();

  const orderData = {
    items,
    type:            window._deliveryType || 'delivery',
    deliveryAddress: {
      name:    document.getElementById('d-name')?.value,
      mobile:  document.getElementById('d-mobile')?.value,
      village: document.getElementById('d-village')?.value,
      taluka:  document.getElementById('d-taluka')?.value || 'Talodhi',
      district:document.getElementById('d-dist')?.value  || 'Chandrapur'
    },
    couponCode:    window._couponCode || '',
    paymentMethod: window._payMethod  || 'cod'
  };

  const r = await OrderAPI.place(orderData);
  if (!r.success) { showError(r.error); return; }

  const order = r.data.order;

  // If online payment selected — open Razorpay
  if (window._payMethod !== 'cod') {
    const payment = await PaymentAPI.openCheckout({
      amount:     order.total,
      orderId:    order.orderId,
      dbOrderId:  order._id,
      userName:   user.name,
      userMobile: user.mobile,
      userEmail:  user.email
    });
    if (!payment.success) { showError('Payment fail hua!'); return; }
  }

  // Clear cart + show success
  await CartAPI.clear();
  localStorage.setItem('ug_last_order', order.orderId);
  document.getElementById('order-id-display').textContent = order.orderId;
  document.getElementById('checkout-page').style.display = 'none';
  document.getElementById('success-page').style.display  = 'block';
}

// ════════════════════════════════════════
// 6. ORDER TRACKING (tracking.html)
// ════════════════════════════════════════
async function trackOrder() {
  const id = document.getElementById('track-input').value.trim();
  if (!id) { showError('Order ID daalo!'); return; }

  const r = await OrderAPI.track(id);
  if (!r.success) { showError(r.error); return; }

  const order = r.data.order;
  document.getElementById('my-orders-section').style.display = 'none';
  document.getElementById('track-result').style.display = 'block';
  // render order details...
}

async function loadMyOrders() {
  if (!Auth.isLoggedIn()) return;
  const r = await OrderAPI.getMyOrders();
  if (r.success) renderOrders(r.data.orders);
}

// ════════════════════════════════════════
// 7. PROFILE PAGE (profile.html)
// ════════════════════════════════════════
async function loadProfile() {
  if (!requireLogin()) return;
  const r = await AuthAPI.getMe();
  if (!r.success) { showError(r.error); return; }

  const user = r.data.user;
  document.getElementById('hero-name').textContent   = user.name;
  document.getElementById('hero-mobile').textContent = `📱 ${user.mobile}`;
  // Fill profile form fields...
}

async function saveProfile() {
  const data = {
    name:     document.getElementById('pf-name')?.value,
    email:    document.getElementById('pf-email')?.value,
    village:  document.getElementById('pf-village')?.value
  };
  const r = await AuthAPI.updateProfile(data);
  if (r.success) showSuccess('Profile save hua!');
  else showError(r.error);
}

// ════════════════════════════════════════
// 8. ADMIN DASHBOARD (admin.html)
// ════════════════════════════════════════
async function loadAdminDashboard() {
  if (!requireAdmin()) return;

  const r = await AdminAPI.getDashboard();
  if (!r.success) { showError(r.error); return; }

  const s = r.data.stats;
  document.querySelector('[data-stat="revenue"]').textContent   = `₹${s.todayRevenue.toLocaleString('en-IN')}`;
  document.querySelector('[data-stat="orders"]').textContent    = s.totalOrders;
  document.querySelector('[data-stat="customers"]').textContent = s.totalUsers;
  document.querySelector('[data-stat="products"]').textContent  = s.totalProducts;
}

async function adminLoadOrders(status = '') {
  const r = await OrderAPI.adminGetAll(status);
  if (!r.success) { showError(r.error); return; }
  // render orders table...
}

async function adminUpdateOrderStatus(orderId, newStatus) {
  const r = await OrderAPI.adminUpdateStatus(orderId, newStatus);
  if (r.success) {
    showSuccess(`Order ${newStatus} → Customer ko WhatsApp + SMS gaya!`);
    adminLoadOrders();
  } else {
    showError(r.error);
  }
}

async function adminLoadProducts() {
  const r = await ProductAPI.getAll();
  if (!r.success) { showError(r.error); return; }
  // render products table...
}

async function adminSaveProduct() {
  const isEdit = !!window._editProductId;
  const data = {
    name:      document.getElementById('pm-name').value,
    nameHindi: document.getElementById('pm-marathi').value,
    dept:      document.getElementById('pm-dept').value,
    emoji:     document.getElementById('pm-emoji').value || '🛍',
    price:     parseFloat(document.getElementById('pm-price').value),
    mrp:       parseFloat(document.getElementById('pm-old').value),
    stock:     parseInt(document.getElementById('pm-stock').value),
    badge:     document.getElementById('pm-badge').value
  };

  const r = isEdit
    ? await ProductAPI.update(window._editProductId, data)
    : await ProductAPI.create(data);

  if (r.success) {
    showSuccess(isEdit ? 'Product update hua!' : 'Product add hua!');
    closeModal('product-modal');
    adminLoadProducts();
  } else {
    showError(r.error);
  }
}

// ════════════════════════════════════════
// 9. NOTIFICATIONS PAGE (notifications.html)
// ════════════════════════════════════════
async function loadNotifications() {
  if (!requireLogin()) return;
  const r = await NotifAPI.get();
  if (!r.success) return;

  document.getElementById('unread-count').textContent = r.data.unread;
  // render notifications...
}

async function markAllRead() {
  const r = await NotifAPI.markAllRead();
  if (r.success) { showSuccess('Sab read ho gaye!'); loadNotifications(); }
}

// ════════════════════════════════════════
// 10. REVIEWS PAGE (reviews.html)
// ════════════════════════════════════════
async function submitReview() {
  if (!requireLogin()) return;

  const productId = window._selectedProduct;
  const rating    = window._selectedRating;
  const title     = document.getElementById('review-title').value.trim();
  const text      = document.getElementById('review-text').value.trim();
  const tags      = [...document.querySelectorAll('.tag-opt.selected')].map(t => t.textContent.trim());

  const r = await ReviewAPI.submit(productId, rating, title, text, tags);
  if (r.success) {
    document.getElementById('review-form').style.display = 'none';
    document.getElementById('review-success').classList.add('show');
    showSuccess('Review submit hua!');
  } else {
    showError(r.error);
  }
}
