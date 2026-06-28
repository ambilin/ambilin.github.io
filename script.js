/* =================================================================
   ambilin — script.js
   TikTok → tikwm API (langsung, no setup)
   YouTube → Piped API (langsung, no setup, CORS-friendly)
   Instagram → butuh Cloudflare Worker (lihat catatan di IG_NEEDS_WORKER)
   ================================================================= */
"use strict";

document.documentElement.classList.add("js");

const CONFIG = {
  TIKTOK_PUBLIC_API: "https://www.tikwm.com/api/",
};

/* ELEMEN DOM */
const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("urlInput");
const downloadBtn = document.getElementById("downloadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const statusBox = document.getElementById("statusBox");
const resultBox = document.getElementById("resultBox");
const platformIcon = document.getElementById("platformIcon");
const themeToggle = document.getElementById("themeToggle");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const toTopBtn = document.getElementById("toTop");
const scrollProgress = document.getElementById("scrollProgress");
const installBtn = document.getElementById("installBtn");
const metaThemeColor = document.getElementById("metaThemeColor");
const historyBox = document.getElementById("historyBox");
const shareBtn = document.getElementById("shareBtn");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===================== ANALYTICS HELPER ========================= */
function trackEvent(name, params = {}) {
  if (typeof gtag === "function") {
    try { gtag("event", name, params); } catch {}
  }
}

/* ============================ TEMA ============================== */
function updateThemeColor(theme) {
  if (metaThemeColor) metaThemeColor.setAttribute("content", theme === "light" ? "#f4f6ff" : "#0b1020");
}
function setTheme(next) {
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ambilin-theme", next);
  updateThemeColor(next);
  trackEvent("theme_toggle", { theme: next });
}

(function initTheme() {
  const saved = localStorage.getItem("ambilin-theme");
  let theme;
  if (saved) {
    theme = saved;
  } else {
    // AUTO: ikut system preference kalau user belum pernah set
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeColor(theme);
})();

// Listen system theme changes (kalau user belum set manual)
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("ambilin-theme")) {
    const newTheme = e.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    updateThemeColor(newTheme);
  }
});

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  if (prefersReducedMotion || !document.startViewTransition) { setTheme(next); return; }
  const rect = themeToggle.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = document.startViewTransition(() => setTheme(next));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
      { duration: 450, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
    );
  }).catch(() => setTheme(next));
  transition.finished.catch(() => {});
});

/* ============================ TAHUN FOOTER ====================== */
document.getElementById("year").textContent = new Date().getFullYear();

/* ============================ MOBILE MENU ======================= */
menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  menuToggle.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    menuToggle.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  })
);

/* ===================== SCROLL PROGRESS + TO TOP ================= */
let ticking = false;
function onScroll() {
  ticking = false;
  const scrollTop = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
  scrollProgress.style.width = pct + "%";
  toTopBtn.hidden = scrollTop < 400;
}
window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
toTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ============================ ANIMASI REVEAL ==================== */
const revealEls = Array.from(document.querySelectorAll(".reveal"));
if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0 }
  );
  revealEls.forEach((el) => observer.observe(el));
  setTimeout(() => {
    revealEls.forEach((el) => {
      if (!el.classList.contains("is-visible")) el.classList.add("is-visible");
    });
  }, 2500);
}

/* ============================ TOMBOL TEMPEL ===================== */
pasteBtn.addEventListener("click", async () => {
  trackEvent("paste_click");
  try {
    const text = await navigator.clipboard.readText();
    if (text) { urlInput.value = text.trim(); urlInput.focus(); updatePlatformIcon(urlInput.value); }
  } catch {
    showStatus("info", "Tidak bisa mengakses clipboard. Tempel manual ya (Ctrl/Cmd + V).");
  }
});
urlInput.addEventListener("input", () => updatePlatformIcon(urlInput.value));

/* ===================== DETEKSI PLATFORM dari URL ================= */
function detectPlatform(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (/tiktok\.com|vt\.tiktok|vm\.tiktok/.test(u)) return "tiktok";
  return null;
}

