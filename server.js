import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "20kb" }));
app.use("/api/", rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));

function buildFallbackChatReply(message, language = "English") {
  const text = String(message || "").trim().toLowerCase();
  const lang = String(language).toLowerCase();
  const isFrench = lang.includes("fr") || lang.includes("french");
  const isArabic = lang.includes("ar") || lang.includes("arabic");

  if (text.includes("wensa")) {
    return isArabic
      ? "WENSA هي مبادرة مجتمعية تركز على الوعي والتضامن ودعم الأشخاص المتأثرين بالسرطان. يمكنكم اكتشاف المشاريع والمنتجات والفعاليات من خلال الموقع."
      : isFrench
      ? "WENSA est une initiative communautaire qui promeut la sensibilisation, la solidarité et le soutien aux personnes touchées par le cancer. Vous pouvez découvrir nos actions, produits et événements sur le site."
      : "WENSA is a community initiative focused on awareness, solidarity and support for people affected by cancer. You can explore our projects, products and events on the website.";
  }
  if (text.includes("support") || text.includes("help") || text.includes("donat") || text.includes("sout") || text.includes("تبرع") || text.includes("مساعدة")) {
    return isArabic
      ? "يمكنكم دعم WENSA عبر مشاركة رسالتنا، المشاركة في الفعاليات، شراء المنتجات أو التواصل مع الفريق لمعرفة المبادرات الرسمية."
      : isFrench
      ? "Vous pouvez soutenir WENSA en partageant notre message, en participant à nos activités, en achetant dans la boutique ou en contactant l’équipe pour découvrir les initiatives officielles."
      : "You can support WENSA by sharing our message, joining our activities, buying from the store or contacting the team to learn about official initiatives.";
  }
  if (text.includes("buy") || text.includes("product") || text.includes("shop") || text.includes("achat") || text.includes("منتج") || text.includes("متجر")) {
    return isArabic
      ? "يمكنكم زيارة صفحة المتجر لمعرفة المنتجات المتاحة. عند اختيار ‘استفسر عن المنتج’ سيتم توجيهكم للتواصل مع الفريق."
      : isFrench
      ? "Vous pouvez visiter la page Boutique pour découvrir les produits disponibles. Sélectionnez « Se renseigner sur ce produit » pour contacter l’équipe."
      : "Visit the Store page to see the available products. Select “Ask about this product” to contact the team for more details.";
  }
  if (text.includes("contact") || text.includes("team") || text.includes("email") || text.includes("contact") || text.includes("تواصل") || text.includes("فريق")) {
    return isArabic
      ? "يمكنكم التواصل مع فريق WENSA عبر قسم اتصل بنا في الصفحة الرئيسية أو من خلال نموذج الاتصال المتوفر في الموقع."
      : isFrench
      ? "Vous pouvez contacter l’équipe WENSA via la section Contact sur la page d’accueil ou via le formulaire de contact du site."
      : "You can contact the WENSA team through the Contact section on the Home page or via the contact form on the website.";
  }
  if (text.includes("event") || text.includes("activité") || text.includes("فعالية") || text.includes("events")) {
    return isArabic
      ? "توجد فعاليات مجتمعية منتظمة، ويفضل متابعة صفحة الفعاليات لمعرفة المواعيد والمناسبات القادمة."
      : isFrench
      ? "Des événements communautaires sont organisés régulièrement. Consultez la page Événements pour voir les prochains rendez-vous."
      : "WENSA organizes community events regularly. Check the Events page to learn about upcoming gatherings and activities.";
  }
  return isArabic
    ? "شكرًا لرسالتكم. يمكنني الإجابة عن أسئلة WENSA، المتجر، الزبائن، الفعاليات وطرق الدعم."
    : isFrench
    ? "Merci pour votre message. Je peux répondre aux questions sur WENSA, la boutique, les événements, les moyens de soutien et les contacts."
    : "Thanks for your message. I can help with questions about WENSA, the store, events, support options and contact details.";
}

app.post("/api/chat", async (req, res) => {
  const { message, language = "English", history = [] } = req.body || {};
  if (typeof message !== "string" || !message.trim() || message.length > 1200) {
    return res.status(400).json({ error: "Please send a message under 1200 characters." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      reply: buildFallbackChatReply(message, language),
      fallback: true
    });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const safeHistory = Array.isArray(history)
      ? history.slice(-8).filter(x => ["user", "assistant"].includes(x?.role) && typeof x?.content === "string")
          .map(x => ({ role: x.role, content: x.content.slice(0, 1200) }))
      : [];
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: `You are the WENSA website assistant. Reply only in ${language}. Help visitors understand WENSA as a community initiative that promotes awareness, solidarity and support for people affected by cancer. You may explain the website, store navigation, product enquiries, volunteering/contact options and donation information that is explicitly present on the site. Do not invent prices, product availability, bank details, donation links, impact statistics, medical facts or promises. If asked for diagnosis, treatment, medication, prognosis or urgent health advice, kindly say you cannot provide medical advice and recommend speaking with a qualified healthcare professional or local emergency services if urgent. Do not collect sensitive medical or payment information. Keep replies warm, concise and accessible. If you do not know an official WENSA detail, say so and direct the visitor to the Contact page.`,
      input: [
        ...safeHistory,
        { role: "user", content: message.trim() }
      ]
    });
    res.json({ reply: response.output_text || "Sorry, I could not prepare an answer. Please contact the WENSA team." });
  } catch (error) {
    console.error("Chat API error:", error?.message || error);
    res.status(502).json({ error: "The assistant is temporarily unavailable. Please try again later." });
  }
});

