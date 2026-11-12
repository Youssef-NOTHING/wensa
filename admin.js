const KEY_PRODUCTS="wensa_products",KEY_MESSAGES="wensa_messages",KEY_EVENTS="wensa_events",KEY_CHAT="wensa_chat_settings";
const seed=window.WENSA_SEED||[];
const defaultEvents=[
  {id:'event-1', title:'Solidarity Walk', city:'Rabat', date:'Saturday · 10:00 AM', description:'A community walk to raise awareness and support people affected by cancer.', active:true},
  {id:'event-2', title:'Care & Kindness Night', city:'Casablanca', date:'Friday · 7:00 PM', description:'An evening focused on listening, care and practical ways to support the community.', active:true},
  {id:'event-3', title:'Open Community Café', city:'Marrakech', date:'Sunday · 9:30 AM', description:'A warm gathering to share project updates and meet new supporters.', active:true}
];
const defaultChatSettings={enabled:true,name:'WENSA Assistant',welcome:'Hello! Ask me about WENSA, products, donations or contacting the team.'};
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
if(!localStorage.getItem(KEY_PRODUCTS))write(KEY_PRODUCTS,seed);
if(!localStorage.getItem(KEY_EVENTS))write(KEY_EVENTS,defaultEvents);
if(!localStorage.getItem(KEY_CHAT))write(KEY_CHAT,defaultChatSettings);
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const loginPanel=$("login-panel"),dashboard=$("dashboard");
let uploadedImageData="";
const uploadInput=$("product-upload"),previewWrap=$("image-preview-wrap"),previewImage=$("image-preview");
let uploadedEventImageData="";
const eventUploadInput=$("event-upload"),eventPreviewWrap=$("event-image-preview-wrap"),eventPreviewImage=$("event-image-preview");
function showImagePreview(src){if(src){previewImage.src=src;previewWrap.hidden=false;}else{previewImage.removeAttribute("src");previewWrap.hidden=true;}}
function showEventImagePreview(src){if(src){eventPreviewImage.src=src;eventPreviewWrap.hidden=false;}else{eventPreviewImage.removeAttribute("src");eventPreviewWrap.hidden=true;}}
uploadInput.addEventListener("change",()=>{
 const file=uploadInput.files&&uploadInput.files[0];if(!file)return;
 if(!file.type.startsWith("image/")){alert("Please choose an image file.");uploadInput.value="";return;}
 if(file.size>2*1024*1024){alert("Please choose an image smaller than 2 MB.");uploadInput.value="";return;}
 const reader=new FileReader();reader.onload=()=>{uploadedImageData=String(reader.result);showImagePreview(uploadedImageData);$("product-image").value="";};reader.readAsDataURL(file);
});
$("remove-image").addEventListener("click",()=>{uploadedImageData="";uploadInput.value="";$("product-image").value="";showImagePreview("");});
eventUploadInput.addEventListener("change",()=>{
 const file=eventUploadInput.files&&eventUploadInput.files[0];if(!file)return;
 if(!file.type.startsWith("image/")){alert("Please choose an image file.");eventUploadInput.value="";return;}
 if(file.size>2*1024*1024){alert("Please choose an image smaller than 2 MB.");eventUploadInput.value="";return;}
 const reader=new FileReader();reader.onload=()=>{uploadedEventImageData=String(reader.result);showEventImagePreview(uploadedEventImageData);$("event-image").value="";};reader.readAsDataURL(file);
});
$("remove-event-image").addEventListener("click",()=>{uploadedEventImageData="";eventUploadInput.value="";$("event-image").value="";showEventImagePreview("");});
$("login-form").addEventListener("submit",e=>{e.preventDefault();if($("admin-password").value==="wensa2026"){sessionStorage.setItem("wensa_admin","yes");showDashboard();}else $("login-error").textContent="Incorrect password. Try the demo password shown below.";});
function showDashboard(){loginPanel.hidden=true;dashboard.hidden=false;renderAll();loadOrders();}
function logout(){sessionStorage.removeItem("wensa_admin");dashboard.hidden=true;loginPanel.hidden=false;$("admin-password").value="";}
$("logout").addEventListener("click",logout);
if(sessionStorage.getItem("wensa_admin")==="yes")showDashboard();
function renderAll(){renderProducts();renderMessages();renderEvents();renderChatConfig();$("product-count").textContent=read(KEY_PRODUCTS,seed).length;$("message-count").textContent=read(KEY_MESSAGES,[]).length;}
function renderProducts(){
 const list=read(KEY_PRODUCTS,seed);
 $("product-list").innerHTML=list.length?list.map(p=>`<div class="admin-item"><img src="${escapeHTML(p.image)}" alt="" onerror="this.src='assets/wensa-logo.jpeg'"><div class="item-copy"><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.price)} · <span class="product-status">${p.active===false?"Hidden":"Visible"}</span></small></div><div class="item-actions"><button class="small-btn" data-edit="${escapeHTML(p.id)}">Modify</button><button class="small-btn delete" data-delete="${escapeHTML(p.id)}">Delete</button></div></div>`).join(""):'<p class="empty">No products yet. Add your first product.</p>';
 $("product-list").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
 $("product-list").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Delete this product?")){write(KEY_PRODUCTS,read(KEY_PRODUCTS,seed).filter(p=>p.id!==b.dataset.delete));renderAll();}});
}
function editProduct(id){
 const p=read(KEY_PRODUCTS,seed).find(x=>x.id===id);if(!p)return;
 $("product-id").value=p.id;$("product-name").value=p.name;$("product-type").value=p.type||"";$("product-price").value=p.price||"";
 $("product-image").value=(p.image||"").startsWith("data:")?"":(p.image||"");uploadedImageData=(p.image||"").startsWith("data:")?(p.image||""):"";
 uploadInput.value="";showImagePreview(p.image||"");$("product-description").value=p.description||"";$("product-active").checked=p.active!==false;$("product-custom").checked=!!p.custom;
 $("editor-title").textContent="Modify product";$("save-product").textContent="Update product";window.scrollTo({top:0,behavior:"smooth"});
}
function clearEditor(){$("product-form").reset();$("product-id").value="";uploadedImageData="";uploadInput.value="";showImagePreview("");$("product-active").checked=true;$("product-custom").checked=false;$("editor-title").textContent="Add a product";$("save-product").textContent="Save product";}
$("cancel-edit").onclick=clearEditor;
$("product-form").addEventListener("submit",e=>{
 e.preventDefault();const list=read(KEY_PRODUCTS,seed),id=$("product-id").value,old=list.find(p=>p.id===id);
 const product={id:id||"p"+Date.now(),name:$("product-name").value.trim(),type:$("product-type").value.trim(),price:$("product-price").value.trim(),image:uploadedImageData||$("product-image").value.trim()||(old?old.image:""),description:$("product-description").value.trim(),active:$("product-active").checked,custom:$("product-custom").checked};
 write(KEY_PRODUCTS,id?list.map(p=>p.id===id?product:p):[product,...list]);clearEditor();renderAll();
});
function renderMessages(){const messages=read(KEY_MESSAGES,[]);$("message-list").innerHTML=messages.length?messages.map(m=>`<article class="message-item"><time>${escapeHTML(m.date)}</time><strong>${escapeHTML(m.name)}</strong> · <a href="mailto:${encodeURIComponent(m.email)}">${escapeHTML(m.email)}</a><p>${escapeHTML(m.message)}</p></article>`).join(""):'<p class="empty">No messages saved in this browser yet.</p>';}
function renderEvents(){const list=read(KEY_EVENTS,defaultEvents);$("event-list").innerHTML=list.length?list.map(e=>`<div class="admin-item"><img src="${escapeHTML(e.image || 'assets/wensa-logo.jpeg')}" alt="" onerror="this.src='assets/wensa-logo.jpeg'"><div class="item-copy"><b>${escapeHTML(e.title)}</b><small>${escapeHTML(e.city)} · ${escapeHTML(e.date)} · ${e.active===false?"Hidden":"Visible"}</small></div><div class="item-actions"><button class="small-btn" data-event-edit="${escapeHTML(e.id)}">Modify</button><button class="small-btn delete" data-event-delete="${escapeHTML(e.id)}">Delete</button></div></div>`).join(""):'<p class="empty">No events yet. Add your first event.</p>';
 $("event-list").querySelectorAll("[data-event-edit]").forEach(button=>button.onclick=()=>editEvent(button.dataset.eventEdit));
 $("event-list").querySelectorAll("[data-event-delete]").forEach(button=>button.onclick=()=>{if(confirm("Delete this event?")){write(KEY_EVENTS,read(KEY_EVENTS,defaultEvents).filter(e=>e.id!==button.dataset.eventDelete));renderAll();}});
}
function renderChatConfig(){const config=read(KEY_CHAT,defaultChatSettings);$("chat-enabled").checked=config.enabled!==false;$("chat-name").value=config.name||defaultChatSettings.name;$("chat-welcome").value=config.welcome||defaultChatSettings.welcome;}
function clearEventEditor(){ $("event-form").reset(); $("event-id").value=""; $("event-active").checked=true; uploadedEventImageData=""; eventUploadInput.value=""; $("event-image").value=""; showEventImagePreview(""); }
function editEvent(id){const item=read(KEY_EVENTS,defaultEvents).find(e=>e.id===id);if(!item)return;$("event-id").value=item.id;$("event-title").value=item.title||"";$("event-city").value=item.city||"";$("event-date").value=item.date||"";$("event-image").value=item.image||"";uploadedEventImageData=item.image&&item.image.startsWith("data:")?item.image:"";showEventImagePreview(item.image||"");$("event-description").value=item.description||"";$("event-active").checked=item.active!==false;window.scrollTo({top:0,behavior:"smooth"});}
$("clear-event").onclick=clearEventEditor;
async function notifyMembersAboutEvent(event){
  try{
    const res=await fetch("/api/events/notify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event})});
    const json=await res.json().catch(()=>({}));
    return { ok: res.ok, sent: !!json.sent, message: json.message || "" };
  }catch(error){
    console.warn("Event notification failed:", error);
    return { ok: false, sent: false, message: "" };
  }
}
$("event-form").addEventListener("submit",async e=>{e.preventDefault();const list=read(KEY_EVENTS,defaultEvents);const event={id:$("event-id").value||"event-"+Date.now(),title:$("event-title").value.trim(),city:$("event-city").value.trim(),date:$("event-date").value.trim(),image:uploadedEventImageData||$("event-image").value.trim(),description:$("event-description").value.trim(),active:$("event-active").checked};const exists=list.some(item=>item.id===event.id);write(KEY_EVENTS,exists?list.map(item=>item.id===event.id?event:item):[event,...list]);clearEventEditor();renderAll();const result=await notifyMembersAboutEvent(event);if(result.sent){alert("Event saved and members were notified by email.");}else if(result.ok){alert("Event saved locally. Email notification is configured but was not sent.");}else{alert("Event saved locally. To enable member email alerts, set Gmail and notify email settings in .env.");}});
$("chat-settings-form").addEventListener("submit",e=>{e.preventDefault();const config={enabled:$("chat-enabled").checked,name:$("chat-name").value.trim()||defaultChatSettings.name,welcome:$("chat-welcome").value.trim()||defaultChatSettings.welcome};write(KEY_CHAT,config);renderAll();});
$("clear-messages").onclick=()=>{if(confirm("Clear all saved messages?")){write(KEY_MESSAGES,[]);renderAll();}};
$("export-data").onclick=()=>{const data={products:read(KEY_PRODUCTS,seed),messages:read(KEY_MESSAGES,[]),events:read(KEY_EVENTS,defaultEvents),chatSettings:read(KEY_CHAT,defaultChatSettings),exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="wensa-local-backup.json";a.click();URL.revokeObjectURL(url);};
$("reset-data").onclick=()=>{if(confirm("Reset products and remove locally saved messages? This cannot be undone.")){write(KEY_PRODUCTS,seed);write(KEY_MESSAGES,[]);write(KEY_EVENTS,defaultEvents);write(KEY_CHAT,defaultChatSettings);clearEditor();clearEventEditor();renderAll();}};

/* ---------- ORDERS (stored on the server in data/orders.json) ---------- */
const ORDER_STATUS=["new","confirmed","delivered","cancelled"];
function ordersAuth(){return sessionStorage.getItem("wensa_orders_pw")||"";}
async function loadOrders(){
 const box=$("order-list"),err=$("orders-error");err.textContent="";
 const pw=ordersAuth();
 if(!pw){box.innerHTML='<p class="empty">Enter the server admin password to load orders.</p>';return;}
 try{
  const r=await fetch("/api/orders",{headers:{"x-admin-password":pw}});
  if(r.status===401){sessionStorage.removeItem("wensa_orders_pw");err.textContent="Wrong password.";box.innerHTML="";return;}
  if(!r.ok){const j=await r.json().catch(()=>({}));err.textContent=j.error||"Could not load orders.";box.innerHTML="";return;}
  const list=await r.json();
  box.innerHTML=list.length?list.map(o=>`<article class="message-item order-item"><time>${escapeHTML(new Date(o.createdAt).toLocaleString())}</time><strong>${escapeHTML(o.ref)}</strong>
   <p><b>${escapeHTML(o.customer.name)}</b> · <a href="tel:${escapeHTML(o.customer.phone)}">${escapeHTML(o.customer.phone)}</a><br>${escapeHTML(o.customer.city)} — ${escapeHTML(o.customer.address)}</p>
   <p>${o.items.map(i=>`${i.qty} × ${escapeHTML(i.name)}${i.custom?`<br><i>✎ ${escapeHTML(i.custom)}</i>`:""}`).join("<br>")}</p>
   <p><b>Total: ${Number(o.total).toLocaleString("en-US")} DH</b>${o.hasUnpricedItems?" (+ items without price)":""}</p>
   <select data-order="${escapeHTML(o.ref)}">${ORDER_STATUS.map(s=>`<option value="${s}"${s===o.status?" selected":""}>${s}</option>`).join("")}</select></article>`).join(""):'<p class="empty">No orders yet.</p>';
 }catch{err.textContent="Server not reachable. Run npm start and open http://localhost:3000/admin.html.";}
}
$("load-orders").onclick=()=>{const v=$("orders-password").value;if(v)sessionStorage.setItem("wensa_orders_pw",v);loadOrders();};
$("refresh-orders").onclick=loadOrders;
$("order-list").addEventListener("change",async e=>{
 const ref=e.target.dataset.order;if(!ref)return;
 const r=await fetch("/api/orders/"+encodeURIComponent(ref),{method:"PATCH",headers:{"Content-Type":"application/json","x-admin-password":ordersAuth()},body:JSON.stringify({status:e.target.value})});
 if(!r.ok)$("orders-error").textContent="Could not update the status.";
});