function updatePlatformIcon(url) {
  const platform = detectPlatform(url);
  const tiktokIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.1v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.7 5.7 0 0 0-.77-.05A5.69 5.69 0 1 0 15.54 15.4V8.83a7.34 7.34 0 0 0 4.3 1.38V7.1a4.28 4.28 0 0 1-3.24-1.28z"/></svg>';
  const linkIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  platformIcon.innerHTML = platform ? tiktokIcon : linkIcon;
  platformIcon.style.color = platform ? "var(--grad-1)" : "var(--text-muted)";
}

/* ============ SHARE TARGET: baca ?url= / ?text= saat buka app ===== */
function handleSharedUrl() {
  const params = new URLSearchParams(window.location.search);
  let shared = params.get("url") || params.get("text") || params.get("title") || "";
  if (shared && !detectPlatform(shared)) {
    const m = shared.match(/https?:\/\/[^\s]+/);
    if (m) shared = m[0];
  }
  if (shared && detectPlatform(shared)) {
    urlInput.value = shared;
    updatePlatformIcon(shared);
    history.replaceState({}, "", window.location.pathname);
    setTimeout(() => form.requestSubmit(), 800);
  }
}
handleSharedUrl();

/* ============ AUTO-DETECT CLIPBOARD saat tab jadi aktif ========= */
let lastClipboard = "";
async function checkClipboardAuto() {
  if (document.hidden) return;
  if (!navigator.clipboard || !navigator.clipboard.readText) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    const trimmed = text.trim();
    if (trimmed === lastClipboard) return;
    lastClipboard = trimmed;
    if (!detectPlatform(trimmed)) return;
    if (urlInput.value === trimmed) return;
    if (resultBox.hidden === false) return;
    urlInput.value = trimmed;
    updatePlatformIcon(trimmed);
    showStatus("info", "📋 Link terdeteksi dari clipboard. Klik Download untuk lanjut.");
  } catch {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkClipboardAuto(); });
window.addEventListener("focus", checkClipboardAuto);
window.addEventListener("load", () => setTimeout(checkClipboardAuto, 600));

/* ===================== SUBMIT FORM ============================== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) { showStatus("error", "Tempel dulu link videonya ya. 🙂"); urlInput.focus(); return; }
  if (!/^https?:\/\//i.test(url)) { showStatus("error", "Link tidak valid. Pastikan diawali http:// atau https://"); return; }
  const platform = detectPlatform(url);
  if (!platform) { showStatus("error", "Link tidak dikenali. ambilin hanya support TikTok. Pastikan link dari tiktok.com, vt.tiktok, atau vm.tiktok."); return; }

  setLoading(true);
  showStatus("info", "⏳ Memproses link, mohon tunggu sebentar…");
  trackEvent("download_attempt", { platform: platform });
  try {
    const data = await fetchVideo(url, platform);
    if (!data || !data.medias || data.medias.length === 0) throw new Error("EMPTY");
    hideStatus();
    renderResult(data);
    trackEvent("download_success", { platform: data.platform, media_count: data.medias.length });
  } catch (err) {
    handleError(err, platform);
    trackEvent("download_error", { platform: platform, error: err.message || "unknown" });
  } finally {
    setLoading(false);
  }
});

/* ============== FETCH VIDEO — TikTok only =================== */
async function fetchVideo(url, platform) {
  if (platform === "tiktok") return await fetchTikTokPublic(url);
  throw new Error("NO_ENDPOINT");
}

