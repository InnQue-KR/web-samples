// OG 이미지(1200×630 PNG)를 사이트 자원(로고·hero 일러스트)과 Pretendard로 그린다. 한 번만 실행하는 생성 스크립트.
// 사용(사이트 폴더에서, 먼저 npm run fonts): node scripts/make-og.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pub = fileURLToPath(new URL('../public/', import.meta.url));
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${pub}fonts/pretendard/pretendardvariable-dynamic-subset.css">
<style>
body{margin:0;width:1200px;height:630px;display:grid;grid-template-columns:520px 680px;font-family:"Pretendard Variable",sans-serif;background:#fff;color:#12284A;word-break:keep-all}
.l{padding:56px 48px;display:flex;flex-direction:column;gap:28px;border-right:1px solid #C9D0D8}
.l img{height:44px;width:auto;align-self:flex-start}
h1{margin:0;font-size:44px;line-height:1.3;font-weight:700;letter-spacing:-.02em}
p{margin:0;font-size:22px;line-height:1.6;color:#4B5662}
.tag{margin-top:auto;display:flex;align-items:center;gap:10px;font-size:18px;font-weight:600;background:#EEF1F4;padding:10px 16px;align-self:flex-start}
.tag::before{content:"";width:10px;height:10px;background:#C94A0A}
.r{position:relative}.r img{width:100%;height:100%;object-fit:cover}
.r span{position:absolute;right:0;bottom:0;background:rgba(255,255,255,.92);font-size:16px;padding:6px 12px;color:#4B5662}
</style></head><body>
<div class="l"><img src="file://${pub}images/logo.svg" alt=""><h1>도면 한 장에서 양산까지, 공차를 지키는 정밀가공</h1><p>CNC 정밀가공 · 지그·픽스처 · 시제품</p><span class="tag">샘플 사이트 · 실제 업체가 아닙니다</span></div>
<div class="r"><img src="file://${pub}images/hero.svg" alt=""><span>일러스트 · 실제 사진이 아닙니다</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// file:// 자원을 읽으려면 페이지도 file://로 열어야 한다
const dir = mkdtempSync(join(tmpdir(), 'og-'));
writeFileSync(join(dir, 'og.html'), html);
await page.goto(`file://${join(dir, 'og.html')}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${pub}images/og-image.png` });
await browser.close();
rmSync(dir, { recursive: true, force: true });
console.log('public/images/og-image.png 생성');