/* ---------- ORDERS ---------- */
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
let queue = Promise.resolve();
const withLock = fn => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };
async function readOrders() {
  try { return JSON.parse(await fs.readFile(ORDERS_FILE, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return []; throw e; }
}
async function writeOrders(list) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(list, null, 2));
}
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const sha = v => crypto.createHash("sha256").update(String(v)).digest();
function adminOnly(req, res, next) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(503).json({ error: "Set ADMIN_PASSWORD in .env to read orders." });
  if (!crypto.timingSafeEqual(sha(req.get("x-admin-password") || ""), sha(pw))) return res.status(401).json({ error: "Wrong password." });
  next();
}


/* ---------- ORDER E-MAIL (Gmail) ---------- */
const mailer = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
  : null;
if (!mailer) console.warn("Gmail is not configured: orders are saved but no e-mail is sent. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.");
const EVENT_NOTIFY_EMAIL = process.env.EVENT_NOTIFY_EMAIL || process.env.ORDER_NOTIFY_EMAIL || process.env.GMAIL_USER || "hello@wensa.org";
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dh = n => Number(n).toLocaleString("fr-FR") + " DH";
async function sendEventEmail(event) {
  if (!mailer) return { sent: false, message: "Gmail is not configured for member alerts." };
  const title = String(event?.title || "New WENSA event");
  const date = String(event?.date || "A new date to be announced");
  const city = String(event?.city || "WENSA community");
  const description = String(event?.description || "A new WENSA community moment is now live.");
  const subject = `WENSA event: ${title}`;
  const text = `Hello WENSA members,\n\nA new event has been published:\n\nTitle: ${title}\nDate: ${date}\nLocation: ${city}\n\n${description}\n\nVisit our website to learn more and join the community.\n\nWENSA`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fffaf2;border-radius:18px;overflow:hidden;border:1px solid #eadfc8"><div style="background:linear-gradient(135deg,#102f35,#1d4e54);padding:18px 24px;color:#f6f1e7"><div style="font-size:12px;letter-spacing:2px;opacity:.8">WENSA</div><h2 style="margin:8px 0 0;font-size:28px">New event announced</h2></div><div style="padding:24px"><p style="margin-top:0;font-size:16px"><strong>${esc(title)}</strong></p><p><strong>Date:</strong> ${esc(date)}<br><strong>Location:</strong> ${esc(city)}</p><p style="color:#425d60;line-height:1.7">${esc(description)}</p><p style="margin-bottom:0"><a href="http://localhost:3100/events.html" style="display:inline-block;background:#d56b3f;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none">View all events</a></p></div></div>`;
  await mailer.sendMail({
    from: `"WENSA Community" <${process.env.GMAIL_USER}>`,
    to: EVENT_NOTIFY_EMAIL,
    subject,
    text,
    html
  });
  return { sent: true, message: `Members notified at ${EVENT_NOTIFY_EMAIL}.` };
}
async function sendOrderEmail(order) {
  if (!mailer) return;
  const { customer: c, items } = order;
  const lines = items.map(i => `${i.qty} × ${i.name}${i.unit == null ? " (prix non défini)" : " — " + dh(i.unit * i.qty)}${i.custom ? "\n   ✎ " + i.custom : ""}`).join("\n");
  const text = `Nouvelle commande ${order.ref}\n\nClient : ${c.name}\nTéléphone : ${c.phone}\nVille : ${c.city}\nAdresse : ${c.address}\n\nArticles :\n${lines}\n\nTotal : ${dh(order.total)}${order.hasUnpricedItems ? " (+ articles sans prix)" : ""}\nLangue du client : ${order.lang || "—"}`;
  const rows = items.map(i => `<tr><td style="padding:8px 10px;border-bottom:1px solid #eadfc8">${i.qty} × <b>${esc(i.name)}</b>${i.custom ? `<br><i>✎ ${esc(i.custom)}</i>` : ""}</td><td style="padding:8px 10px;border-bottom:1px solid #eadfc8;text-align:right;white-space:nowrap">${i.unit == null ? "—" : dh(i.unit * i.qty)}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#3a1a1f"><div style="background:#6b0f1f;color:#f7ecd2;padding:18px 22px;border-radius:12px 12px 0 0"><div style="font-size:12px;letter-spacing:2px">WENSA</div><div style="font-size:22px">Nouvelle commande</div><div style="font-size:13px;opacity:.85">${esc(order.ref)}</div></div><div style="background:#fbf5e6;padding:20px 22px;border-radius:0 0 12px 12px"><p style="margin:0 0 14px"><b>${esc(c.name)}</b><br>📞 <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a><br>${esc(c.city)} — ${esc(c.address)}</p><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:12px 10px;font-size:16px"><b>Total</b></td><td style="padding:12px 10px;text-align:right;font-size:16px"><b>${dh(order.total)}</b></td></tr></table>${order.hasUnpricedItems ? '<p style="font-size:12px;color:#8a1b2c">Certains articles n’ont pas de prix : confirmez le total avec le client.</p>' : ""}<p style="font-size:12px;color:#7a6a58;margin-bottom:0">À faire : appeler le client pour confirmer la commande et la livraison.</p></div></div>`;
  await mailer.sendMail({
    from: `"WENSA Boutique" <${process.env.GMAIL_USER}>`,
    to: process.env.ORDER_NOTIFY_EMAIL || process.env.GMAIL_USER,
    subject: `Nouvelle commande ${order.ref} — ${dh(order.total)}`,
    text, html
  });
}

app.post("/api/events/notify", async (req, res) => {
  const event = req.body?.event || {};
  if (!event || typeof event !== "object") return res.status(400).json({ error: "Invalid event payload." });
  try {
    const result = await sendEventEmail(event);
    res.json({ sent: !!result.sent, message: result.message || "Event notification processed." });
  } catch (error) {
    console.error("Event notification error:", error?.message || error);
    res.status(500).json({ error: "The event was saved but the email could not be sent." });
  }
});

app.post("/api/orders", async (req, res) => {
  const b = req.body || {}, c = b.customer || {};
  const customer = { name: str(c.name, 100), phone: str(c.phone, 30), city: str(c.city, 80), address: str(c.address, 300) };
  if (!customer.name || !customer.city || !customer.address || !/^[+\d][\d\s().-]{7,29}$/.test(customer.phone))
    return res.status(400).json({ error: "Missing or invalid customer details." });
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 20)
    return res.status(400).json({ error: "Invalid cart." });
  const items = [];
  for (const i of b.items) {
    const qty = Number(i?.qty);
    const unit = i?.unit == null ? null : Number(i.unit);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99 || (unit !== null && (!Number.isFinite(unit) || unit < 0 || unit > 100000)))
      return res.status(400).json({ error: "Invalid item." });
    items.push({ productId: str(i.productId, 40), name: str(i.name, 120), unit, qty, custom: str(i.custom, 300) });
  }
  const total = items.reduce((s, i) => s + (i.unit == null ? 0 : i.unit * i.qty), 0);
  const ref = "WN-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
  const order = { ref, createdAt: new Date().toISOString(), status: "new", lang: str(b.lang, 5), customer, items, total, hasUnpricedItems: items.some(i => i.unit == null) };
  try {
    await withLock(async () => { const list = await readOrders(); list.unshift(order); await writeOrders(list); });
    try { await sendOrderEmail(order); } catch (mailError) { console.error("Order e-mail error:", mailError?.message || mailError); }
    res.status(201).json({ ref });
  } catch (error) {
    console.error("Order save error:", error?.message || error);
    res.status(500).json({ error: "Could not save the order." });
  }
});

app.get("/api/orders", adminOnly, async (req, res) => {
  try { res.json(await readOrders()); } catch { res.status(500).json({ error: "Could not read orders." }); }
});

app.patch("/api/orders/:ref", adminOnly, async (req, res) => {
  const status = req.body?.status;
  if (!["new", "confirmed", "delivered", "cancelled"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  try {
    const found = await withLock(async () => {
      const list = await readOrders(); const o = list.find(x => x.ref === req.params.ref);
      if (!o) return false; o.status = status; await writeOrders(list); return true;
    });
    found ? res.json({ ok: true }) : res.status(404).json({ error: "Order not found." });
  } catch { res.status(500).json({ error: "Could not update the order." }); }
});

/* never serve server code, secrets or order data as static files */
app.use((req, res, next) => /^\/(\.|_env|_gitignore|server\.js|package(-lock)?\.json|data(\/|$)|node_modules(\/|$))/i.test(req.path) ? res.status(404).end() : next());
app.use(express.static(__dirname));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.listen(PORT, () => console.log(`WENSA is running at http://localhost:${PORT}`));