/* ---------- TIKTOK via tikwm (langsung, CORS-friendly) ---------- */
async function fetchTikTokPublic(url) {
  const api = `${CONFIG.TIKTOK_PUBLIC_API}?url=${encodeURIComponent(url)}&hd=1`;
  const res = await fetch(api);
  if (!res.ok) throw new Error("HTTP_" + res.status);
  const json = await res.json();
  if (json.code !== 0 || !json.data) throw new Error("API_FAIL");
  const d = json.data;
  const medias = [];
  if (d.hdplay) medias.push({ label: "Video HD tanpa watermark", url: d.hdplay, kind: "video" });
  if (d.play) medias.push({ label: "Video tanpa watermark", url: d.play, kind: "video" });
  if (d.wmplay) medias.push({ label: "Video (dengan watermark)", url: d.wmplay, kind: "video" });
  if (d.music) medias.push({ label: "Audio MP3", url: d.music, kind: "audio" });
  return normalize({
    platform: "tiktok", title: d.title || "Video TikTok",
    author: d.author ? d.author.nickname || d.author.unique_id : "TikTok",
    thumbnail: d.cover || d.origin_cover, duration: d.duration, medias,
  });
}

function normalize(data) {
  return {
    platform: data.platform || "video", title: data.title || "Video",
    author: data.author || "", thumbnail: data.thumbnail || "",
    duration: data.duration || null, medias: (data.medias || []).filter((m) => m && m.url),
  };
}

/* ===================== RENDER HASIL ============================= */
function renderResult(data) {
  const durText = data.duration ? formatDuration(data.duration) : "";
  const buttons = data.medias.map((m, i) => {
    const primary = i === 0 ? "dl-btn--primary" : "";
    const icon = m.kind === "audio"
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>';
    return `<button class="dl-btn ${primary}" data-url="${escapeAttr(m.url)}" data-label="${escapeAttr(m.label)}">${icon}${escapeHtml(m.label)}</button>`;
  }).join("");
  // Tombol preview video inline (kalau ada media video dengan URL yang bisa di-embed)
  const firstVideo = data.medias.find(m => m.kind === "video");
  const previewBtn = firstVideo ? `<button class="dl-btn dl-btn--preview" id="previewBtn" type="button" data-url="${escapeAttr(firstVideo.url)}" title="Preview video sebelum download">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    Preview
  </button>` : "";
  // Tombol QR code untuk transfer ke HP lain
  const qrBtn = `<button class="dl-btn dl-btn--qr" id="qrBtn" type="button" title="Tampilkan QR code untuk scan di HP lain">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v1"/></svg>
    QR
  </button>`;
  resultBox.innerHTML = `
    <div class="result-card">
      <div class="result-card__media">
        ${data.thumbnail ? `<img src="${escapeAttr(data.thumbnail)}" alt="Pratinjau video" loading="lazy" />` : ""}
        <div class="result-card__play"><svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div class="result-card__body">
        <p class="result-card__title">${escapeHtml(data.title)}</p>
        <p class="result-card__meta">
          <span>📺 ${escapeHtml(capitalize(data.platform))}</span>
          ${data.author ? `<span>· 👤 ${escapeHtml(data.author)}</span>` : ""}
          ${durText ? `<span>· ⏱️ ${durText}</span>` : ""}
        </p>
        <div class="result-card__downloads">${buttons}${previewBtn}${qrBtn}</div>
        <div class="result-card__preview-wrap" id="previewWrap" aria-hidden="true">
          <button type="button" class="result-card__preview-close" id="previewCloseBtn" aria-label="Tutup preview">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <video class="result-card__preview" id="previewVideo" controls preload="metadata" poster="${escapeAttr(data.thumbnail || "")}"></video>
        </div>
      </div>
    </div>`;
  resultBox.hidden = false;
  resultBox.querySelectorAll(".dl-btn:not(.dl-btn--qr):not(.dl-btn--preview)").forEach((btn) => {
    btn.addEventListener("click", () => triggerDownload(btn.dataset.url, data, btn.dataset.label));
  });
  const qrBtnEl = document.getElementById("qrBtn");
  if (qrBtnEl) qrBtnEl.addEventListener("click", () => showQrCode(data));
  // Preview video inline
  const previewBtnEl = document.getElementById("previewBtn");
  const previewWrap = document.getElementById("previewWrap");
  const previewVideo = document.getElementById("previewVideo");
  const previewCloseBtn = document.getElementById("previewCloseBtn");
  if (previewBtnEl && previewWrap && previewVideo) {
    previewBtnEl.addEventListener("click", () => {
      try {
        previewVideo.src = previewBtnEl.dataset.url;
        previewWrap.classList.add("is-active");
        previewWrap.setAttribute("aria-hidden", "false");
        previewVideo.play().catch(() => {}); // autoplay might be blocked, that's OK
        trackEvent("preview_play", { platform: data.platform });
      } catch (err) {
        showStatus("info", "Preview tidak bisa dimuat. Coba download langsung aja.");
      }
    });
    if (previewCloseBtn) {
      previewCloseBtn.addEventListener("click", () => {
        previewWrap.classList.remove("is-active");
        previewWrap.setAttribute("aria-hidden", "true");
        try { previewVideo.pause(); previewVideo.src = ""; } catch {}
      });
    }
  }
}

