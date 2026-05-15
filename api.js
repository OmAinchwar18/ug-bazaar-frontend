const API_BASE = 'https://ug-bazaar-backend-production.up.railway.app/api';
const getToken   = ()      => localStorage.getItem('ug_token');
const setToken   = (t)     => localStorage.setItem('ug_token', t);
const clearToken = ()      => localStorage.removeItem('ug_token');

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const config = {
    headers: { 'Content-Type':'application/json', ...(token && { Authorization:`Bearer ${token}` }), ...options.headers },
    ...options
  };
  const res  = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

const Auth = {
  async register(name, mobile, password, village='') {
    const d = await apiFetch('/auth/register',{ method:'POST', body:JSON.stringify({name,mobile,password,village}) });
    if(d.token){ setToken(d.token); localStorage.setItem('ug_user_name',d.user.name); localStorage.setItem('ug_user_id',d.user._id); localStorage.setItem('ug_user_role',d.user.role); }
    return d;
  },
  async login(mobile, password) {
    const d = await apiFetch('/auth/login',{ method:'POST', body:JSON.stringify({mobile,password}) });
    if(d.token){ setToken(d.token); localStorage.setItem('ug_user_name',d.user.name); localStorage.setItem('ug_user_id',d.user._id); localStorage.setItem('ug_user_role',d.user.role); }
    return d;
  },
  async sendOTP(mobile)          { return apiFetch('/auth/send-otp',{method:'POST',body:JSON.stringify({mobile})}); },
  async verifyOTP(mobile, otp) {
    const d = await apiFetch('/auth/verify-otp',{method:'POST',body:JSON.stringify({mobile,otp})});
    if(d.token){ setToken(d.token); localStorage.setItem('ug_user_name',d.user.name); localStorage.setItem('ug_user_id',d.user._id); localStorage.setItem('ug_user_role',d.user.role); }
    return d;
  },
  async forgotPassword(mobile)   { return apiFetch('/auth/forgot-password',{method:'POST',body:JSON.stringify({mobile})}); },
  async resetPassword(mobile,otp,newPassword) { return apiFetch('/auth/reset-password',{method:'POST',body:JSON.stringify({mobile,otp,newPassword})}); },
  async getMe()                  { return apiFetch('/auth/me'); },
  async updateProfile(data)      { return apiFetch('/auth/update-profile',{method:'PUT',body:JSON.stringify(data)}); },
  logout() { clearToken(); ['ug_user_name','ug_user_id','ug_user_role','ug_cart_count'].forEach(k=>localStorage.removeItem(k)); window.location.href='index.html'; },
  isLoggedIn: () => !!getToken(),
  isAdmin:    () => localStorage.getItem('ug_user_role')==='admin',
  getUserName:() => localStorage.getItem('ug_user_name')||''
};

const Products = {
  async getAll(filters={}) {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k,v])=>v&&p.set(k,v));
    return apiFetch(`/products?${p}`);
  },
  async search(q, filters={}) {
    const p = new URLSearchParams({q});
    Object.entries(filters).forEach(([k,v])=>v&&p.set(k,v));
    return apiFetch(`/products/search?${p}`);
  },
  async getById(id)         { return apiFetch(`/products/${id}`); },
  async create(data)        { return apiFetch('/products',{method:'POST',body:JSON.stringify(data)}); },
  async update(id, data)    { return apiFetch(`/products/${id}`,{method:'PUT',body:JSON.stringify(data)}); },
  async delete(id)          { return apiFetch(`/products/${id}`,{method:'DELETE'}); }
};

