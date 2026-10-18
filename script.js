/* ============================================================
   OSINTMichelin — web app restoran yang SENGAJA dibuat rentan
   Dibuat sebagai target hacking lab pribadi. Lihat README.md.
   ============================================================ */

// ---- "database" (localStorage) ----
const MENU = [
  {id:1, name:"Seared Scallop, Brown Butter", desc:"Yuzu, chive oil", price:185000},
  {id:2, name:"Duck Breast, Cherry Jus", desc:"Confit leg, charred shallot", price:245000},
  {id:3, name:"Wagyu Tartare", desc:"Smoked egg yolk, rye crisp", price:220000},
  {id:4, name:"Truffle Risotto", desc:"Parmesan, 24-month aged", price:175000},
  {id:5, name:"Miso Black Cod", desc:"Bok choy, dashi butter", price:265000},
  {id:6, name:"Burnt Basque Cheesecake", desc:"Salted caramel", price:95000},
  {id:7, name:"Deconstructed Tiramisu", desc:"Mascarpone foam", price:85000},
  {id:8, name:"Sommelier's Pairing (3 glasses)", desc:"Ask your server", price:320000}
];

// User "di-hash" pakai base64 — gampang banget dibalikin. Bug #1: auth full client-side.
const AUTH = {
  users: [
    {username:"1", passHash:btoa("11"), role:"guest"},
    {username:"user2", passHash:btoa("22"), role:"guest"}
  ],
  // Bug #2: kredensial admin dikirim ke client, cuma di-base64.
  admin: {username:"admin", passHash:"YWRtaW5Pc2ludDIwMjYh"} // atob -> adminOsint2026!
};

function db(key, fallback){
  const raw = localStorage.getItem(key);
  if(raw) return JSON.parse(raw);
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}
function dbSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

let orders = db('osm_orders', []);
let nextOrderId = db('osm_next_id', 1001);
let cart = [];
let session = JSON.parse(sessionStorage.getItem('osm_session') || 'null');

// ---- routing ----
function route(){
  const hash = location.hash;
  document.getElementById('view-login').classList.add('hide');
  document.getElementById('view-app').classList.add('hide');
  document.getElementById('view-admin').classList.add('hide');

  if(hash === '#admin'){
    document.getElementById('view-admin').classList.remove('hide');
    // Bug #3: visibilitas admin panel cuma flag di localStorage,
    // dan gak ada yang nahan kalau di-set langsung dari console:
    //   localStorage.setItem('osm_role','admin')
    if(localStorage.getItem('osm_role') === 'admin'){
      renderAdmin();
    }
    return;
  }
  if(session){
    document.getElementById('view-app').classList.remove('hide');
    renderMenu(); renderCart();
  } else {
    document.getElementById('view-login').classList.remove('hide');
  }
  renderUserbox();
}
window.addEventListener('hashchange', route);

// ---- guest auth ----
function doLogin(){
  const u = document.getElementById('li-u').value.trim();
  const p = document.getElementById('li-p').value;
  const err = document.getElementById('li-err');

  // Bug #4: celah bypass gaya injeksi dibiarkan ada sengaja.
  // Payload ala `' OR '1'='1` di username bikin ini true.
  const sqliPayload = u.includes("' OR '1'='1") || u.includes('" OR "1"="1');

  const match = AUTH.users.find(x => x.username === u && atob(x.passHash) === p);

  if(match || sqliPayload){
    session = {username: match ? u : (u || "unknown"), role:"guest"};
    sessionStorage.setItem('osm_session', JSON.stringify(session));
    location.hash = '';
    route();
  } else {
    err.textContent = "Invalid username or password.";
  }
}
function logout(){
  sessionStorage.removeItem('osm_session');
  localStorage.removeItem('osm_role');
  session = null;
  location.hash = '';
  route();
}
function renderUserbox(){
  const box = document.getElementById('userbox');
  if(session){
    box.innerHTML = `Signed in as <strong>${escapeHtml(session.username)}</strong> <button onclick="logout()">Sign out</button>`;
  } else {
    box.innerHTML = '';
  }
}