/* ===================== QR CODE MODAL ============================ */
function showQrCode(data) {
  // Hapus modal lama kalau ada
  const existing = document.getElementById("qrModal");
  if (existing) existing.remove();

  const sourceUrl = urlInput.value.trim() || window.location.href;
  const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(sourceUrl)}&size=240&margin=8&dark=${encodeURIComponent(data.platform === "tiktok" ? "2530314" : data.platform === "instagram" ? "dc2743" : "ff0000")}`;

  const modal = document.createElement("div");
  modal.id = "qrModal";
  modal.className = "qr-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="qr-modal__content">
      <button type="button" class="qr-modal__close" id="qrCloseBtn" aria-label="Tutup">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <h3 class="qr-modal__title">Scan untuk lanjut di HP lain</h3>
      <div class="qr-modal__img-wrap">
        <img src="${escapeAttr(qrApiUrl)}" alt="QR code berisi link video" class="qr-modal__img" loading="lazy" />
      </div>
      <p class="qr-modal__video-title">${escapeHtml(data.title)}</p>
      <p class="qr-modal__hint">Buka kamera HP → arahkan ke QR → klik link yang muncul</p>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  const close = () => {
    modal.classList.add("is-leaving");
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = "";
    }, 200);
  };
  document.getElementById("qrCloseBtn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
  trackEvent("qr_show", { platform: data.platform });
}

/* ===================== PICU DOWNLOAD FILE ======================= */
async function triggerDownload(fileUrl, data, label) {
  const rawName = (data.title || "video").slice(0, 40);
  const safeSlug = rawName.replace(/[\\/:*?"<>|#%\s+]+/g, "-").replace(/^-+|-+$/g, "") || "video";
  const safeName = `${data.platform}-${safeSlug}`;
  const ext = /audio|mp3|m4a/i.test(label) ? "m4a" : "mp4";
  showStatus("info", "⬇️ Menyiapkan file untuk diunduh…");
  // Simpan ke riwayat (lakukan paralel dengan download, biar nggak nunggu)
  saveHistory({
    url: fileUrl,
    title: data.title || "Video",
    platform: data.platform,
    thumbnail: data.thumbnail || "",
    timestamp: Date.now(),
  });
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error("blob");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl; a.download = `${safeName}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(objectUrl);
    showStatus("success", "✅ Berhasil! File tersimpan di perangkatmu.");
  } catch {
    window.open(fileUrl, "_blank", "noopener");
    showStatus("info", "Video dibuka di tab baru. Klik-kanan → \"Simpan video sebagai…\" untuk menyimpannya.");
  }
}

