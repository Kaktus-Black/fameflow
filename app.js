(() => {
  const cfg = window.FAMEFLOW_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_PROJECT")
    && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;
  const $ = (id) => document.getElementById(id);
  const money = (n) => `KSh ${Number(n || 0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  let services = [], selected = null, adminUser = null;
  $("year").textContent = new Date().getFullYear();

  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800)}
  function result(el,msg,error=false){el.textContent=msg;el.classList.toggle("error",error)}
  function modal(id,open=true){$(id).classList.toggle("open",open)}
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>modal(b.dataset.close,false)));
  document.querySelectorAll(".modal-backdrop").forEach(b=>b.addEventListener("click",e=>{if(e.target===b)b.classList.remove("open")}));
  $("admin-open").addEventListener("click",()=>modal("admin-modal"));

  async function loadServices(){
    if(!client){$("service-grid").innerHTML='<div class="empty-state">Connect your Supabase project in <b>config.js</b> to load the live service catalogue.</div>';return}
    const {data,error}=await client.from("services").select("*").eq("active",true).order("sort_order").order("created_at");
    if(error){$("service-grid").innerHTML=`<div class="empty-state">Could not load services: ${error.message}</div>`;return}
    services=data||[];
    $("service-grid").innerHTML=services.length?services.map(s=>`<article class="service-card"><div class="service-icon">${platformIcon(s.platform)}</div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description||s.category||"Social media growth service")}</p><div class="service-meta"><div class="service-price">${money(s.price_per_1000)} <small>/ 1,000</small></div><button class="button" data-order="${s.id}">Select ↗</button></div></article>`).join(""):'<div class="empty-state">No services have been published yet. Add your first service in the admin dashboard.</div>';
    document.querySelectorAll("[data-order]").forEach(b=>b.addEventListener("click",()=>openOrder(b.dataset.order)));
  }
  function platformIcon(p){const x=(p||"").toLowerCase();return x.includes("instagram")?"◎":x.includes("tiktok")?"♪":x.includes("youtube")?"▶":x.includes("facebook")?"f":x.includes("telegram")?"➤":"✦"}
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function openOrder(id){selected=services.find(s=>s.id===id);if(!selected)return;$("order-service").value=id;$("selected-service").textContent=`${selected.platform} · ${selected.name} · ${money(selected.price_per_1000)} per 1,000`;$("quantity").min=selected.min_quantity;$("quantity").max=selected.max_quantity;$("quantity").value=selected.min_quantity;$("estimated-total").textContent=money(selected.min_quantity*selected.price_per_1000/1000);result($("order-message"),"");modal("order-modal")}
  $("quantity").addEventListener("input",()=>{if(selected)$("estimated-total").textContent=money(Number($("quantity").value||0)*selected.price_per_1000/1000)});
  $("order-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!client){result($("order-message"),"Supabase is not configured. Complete config.js first.",true);return}
    const btn=e.submitter;btn.disabled=true;btn.textContent="Creating…";
    const {data,error}=await client.rpc("create_guest_order",{p_service_id:$("order-service").value,p_target_url:$("target-url").value.trim(),p_quantity:Number($("quantity").value),p_preview_image_url:null,p_customer_contact:$("contact").value.trim()||null});
    btn.disabled=false;btn.innerHTML='Create order <span>→</span>';
    if(error){result($("order-message"),error.message,true);return}
    const o=Array.isArray(data)?data[0]:data;
    const trackingUrl=`${location.origin}${location.pathname}?ticket=${encodeURIComponent(o.ticket)}&token=${encodeURIComponent(o.tracking_token)}#track`;
    const details=`Order created!\nTicket: ${o.ticket}\nPrivate tracking code: ${o.tracking_token}\nTotal: ${money(o.total_amount)}\n\nSave both your ticket and tracking code. You will need them to check your order.`;
    result($("order-message"),details);
    $("payment-panel").classList.remove("hidden");
    $("payment-amount").value=Number(o.total_amount).toFixed(2);
    $("payment-form").dataset.ticket=o.ticket;
    $("payment-form").dataset.token=o.tracking_token;
    $("track-ticket").value=o.ticket;$("track-token").value=o.tracking_token;
    history.replaceState(null,"",trackingUrl);
    toast("Order created — save your tracking details.");
  });
  $("payment-form").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!client){result($("payment-message"),"Supabase is not configured.",true);return}
    const {ticket,token}=e.currentTarget.dataset;
    const {error}=await client.rpc("submit_guest_payment",{
      p_ticket:ticket,
      p_tracking_token:token,
      p_transaction_id:$("payment-transaction").value.trim(),
      p_amount:Number($("payment-amount").value)
    });
    if(error){result($("payment-message"),error.message,true);return}
    result($("payment-message"),"Payment details submitted. Your payment is awaiting manual verification.");
    toast("Payment submitted for review.");
  });

  $("track-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!client){result($("track-result"),"Supabase is not configured.",true);return}
    result($("track-result"),"Looking up your order…");
    const {data,error}=await client.rpc("track_guest_order",{p_ticket:$("track-ticket").value.trim(),p_tracking_token:$("track-token").value.trim()});
    if(error){result($("track-result"),error.message,true);return}
    const updates=(data.updates||[]).map(x=>`• ${new Date(x.created_at).toLocaleString()} — ${x.message}`).join("\n");
    result($("track-result"),`Status: ${data.status.replaceAll("_"," ").toUpperCase()}\nService: ${data.service_name}\nPlatform: ${data.platform}\nQuantity: ${data.quantity}\nTotal: ${money(data.total_amount)}\nPayment: ${data.payment?.status||"Not submitted"}\n\nUpdates:\n${updates||"No updates yet."}`);
  });

  async function login(email,password){
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;adminUser=data.user;
    const {data:admin,error:adminError}=await client.from("admin_users").select("user_id").eq("user_id",adminUser.id).maybeSingle();
    if(adminError||!admin) {await client.auth.signOut();adminUser=null;throw new Error("This account is not registered as a Fameflow administrator.");}
    $("admin-login").classList.add("hidden");$("admin-panel").classList.remove("hidden");await loadAdminOrders();
  }
  $("admin-login").addEventListener("submit",async e=>{e.preventDefault();if(!client){result($("admin-message"),"Supabase is not configured.",true);return}try{await login($("admin-email").value,$("admin-password").value);result($("admin-message"),"Signed in.");}catch(err){result($("admin-message"),err.message,true)}});
  $("admin-logout").addEventListener("click",async()=>{await client.auth.signOut();adminUser=null;$("admin-panel").classList.add("hidden");$("admin-login").classList.remove("hidden")});
  $("admin-refresh").addEventListener("click",loadAdminOrders);

  async function loadAdminOrders(){
    const host=$("admin-orders");host.innerHTML='<div class="muted tiny">Loading orders…</div>';
    const {data,error}=await client.from("orders").select("*,payments(*)").order("created_at",{ascending:false}).limit(100);
    if(error){host.textContent=error.message;return}
    if(!data.length){host.innerHTML='<div class="muted tiny">No orders yet.</div>';return}
    host.innerHTML=data.map(o=>`<article class="admin-order"><div class="admin-order-head"><b>${escapeHtml(o.ticket)} · ${escapeHtml(o.service_name)}</b><b>${money(o.total_amount)}</b></div><p>${escapeHtml(o.platform)} · ${o.quantity} units · ${new Date(o.created_at).toLocaleString()}</p><p>Target: <a href="${escapeHtml(o.target_url)}" target="_blank" rel="noopener">${escapeHtml(o.target_url)}</a></p><p>Status: ${escapeHtml(o.status)} · Payment: ${escapeHtml(o.payments?.[0]?.status||"not submitted")}</p>${(o.payments||[]).map(p=>`<p>Transaction: ${escapeHtml(p.transaction_id)} · ${money(p.amount)} · ${escapeHtml(p.status)}</p><div class="two-inputs"><button class="button button-small" data-pay="${p.id}" data-paystatus="verified">Verify payment</button><button class="button button-small button-outline" data-pay="${p.id}" data-paystatus="rejected">Reject payment</button></div>`).join("")}<select data-status="${o.id}"><option value="">Change order status…</option>${["awaiting_payment","payment_review","payment_rejected","accepted","processing","completed","cancelled"].map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${s.replaceAll("_"," ")}</option>`).join("")}</select><textarea data-note="${o.id}" placeholder="Customer-facing update / admin note"></textarea><button class="button button-small" data-save="${o.id}">Save status & update</button></article>`).join("");
    host.querySelectorAll("[data-pay]").forEach(b=>b.addEventListener("click",()=>updatePayment(b.dataset.pay,b.dataset.paystatus)));
    host.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>updateOrder(b.dataset.save)));
  }
  async function updatePayment(id,status){
    const {error}=await client.from("payments").update({status,reviewed_at:new Date().toISOString()}).eq("id",id);
    if(error){toast(error.message);return}
    toast("Payment updated.");await loadAdminOrders();
  }
  async function updateOrder(id){
    const status=$(`select[data-status="${id}"]`).value;
    const note=$(`textarea[data-note="${id}"]`).value.trim();
    if(!status){toast("Choose an order status first.");return}
    const {error}=await client.from("orders").update({status,admin_note:note||null}).eq("id",id);
    if(error){toast(error.message);return}
    if(note){const {data:order}=await client.from("orders").select("id").eq("id",id).single();await client.from("notifications").insert({order_id:order.id,message:note,status_snapshot:status})}
    toast("Order updated.");await loadAdminOrders();
  }
  $("service-form").addEventListener("submit",async e=>{
    e.preventDefault();const payload={name:$("svc-name").value.trim(),platform:$("svc-platform").value.trim(),category:$("svc-category").value.trim(),description:$("svc-description").value.trim(),price_per_1000:Number($("svc-price").value),min_quantity:Number($("svc-min").value),max_quantity:Number($("svc-max").value),active:true};
    const {error}=await client.from("services").insert(payload);
    if(error){result($("service-message"),error.message,true);return}
    result($("service-message"),"Service added successfully.");$("service-form").reset();await loadServices();
  });

  const params=new URLSearchParams(location.search);
  if(params.get("ticket")&&params.get("token")){$("track-ticket").value=params.get("ticket");$("track-token").value=params.get("token");}
  loadServices();
})();