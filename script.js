const DB = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(`wensa_${key}`)) ?? fallback; }
    catch { return fallback; }
  },
  write(key, value) { localStorage.setItem(`wensa_${key}`, JSON.stringify(value)); }
};

const defaultVisits = [
  { title: "Rabat community visit", location: "Rabat", text: "Friendly visits where we listen, share encouragement and support families facing difficult moments.", image: "https://images.unsplash.com/photo-1517841905240-472988c2477c?auto=format&fit=crop&w=1200&q=80" },
  { title: "Care & kindness day", location: "Casablanca", text: "Small acts of care, warm conversations and volunteer support during our local outreach moments.", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80" },
  { title: "Community gathering", location: "Marrakech", text: "Open moments of connection to raise awareness, strengthen local solidarity and invite new support.", image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80" }
];
const defaultEvents = [
  {id:'event-1', title:'Solidarity Walk', city:'Rabat', date:'Saturday · 10:00 AM', description:'A community walk to raise awareness and support people affected by cancer.', active:true},
  {id:'event-2', title:'Care & Kindness Night', city:'Casablanca', date:'Friday · 7:00 PM', description:'An evening focused on listening, care and practical ways to support the community.', active:true},
  {id:'event-3', title:'Open Community Café', city:'Marrakech', date:'Sunday · 9:30 AM', description:'A warm gathering to share project updates and meet new supporters.', active:true}
];
const starterProducts = window.WENSA_SEED || [];

function renderProducts() {
  const container = document.querySelector(".products");
  if (!container) return;
  const products = DB.read("products", starterProducts).filter(p => p.active !== false);
  container.innerHTML = products.length ? products.map(p => `
    <article class="product reveal">
      <img src="${escapeHtml(p.image || '')}" alt="${escapeHtml(p.name)}" onerror="this.src='assets/wensa-logo.jpeg'">
      <div><small>${escapeHtml(p.type || 'WENSA COLLECTION')}</small>
      <h3>${escapeHtml(p.name)} <b>${escapeHtml(p.price || 'Price on request')}</b></h3>
      <p class="product-description">${escapeHtml(p.description || '')}</p>
      <a href="#contact" data-product="${escapeHtml(p.name)}">Ask about this product ↗</a></div>
    </article>`).join("") : '<p class="empty-store">New WENSA products will be added soon.</p>';
  container.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
  container.querySelectorAll("[data-product]").forEach(a => a.addEventListener("click", () => {
    const message = document.querySelector('#contact-form textarea[name="message"]');
    if (message) message.value = `I would like to know more about: ${a.dataset.product}`;
  }));
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const toggle = document.querySelector(".toggle");
const nav = document.querySelector("nav");
if (toggle && nav) {
  // the open/close click is already handled in language-chat.js (two handlers = opens then closes immediately)
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}
renderProducts();

const contactForm = document.querySelector("#contact-form");
if (contactForm) contactForm.addEventListener("submit", e => {
  e.preventDefault();
  const d = new FormData(contactForm);
  const messages = DB.read("messages", []);
  messages.unshift({ id: Date.now().toString(), name: d.get("name"), email: d.get("email"), message: d.get("message"), date: new Date().toLocaleString() });
  DB.write("messages", messages);
  const subject = encodeURIComponent("WENSA message from " + d.get("name"));
  const body = encodeURIComponent(d.get("message") + "\n\nName: " + d.get("name") + "\nEmail: " + d.get("email"));
  const status = document.querySelector(".status");
  if (status) status.textContent = "Message saved in this browser. Your email app will also open.";
  window.location.href = "mailto:hello@wensa.org?subject=" + subject + "&body=" + body;
});

function renderVisits() {
  const slider = document.querySelector("[data-visits]");
  if (!slider) return;
  const items = DB.read("visits", defaultVisits).filter(Boolean);
  if (!items.length) return;
  let activeIndex = Number(sessionStorage.getItem("wensa_visit_index") || 0);
  const render = () => {
    const item = items[activeIndex % items.length];
    slider.innerHTML = `
      <div class="visit-card">
        <img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.title || 'WENSA visit')}" onerror="this.src='https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'">
        <div class="visit-content">
          <small>${escapeHtml(item.location || 'Community visit')}</small>
          <h3>${escapeHtml(item.title || 'WENSA visit')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
        </div>
      </div>
    `;
  };
  render();
  const change = direction => {
    activeIndex = (activeIndex + (direction === 'next' ? 1 : -1) + items.length) % items.length;
    sessionStorage.setItem("wensa_visit_index", String(activeIndex));
    render();
  };
  document.querySelectorAll("[data-visit-dir]").forEach(button => {
    button.onclick = () => change(button.dataset.visitDir);
  });
  setInterval(() => change('next'), 5000);
}

function renderHomeEvents() {
  const list = document.querySelector('#events-grid');
  if (!list) return;
  const items = DB.read('events', defaultEvents).filter(item => item.active !== false).slice(0, 3);
  if (!items.length) return;
  list.innerHTML = items.map(item => `
    <article class="event-card">
      <div class="event-visual" style="background-image: linear-gradient(rgba(16,47,53,0.12), rgba(16,47,53,0.12)), url('${escapeHtml(item.image || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80')}')"></div>
      <span class="event-date">${escapeHtml(item.date || 'Soon')}</span>
      <h3>${escapeHtml(item.title || 'WENSA event')}</h3>
      <p class="event-meta">${escapeHtml(item.city || 'Community')}</p>
      <p>${escapeHtml(item.description || '')}</p>
    </article>
  `).join('');
}

function renderEventPage() {
  const list = document.querySelector('#events-grid');
  if (!list) return;
  const items = DB.read('events', defaultEvents).filter(item => item.active !== false);
  if (!items.length) return;
  list.innerHTML = items.map(item => `
    <article class="event-card compact-card">
      <div class="event-thumb" style="background-image: linear-gradient(rgba(16,47,53,0.12), rgba(16,47,53,0.12)), url('${escapeHtml(item.image || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80')}')" aria-label="${escapeHtml(item.title || 'WENSA event')}"></div>
      <div class="event-info">
        <span class="event-tag">${escapeHtml(item.city || 'Community')}</span>
        <h3>${escapeHtml(item.title || 'WENSA event')}</h3>
        <p>${escapeHtml(item.description || '')}</p>
        <div class="event-schedule">
          <span>${escapeHtml(item.date || 'Soon')}</span>
          <span>${escapeHtml(item.city || 'Community')}</span>
        </div>
      </div>
    </article>
  `).join('');
}

const enquiry=localStorage.getItem("wensa_product_enquiry");
if(enquiry){const field=document.querySelector('#contact-form textarea[name="message"]');if(field)field.value="I would like to know more about: "+enquiry;localStorage.removeItem("wensa_product_enquiry");}

renderVisits();
if (document.body.classList.contains('events-page')) {
  renderEventPage();
} else {
  renderHomeEvents();
}
