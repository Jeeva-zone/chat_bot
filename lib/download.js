// Browser-side file downloads via Blob + object URLs (no server round trip).

export function downloadText(filename, text, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "output.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give Safari/Firefox a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const EXT_BY_LANG = {
  javascript: "js",
  js: "js",
  jsx: "jsx",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  python: "py",
  py: "py",
  bash: "sh",
  shell: "sh",
  sh: "sh",
  zsh: "sh",
  json: "json",
  jsonc: "json",
  html: "html",
  xml: "xml",
  css: "css",
  scss: "scss",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  markdown: "md",
  md: "md",
  sql: "sql",
  go: "go",
  rust: "rs",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  csharp: "cs",
  cs: "cs",
  php: "php",
  ruby: "rb",
  dockerfile: "Dockerfile",
  text: "txt",
  plaintext: "txt",
  ini: "ini",
  env: "env",
  diff: "diff",
  patch: "diff",
};

/** Best-effort filename for a code block, e.g. lang=python -> snippet.py */
export function filenameForCodeBlock(lang, hint, index = 1) {
  const l = String(lang || "").toLowerCase().trim();
  if (hint && /\.[a-z0-9]{1,8}$/i.test(hint)) return hint;
  const ext = EXT_BY_LANG[l] || (l && /^[a-z0-9]{1,6}$/.test(l) ? l : "txt");
  const base = hint && !/\.[a-z0-9]{1,8}$/i.test(hint) ? slugify(hint) : `snippet-${index}`;
  return ext === "Dockerfile" ? "Dockerfile" : `${base}.${ext}`;
}

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "output";
}

/** Timestamp suffix so repeated downloads never overwrite each other silently. */
export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for non-secure contexts (http://LAN-IP:3000).
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    } catch (e) {
      reject(e);
    }
  });
}
