(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.FAMEFLOW_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase;
  const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  // Theme: follow device by default, allow a saved manual preference.
  const themeKey = 'fameflow-theme';
  const systemTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function applyTheme(choice) {
    const actual = choice === 'system' ? (systemTheme && systemTheme.matches ? 'light' : 'dark') : choice;
    document.documentElement.dataset.theme = actual;
    document.documentElement.style.colorScheme = actual;
    const toggle = $('theme-toggle');
    if (toggle) { toggle.textContent = actual === 'dark' ? '☀' : '☾'; toggle.setAttribute('aria-label', `Switch to ${actual === 'dark' ? 'light' : 'dark'} theme`); }
  }
  let themeChoice = localStorage.getItem(themeKey) || 'system';
  applyTheme(themeChoice);
  if (systemTheme) systemTheme.addEventListener?.('change', () => { if (themeChoice === 'system') applyTheme('system'); });
  $('theme-toggle')?.addEventListener('click', () => { themeChoice = themeChoice === 'system' ? 'light' : themeChoice === 'light' ? 'dark' : 'system'; if (themeChoice === 'system') localStorage.removeItem(themeKey); else localStorage.setItem(themeKey, themeChoice); applyTheme(themeChoice); toast(`Theme: ${themeChoice}`); });

  const money = n => `KSh ${Number(n || 0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  let services = [], selected = null;
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  const menu = $('menu-toggle');
  if (menu) menu.addEventListener('click', () => $('mobile-nav')?.classList.toggle('open'));
  const toast = msg => { const el=$('toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); };
  document.addEventListener('click', async e => {
    const button=e.target.closest('[data-copy]'); if(!button)return;
    const value=button.dataset.copy;
    try {
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else { const field=document.createElement('textarea'); field.value=value; field.style.position='fixed'; field.style.opacity='0'; document.body.appendChild(field); field.select(); document.execCommand('copy'); field.remove(); }
      const previous=button.textContent; button.textContent='Copied'; setTimeout(()=>button.textContent=previous,1400);
    } catch { toast('Copy unavailable. Please select and copy the number.'); }
  });
  const result = (el,msg,error=false) => { if(!el)return; el.textContent=msg; el.classList.toggle('error',error); };
  const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const platformIcon = p => { const x=(p||'').toLowerCase(); return x.includes('instagram')?'◎':x.includes('tiktok')?'♪':x.includes('youtube')?'▶':x.includes('facebook')?'f':x.includes('telegram')?'➤':'✦'; };

  async function loadServices(){
    const grid=$('service-grid'); if(!grid)return;
    if(!db){grid.innerHTML='<div class="empty-state">Supabase is not configured. Check config.js.</div>';return;}
    const {data,error}=await db.from('services').select('*').eq('active',true).order('sort_order').order('created_at');
    if(error){grid.innerHTML=`<div class="empty-state">Could not load services: ${escapeHtml(error.message)}</div>`;return;}
    services=data||[];
    grid.innerHTML=services.length?services.map(s=>`<article class="service-card"><div class="service-icon">${platformIcon(s.platform)}</div><div class="eyebrow">${escapeHtml(s.platform)}</div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description||s.category||'Social media growth service')}</p><div class="service-meta"><div class="service-price">${money(s.price_per_1000)} <small>/ 1,000</small></div><button class="button button-small" data-order="${s.id}">Select ↗</button></div></article>`).join(''):'<div class="empty-state">No services have been published yet. Add your first service in Admin.</div>';
    grid.querySelectorAll('[data-order]').forEach(b=>b.addEventListener('click',()=>openOrder(b.dataset.order)));
  }
  function openOrder(id){
    selected=services.find(s=>s.id===id); if(!selected)return;
    $('order-area')?.classList.remove('hidden');
    $('order-service').value=id;
    $('selected-service').textContent=`${selected.platform} · ${selected.name} · ${money(selected.price_per_1000)} per 1,000`;
    $('quantity').min=selected.min_quantity; $('quantity').max=selected.max_quantity; $('quantity').value=selected.min_quantity;
    $('estimated-total').textContent=money(selected.min_quantity*selected.price_per_1000/1000);
    result($('order-message'),''); $('payment-panel')?.classList.add('hidden');
    $('order-area').scrollIntoView({behavior:'smooth',block:'start'});
  }
  if($('quantity')) $('quantity').addEventListener('input',()=>{if(selected)$('estimated-total').textContent=money(Number($('quantity').value||0)*selected.price_per_1000/1000);});

  if($('order-form')) $('order-form').addEventListener('submit',async e=>{
    e.preventDefault(); if(!db){result($('order-message'),'Supabase is not configured.',true);return;}
    const btn=e.submitter; btn.disabled=true; btn.textContent='Creating…';
    const {data,error}=await db.rpc('create_guest_order',{p_service_id:$('order-service').value,p_target_url:$('target-url').value.trim(),p_quantity:Number($('quantity').value),p_preview_image_url:null,p_customer_contact:$('contact').value.trim()||null});
    btn.disabled=false;btn.innerHTML='Create order <span>→</span>';
    if(error){result($('order-message'),error.message,true);return;}
    const o=Array.isArray(data)?data[0]:data;
    // The secure random ticket is the sole customer credential for tracking and payment submission.
    $('payment-form').dataset.ticket=o.ticket;
    $('payment-amount').value=Number(o.total_amount).toFixed(2);
    $('created-ticket').innerHTML=`<span>Your order ticket</span><strong>${escapeHtml(o.ticket)}</strong><small>Save this ticket. It is all you need to track your order.</small>`;
    result($('order-message'),`Order created successfully. Your ticket is ${o.ticket}.`);
    $('payment-panel').classList.remove('hidden');
    toast('Order created. Save your ticket number.');
  });

  if($('payment-form')) $('payment-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!db){result($('payment-message'),'Supabase is not configured.',true);return;}
    const {ticket}=e.currentTarget.dataset;
    const {error}=await db.rpc('submit_guest_payment_by_ticket',{p_ticket:ticket,p_transaction_id:$('payment-transaction').value.trim(),p_amount:Number($('payment-amount').value)});
    if(error){result($('payment-message'),error.message,true);return;}
    result($('payment-message'),'Payment details submitted. Your payment is awaiting manual verification.');toast('Payment submitted for review.');
  });

  if($('track-form')){
    const params=new URLSearchParams(location.search); if(params.get('ticket'))$('track-ticket').value=params.get('ticket');
    $('track-form').addEventListener('submit',async e=>{
      e.preventDefault(); if(!db){result($('track-result'),'Supabase is not configured.',true);return;}
      const ticket=$('track-ticket').value.trim().toUpperCase();
      result($('track-result'),'Looking up your order…');$('track-result').classList.remove('hidden');
      const {data,error}=await db.rpc('track_guest_order_by_ticket',{p_ticket:ticket});
      if(error){result($('track-result'),error.message,true);return;}
      if(!data||data.error){result($('track-result'),data?.error||'Order not found. Check your ticket number.',true);return;}
      const updates=(data.updates||[]).map(x=>`<li><time>${new Date(x.created_at).toLocaleString()}</time><span>${escapeHtml(x.message)}</span></li>`).join('');
      $('track-result').innerHTML=`<div class="result-top"><span class="status-pill">${escapeHtml(String(data.status).replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(data.ticket)}</strong></div><div class="tracking-facts"><div><small>Service</small><b>${escapeHtml(data.service_name)}</b></div><div><small>Platform</small><b>${escapeHtml(data.platform)}</b></div><div><small>Quantity</small><b>${Number(data.quantity).toLocaleString()}</b></div><div><small>Order total</small><b>${money(data.total_amount)}</b></div><div><small>Payment</small><b>${escapeHtml(data.payment?.status||'Not submitted')}</b></div></div><h3>Order updates</h3><ol class="update-list">${updates||'<li><span>No updates yet.</span></li>'}</ol>`;
    });
  }

  async function adminLogin(email,password){
    const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
    const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(adminError||!admin){await db.auth.signOut();throw new Error('This account is not registered as a Fameflow administrator.');}
    $('admin-login').classList.add('hidden');$('admin-panel').classList.remove('hidden');await loadAdminOrders();
  }
  if($('admin-login')) $('admin-login').addEventListener('submit',async e=>{e.preventDefault();if(!db){result($('admin-message'),'Supabase is not configured.',true);return;}try{await adminLogin($('admin-email').value,$('admin-password').value);result($('admin-message'),'Signed in.');}catch(err){result($('admin-message'),err.message,true);}});
  if($('admin-logout')) $('admin-logout').addEventListener('click',async()=>{await db.auth.signOut();$('admin-panel').classList.add('hidden');$('admin-login').classList.remove('hidden');});
  if($('admin-refresh')) $('admin-refresh').addEventListener('click',loadAdminOrders);
  async function loadAdminOrders(){
    const host=$('admin-orders');if(!host)return;host.innerHTML='<div class="muted small">Loading orders…</div>';
    const {data,error}=await db.from('orders').select('*,payments(*)').order('created_at',{ascending:false}).limit(100);
    if(error){host.textContent=error.message;return;} if(!data.length){host.innerHTML='<div class="muted small">No orders yet.</div>';return;}
    host.innerHTML=data.map(o=>`<article class="admin-order"><div class="admin-order-head"><b>${escapeHtml(o.ticket)} · ${escapeHtml(o.service_name)}</b><b>${money(o.total_amount)}</b></div><p>${escapeHtml(o.platform)} · ${o.quantity} units · ${new Date(o.created_at).toLocaleString()}</p><p>Target: <a href="${escapeHtml(o.target_url)}" target="_blank" rel="noopener">${escapeHtml(o.target_url)}</a></p><p>Status: ${escapeHtml(o.status)} · Payment: ${escapeHtml(o.payments?.[0]?.status||'not submitted')}</p>${(o.payments||[]).map(p=>`<p>Transaction: ${escapeHtml(p.transaction_id)} · ${money(p.amount)} · ${escapeHtml(p.status)}</p><div class="two-inputs"><button class="button button-small" data-pay="${p.id}" data-paystatus="verified">Verify payment</button><button class="button button-small button-outline" data-pay="${p.id}" data-paystatus="rejected">Reject payment</button></div>`).join('')}<label class="admin-label">Order status<select data-status="${o.id}">${['awaiting_payment','payment_review','payment_rejected','accepted','processing','completed','cancelled'].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s.replaceAll('_',' ')}</option>`).join('')}</select></label><label class="admin-label">Customer update<textarea data-note="${o.id}" placeholder="Customer-facing update / admin note"></textarea></label><button class="button button-small" data-save="${o.id}">Save status & update</button></article>`).join('');
    host.querySelectorAll('[data-pay]').forEach(b=>b.addEventListener('click',()=>updatePayment(b.dataset.pay,b.dataset.paystatus)));
    host.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>updateOrder(b.dataset.save)));
  }
  async function updatePayment(id,status){
    const {data:p,error:readError}=await db.from('payments').select('order_id,transaction_id,amount').eq('id',id).single();if(readError){toast(readError.message);return;}
    const {error}=await db.from('payments').update({status,reviewed_at:new Date().toISOString()}).eq('id',id);if(error){toast(error.message);return;}
    const next=status==='verified'?'accepted':'payment_rejected';
    const message=status==='verified'?`Your payment (${p.transaction_id}) has been verified. Your order has been accepted.`:`Your payment (${p.transaction_id}) could not be verified. Please contact Fameflow support.`;
    const {error:oe}=await db.from('orders').update({status:next}).eq('id',p.order_id);if(oe){toast(oe.message);return;}
    const {error:ne}=await db.from('notifications').insert({order_id:p.order_id,message,status_snapshot:next});if(ne){toast(ne.message);return;}
    toast('Payment and order updated.');await loadAdminOrders();
  }
  async function updateOrder(id){
    const status=$(`select[data-status="${id}"]`).value,note=$(`textarea[data-note="${id}"]`).value.trim();if(!status){toast('Choose an order status.');return;}
    const {error}=await db.from('orders').update({status,admin_note:note||null}).eq('id',id);if(error){toast(error.message);return;}
    if(note){const {error:ne}=await db.from('notifications').insert({order_id:id,message:note,status_snapshot:status});if(ne){toast(ne.message);return;}}
    toast('Order updated.');await loadAdminOrders();
  }
  if($('service-form')) $('service-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!db){result($('service-message'),'Supabase is not configured.',true);return;}
    const payload={name:$('svc-name').value.trim(),platform:$('svc-platform').value.trim(),category:$('svc-category').value.trim(),description:$('svc-description').value.trim(),price_per_1000:Number($('svc-price').value),min_quantity:Number($('svc-min').value),max_quantity:Number($('svc-max').value),active:true};
    const {error}=await db.from('services').insert(payload);if(error){result($('service-message'),error.message,true);return;}
    result($('service-message'),'Service added successfully.');$('service-form').reset();await loadAdminOrders();
  });
  loadServices();
})();