/* ============= ERROR HANDLING =================================== */
function handleError(err, platform) {
  console.error("[ambilin] error:", err);
  const code = (err && err.message) || "";
  let msg;
  switch (true) {
    case code === "NO_ENDPOINT":
      msg = "Hanya link TikTok yang didukung. Pastikan link dari tiktok.com, vt.tiktok, atau vm.tiktok.";
      break;
    case code === "EMPTY":
      msg = "Tidak menemukan video pada link ini. Pastikan video bersifat publik (bukan private), dan bukan livestream.";
      break;
    case code === "API_FAIL":
      msg = "Server TikTok sedang sibuk. Coba lagi sebentar, atau coba video lain.";
      break;
    case /^HTTP_4/.test(code):
      msg = "Link ditolak server (4xx). Cek kembali apakah link benar dan video publik.";
      break;
    case /^HTTP_5/.test(code):
      msg = "Server TikTok sedang bermasalah (5xx). Coba lagi beberapa saat.";
      break;
    case /Failed to fetch|NetworkError|TypeError|timeout|Timeout/i.test(code):
      msg = "Gagal terhubung ke server. Cek koneksi internet kamu, lalu coba lagi.";
      break;
    default:
      msg = "Terjadi kesalahan saat memproses. Coba lagi atau gunakan link TikTok lain.";
  }
  showStatus("error", "⚠️ " + msg);
}

/* ===================== PWA INSTALL ======================= */
let deferredPrompt = null;
let isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

if (isStandalone) installBtn.hidden = true;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone) {
    installBtn.hidden = false;
    installBtn.classList.add("is-ready");
  }
});

installBtn.addEventListener("click", async () => {
  trackEvent("install_click", { has_prompt: !!deferredPrompt });
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      installBtn.hidden = true;
      isStandalone = true;
      trackEvent("install_accepted");
    } else {
      trackEvent("install_dismissed");
    }
    deferredPrompt = null;
    installBtn.classList.remove("is-ready");
  } else {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isIOS) {
      showStatus("info", "🍎 Di iPhone/iPad (Safari): tekan tombol Share (kotak panah atas) → 'Tambah ke Layar Utama'.");
    } else if (isAndroid) {
      showStatus("info", "📱 Di Android: tekan menu ⋮ di browser → 'Tambah ke Layar utama' atau 'Install aplikasi'.");
    } else {
      showStatus("info", "💻 Di desktop: cari ikon ⊕ di address bar, atau menu browser → 'Install ambilin'.");
    }
  }
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
  deferredPrompt = null;
  isStandalone = true;
});

/* ===================== DAFTARKAN SERVICE WORKER ================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("[ambilin] SW gagal:", err));
  });
}

/* ===================== UTILITAS UI ============================== */
function setLoading(isLoading) {
  downloadBtn.classList.toggle("is-loading", isLoading);
  downloadBtn.disabled = isLoading; urlInput.disabled = isLoading;
  if (isLoading) {
    // Clear dulu, lalu tampilkan skeleton
    resultBox.innerHTML = "";
    resultBox.hidden = false;
    resultBox.innerHTML = `
      <div class="result-card result-card--skeleton">
        <div class="skeleton skeleton--media"></div>
        <div class="result-card__body">
          <div class="skeleton skeleton--line skeleton--title"></div>
          <div class="skeleton skeleton--line skeleton--meta"></div>
          <div class="skeleton skeleton--line skeleton--meta"></div>
          <div class="skeleton skeleton--btn"></div>
        </div>
      </div>`;
  }
}
function showStatus(type, message) {
  // Tetap update statusBox (hidden, untuk screen reader via aria-live)
  statusBox.className = `status status--${type}`;
  statusBox.textContent = message;
  statusBox.hidden = false;

  // Buat toast visual
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-dismiss: 3s untuk success, 5s untuk error/info
  const duration = type === "success" ? 3000 : 5000;
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => {
      toast.remove();
      // Auto-hide statusBox kalau toast terakhir
      if (container.children.length === 0) {
        statusBox.hidden = true;
      }
    }, 250);
  }, duration);
}
function hideStatus() { statusBox.hidden = true; /* biarkan toast auto-dismiss */ }
function clearResult() { resultBox.hidden = true; resultBox.innerHTML = ""; }
function formatDuration(sec) { sec = Math.round(Number(sec) || 0); const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : str; }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(str) { return escapeHtml(str); }

/* ===================== RIWAYAT DOWNLOAD ========================== */
const HISTORY_KEY = "ambilin-history";
const HISTORY_MAX = 5;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveHistory(item) {
  const history = getHistory().filter((h) => h.url !== item.url);
  history.unshift(item);
  const trimmed = history.slice(0, HISTORY_MAX);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); } catch {}
  renderHistory();
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
  renderHistory();
  trackEvent("history_clear");
}

