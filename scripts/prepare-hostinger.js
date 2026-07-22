/**
 * Gera pastas prontas para upload na Hostinger:
 *   dist/site/    → domínio principal (public_html)
 *   dist/painel/  → subdomínio painel.* (document root do subdomínio)
 *
 * Uso:
 *   1. Edite deploy.config.json com suas URLs reais
 *   2. npm run prepare:hostinger
 *   3. Suba dist/site e dist/painel conforme o guia
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FRONT = path.join(ROOT, "frontend");
const DIST = path.join(ROOT, "dist");
const CONFIG_PATH = path.join(ROOT, "deploy.config.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

function writeConfig(destDir, cfg) {
  const content = `/**
 * Gerado por npm run prepare:hostinger — não edite à mão no dist.
 * Fonte: deploy.config.json
 */
(function () {
  window.APP_CONFIG = {
    API_BASE_URL: ${JSON.stringify(cfg.apiUrl)},
    SITE_URL: ${JSON.stringify(cfg.siteUrl)},
    PAINEL_URL: ${JSON.stringify(cfg.painelUrl)},
  };
})();
`;
  ensureDir(path.join(destDir, "js"));
  fs.writeFileSync(path.join(destDir, "js", "config.js"), content, "utf8");
}

function stripDemoAndDevHints(html) {
  return html
    .replace(/<p id="loginDemoHint"[\s\S]*?<\/p>/i, "")
    .replace(/<div id="portWarning"[\s\S]*?<\/div>/i, '<div id="portWarning" class="port-warning" hidden></div>');
}

function writeHtaccess(destDir) {
  const body = `DirectoryIndex index.html
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} !=on
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
`;
  fs.writeFileSync(path.join(destDir, ".htaccess"), body, "utf8");
}

function patchHtml(filePath, replacements) {
  let html = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of replacements) {
    html = html.split(from).join(to);
  }
  fs.writeFileSync(filePath, html, "utf8");
}

function build() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("Crie deploy.config.json na raiz (veja deploy.config.json de exemplo).");
    process.exit(1);
  }

  const cfg = readJson(CONFIG_PATH);
  if (!cfg.apiUrl || !cfg.siteUrl || !cfg.painelUrl) {
    console.error("deploy.config.json precisa de apiUrl, siteUrl e painelUrl.");
    process.exit(1);
  }

  if (String(cfg.apiUrl).includes("seudominio")) {
    console.warn(
      "[Aviso] deploy.config.json ainda usa 'seudominio' — troque pelas URLs reais antes do upload."
    );
  }

  rmDir(DIST);
  const siteDir = path.join(DIST, "site");
  const painelDir = path.join(DIST, "painel");
  ensureDir(siteDir);
  ensureDir(painelDir);

  // --- SITE (domínio) ---
  copyFile(path.join(FRONT, "index.html"), path.join(siteDir, "index.html"));
  copyDir(path.join(FRONT, "css"), path.join(siteDir, "css"));
  ensureDir(path.join(siteDir, "js"));
  copyFile(path.join(FRONT, "js", "script.js"), path.join(siteDir, "js", "script.js"));
  writeConfig(siteDir, cfg);
  writeHtaccess(siteDir);

  patchHtml(path.join(siteDir, "index.html"), [
    ['id="linkAreaProfissional" href="login.html"', `id="linkAreaProfissional" href="${cfg.painelUrl}"`],
  ]);

  // --- PAINEL (subdomínio) ---
  copyDir(path.join(FRONT, "css"), path.join(painelDir, "css"));
  ensureDir(path.join(painelDir, "js"));
  for (const name of ["login.js", "painel.js", "config.js"]) {
    // config.js sobrescrito depois por writeConfig
    if (name === "config.js") continue;
    copyFile(path.join(FRONT, "js", name), path.join(painelDir, "js", name));
  }

  let loginHtml = fs.readFileSync(path.join(FRONT, "login.html"), "utf8");
  loginHtml = stripDemoAndDevHints(loginHtml);
  loginHtml = loginHtml.replace(/href="index\.html"/g, `href="${cfg.siteUrl}"`);
  loginHtml = loginHtml.replace(
    /id="loginBackLink" href="[^"]*"/,
    `id="loginBackLink" href="${cfg.siteUrl}"`
  );

  fs.writeFileSync(path.join(painelDir, "index.html"), loginHtml, "utf8");
  fs.writeFileSync(path.join(painelDir, "login.html"), loginHtml, "utf8");

  let painelHtml = fs.readFileSync(path.join(FRONT, "painel.html"), "utf8");
  painelHtml = stripDemoAndDevHints(painelHtml);
  fs.writeFileSync(path.join(painelDir, "painel.html"), painelHtml, "utf8");

  writeConfig(painelDir, cfg);
  writeHtaccess(painelDir);

  fs.writeFileSync(
    path.join(DIST, "LEIA-ME-UPLOAD.txt"),
    `UPLOAD HOSTINGER
================

1) Domínio principal (${cfg.siteUrl})
   → Envie TODO o conteúdo de dist/site/ para public_html

2) Subdomínio painel (${cfg.painelUrl})
   → No hPanel crie o subdomínio "painel"
   → Envie TODO o conteúdo de dist/painel/ para a pasta do subdomínio
   → Abrir ${cfg.painelUrl} já cai no login

3) API (${cfg.apiUrl})
   → VPS / Node Hosting Hostinger
   → Pasta backend/ + arquivo .env
   → CORS_ORIGIN=${cfg.siteUrl},${cfg.painelUrl}

MySQL: rode backend/database/schema.sql no phpMyAdmin do banco criado no hPanel.
`,
    "utf8"
  );

  console.log("Pronto!");
  console.log(`  dist/site/    → ${cfg.siteUrl}`);
  console.log(`  dist/painel/  → ${cfg.painelUrl}`);
  console.log(`  API esperada  → ${cfg.apiUrl}`);
  console.log("Leia dist/LEIA-ME-UPLOAD.txt");
}

build();
