const $ = (s, e = document) => e.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const MOODS = [
    "Radiant",
    "Content",
    "Calm",
    "Reflective",
    "Tired",
    "Sad",
    "Anxious",
  ],
  CATS = [
    "Achievement",
    "Travel",
    "Discovery",
    "Life change",
    "Special occasion",
    "Experience",
  ];
const QUOTES = [
  "A journal is a garden you tend with attention.",
  "Small days, quietly noticed, become a life.",
  "Write what the light looked like today.",
  "Memory is kinder when it is written down.",
  "Slow down; the water is still reflecting.",
];
const MN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/* ---- storage layer (swap for a backend later) ---- */
let db,
  mem = new Map(),
  persist = true;
const idbOpen = () =>
  new Promise((ok, no) => {
    if (!window.indexedDB) return no();
    const r = indexedDB.open("lily", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("items", { keyPath: "id" });
    r.onsuccess = () => {
      db = r.result;
      ok();
    };
    r.onerror = () => no(r.error);
  });
const tx = (m, f) =>
  new Promise((ok, no) => {
    const t = db.transaction("items", m),
      q = f(t.objectStore("items"));
    t.oncomplete = () => ok(q && q.result);
    t.onerror = t.onabort = () => no(t.error);
  });
const Store = {
  all: async () =>
    persist ? tx("readonly", (s) => s.getAll()) : [...mem.values()],
  put: async (x) => {
    if (persist) await tx("readwrite", (s) => s.put(x));
    else mem.set(x.id, x);
  },
  del: async (id) => {
    if (persist) await tx("readwrite", (s) => s.delete(id));
    else mem.delete(id);
  },
  clear: async () => {
    if (persist) await tx("readwrite", (s) => s.clear());
    else mem.clear();
  },
};
const LS = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
  del: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};
/* ---- state ---- */
const now = new Date(),
  pad = (n) => String(n).padStart(2, "0"),
  isoNow = () =>
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
const day = (x) => x.date.slice(0, 10),
  today = isoNow().slice(0, 10);
const S = {
  items: [],
  view: "home",
  edit: null,
  photos: [],
  y: now.getFullYear(),
  m: now.getMonth(),
  sel: today,
  f: { q: "", y: "", mood: "", tag: "", cat: "" },
  tlY: "",
  gq: "",
  gm: "",
  gc: "",
  set: LS.get("lj-set", { name: "Friend", theme: "system" }),
};
const pub = () =>
  S.items.filter((i) => !i.draft).sort((a, b) => b.date.localeCompare(a.date));
const entries = () => pub().filter((i) => i.kind !== "milestone");
const fmt = (d) =>
  new Date(d).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const toast = (t) => {
  const e = $("#toast");
  e.textContent = t;
  e.className = "on";
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (e.className = ""), 2800);
};
function theme() {
  const t =
    S.set.theme === "system"
      ? matchMedia("(prefers-color-scheme:dark)").matches
        ? "dark"
        : "light"
      : S.set.theme;
  document.documentElement.dataset.theme = t;
}
async function save(x) {
  try {
    await Store.put(x);
    const i = S.items.findIndex((a) => a.id === x.id);
    i < 0 ? S.items.push(x) : (S.items[i] = x);
    return true;
  } catch (e) {
    toast(
      "Could not save: storage may be full. Export a backup or remove some photos.",
    );
    return false;
  }
}
/* ---- svg art ---- */
const lily = (c = "#B7A9CF") =>
  `<svg viewBox="0 0 100 60" aria-hidden="true"><ellipse cx="50" cy="44" rx="46" ry="12" fill="#8DAE83" opacity=".6"/><g fill="${c}" stroke="#F4F0E3" stroke-width="1"><ellipse cx="50" cy="26" rx="8" ry="18"/><ellipse cx="50" cy="26" rx="8" ry="18" transform="rotate(50 50 40)"/><ellipse cx="50" cy="26" rx="8" ry="18" transform="rotate(-50 50 40)"/></g><circle cx="50" cy="38" r="4" fill="#E8C86A"/></svg>`;