function renderHistory() {
  if (!historyBox) return;
  const history = getHistory();
  if (history.length === 0) {
    historyBox.hidden = true;
    historyBox.innerHTML = "";
    return;
  }
  historyBox.hidden = false;
  historyBox.innerHTML = `
    <div class="history__head">
      <h3 class="history__title">Riwayat terakhir</h3>
      <div class="history__actions">
        <button type="button" class="history__action-btn" id="exportHistoryBtn" aria-label="Export riwayat sebagai JSON" title="Export sebagai JSON">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button type="button" class="history__clear" id="clearHistoryBtn" aria-label="Hapus riwayat">Hapus</button>
      </div>
    </div>
    <ul class="history__list">
      ${history.map((h) => `
        <li class="history__item">
          <button type="button" class="history__item-btn" data-url="${escapeAttr(h.url)}">
            ${h.thumbnail ? `<img src="${escapeAttr(h.thumbnail)}" alt="" class="history__thumb" loading="lazy" />` : `<div class="history__thumb history__thumb--placeholder">${escapeHtml(capitalize(h.platform || "video").charAt(0))}</div>`}
            <div class="history__info">
              <p class="history__item-title">${escapeHtml(h.title.slice(0, 50))}${h.title.length > 50 ? "…" : ""}</p>
              <span class="history__item-meta">${escapeHtml(capitalize(h.platform || "video"))} · ${new Date(h.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            </div>
          </button>
        </li>
      `).join("")}
    </ul>
  `;
  const clearBtn = document.getElementById("clearHistoryBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearHistory);
  const exportBtn = document.getElementById("exportHistoryBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportHistory);
  historyBox.querySelectorAll(".history__item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      urlInput.value = btn.dataset.url;
      updatePlatformIcon(btn.dataset.url);
      urlInput.focus();
      trackEvent("history_click");
      form.requestSubmit();
    });
  });
}

/* ===================== SHARE BUTTON ============================= */
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    const shareData = {
      title: "ambilin — Downloader Video Tanpa Watermark",
      text: "Download video IG, TikTok & YouTube tanpa watermark gratis!",
      url: window.location.href,
    };
    trackEvent("share_click", { method: navigator.share ? "native" : "clipboard" });
    if (navigator.share) {
      try { await navigator.share(shareData); trackEvent("share_success", { method: "native" }); } catch {}
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showStatus("success", "🔗 Link ambilin disalin ke clipboard!");
        trackEvent("share_success", { method: "clipboard" });
      } catch {
        showStatus("info", "Bagikan link ini: " + shareData.url);
      }
    }
  });
}

/* ===================== SERVICE WORKER UPDATE PROMPT ============== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      // Auto-reload kalau user belum scroll (first load case)
      if (window.pageYOffset < 100 && !sessionStorage.getItem("ambilin-autoreloaded")) {
        sessionStorage.setItem("ambilin-autoreloaded", "1");
        window.location.reload();
        return;
      }
      showUpdateBanner();
    }
  });
}

function showUpdateBanner() {
  if (document.getElementById("updateBanner")) return;
  const banner = document.createElement("div");
  banner.id = "updateBanner";
  banner.className = "update-banner";
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
    <span>Versi baru tersedia!</span>
    <button type="button" class="update-banner__btn" id="updateRefreshBtn">Refresh</button>
    <button type="button" class="update-banner__close" id="updateDismissBtn" aria-label="Tutup">×</button>
  `;
  document.body.appendChild(banner);
  document.getElementById("updateRefreshBtn").addEventListener("click", () => {
    trackEvent("pwa_update_apply");
    window.location.reload();
  });
  document.getElementById("updateDismissBtn").addEventListener("click", () => {
    banner.classList.add("is-leaving");
    setTimeout(() => banner.remove(), 250);
    trackEvent("pwa_update_dismiss");
  });
  trackEvent("pwa_update_available");
}

/* ===================== KEYBOARD SHORTCUTS ======================= */
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd+Enter → submit form
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    if (document.activeElement === urlInput && !downloadBtn.disabled) {
      e.preventDefault();
      trackEvent("keyboard_shortcut", { key: "ctrl_enter" });
      form.requestSubmit();
    }
  }
  // Ctrl/Cmd+K → focus input
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    trackEvent("keyboard_shortcut", { key: "ctrl_k" });
    urlInput.focus();
    urlInput.select();
  }
  // Escape → clear input
  if (e.key === "Escape" && document.activeElement === urlInput) {
    urlInput.value = "";
    updatePlatformIcon("");
  }
});

