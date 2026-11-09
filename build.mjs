// 把 src/app.html 用密碼加密成 index.html（打開要輸入密碼才解得開）。
// 用法：node build.mjs            → 會問密碼（輸入時不顯示）
//      TQ_PASSWORD=xxx node build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import readline from "node:readline";

const ITER = 310000;

function ask(q) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) process.stdout.write(q); };
    rl.question(q, (a) => { rl.close(); process.stdout.write("\n"); res(a); });
  });
}

let pw = process.env.TQ_PASSWORD;
if (!pw) {
  pw = await ask("設定密碼：");
  const again = await ask("再輸入一次：");
  if (pw !== again) { console.error("兩次密碼不一樣，沒有產生檔案。"); process.exit(1); }
}
if (!pw || pw.length < 4) { console.error("密碼至少 4 個字。"); process.exit(1); }

const app = readFileSync(new URL("./src/app.html", import.meta.url), "utf8");
const full = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><link rel="icon" type="image/png" href="favicon.png"><link rel="apple-touch-icon" href="apple-touch-icon.png"></head><body>${app}</body></html>`;

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(full)));
const b64 = (u) => Buffer.from(u).toString("base64");

const lock = readFileSync(new URL("./src/lock.html", import.meta.url), "utf8")
  .replace("__SALT__", b64(salt)).replace("__IV__", b64(iv)).replace("__CT__", b64(ct)).replace("__ITER__", String(ITER));
writeFileSync(new URL("./index.html", import.meta.url), lock);
console.log(`已產生 index.html（加密後 ${Math.round(lock.length / 1024)} KB）`);