const hero = () => {
  let w = "",
    l = "";
  for (let i = 0; i < 26; i++) {
    const x = i * 32 + (i % 3) * 5;
    w += `<path d="M${x} 0 Q${x + 14} 70 ${x - 8} ${120 + (i % 5) * 22}" stroke="${["#6B8F5E", "#8DAE83", "#3f6b4c", "#A5C08F"][i % 4]}" stroke-width="${5 + (i % 4)}" fill="none" opacity=".75"/>`;
  }
  for (let i = 0; i < 50; i++) {
    const x = (i * 97) % 800,
      y = 190 + ((i * 53) % 70);
    l += `<ellipse cx="${x}" cy="${y}" rx="${10 + (i % 4) * 4}" ry="3" fill="${["#8DAE83", "#6B7F4A", "#A5C08F"][i % 3]}"/>`;
    if (i % 4 == 0)
      l += `<ellipse cx="${x + 4}" cy="${y - 2}" rx="4" ry="2.5" fill="${["#E9B8C9", "#B7A9CF", "#F4F0E3"][i % 3]}"/>`;
  }
  return `<svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f6b4c"/><stop offset=".6" stop-color="#8DAE83"/></linearGradient><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#526F86"/><stop offset="1" stop-color="#2f5a52"/></linearGradient></defs><rect width="800" height="260" fill="url(#s)"/><rect y="170" width="800" height="90" fill="url(#p)"/>${w}<path d="M230 150 Q480 70 740 150" stroke="#DDE6D5" stroke-width="9" fill="none"/><path d="M230 120 Q480 40 740 120" stroke="#DDE6D5" stroke-width="3" fill="none"/>${[290, 360, 430, 500, 570, 640, 700].map((x, i) => `<line x1="${x}" y1="${[132, 106, 92, 90, 98, 114, 134][i]}" x2="${x}" y2="${[148, 128, 116, 114, 122, 136, 150][i]}" stroke="#DDE6D5" stroke-width="3"/>`).join("")}${l}</svg>`;
};
const empty = (t, s) =>
  `<div class="empty">${lily()}<h3>${t}</h3><p>${s}</p><button class="btn" data-a="new">Write an entry</button></div>`;
/* ---- shared bits ---- */
const NAV = [
  ["home", "Home"],
  ["write", "New Entry"],
  ["memories", "Memories"],
  ["timeline", "Timeline"],
  ["calendar", "Calendar"],
  ["archive", "Archive"],
  ["milestones", "Milestones"],
  ["settings", "Settings"],
];
const ecard = (x) =>
  `<button class="card ecard" data-a="open" data-id="${x.id}" aria-label="Open ${esc(x.title || "Untitled")}"><div class="im" style="${x.photos?.[0] ? `background-image:url(${x.photos[0]})` : ""}"></div><div class="b"><div class="meta">${fmt(x.date)}${x.draft ? ` <span class="badge">Draft</span>` : ""}${x.mood ? ` · ${esc(x.mood)}` : ""}${x.kind === "milestone" ? ` <span class="badge">Milestone</span>` : ""}</div><h3>${esc(x.title || "Untitled")}</h3><p style="margin:4px 0 0;color:var(--mute)">${esc((x.body || "").slice(0, 90))}${(x.body || "").length > 90 ? "…" : ""}</p>${(x.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></button>`;