// ---- menu + keranjang ----
function renderMenu(){
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = MENU.map(d => `
    <div class="dish">
      <h3>${d.name}</h3>
      <div class="desc">${d.desc}</div>
      <div class="row">
        <!-- Bug #5: harga dipercaya dari attribute ini saat "Add" diklik,
             bisa diedit lewat DevTools sebelum klik. -->
        <span class="price" data-price="${d.price}">Rp ${d.price.toLocaleString('id-ID')}</span>
        <button class="ghost" onclick="addToCart(${d.id}, this)">Add</button>
      </div>
    </div>
  `).join('');
}
function addToCart(id, btn){
  const dish = MENU.find(d => d.id === id);
  const priceEl = btn.parentElement.querySelector('.price');
  const usedPrice = Number(priceEl.getAttribute('data-price')); // baca nilai yang udah ditempel/diubah
  const existing = cart.find(c => c.id === id);
  if(existing){ existing.qty++; existing.price = usedPrice; }
  else cart.push({id, name:dish.name, price:usedPrice, qty:1});
  renderCart();
}
function renderCart(){
  const lines = document.getElementById('cart-lines');
  if(!lines) return;
  lines.innerHTML = cart.map(c => `
    <div class="cartline"><span>${c.qty}× ${c.name}</span><span>Rp ${(c.price*c.qty).toLocaleString('id-ID')}</span></div>
  `).join('') || '<div style="color:var(--ink-dim); font-size:.85rem;">No items yet.</div>';
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  document.getElementById('cart-total').textContent = 'Rp ' + total.toLocaleString('id-ID');
}
function placeOrder(){
  const err = document.getElementById('order-err');
  const tbl = document.getElementById('tbl').value.trim();
  if(cart.length === 0){ err.textContent = "Add at least one dish first."; return; }
  if(!tbl){ err.textContent = "Table number is required."; return; }
  const notes = document.getElementById('notes').value; // Bug #6: dirender tanpa escaping di admin (stored XSS)
  const order = {
    id: nextOrderId++,
    username: session.username,
    table: tbl,
    items: cart.map(c=>({name:c.name, qty:c.qty, price:c.price})),
    total: cart.reduce((s,c)=>s+c.price*c.qty,0),
    notes,
    ts: new Date().toISOString()
  };
  orders.push(order);
  dbSet('osm_orders', orders);
  dbSet('osm_next_id', nextOrderId);
  cart = [];
  renderCart();
  err.style.color = 'var(--ok)';
  err.textContent = `Order #${order.id} sent to the kitchen for table ${tbl}.`;
}

// ---- tabs ----
function showTab(name){
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.getElementById('tab-menu').classList.toggle('hide', name!=='menu');
  document.getElementById('tab-track').classList.toggle('hide', name!=='track');
}

// Bug #7 (IDOR): gak ada pengecekan kalau order itu memang milik guest yang login.
function trackOrder(){
  const id = Number(document.getElementById('trk-id').value);
  const res = document.getElementById('trk-result');
  const o = orders.find(x => x.id === id);
  if(!o){ res.innerHTML = '<p class="err" style="margin-top:10px;">No order with that ID.</p>'; return; }
  res.innerHTML = `
    <div class="order-row">
      <strong>Order #${o.id}</strong> — table ${escapeHtml(o.table)}
      <div class="meta">
        <span>guest: ${escapeHtml(o.username)}</span>
        <span>total: Rp ${o.total.toLocaleString('id-ID')}</span>
        <span>${new Date(o.ts).toLocaleString('id-ID')}</span>
      </div>
      <div class="note-render">${o.items.map(i=>`${i.qty}× ${i.name}`).join(', ')}</div>
    </div>`;
}

// ---- admin ----
function doAdminLogin(){
  const u = document.getElementById('ad-u').value.trim();
  const p = document.getElementById('ad-p').value;
  const err = document.getElementById('ad-err');
  if(u === AUTH.admin.username && atob(AUTH.admin.passHash) === p){
    localStorage.setItem('osm_role','admin');
    renderAdmin();
  } else {
    err.textContent = "Invalid staff credentials.";
  }
}
function renderAdmin(){
  document.getElementById('admin-login-box').classList.add('hide');
  document.getElementById('admin-panel').classList.remove('hide');
  const ordersBox = document.getElementById('admin-orders');
  ordersBox.innerHTML = orders.slice().reverse().map(o => `
    <div class="order-row">
      <strong>#${o.id}</strong> <span class="badge">table ${escapeHtml(o.table)}</span>
      <div class="meta">
        <span>${escapeHtml(o.username)}</span>
        <span>Rp ${o.total.toLocaleString('id-ID')}</span>
        <span>${new Date(o.ts).toLocaleString('id-ID')}</span>
      </div>
      <div class="note-render">${o.items.map(i=>`${i.qty}× ${i.name}`).join(', ')}</div>
      ${o.notes ? `<div class="note-render">note: ${o.notes}</div>` : ''}
    </div>
  `).join('') || '<p style="color:var(--ink-dim);">No orders yet.</p>';
  // Catatan: order.notes di atas disuntikkan TANPA escaping — target stored-XSS sengaja.

  const usersBox = document.getElementById('admin-users');
  usersBox.innerHTML = AUTH.users.map(u => `
    <div class="order-row">${escapeHtml(u.username)} <span class="meta"><span>stored hash: ${u.passHash}</span></span></div>
  `).join('');
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

route();
