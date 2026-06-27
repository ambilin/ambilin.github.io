/* =================================================================
   ambilin — script.js (optimized)
   ================================================================= */
"use strict";

document.documentElement.classList.add("js");

const CONFIG = {
  SERVERLESS_ENDPOINT: "",
  TIKTOK_PUBLIC_API: "https://www.tikwm.com/api/",
  PREFER_PUBLIC_TIKTOK: true,
};

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

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================ TEMA ============================== */
function updateThemeColor(theme) {
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", theme === "light" ? "#f4f6ff" : "#0b1020");
  }
}

function setTheme(next) {
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ambilin-theme", next);
  updateThemeColor(next);
}

(function initTheme() {
  const saved = localStorage.getItem("ambilin-theme");
  const theme = saved || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeColor(theme);
})();

/* Toggle tema dengan circular reveal (View Transitions API).
   FIX: Added .catch() fallback untuk mobile robustness.
   Jika transition gagal, theme tetap di-apply. */
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";

  if (prefersReducedMotion || !document.startViewTransition) {
    setTheme(next);
    return;
  }

  const rect = themeToggle.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(() => {
    setTheme(next);
  });

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 450,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }).catch(() => {
    // Fallback: jika transition.ready reject, theme sudah di-set di callback
    setTheme(next);
  });

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
if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  let revealTicking = false;
  const revealInView = () => {
    revealTicking = false;
    const trigger = window.innerHeight * 0.92;
    for (let i = revealEls.length - 1; i >= 0; i--) {
      const el = revealEls[i];
      if (el.getBoundingClientRect().top < trigger) {
        el.classList.add("is-visible");
        revealEls.splice(i, 1);
      }
    }
  };
  const onRevealScroll = () => { if (!revealTicking) { revealTicking = true; requestAnimationFrame(revealInView); } };
  window.addEventListener("scroll", onRevealScroll, { passive: true });
  window.addEventListener("resize", onRevealScroll, { passive: true });
  revealInView();
}

/* ============================ TOMBOL TEMPEL ===================== */
pasteBtn.addEventListener("click", async () => {
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
  if (/instagram\.com|instagr\.am/.test(u)) return "instagram";
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  return null;
}
function updatePlatformIcon(url) {
  const platform = detectPlatform(url);
  const icons = {
    tiktok: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.1v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.7 5.7 0 0 0-.77-.05A5.69 5.69 0 1 0 15.54 15.4V8.83a7.34 7.34 0 0 0 4.3 1.38V7.1a4.28 4.28 0 0 1-3.24-1.28z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M23 12s0-3.3-.42-4.88a2.53 2.53 0 0 0-1.78-1.79C19.22 5 12 5 12 5s-7.22 0-8.8.33a2.53 2.53 0 0 0-1.78 1.79C1 8.7 1 12 1 12s0 3.3.42 4.88a2.53 2.53 0 0 0 1.78 1.79C4.78 19 12 19 12 19s7.22 0 8.8-.33a2.53 2.53 0 0 0 1.78-1.79C23 15.3 23 12 23 12zM9.75 15.02V8.98L15.5 12z"/></svg>',
  };
  const linkIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  platformIcon.innerHTML = platform ? icons[platform] : linkIcon;
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
  if (!platform) { showStatus("error", "Link tidak dikenali. Gunakan link Instagram, TikTok, atau YouTube."); return; }

  setLoading(true);
  clearResult();
  showStatus("info", "⏳ Memproses link, mohon tunggu sebentar…");
  try {
    const data = await fetchVideo(url, platform);
    if (!data || !data.medias || data.medias.length === 0) throw new Error("EMPTY");
    hideStatus();
    renderResult(data);
  } catch (err) {
    handleError(err, platform);
  } finally {
    setLoading(false);
  }
});

/* ============== FETCH VIDEO — OPSI A / OPSI B =================== */
async function fetchVideo(url, platform) {
  const useServerless = CONFIG.SERVERLESS_ENDPOINT && CONFIG.SERVERLESS_ENDPOINT.trim() !== "";
  if (platform === "tiktok" && (CONFIG.PREFER_PUBLIC_TIKTOK || !useServerless)) return await fetchTikTokPublic(url);
  if (useServerless) return await fetchViaServerless(url, platform);
  throw new Error("NO_ENDPOINT");
}

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

async function fetchViaServerless(url, platform) {
  const endpoint = `${CONFIG.SERVERLESS_ENDPOINT}?url=${encodeURIComponent(url)}&platform=${platform}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("HTTP_" + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return normalize(json);
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
    // Icon download: file-document dengan panah di dalam (beda dari logo web)
    const icon = m.kind === "audio"
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>';
    return `<button class="dl-btn ${primary}" data-url="${escapeAttr(m.url)}" data-label="${escapeAttr(m.label)}">${icon}${escapeHtml(m.label)}</button>`;
  }).join("");
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
        <div class="result-card__downloads">${buttons}</div>
      </div>
    </div>`;
  resultBox.hidden = false;
  resultBox.querySelectorAll(".dl-btn").forEach((btn) => {
    btn.addEventListener("click", () => triggerDownload(btn.dataset.url, data, btn.dataset.label));
  });
}

/* ===================== PICU DOWNLOAD FILE ======================= */
async function triggerDownload(fileUrl, data, label) {
  const rawName = (data.title || "video").slice(0, 40);
  const safeSlug = rawName.replace(/[\\/:*?"<>|#%\s+]+/g, "-").replace(/^-+|-+$/g, "") || "video";
  const safeName = `${data.platform}-${safeSlug}`;
  const ext = /audio|mp3/i.test(label) ? "mp3" : "mp4";
  showStatus("info", "⬇️ Menyiapkan file untuk diunduh…");
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
      msg = platform === "tiktok"
        ? "Gagal memproses TikTok. Coba lagi sebentar lagi."
        : "Untuk Instagram & YouTube, aktifkan dulu serverless function (OPSI B) dan isi SERVERLESS_ENDPOINT di script.js.";
      break;
    case code === "EMPTY": msg = "Tidak menemukan video pada link ini. Pastikan video bersifat publik (bukan private)."; break;
    case code === "API_FAIL": msg = "Server downloader gagal memproses link. Mungkin video private, dihapus, atau dibatasi wilayah."; break;
    case /^HTTP_4/.test(code): msg = "Link ditolak server (4xx). Cek kembali apakah link benar dan video publik."; break;
    case /^HTTP_5/.test(code): msg = "Server downloader sedang bermasalah (5xx). Coba lagi beberapa saat."; break;
    case /Failed to fetch|NetworkError|TypeError/i.test(code): msg = "Gagal terhubung ke server. Cek koneksi internet, atau API memblokir akses (CORS). Coba OPSI B."; break;
    default: msg = "Terjadi kesalahan saat memproses. Coba lagi atau gunakan link lain.";
  }
  showStatus("error", "⚠️ " + msg);
}

/* ===================== PWA INSTALL ======================= */
let deferredPrompt = null;
let isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

if (isStandalone) {
  installBtn.hidden = true;
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone) {
    installBtn.hidden = false;
    installBtn.classList.add("is-ready");
  }
});

installBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      installBtn.hidden = true;
      isStandalone = true;
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
}
function showStatus(type, message) { statusBox.className = `status status--${type}`; statusBox.textContent = message; statusBox.hidden = false; }
function hideStatus() { statusBox.hidden = true; }
function clearResult() { resultBox.hidden = true; resultBox.innerHTML = ""; }
function formatDuration(sec) { sec = Math.round(Number(sec) || 0); const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : str; }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(str) { return escapeHtml(str); }