const CartAPI = {
  async get()               { return apiFetch('/cart'); },
  async add(productId,qty=1){ const d=await apiFetch('/cart/add',{method:'POST',body:JSON.stringify({productId,qty})}); CartAPI.refreshCount(); return d; },
  async update(productId,qty){ const d=await apiFetch(`/cart/update/${productId}`,{method:'PUT',body:JSON.stringify({qty})}); CartAPI.refreshCount(); return d; },
  async clear()             { localStorage.setItem('ug_cart_count','0'); document.querySelectorAll('.cart-count-badge').forEach(b=>b.textContent=''); return apiFetch('/cart/clear',{method:'DELETE'}); },
  async refreshCount() {
    try {
      const {cart} = await CartAPI.get();
      const n = cart?.items?.reduce((s,i)=>s+i.qty,0)||0;
      localStorage.setItem('ug_cart_count',n);
      document.querySelectorAll('.cart-count-badge').forEach(b=>b.textContent=n>0?`(${n})`:'');
    } catch(e){}
  }
};

const Orders = {
  async place(data)         { return apiFetch('/orders',{method:'POST',body:JSON.stringify(data)}); },
  async getMyOrders()       { return apiFetch('/orders/my-orders'); },
  async getById(id)         { return apiFetch(`/orders/${id}`); },
  async cancel(id)          { return apiFetch(`/orders/${id}/cancel`,{method:'PUT'}); },
  async adminGetAll(filters={}) { const p=new URLSearchParams(filters); return apiFetch(`/orders/admin/all?${p}`); },
  async adminUpdateStatus(id,status,note='') { return apiFetch(`/orders/admin/${id}/status`,{method:'PUT',body:JSON.stringify({status,note})}); }
};

const Payment = {
  async createOrder(amount,orderId) { return apiFetch('/payment/create-order',{method:'POST',body:JSON.stringify({amount,orderId})}); },
  async openRazorpay({amount,orderId,userName,userMobile,onSuccess,onFailure}) {
    const od = await Payment.createOrder(amount,orderId);
    if(!window.Razorpay) await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.onload=res; s.onerror=rej; document.body.appendChild(s); });
    new window.Razorpay({
      key:od.key, amount:od.amount, currency:'INR',
      name:'UG Bazaar', description:`Order ${orderId}`, order_id:od.orderId,
      prefill:{name:userName,contact:userMobile},
      theme:{color:'#F47820'},
      handler: async(r)=>{ try{ await apiFetch('/payment/verify',{method:'POST',body:JSON.stringify({razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature,orderId})}); if(onSuccess)onSuccess(r); }catch(e){ if(onFailure)onFailure(e); } },
      modal:{ondismiss:()=>{ if(onFailure)onFailure(new Error('cancelled')); }}
    }).open();
  }
};

const Coupons = {
  async validate(code,orderTotal) { return apiFetch('/coupons/validate',{method:'POST',body:JSON.stringify({code,orderTotal})}); },
  async getAll()   { return apiFetch('/coupons'); },
  async create(d)  { return apiFetch('/coupons',{method:'POST',body:JSON.stringify(d)}); }
};

const Reviews = {
  async getByProduct(productId) { return apiFetch(`/reviews/${productId}`); },
  async submit(data) { return apiFetch('/reviews',{method:'POST',body:JSON.stringify(data)}); }
};

const Notifications = {
  async getAll()    { return apiFetch('/notifications'); },
  async markRead(id){ return apiFetch(`/notifications/${id}/read`,{method:'PUT'}); },
  async markAllRead(){ return apiFetch('/notifications/mark-all-read',{method:'PUT'}); }
};

const Admin = {
  async getDashboard()  { return apiFetch('/admin/dashboard'); },
  async getCustomers()  { return apiFetch('/admin/customers'); }
};

function initPage() {
  document.querySelectorAll('.nav-login-link').forEach(el=>{
    if(Auth.isLoggedIn()){ el.textContent=`👤 ${Auth.getUserName().split(' ')[0]}`; el.href='profile.html'; }
    else{ el.textContent='👤 Login'; el.href='auth.html'; }
  });
  if(Auth.isLoggedIn()) CartAPI.refreshCount();
  if(window.location.pathname.includes('admin')&&!Auth.isAdmin()) window.location.href='auth.html';
  if(Auth.isAdmin()) document.querySelectorAll('.nav-admin-item').forEach(el=>el.style.display='block');
}

document.addEventListener('DOMContentLoaded', initPage);