/* ===================== INIT HISTORY ON LOAD ==================== */
window.addEventListener("load", renderHistory);

/* ===================== WEB VITALS TRACKING ====================== */
(function trackWebVitals() {
  if (typeof gtag !== "function") return;

  // LCP (Largest Contentful Paint)
  if ("PerformanceObserver" in window) {
    try {
      const po = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          trackEvent("web_vitals_lcp", {
            value: Math.round(lastEntry.startTime),
            event_label: "LCP",
          });
        }
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}

    // CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      // Report CLS on visibility change (page hide)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && clsValue > 0) {
          trackEvent("web_vitals_cls", {
            value: parseFloat(clsValue.toFixed(3)),
            event_label: "CLS",
          });
        }
      });
    } catch {}

    // FID (First Input Delay) / INP (Interaction to Next Paint)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const delay = entry.processingStart - entry.startTime;
          trackEvent("web_vitals_fid", {
            value: Math.round(delay),
            event_label: "FID",
          });
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });
    } catch {}

    // INP (modern, fallback to FID)
    try {
      const inpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = entry.duration;
          if (duration > 0) {
            trackEvent("web_vitals_inp", {
              value: Math.round(duration),
              event_label: "INP",
            });
          }
        }
      });
      inpObserver.observe({ type: "event", buffered: true });
    } catch {}
  }

  // TTFB (Time to First Byte)
  if (performance.timing) {
    window.addEventListener("load", () => {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      if (ttfb > 0) {
        trackEvent("web_vitals_ttfb", {
          value: ttfb,
          event_label: "TTFB",
        });
      }
    });
  }
})();

/* ===================== OFFLINE INDICATOR ======================== */
(function setupOfflineIndicator() {
  let banner = null;

  function showOfflineBanner() {
    if (banner) return;
    banner = document.createElement("div");
    banner.className = "offline-banner";
    banner.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
      <span>Kamu sedang offline. Beberapa fitur mungkin nggak jalan.</span>
    `;
    document.body.appendChild(banner);
    document.body.style.paddingTop = banner.offsetHeight + "px";
  }

  function hideOfflineBanner() {
    if (!banner) return;
    banner.classList.add("is-leaving");
    const b = banner;
    banner = null;
    setTimeout(() => {
      b.remove();
      document.body.style.paddingTop = "";
    }, 300);
    // Toast: back online
    showStatus("success", "🌐 Kamu kembali online!");
  }

  window.addEventListener("offline", showOfflineBanner);
  window.addEventListener("online", hideOfflineBanner);

  // Initial check (kalau buka web saat offline)
  if (!navigator.onLine) {
    setTimeout(showOfflineBanner, 500);
  }
})();

/* ===================== EXPORT HISTORY (JSON) ==================== */
function exportHistory() {
  const history = getHistory();
  if (history.length === 0) {
    showStatus("info", "Belum ada riwayat untuk diexport.");
    return;
  }
  const exportData = {
    exported_at: new Date().toISOString(),
    app: "ambilin",
    version: "1.0",
    count: history.length,
    history: history,
  };
  try {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ambilin-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus("success", "💾 Riwayat berhasil diexport!");
    trackEvent("history_export", { count: history.length });
  } catch (err) {
    showStatus("error", "Gagal export riwayat: " + err.message);
  }
}