function cal(y, m) {
  const f = new Date(y, m, 1),
    off = (f.getDay() + 6) % 7,
    n = new Date(y, m + 1, 0).getDate(),
    has = new Set(pub().map(day));
  let h = `<table class="cal" role="grid"><tr>${"MTWTFSS"
    .split("")
    .map((d) => `<th>${d}</th>`)
    .join("")}</tr><tr>`;
  for (let i = 0; i < off; i++) h += "<td></td>";
  for (let d = 1; d <= n; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`;
    if ((off + d - 1) % 7 == 0 && d > 1) h += "</tr><tr>";
    h += `<td><button data-a="day" data-d="${k}" class="${has.has(k) ? "dot " : ""}${k === S.sel ? "sel " : ""}${k === today ? "today" : ""}" aria-label="${d} ${MN[m]} ${y}${has.has(k) ? ", has entries" : ""}">${d}</button></td>`;
  }
  return h + "</tr></table>";
}
const calHead = () =>
  `<div class="calhd"><button data-a="cm" data-n="-12" aria-label="Previous year">«</button><button data-a="cm" data-n="-1" aria-label="Previous month">‹</button><strong class="serif" style="font-size:1.25rem">${MN[S.m]} ${S.y}</strong><button data-a="cm" data-n="1" aria-label="Next month">›</button><button data-a="cm" data-n="12" aria-label="Next year">»</button></div>`;
const photos = () =>
  entries().flatMap((e) => (e.photos || []).map((p, i) => ({ src: p, e, i })));
/* ---- views ---- */
const V = {
  home() {
    const e = entries(),
      r = e.slice(0, 3),
      h = now.getHours(),
      g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening",
      mo = e.filter((x) => day(x).slice(0, 7) === today.slice(0, 7)).length,
      ph = photos().slice(0, 4);
    return `<section class="hero">${hero()}<div class="t"><h1>${g},<br><em>${esc(S.set.name)}.</em></h1><p style="margin:6px 0 0">Another day, another page in your story.</p><button class="btn" data-a="new">Write a new entry</button></div></section>
<div class="grid g2"><div class="grid"><div class="card"><h3>Recent entries</h3>${r.length ? `<div class="grid g3" style="margin-top:12px">${r.map(ecard).join("")}</div>` : empty("Your garden is waiting", "Plant your first entry — a few words is enough.")}</div>
${ph.length ? `<div class="card"><h3>Recent memories</h3><div class="bar">${ph.map((p) => `<button data-a="photo" data-id="${p.e.id}" data-i="${p.i}" style="border:0;padding:0;background:none;cursor:pointer"><img src="${p.src}" alt="Photo from ${esc(p.e.title || "entry")}" style="height:90px;border-radius:6px"></button>`).join("")}</div></div>` : ""}</div>
<div class="grid" style="align-content:start"><div class="card">${calHead()}${cal(S.y, S.m)}</div><div class="card stats"><div><b>${e.length}</b><span class="meta">Entries</span></div><div><b>${new Set(e.map(day)).size}</b><span class="meta">Days</span></div><div><b>${mo}</b><span class="meta">This month</span></div></div>
<div class="card serif" style="font-size:1.4rem;font-style:italic;text-align:center">“${QUOTES[now.getDate() % QUOTES.length]}”</div></div></div>`;
  },
  write() {
    const x = S.edit ? S.items.find((i) => i.id === S.edit) : null,
      d = x || LS.get("lj-draft", {}),
      n = d.title || d.body;
    return `<h2 style="margin-bottom:14px">${x ? "Edit entry" : "New entry"}</h2><form class="paper" id="ef" onsubmit="return false"><label for="ti" class="meta">Title</label><input id="ti" class="ti" value="${esc(d.title)}" placeholder="A title for today…"><label for="bd" class="meta">Entry</label><textarea id="bd" class="bd" placeholder="What is on your mind? Write freely…">${esc(d.body)}</textarea>
<div class="fields"><div><label for="dt">Date & time</label><input type="datetime-local" id="dt" value="${d.date || isoNow()}"></div><div><label for="mo">Mood</label><select id="mo"><option value="">—</option>${MOODS.map((m) => `<option${d.mood === m ? " selected" : ""}>${m}</option>`).join("")}</select></div><div><label for="lo">Location</label><input id="lo" value="${esc(d.loc)}"></div><div><label for="tg">Tags (comma separated)</label><input id="tg" value="${esc((d.tags || []).join(", "))}"></div><div><label for="ct">Life-event category</label><select id="ct"><option value="">None</option>${CATS.map((m) => `<option${d.cat === m ? " selected" : ""}>${m}</option>`).join("")}</select></div><div><label for="ph">Photographs</label><input type="file" id="ph" accept="image/*" multiple></div></div>
<div class="thumbs" id="th">${thumbs()}</div><p class="meta" id="dn" aria-live="polite">${!x && n ? "Draft restored." : x ? "" : "Your words are kept automatically as you write."}</p>
<div class="bar"><button class="btn" data-a="pub">${x && !x.draft ? "Save changes" : "Publish entry"}</button><button class="btn ghost" data-a="drf">Save as draft</button><button class="btn ghost" data-a="home">Cancel</button></div></form>`;
  },
  memories() {
    let p = photos();
    const q = S.gq.toLowerCase();
    p = p.filter(
      (x) =>
        (!q ||
          (x.e.title + x.e.body + (x.e.tags || []).join(" ") + (x.e.loc || ""))
            .toLowerCase()
            .includes(q)) &&
        (!S.gm || day(x.e).startsWith(S.gm)) &&
        (!S.gc || (x.e.tags || []).includes(S.gc) || x.e.cat === S.gc),
    );
    const cols = [
      ...new Set(
        entries().flatMap((e) => [...(e.tags || []), e.cat].filter(Boolean)),
      ),
    ];
    return `<h2>Memories</h2><div class="bar"><input type="search" id="gq" value="${esc(S.gq)}" placeholder="Search memories…" aria-label="Search memories"><input type="month" id="gm" value="${S.gm}" aria-label="Filter by month"><select id="gc" aria-label="Collection"><option value="">All collections</option>${cols.map((c) => `<option${S.gc === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
${p.length ? `<div class="gal">${p.map((x) => `<button data-a="photo" data-id="${x.e.id}" data-i="${x.i}"><img src="${x.src}" alt="${esc(x.e.title || "Memory")}, ${fmt(x.e.date)}" loading="lazy"></button>`).join("")}</div>` : empty("No memories here yet", "Add photographs to an entry and they will bloom here.")}`;
  },
  timeline() {
    const all = pub(),
      ys = [...new Set(all.map((i) => i.date.slice(0, 4)))],
      l = all.filter((i) => !S.tlY || i.date.startsWith(S.tlY));
    let last = "",
      h = "";
    l.forEach((i) => {
      const k = i.date.slice(0, 7);
      if (k !== last) {
        h += `<h3 class="mo">${MN[+k.slice(5) - 1]} ${k.slice(0, 4)}</h3>`;
        last = k;
      }
      h += `<div class="it ${i.kind === "milestone" ? "ms" : ""}">${ecard(i)}</div>`;
    });
    return `<h2>Timeline</h2><div class="bar"><label for="ty" class="meta" style="align-self:center;margin:0">Jump to year</label><select id="ty"><option value="">All years</option>${ys.map((y) => `<option${S.tlY === y ? " selected" : ""}>${y}</option>`).join("")}</select></div>${l.length ? `<div class="tl">${h}</div>` : empty("Your timeline is empty", "Entries and milestones will appear here in order.")}`;
  },
  calendar() {
    const l = pub().filter((i) => day(i) === S.sel);
    return `<h2>Calendar</h2><div class="grid g2" style="margin-top:14px"><div class="card">${calHead()}${cal(S.y, S.m)}</div><div><h3 style="margin-bottom:10px">${fmt(S.sel)}</h3>${l.length ? `<div class="grid">${l.map(ecard).join("")}</div>` : `<div class="card empty" style="padding:24px">Nothing written on this day.<br><br><button class="btn" data-a="new">Write for this day</button></div>`}</div></div>`;
  },
  archive() {
    const a = pub(),
      f = S.f,
      q = f.q.toLowerCase(),
      tags = [...new Set(a.flatMap((i) => i.tags || []))],
      ys = [...new Set(a.map((i) => i.date.slice(0, 4)))];
    const dr = S.items.filter((i) => i.draft),
      l = a.filter(
        (i) =>
          (!q || (i.title + " " + i.body).toLowerCase().includes(q)) &&
          (!f.y || i.date.startsWith(f.y)) &&
          (!f.mood || i.mood === f.mood) &&
          (!f.tag || (i.tags || []).includes(f.tag)) &&
          (!f.cat || i.cat === f.cat),
      );
    const sel = (id, lab, arr) =>
      `<select id="${id}" aria-label="${lab}"><option value="">${lab}</option>${arr.map((o) => `<option${f[id.slice(1)] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    return `<h2>Archive</h2><div class="bar"><input type="search" id="fq" value="${esc(f.q)}" placeholder="Search titles and text…" aria-label="Search">${sel("fy", "Year", ys)}${sel("fmood", "Mood", MOODS)}${sel("ftag", "Tag", tags)}${sel("fcat", "Category", CATS)}</div>
${dr.length && !q ? `<h3 style="margin:8px 0">Drafts</h3><div class="grid g3">${dr.map(ecard).join("")}</div><h3 style="margin:18px 0 8px">Published</h3>` : ""}${l.length ? `<div class="grid g3">${l.map(ecard).join("")}</div>` : empty("Nothing found", "Try different words or clear a filter.")}`;
  },
  milestones() {
    const l = pub().filter((i) => i.kind === "milestone");
    return `<h2>Life milestones</h2><form class="card" id="mf" style="margin:14px 0" onsubmit="return false"><div class="fields"><div><label for="mt">Milestone</label><input id="mt" placeholder="e.g. Finished my first marathon"></div><div><label for="md">Date</label><input type="date" id="md" value="${today}"></div><div><label for="mc">Category</label><select id="mc">${CATS.map((c) => `<option>${c}</option>`).join("")}</select></div></div><label for="mn">Note (optional)</label><textarea id="mn" rows="2" style="width:100%"></textarea><div class="bar"><button class="btn" data-a="addms">Add milestone</button></div></form>${l.length ? `<div class="grid g3">${l.map(ecard).join("")}</div>` : empty("No milestones yet", "Record the moments that changed or delighted you.")}`;
  },
  settings() {
    return `<h2>Settings</h2><div class="grid g3" style="margin-top:14px"><div class="card"><h3>Profile & appearance</h3><label for="sn" style="margin-top:10px">Your name</label><input id="sn" value="${esc(S.set.name)}"><label for="st" style="margin-top:10px">Theme</label><select id="st">${["system", "light", "dark"].map((t) => `<option${S.set.theme === t ? " selected" : ""}>${t}</option>`).join("")}</select></div>
<div class="card"><h3>Privacy</h3><p>Everything is stored only in this browser on this device. Nothing is uploaded or shared. Data is <strong>not encrypted</strong>, so anyone with access to this browser profile could read it.</p></div>
<div class="card"><h3>Export & backup</h3><p>Download or copy a full JSON backup including photographs. There is no automatic cloud backup; export regularly.</p><div class="bar"><button class="btn" data-a="exp">Export backup</button><label class="btn ghost" style="margin:0;cursor:pointer">Import backup<input type="file" id="imp" accept=".json" hidden></label></div></div>
<div class="card"><h3>Erase everything</h3><p>Permanently deletes all entries, photographs and milestones from this browser.</p><button class="btn danger" data-a="wipe">Delete all data</button></div></div>`;
  },
};
const thumbs = () =>
  S.photos
    .map(
      (p, i) =>
        `<div><img src="${p}" alt="Attached photo ${i + 1}"><button type="button" data-a="rmph" data-i="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`,
    )
    .join("");
/* ---- render ---- */
function render() {
  $("#nav").innerHTML =
    `<div class="logo">${lily().replace("<svg", '<svg width="34"')}Lily Journal</div>` +
    NAV.map(
      ([k, l]) =>
        `<button data-a="go" data-v="${k}"${S.view === k ? ' aria-current="page"' : ""}>${l}</button>`,
    ).join("") +
    `<div class="q">“In the stillness, a page opens.”</div>`;
  $("#main").innerHTML = V[S.view]();
}
function go(v, e) {
  if (v === "write" && !e) {
    S.edit = null;
    S.photos = LS.get("lj-draft", {}).photos || [];
  }
  S.view = v;
  if (location.hash !== "#" + v) location.hash = v;
  else render();
  scrollTo(0, 0);
}
window.addEventListener("hashchange", () => {
  const v = location.hash.slice(1);
  if (V[v] && v !== S.view) {
    if (v === "write" && !S.edit) S.photos = [];
    S.view = v;
  }
  render();
});
/* ---- dialogs ---- */
const dlg = $("#dlg");
const show = (h) => {
  dlg.innerHTML =
    h +
    `<div class="bar"><button class="btn ghost" data-a="close">Close</button></div>`;
  dlg.showModal();
};
function openItem(id) {
  const x = S.items.find((i) => i.id === id);
  if (!x) return;
  show(
    `<div class="meta">${new Date(x.date).toLocaleString("en", { dateStyle: "long", timeStyle: "short" })}${x.loc ? " · " + esc(x.loc) : ""}${x.mood ? " · " + esc(x.mood) : ""}${x.cat ? " · " + esc(x.cat) : ""}${x.draft ? ' · <span class="badge">Draft</span>' : ""}</div><h2>${esc(x.title || "Untitled")}</h2><p style="white-space:pre-wrap;font:1.15rem/1.7 'Cormorant Garamond',serif">${esc(x.body)}</p>${(x.photos || []).map((p) => `<img class="big" src="${p}" alt="">`).join("")}<div>${(x.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div><div class="bar"><button class="btn" data-a="edit" data-id="${id}">Edit</button><button class="btn danger" data-a="del" data-id="${id}">Delete</button></div>`,
  );
}
function collect(draft) {
  const v = (i) => $("#" + i).value.trim(),
    x = S.edit ? S.items.find((i) => i.id === S.edit) : null;
  if (!v("ti") && !v("bd") && !S.photos.length) {
    toast("Write a few words first.");
    return null;
  }
  return {
    ...(x || {}),
    id: x?.id || crypto.randomUUID(),
    kind: "entry",
    title: v("ti"),
    body: $("#bd").value,
    date: $("#dt").value || isoNow(),
    mood: v("mo"),
    loc: v("lo"),
    tags: v("tg")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    cat: v("ct"),
    photos: S.photos.slice(),
    draft,
  };
}
const shrink = (f) =>
  new Promise((r) => {
    const i = new Image(),
      u = URL.createObjectURL(f);
    i.onload = () => {
      const k = Math.min(1, 1400 / Math.max(i.width, i.height)),
        c = document.createElement("canvas");
      c.width = i.width * k;
      c.height = i.height * k;
      c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      r(c.toDataURL("image/jpeg", 0.8));
    };
    i.onerror = () => r(null);
    i.src = u;
  });
const download = async () => {
  const j = JSON.stringify(
    {
      app: "lily-journal",
      version: 1,
      exported: new Date().toISOString(),
      items: S.items,
    },
    null,
    1,
  );
  show(
    `<h3>Your backup</h3><p>Copy this text into a .json file, or try the download button.</p><textarea id="ex" readonly rows="8" style="width:100%">${esc(j)}</textarea><div class="bar"><button class="btn" data-a="cp">Copy</button><a class="btn ghost" style="text-decoration:none" download="lily-journal-backup.json" href="data:application/json;charset=utf-8,${encodeURIComponent(j)}">Download</a></div>`,
  );
};
/* ---- events ---- */
document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-a]");
  if (!t) return;
  const a = t.dataset.a,
    id = t.dataset.id;
  if (a === "go") go(t.dataset.v);
  else if (a === "home") go("home");
  else if (a === "new") {
    dlg.close();
    go("write");
  } else if (a === "open") openItem(id);
  else if (a === "close") dlg.close();
  else if (a === "edit") {
    dlg.close();
    S.edit = id;
    S.photos = [...(S.items.find((i) => i.id === id).photos || [])];
    S.view = "write";
    location.hash = "write";
    render();
  } else if (a === "del") {
    show(
      `<h3>Delete this entry?</h3><p>This cannot be undone.</p><div class="bar"><button class="btn danger" data-a="del2" data-id="${id}">Yes, delete</button></div>`,
    );
  } else if (a === "del2") {
    await Store.del(id);
    S.items = S.items.filter((i) => i.id !== id);
    dlg.close();
    toast("Deleted.");
    render();
  } else if (a === "day") {
    S.sel = t.dataset.d;
    if (S.view === "home") {
      go("calendar");
    } else render();
  } else if (a === "cm") {
    const d = new Date(S.y, S.m + +t.dataset.n, 1);
    S.y = d.getFullYear();
    S.m = d.getMonth();
    render();
  } else if (a === "pub" || a === "drf") {
    const x = collect(a === "drf");
    if (!x) return;
    if (await save(x)) {
      LS.del("lj-draft");
      S.edit = null;
      S.photos = [];
      toast(x.draft ? "Draft saved." : "Entry saved.");
      go(x.draft ? "archive" : "home");
    }
  } else if (a === "rmph") {
    S.photos.splice(+t.dataset.i, 1);
    $("#th").innerHTML = thumbs();
  } else if (a === "photo") {
    const x = S.items.find((i) => i.id === id);
    show(
      `<img class="big" src="${x.photos[+t.dataset.i]}" alt="Photo from ${esc(x.title)}"><h3>${esc(x.title || "Untitled")}</h3><div class="meta">${fmt(x.date)}</div><div class="bar"><button class="btn ghost" data-a="open" data-id="${id}">Open entry</button></div>`,
    );
  } else if (a === "addms") {
    const v = (i) => $("#" + i).value.trim();
    if (!v("mt")) return toast("Give the milestone a title.");
    const x = {
      id: crypto.randomUUID(),
      kind: "milestone",
      title: v("mt"),
      body: v("mn"),
      date: v("md") + "T12:00",
      cat: v("mc"),
      tags: [],
      photos: [],
    };
    if (await save(x)) {
      toast("Milestone added.");
      render();
    }
  } else if (a === "exp") download();
  else if (a === "cp") {
    $("#ex").select();
    try {
      await navigator.clipboard.writeText($("#ex").value);
      toast("Copied.");
    } catch {
      document.execCommand("copy");
      toast("Copied, or press Ctrl+C.");
    }
  } else if (a === "wipe")
    show(
      `<h3>Delete everything?</h3><p>Export a backup first if you might want this data again.</p><div class="bar"><button class="btn danger" data-a="wipe2">Yes, delete all</button></div>`,
    );
  else if (a === "wipe2") {
    await Store.clear();
    S.items = [];
    LS.del("lj-draft");
    dlg.close();
    toast("All data deleted.");
    render();
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target,
    i = t.id;
  if (i === "ph") {
    for (const f of t.files) {
      const d = await shrink(f);
      if (d) S.photos.push(d);
    }
    t.value = "";
    $("#th").innerHTML = thumbs();
  } else if (i === "gm") {
    S.gm = t.value;
    render();
  } else if (i === "gc") {
    S.gc = t.value;
    render();
  } else if (i === "ty") {
    S.tlY = t.value;
    render();
  } else if (/^f(y|mood|tag|cat)$/.test(i)) {
    S.f[i.slice(1)] = t.value;
    render();
  } else if (i === "sn") {
    S.set.name = t.value.trim() || "Friend";
    LS.set("lj-set", S.set);
  } else if (i === "st") {
    S.set.theme = t.value;
    LS.set("lj-set", S.set);
    theme();
  } else if (i === "imp") {
    try {
      const j = JSON.parse(await t.files[0].text());
      if (j.app !== "lily-journal") throw 0;
      for (const x of j.items) await save(x);
      toast(`Imported ${j.items.length} items.`);
      render();
    } catch {
      toast("That file isn’t a Lily Journal backup.");
    }
  }
});
document.addEventListener("input", (e) => {
  const i = e.target.id;
  if (i === "gq" || i === "fq") {
    const p = e.target.selectionStart;
    i === "gq" ? (S.gq = e.target.value) : (S.f.q = e.target.value);
    render();
    const n = $("#" + i);
    n.focus();
    n.setSelectionRange(p, p);
  } else if (!S.edit && e.target.closest("#ef")) {
    const v = (k) => $("#" + k).value;
    LS.set("lj-draft", {
      title: v("ti"),
      body: v("bd"),
      date: v("dt"),
      mood: v("mo"),
      loc: v("lo"),
      tags: v("tg")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      cat: v("ct"),
      photos: S.photos,
    });
    const d = $("#dn");
    if (d) d.textContent = "Draft kept automatically.";
  }
});
(async () => {
  theme();
  matchMedia("(prefers-color-scheme:dark)").addEventListener?.("change", theme);
  const v = location.hash.slice(1);
  if (V[v]) S.view = v;
  render();
  try {
    await Promise.race([
      idbOpen(),
      new Promise((_, no) => setTimeout(no, 2500)),
    ]);
  } catch {
    persist = false;
    toast("Storage unavailable here: entries won’t persist after closing.");
  }
  try {
    S.items = await Promise.race([
      Store.all(),
      new Promise((_, no) => setTimeout(no, 2500)),
    ]);
  } catch {
    S.items = [];
  }
  render();
})();
