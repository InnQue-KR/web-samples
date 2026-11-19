// company-01 핵심 동작 smoke (Playwright Chromium headless). 먼저 npm run build.
// 결과: qa-output/company-01/smoke.json, 화면 PNG. 하나라도 실패하면 종료 코드 1.
// Chromium 자동화 결과이며 iPhone/Safari 실기기·화면낭독기 확인을 대신하지 않는다.
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { startServer } from '../scripts/serve-dist.mjs';

const OUT = new URL('../qa-output/company-01/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const server = await startServer(0);
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const BASE = `${ORIGIN}/company-01/`;
const PAGES = ['', 'about/', 'services/', 'cases/', 'news/', 'news/seollal-holiday/', 'news/5-axis-machining-center/', 'news/quality-certification-renewal/', 'quote/', 'privacy/'];
// 합성 테스트 값(실존 회사·사람·번호 아님)
const T = { company: '합성테스트회사', name: '테스트담당', phone: '010-1234-5678', mail: 'qa@example.com', item: '합성품목 알루미늄 10개', memo: '합성요청문구' };

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const browser = await chromium.launch();
const startedAt = new Date().toISOString();

async function open(path = '', opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await context.newPage();
  const requests = [];
  const responses = [];
  const consoleMsgs = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), post: r.postData() }));
  page.on('response', (r) => responses.push({ url: r.url(), status: r.status() }));
  page.on('console', (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consoleMsgs.push(`pageerror: ${e.message}`));
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return { context, page, res, requests, responses, consoleMsgs };
}
const bytesOf = (u) => statSync(new URL(`../dist${new URL(u).pathname.replace(/\/$/, '/index.html')}`, import.meta.url)).size;
// 지연 로딩(lazy) 이미지를 모두 불러와 끝날 때까지 기다린다. 깨진 이미지 src 목록을 돌려준다.
const loadAllImages = (page) => page.evaluate(async () => {
  const imgs = [...document.images];
  imgs.forEach((i) => { i.loading = 'eager'; });
  await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => { i.addEventListener('load', ok, { once: true }); i.addEventListener('error', ok, { once: true }); }))));
  return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src'));
});
const storageEmpty = (page) => page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === '');

try {
  // ---------- 1. URL 10개 + 404: 응답·자원·고지·제목 ----------
  const titles = new Set();
  for (const path of [...PAGES, '404.html']) {
    const { context, page, res, requests, responses, consoleMsgs } = await open(path);
    const tag = `/company-01/${path}`;
    const ext = requests.filter((r) => !r.url.startsWith(ORIGIN));
    const outside = requests.filter((r) => r.url.startsWith(ORIGIN) && !new URL(r.url).pathname.startsWith('/company-01/'));
    const bad = responses.filter((r) => r.status >= 400);
    const strip = await page.$eval('[data-sample-strip]', (e) => ({ t: e.textContent, y: e.getBoundingClientRect().top, tag: e.tagName, label: e.getAttribute('aria-label') }));
    const info = await page.evaluate(() => ({
      robots: document.querySelector('meta[name=robots]')?.getAttribute('content'),
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.getAttribute('content') ?? '',
      og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
      h1: document.querySelectorAll('h1').length,
      foot: document.querySelector('.disclosure')?.textContent ?? '',
      frame: document.body.dataset.frame,
      brokenImg: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      extLinks: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /^(https?:|tel:|mailto:|\/\/)/.test(h)),
    }));
    const ok = res.status() === 200 && ext.length === 0 && outside.length === 0 && bad.length === 0
      && info.robots === 'noindex, nofollow' && strip.y === 0 && strip.t.includes('샘플 사이트') && info.foot.includes('AI를 활용')
      && info.h1 === 1 && info.desc && info.og === 'https://samples.innque.co.kr/company-01/images/og-image.png' && info.brokenImg.length === 0 && info.extLinks.length === 0
      && !consoleMsgs.some((m) => /^(error|pageerror)/.test(m));
    check(`${tag} 200·외부요청0·/company-01/ 밖 0·noindex·샘플 띠 y=0·AI 고지·h1 1개·description·OG·외부/tel/mailto 링크 0·콘솔 오류 0`, ok,
      `${res.status()} [${info.frame}] "${info.title}" ext=${ext.length} out=${outside.length} bad=${bad.map((b) => b.url).join(',')} h1=${info.h1} img깨짐=${info.brokenImg.join(',')} console=${consoleMsgs.join('|')}`);
    const wantUrl = path === '404.html' ? null : `https://samples.innque.co.kr/company-01/${path}`;
    check(`${tag} og:url ${wantUrl ?? '없음(404는 여러 주소에서 보이므로)'}·샘플 띠 aside 랜드마크`, info.ogUrl === wantUrl && strip.tag === 'ASIDE' && Boolean(strip.label), `og:url=${info.ogUrl} strip=${strip.tag}/${strip.label}`);
    const broken = await loadAllImages(page);
    check(`${tag} 지연 로딩 포함 모든 이미지 열림`, broken.length === 0, broken.join(','));
    if (path !== '404.html') { check(`${tag} title 중복 없음`, !titles.has(info.title)); titles.add(info.title); }
    const urls = [...new Set(requests.map((r) => r.url))];
    const total = urls.reduce((s, u) => s + bytesOf(u), 0);
    check(`${tag} 첫 로드 파일 합계 ≤ 1.5MB(압축 전, 1280)`, total <= 1.5 * 1024 * 1024, `${urls.length}개 ${(total / 1024).toFixed(0)}KB`);
    // (INNA-653) 화면 글자는 파생본 Doram Sans 한 파일로. 공식 Pretendard 조각은 범위 밖 글자용이라 받지 않아야 함(같은 글자 중복 없음)
    const chunks = urls.filter((u) => u.includes('/fonts/pretendard/'));  // 조각 woff2와 대체 경로 CSS 모두(첫 로드에는 받지 않음)
    const doram = requests.filter((r) => r.url.endsWith('/fonts/doram-sans/DoramSans-subset.woff2'));
    const fontsOk = await page.evaluate(() => document.fonts.check('16px "Doram Sans"', '가') && [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Doram Sans' && f.status === 'loaded'));
    check(`${tag} 글꼴: Doram Sans 1회 받아 사용, 공식 Pretendard CSS·조각 0개`, chunks.length === 0 && doram.length === 1 && fontsOk, `조각 ${chunks.length} doram ${doram.length} loaded=${fontsOk}`);
    await context.close();
  }

  // ---------- 2. 글꼴·로고 ----------
  {
    const { context, page, requests } = await open('services/');
    await page.evaluate(() => document.fonts.ready);
    const fams = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))]);
    // (INNA-653) 화면 글자는 파생본 Doram Sans(Pretendard 1.3.9 서브셋)와 IBM Plex Mono만. 공식 Pretendard는 범위 밖 글자가 있을 때만 받는다
    check('로드된 글꼴은 Doram Sans·IBM Plex Mono만(공식 Pretendard 조각은 받지 않음)', fams.includes('Doram Sans') && fams.includes('IBM Plex Mono') && fams.every((f) => ['Doram Sans', 'IBM Plex Mono'].includes(f)), fams.join(','));
    const woff = requests.filter((r) => r.url.endsWith('.woff2')).map((r) => new URL(r.url).pathname);
    check('글꼴 파일은 /company-01/fonts/ 아래 doram-sans 1개 + plex-mono', woff.filter((p) => p === '/company-01/fonts/doram-sans/DoramSans-subset.woff2').length === 1 && woff.every((p) => p.startsWith('/company-01/fonts/doram-sans/') || p.startsWith('/company-01/fonts/plex-mono/')), woff.join(','));
    const logo = await page.$eval('.site-header .logo img', (i) => ({ ok: i.complete && i.naturalWidth > 0, h: i.getBoundingClientRect().height }));
    check('로고(윤곽선 SVG) 표시', logo.ok && logo.h >= 30, JSON.stringify(logo));
    await context.close();
  }

  // ---------- 3. 반응형 가로 넘침 (전체 URL × 8폭) ----------
  for (const w of [320, 360, 390, 768, 1024, 1280, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const over = [];
    for (const path of [...PAGES, '404.html']) {
      await p.goto(BASE + path, { waitUntil: 'networkidle' });
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) over.push(`${path || '/'}=${sw}`);
    }
    check(`${w}px 11개 화면 가로 넘침 없음`, over.length === 0, over.join(', '));
    await ctx.close();
  }

  // ---------- 4. 화면 저장(y=0 첫 화면 + 전체, reduced-motion) ----------
  const shots = [];
  for (const [path, name] of [['', 'home'], ['quote/', 'quote'], ['news/', 'news'], ['news/5-axis-machining-center/', 'news-detail'], ['about/', 'about'], ['services/', 'services'], ['cases/', 'cases']]) {
    for (const w of [360, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w === 360 ? 740 : 800 }, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await p.goto(BASE + path, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      if (name === 'home' || name === 'quote' || name === 'news' || name === 'news-detail') { await p.screenshot({ path: `${OUT}${name}-first-${w}.png` }); shots.push(`${name}-first-${w}.png`); }
      await loadAllImages(p);
      await p.screenshot({ path: `${OUT}${name}-full-${w}.png`, fullPage: true });
      shots.push(`${name}-full-${w}.png`);
      await ctx.close();
    }
  }
  check('화면 PNG 저장', shots.length > 0, shots.join(', '));

  // ---------- 5. 메뉴 앵커가 실제 구역으로 이어짐 ----------
  {
    const { context, page } = await open('');
    const links = await page.$$eval('a[href*="#"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))].filter((h) => !h.startsWith('#')));
    const missing = [];
    for (const href of links) {
      const [path, hash] = href.split('#');
      await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded' });
      if (!(await page.$(`#${hash}`))) missing.push(href);
    }
    check('홈·머리말·바닥글의 #앵커 링크가 모두 대상 구역을 가짐', links.length >= 6 && missing.length === 0, `${links.join(', ')} 없음=${missing.join(',')}`);
    await page.goto(`${BASE}about/#history`, { waitUntil: 'networkidle' });
    const pos = await page.evaluate(() => {
      const h = document.getElementById('history').getBoundingClientRect().top;
      const head = document.querySelector('.site-header').getBoundingClientRect().bottom;
      return { h, head };
    });
    check('about/#history로 열면 구역 머리가 고정 머리말 아래에 보임', pos.h >= pos.head - 1 && pos.h < 200, JSON.stringify(pos));
    await context.close();
  }

  // ---------- 6. 모바일 메뉴: 열기·현재 그룹 펼침·Escape·초점 복귀·앵커 이동 시 닫힘 ----------
  {
    const { context, page } = await open('about/', { viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    const toggle = page.locator('.menu-toggle');
    check('360: 메뉴는 처음에 닫힘', (await toggle.getAttribute('aria-expanded')) === 'false' && !(await page.isVisible('#gnav')));
    await toggle.click();
    check('360: 메뉴 버튼으로 열림(aria-expanded=true, 라벨 "메뉴 닫기")', (await toggle.getAttribute('aria-expanded')) === 'true' && (await toggle.getAttribute('aria-label')) === '메뉴 닫기' && (await page.isVisible('#gnav')));
    const cur = await page.$eval('.gnav li.is-current', (li) => ({ open: li.classList.contains('is-open'), exp: li.querySelector('[data-submenu-toggle]').getAttribute('aria-expanded'), label: li.querySelector('button').textContent.trim() }));
    check('360: 현재 그룹(회사 소개) 하위 메뉴가 처음부터 펼쳐짐', cur.open && cur.exp === 'true' && cur.label.startsWith('회사 소개'), JSON.stringify(cur));
    const svc = page.locator('.gnav [data-submenu-toggle]').nth(1);
    await svc.click();
    check('360: 다른 그룹 하위 메뉴를 눌러 펼침', (await svc.getAttribute('aria-expanded')) === 'true' && (await page.isVisible('.gnav li:nth-child(2) .submenu')));
    await page.keyboard.press('Escape');
    const afterEsc = await page.evaluate(() => ({ exp: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), focus: document.activeElement?.classList.contains('menu-toggle'), lock: document.body.classList.contains('menu-open') }));
    check('360: Escape로 닫히고 초점이 메뉴 버튼으로 돌아감, 스크롤 잠금 해제', afterEsc.exp === 'false' && afterEsc.focus && !afterEsc.lock, JSON.stringify(afterEsc));
    await toggle.click();
    await page.click('.gnav a[href="/company-01/about/#history"]');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ exp: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), hash: location.hash, top: document.getElementById('history').getBoundingClientRect().top }));
    check('360: 같은 페이지 앵커(연혁·인증)를 누르면 메뉴가 닫히고 구역으로 이동', after.exp === 'false' && after.hash === '#history' && after.top < 200, JSON.stringify(after));
    await context.close();
  }
  {
    const { context, page } = await open('');
    await page.focus('.gnav [data-submenu-toggle]');
    check('1280: 키보드 초점으로 하위 메뉴 보임', await page.isVisible('.gnav li:first-child .submenu'));
    await page.keyboard.press('Tab');
    const inSub = await page.evaluate(() => Boolean(document.activeElement?.closest('.submenu')));
    await page.keyboard.press('Escape');
    const back = await page.evaluate(() => document.activeElement?.hasAttribute('data-submenu-toggle'));
    check('1280: 하위 메뉴 링크에서 Escape → 그룹 버튼으로 초점 복귀', inSub && back);
    await context.close();
  }

  // ---------- 6-1. (INNA-644 UX-01) 펼친 모바일 메뉴: 초점이 가려진 본문으로 새지 않음, 닫을 때 inert·잠금 해제 ----------
  // 머리말 밖 최상위 요소(건너뛰기·띠·본문·바닥글·안내창)의 inert 상태와 스크롤 잠금
  const menuState = (page) => page.evaluate(() => {
    const header = document.querySelector('.site-header');
    const outside = [...document.body.children].filter((el) => el !== header && el.tagName !== 'SCRIPT');
    return {
      exp: document.querySelector('.menu-toggle').getAttribute('aria-expanded'),
      inert: outside.filter((el) => el.inert).map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')),
      outside: outside.length, lock: document.body.classList.contains('menu-open'),
      focus: document.activeElement?.className || document.activeElement?.id || document.activeElement?.tagName,
    };
  });
  // Tab을 n번 눌러 초점이 머리말 안에만 있고, 그 자리에서 실제로 보이며(가려지지 않음), 뒤 페이지가 스크롤되지 않는지
  const tabWalk = async (page, n, back = false) => {
    const y0 = await page.evaluate(() => scrollY);
    const bad = [];
    for (let i = 0; i < n; i++) {
      await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
      const f = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return { ok: true, what: 'body' };
        const r = a.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { ok: Boolean(a.closest('.site-header')) && Boolean(hit && (a === hit || a.contains(hit))), what: a.textContent.trim().slice(0, 12) || a.getAttribute('aria-label') };
      });
      if (!f.ok) bad.push(f.what);
    }
    return { bad, scrolled: (await page.evaluate(() => scrollY)) - y0 };
  };
  for (const vp of [{ width: 360, height: 740 }, { width: 768, height: 1024 }]) {
    const { context, page } = await open('', { viewport: vp, reducedMotion: 'reduce' });
    const toggle = page.locator('.menu-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    const s = await menuState(page);
    check(`${vp.width}: 메뉴를 열면 머리말 밖 요소 모두 inert + 스크롤 잠금`, s.exp === 'true' && s.lock && s.inert.length === s.outside && s.outside >= 4, JSON.stringify(s));
    const fw = await tabWalk(page, 30);
    check(`${vp.width}: 열린 메뉴에서 Tab 30번 — 초점이 메뉴 뒤 본문으로 가지 않고 가려지지 않음, 뒤 페이지 스크롤 0`, fw.bad.length === 0 && fw.scrolled === 0, JSON.stringify(fw));
    const bw = await tabWalk(page, 30, true);
    check(`${vp.width}: 열린 메뉴에서 Shift+Tab 30번 — 같은 조건`, bw.bad.length === 0 && bw.scrolled === 0, JSON.stringify(bw));
    await toggle.click();
    const c = await menuState(page);
    check(`${vp.width}: 메뉴 버튼으로 닫으면 inert·스크롤 잠금 해제, 초점은 메뉴 버튼`, c.exp === 'false' && !c.lock && c.inert.length === 0 && c.focus.includes('menu-toggle'), JSON.stringify(c));
    await toggle.click();
    await page.keyboard.press('Escape');
    const e = await menuState(page);
    check(`${vp.width}: Escape로 닫으면 inert·스크롤 잠금 해제, 초점은 메뉴 버튼`, e.exp === 'false' && !e.lock && e.inert.length === 0 && e.focus.includes('menu-toggle'), JSON.stringify(e));
    // 1024 경계 넘기: 열린 채 넓히면 펼침·inert·잠금이 풀리고, 사라진 메뉴 버튼에 있던 초점은 로고로
    await toggle.click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(100);
    const w = await menuState(page);
    check(`${vp.width}→1280 창 넓히기: 펼침 해제, inert·스크롤 잠금 해제, 초점은 보이는 로고로`, w.exp === 'false' && !w.lock && w.inert.length === 0 && w.focus.includes('logo'), JSON.stringify(w));
    await page.setViewportSize(vp);
    await page.waitForTimeout(100);
    const n = await menuState(page);
    check(`1280→${vp.width} 되돌리기: 메뉴 닫힌 상태, inert 없음`, n.exp === 'false' && !n.lock && n.inert.length === 0 && !(await page.isVisible('#gnav')), JSON.stringify(n));
    await context.close();
  }
  {
    // 같은 페이지 앵커로 이동: inert 해제 후 구역으로 초점 이동 / 다른 페이지 링크: 새 페이지에 inert·잠금 없음
    const { context, page } = await open('about/', { viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    await page.click('.menu-toggle');
    await page.click('.gnav a[href="/company-01/about/#history"]');
    await page.waitForTimeout(200);
    const a = await menuState(page);
    const focusId = await page.evaluate(() => document.activeElement?.id);
    check('360: 같은 페이지 앵커로 이동하면 inert·잠금 해제, 초점이 그 구역(#history)으로', a.exp === 'false' && !a.lock && a.inert.length === 0 && focusId === 'history', JSON.stringify({ ...a, focusId }));
    await page.click('.menu-toggle');
    await Promise.all([page.waitForURL(`${BASE}quote/`), page.click('.gnav .nav-cta a')]);
    const q = await menuState(page);
    check('360: 다른 페이지 링크로 이동한 뒤 inert·잠금 없음', q.exp === 'false' && !q.lock && q.inert.length === 0, JSON.stringify(q));
    await context.close();
  }

  // ---------- 6-2. (INNA-644 UX-02) 데스크톱 하위 메뉴: Esc가 hover/focus-within에 지지 않음, aria-expanded = 실제 표시 ----------
  {
    const { context, page } = await open('', { reducedMotion: 'reduce' });
    const sub = (i) => page.evaluate((i) => {
      const li = document.querySelectorAll('.gnav [data-submenu-toggle]')[i].parentElement;
      return { shown: getComputedStyle(li.querySelector('.submenu')).display !== 'none', exp: li.querySelector('[data-submenu-toggle]').getAttribute('aria-expanded'), focusBtn: document.activeElement === li.querySelector('[data-submenu-toggle]') };
    }, i);
    const same = (s) => s.exp === String(s.shown);
    // 키보드: Tab으로 그룹 버튼에 초점 → 보임 → Esc → 숨김(초점 그대로여도 다시 안 열림) → 밖으로 Tab → 다시 Shift+Tab이면 열림
    await page.focus('.logo');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    const k1 = await sub(0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const k2 = await sub(0);
    check('1280 키보드: 그룹 버튼 초점으로 열린 하위 메뉴가 Esc로 닫히고 초점은 버튼에 남은 채 다시 열리지 않음, aria-expanded 일치', k1.shown && same(k1) && !k2.shown && same(k2) && k2.focusBtn, JSON.stringify({ k1, k2 }));
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    const k3 = await sub(0);
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(50);
    const k4 = await sub(0);
    check('1280 키보드: Esc 뒤 밖으로 나갔다가 다시 초점을 주면 정상으로 열림, aria-expanded 일치', !k3.shown && same(k3) && k4.shown && same(k4) && k4.focusBtn, JSON.stringify({ k3, k4 }));
    // 하위 메뉴 링크에서 Esc
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const k5 = await sub(0);
    check('1280 키보드: 하위 링크에서 Esc → 닫힘, 초점은 그룹 버튼, aria-expanded=false', !k5.shown && same(k5) && k5.focusBtn, JSON.stringify(k5));
    await page.focus('.logo');
    await page.waitForTimeout(50);
    // 포인터: 올리면 열림 → Esc → 포인터가 그대로 있어도 닫힘 → 메뉴 안에서 움직여도 닫힘 → 나갔다 다시 들어오면 열림
    const box = await page.locator('.gnav [data-submenu-toggle]').nth(1).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);
    const p1 = await sub(1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 2);
    await page.waitForTimeout(150);
    const p2 = await sub(1);
    check('1280 포인터: hover로 열린 하위 메뉴가 Esc로 닫히고, 포인터가 머물러도 다시 열리지 않음, aria-expanded 일치', p1.shown && same(p1) && !p2.shown && same(p2), JSON.stringify({ p1, p2 }));
    await page.mouse.move(box.x + box.width / 2, box.y + 400);
    await page.waitForTimeout(50);
    const p3 = await sub(1);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);
    const p4 = await sub(1);
    check('1280 포인터: 벗어났다가 다시 올리면 정상으로 열림, aria-expanded 일치', !p3.shown && same(p3) && p4.shown && same(p4), JSON.stringify({ p3, p4 }));
    // 클릭(INNA-653 R-1): hover로 보이는 것은 아직 '열기 전'. 첫 클릭은 열린 채 유지(명시적 열림), 두 번째는 포인터가 위에 있어도 닫힘, 세 번째 다시 열림
    const clicks = [];
    for (let n = 0; n < 3; n++) { await page.mouse.down(); await page.mouse.up(); clicks.push(await sub(1)); }
    check('1280 클릭: hover 중 첫 클릭 → 열림 유지, 두 번째 → 닫힘(포인터가 위에 있어도), 세 번째 → 열림, 매번 aria-expanded 일치(바로 확인)',
      clicks[0].shown && !clicks[1].shown && clicks[2].shown && clicks.every(same), JSON.stringify(clicks));
    await context.close();
  }

  // ---------- 6-3. (INNA-653 R-1) 1024 이상 새 페이지의 첫 클릭·첫 터치 탭·Enter/Space로 하위 메뉴가 열림 ----------
  // 원 결함: 첫 클릭·탭이 hover/초점으로 이미 보이던 메뉴를 '닫기'로 처리. 포인터는 메뉴 밖에서 시작하고 hover로 바꿔 열지 않는다
  {
    const state = (page) => page.evaluate(() => [...document.querySelectorAll('.gnav [data-submenu-toggle]')].map((b) => {
      const sub = b.parentElement.querySelector('.submenu');
      const vis = [...sub.querySelectorAll('a')].filter((a) => { const r = a.getBoundingClientRect(); const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null; return hit === a || a.contains(hit); }).length;
      return { shown: getComputedStyle(sub).display !== 'none', aria: b.getAttribute('aria-expanded'), vis };
    }));
    const is = (s, want) => s.every((g, i) => g.aria === String(g.shown) && g.shown === want[i] && (!want[i] || g.vis === [2, 4][i]));
    for (const w of [1024, 1280]) {
      for (const touch of [false, true]) {
        const how = touch ? '터치 탭' : '마우스 클릭';
        const rows = [];
        for (const i of [0, 1]) {
          const { context, page } = await open('', { viewport: { width: w, height: 800 }, hasTouch: touch, reducedMotion: 'reduce' });
          if (!touch) await page.mouse.move(w - 10, 790);
          const b = await page.locator('.gnav [data-submenu-toggle]').nth(i).boundingBox();
          const press = (x, y) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
          const want = (v) => (i === 0 ? [v, false] : [false, v]);
          await press(b.x + b.width / 2, b.y + b.height / 2); const s1 = await state(page);
          await press(b.x + b.width / 2, b.y + b.height / 2); const s2 = await state(page);
          await press(b.x + b.width / 2, b.y + b.height / 2); const s3 = await state(page);
          await press(w / 2, 700); const s4 = await state(page);
          rows.push({ i, ok: is(s1, want(true)) && is(s2, want(false)) && is(s3, want(true)) && is(s4, [false, false]), s1, s2, s3, s4 });
          await context.close();
        }
        check(`${w} ${how}: 새 페이지 첫 누름 → 열림·하위 링크 보임, 두 번째 → 닫힘, 세 번째 → 열림, 메뉴 밖 누르면 닫힘(두 그룹, 매번 aria-expanded 일치)`, rows.every((r) => r.ok), JSON.stringify(rows.filter((r) => !r.ok)));
      }
      const { context, page } = await open('', { viewport: { width: w, height: 800 }, reducedMotion: 'reduce' });
      await page.focus('.logo'); await page.keyboard.press('Tab');
      const k = [await state(page)];
      for (const key of ['Enter', 'Enter', ' ', ' ', 'Enter']) { await page.keyboard.press(key); k.push(await state(page)); }
      await page.keyboard.press('Escape'); k.push(await state(page));
      await page.keyboard.press('Enter'); k.push(await state(page));
      const kw = [[1, 0], [1, 0], [0, 0], [1, 0], [0, 0], [1, 0], [0, 0], [1, 0]].map((a) => a.map(Boolean));
      check(`${w} 키보드: 초점 → Enter 열림 → Enter 닫힘 → Space 열림 → Space 닫힘 → Enter 열림 → Esc 닫힘 → Enter 다시 열림(매번 aria-expanded 일치)`, k.every((s, n) => is(s, kw[n])), JSON.stringify(k));
      await context.close();
    }
    for (const w of [1024, 1280]) {
      // 두 그룹 전환(새 페이지): 회사 소개 열기 → 가공 서비스 누르면 그쪽만 열림
      const { context, page } = await open('', { viewport: { width: w, height: 800 }, reducedMotion: 'reduce' });
      await page.mouse.move(w - 10, 790);
      await page.locator('.gnav [data-submenu-toggle]').nth(0).click(); const g1 = await state(page);
      await page.locator('.gnav [data-submenu-toggle]').nth(1).click(); const g2 = await state(page);
      check(`${w} 두 그룹 전환: 회사 소개 → 가공 서비스를 누르면 가공 서비스만 열림`, is(g1, [true, false]) && is(g2, [false, true]), JSON.stringify({ g1, g2 }));
      await context.close();
    }
  }

  // ---------- 7. 샘플 안내창(전화·메일) ----------
  {
    const { context, page, requests } = await open('quote/');
    const before = requests.length;
    const tel = page.locator('.quote-aside a[data-sample-notice]').last();
    await tel.click();
    const dlg = await page.evaluate(() => ({ open: document.getElementById('sampleDialog').open, msg: document.getElementById('sampleDialogMsg').textContent, url: location.href }));
    check('전화 버튼 → 안내창 열림, 주소 그대로', dlg.open && dlg.msg.includes('샘플 사이트') && dlg.url === `${BASE}quote/`, JSON.stringify(dlg));
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => ({ open: document.getElementById('sampleDialog').open, focusTel: document.activeElement?.matches('.quote-aside a[data-sample-notice]') }));
    check('Escape로 안내창 닫힘, 누른 버튼으로 초점 복귀', !closed.open && closed.focusTel, JSON.stringify(closed));
    await page.locator('#f-memo-hint a[data-sample-notice]').click({ force: true }).catch(() => {});
    // fieldset 잠금이 풀린 뒤라 메일 링크도 눌린다
    const mail = await page.evaluate(() => document.getElementById('sampleDialog').open);
    if (mail) await page.click('#sampleDialog button[type=submit]');
    const mailClosed = await page.evaluate(() => document.getElementById('sampleDialog').open);
    check('메일 주소 링크 → 안내창, [확인]으로 닫힘', mail && !mailClosed);
    check('안내창 동작 중 네트워크 요청 0건', requests.length === before, requests.slice(before).map((r) => r.url).join(','));
    check('전역 측정 객체 없음(기업은 이벤트 미연결)', await page.evaluate(() => typeof window.sampleTrack === 'undefined' && typeof window.dataLayer === 'undefined' && typeof window.gtag === 'undefined'));
    await context.close();
  }

  // ---------- 8. 사례 필터 ----------
  {
    const { context, page } = await open('cases/', { reducedMotion: 'reduce' });
    const count = async () => page.evaluate(() => ({ n: Number(document.querySelector('[data-case-count]').textContent), shown: document.querySelectorAll('[data-case]:not([hidden])').length, empty: !document.querySelector('[data-case-empty]').hidden }));
    let c = await count();
    check('사례 처음 9건 모두 표시, 0건 안내 숨김', c.n === 9 && c.shown === 9 && !c.empty, JSON.stringify(c));
    const chip = (g, v) => page.click(`[data-filter-group="${g}"] .chip[data-value="${v}"]`);
    await chip('material', '알루미늄'); c = await count();
    const pressed = await page.$eval('[data-filter-group="material"] .chip[data-value="알루미늄"]', (b) => b.getAttribute('aria-pressed'));
    check('소재=알루미늄 → 3건, aria-pressed=true', c.n === 3 && c.shown === 3 && pressed === 'true', JSON.stringify(c));
    await chip('process', '5축 가공'); c = await count();
    check('소재=알루미늄 + 공정=5축 가공 → 1건', c.n === 1 && c.shown === 1, JSON.stringify(c));
    await chip('use', '자동화 설비'); c = await count();
    check('+ 용도=자동화 설비 → 0건, 0건 안내 표시', c.n === 0 && c.shown === 0 && c.empty, JSON.stringify(c));
    await page.click('[data-filter-reset]'); c = await count();
    const allFirst = await page.$$eval('[data-filter-group]', (gs) => gs.every((g) => g.querySelector('.chip').getAttribute('aria-pressed') === 'true' && g.querySelectorAll('.chip[aria-pressed="true"]').length === 1));
    check('[선택 모두 해제] → 9건, 각 줄 "전체"만 선택', c.n === 9 && c.shown === 9 && !c.empty && allFirst, JSON.stringify(c));
    await chip('use', '지그·픽스처'); c = await count();
    await chip('use', ''); const c2 = await count();
    check('용도=지그·픽스처 → 2건, 다시 "전체" → 9건', c.n === 2 && c2.n === 9, `${c.n} → ${c2.n}`);
    await context.close();
  }

  // ---------- 9. 소식: 목록·상세 3건·이전/다음·홈 미리보기 ----------
  {
    const { context, page } = await open('news/');
    const rows = await page.$$eval('.board tbody tr', (trs) => trs.map((tr) => ({ no: tr.querySelector('.c-no')?.textContent, href: tr.querySelector('a')?.getAttribute('href'), t: tr.querySelector('a')?.textContent, d: tr.querySelector('.c-date')?.textContent })));
    check('소식 목록 3건(번호 3·2·1, 최신순)', rows.length === 3 && rows.map((r) => r.no).join() === '3,2,1' && rows[0].d === '2026-10-14' && rows[2].d === '2026-02-09', JSON.stringify(rows.map((r) => `${r.no} ${r.d} ${r.t}`)));
    check('앞날짜(오늘 이후) 소식 없음', rows.every((r) => r.d <= new Date().toISOString().slice(0, 10)), rows.map((r) => r.d).join());
    check('목록 링크가 안내창이 아니라 상세 주소', rows.every((r) => r.href?.startsWith('/company-01/news/') && r.href.length > '/company-01/news/'.length));
    const detail = [];
    for (const r of rows) {
      const res = await page.goto(ORIGIN + r.href, { waitUntil: 'networkidle' });
      detail.push(await page.evaluate(() => ({
        h1: document.querySelector('.article h1')?.textContent,
        body: document.querySelectorAll('.article__body p').length,
        next: document.querySelector('.article__nav a:first-child .t')?.textContent ?? document.querySelector('.article__nav > :first-child')?.textContent.trim(),
        prev: [...document.querySelectorAll('.article__nav > *')][1]?.textContent.trim(),
        frame: document.body.dataset.frame,
      })));
      detail.at(-1).status = res.status();
      detail.at(-1).expect = r.t;
    }
    check('상세 3건 모두 200, NewsDetail 틀, 제목 일치, 본문 있음', detail.every((d) => d.status === 200 && d.frame === 'NewsDetail' && d.h1 === d.expect && d.body >= 3), JSON.stringify(detail.map((d) => [d.status, d.h1, d.body])));
    check('가장 최근 글: 다음 글 없음 / 이전 글 = 품질경영', detail[0].next.includes('다음 글이 없습니다') && detail[0].prev.includes('품질경영시스템'), `${detail[0].next} | ${detail[0].prev}`);
    check('가운데 글: 다음 = 5축 / 이전 = 설 연휴', detail[1].next.includes('5축 머시닝센터') && detail[1].prev.includes('설 연휴 휴무 안내'), `${detail[1].next} | ${detail[1].prev}`);
    check('가장 오래된 글: 이전 글 없음', detail[2].prev.includes('이전 글이 없습니다') && detail[2].next.includes('품질경영시스템'), `${detail[2].next} | ${detail[2].prev}`);
    await page.goto(`${BASE}news/seollal-holiday/`);
    await page.click('.article__nav a:first-child');
    await page.waitForLoadState('networkidle');
    check('상세 [다음 글] 누르면 해당 상세로 이동', page.url() === `${BASE}news/quality-certification-renewal/`, page.url());
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const home = await page.$$eval('.news-simple a', (as) => as.map((a) => a.getAttribute('href')));
    check('홈 최근 소식 3건이 상세 주소로 연결', home.length === 3 && home.every((h, i) => h === rows[i].href), home.join(', '));
    await context.close();
  }

  // ---------- 10. 견적 폼: 무효 ----------
  {
    const { context, page, requests, consoleMsgs } = await open('quote/', { viewport: { width: 360, height: 740 } });
    check('JS 켜짐: 폼 잠금 풀림·JS 꺼짐 안내 숨김', await page.evaluate(() => !document.querySelector('[data-sample-lock]').disabled && document.querySelector('[data-sample-js-off]').hidden && getComputedStyle(document.querySelector('[data-sample-js-off]')).display === 'none'));
    const fields = await page.$$eval('#quoteForm input:not([type=checkbox]), #quoteForm textarea, #quoteForm select', (a) => a.map((x) => x.id));
    check('입력 5개(회사명·이름·연락처·품목수량·요청사항), 첨부 없음', fields.join() === 'f-company,f-name,f-contact,f-item,f-memo' && !(await page.$('#quoteForm input[type=file]')), fields.join(','));
    check('폼 안 입력·동의에 name 속성 없음', await page.$$eval('#quoteForm input, #quoteForm textarea', (a) => a.every((x) => !x.hasAttribute('name'))));
    const before = requests.length;
    await page.click('#quoteForm button[type=submit]');
    const st = await page.evaluate(() => ({
      errs: [...document.querySelectorAll('#quoteForm .field.has-error')].map((f) => f.id),
      req: document.getElementById('consent-required-box').classList.contains('has-error'),
      focus: document.activeElement?.id, inv: document.getElementById('f-company').getAttribute('aria-invalid'),
      summary: document.getElementById('formSummary').textContent, result: document.getElementById('formResult').classList.contains('is-visible'),
    }));
    check('빈 제출: 회사명·연락처·품목 오류 + 필수 동의 오류 + 요약, 회사명으로 초점, aria-invalid', st.errs.join() === 'f-company-wrap,f-contact-wrap,f-item-wrap' && st.req && st.focus === 'f-company' && st.inv === 'true' && st.summary.includes('4개') && !st.result, JSON.stringify(st));
    await page.fill('#f-company', T.company);
    await page.fill('#f-contact', '12345');
    await page.fill('#f-item', T.item);
    await page.check('#c-required');
    await page.click('#quoteForm button[type=submit]');
    const fmt = await page.evaluate(() => ({ err: document.getElementById('f-contact-err').textContent, focus: document.activeElement?.id }));
    check('연락처 형식 오류(숫자 8자리 미만) → 오류·초점', fmt.err.includes('형식') && fmt.focus === 'f-contact', JSON.stringify(fmt));
    await page.fill('#f-contact', 'abc@');
    await page.click('#quoteForm button[type=submit]');
    check('연락처 이메일 형식 오류(abc@) 차단', (await page.evaluate(() => document.activeElement?.id)) === 'f-contact');
    await page.fill('#f-contact', T.phone);
    await page.fill('#f-name', T.name);
    await page.click('#quoteForm button[type=submit]');
    const nm = await page.evaluate(() => ({ box: document.getElementById('consent-name-box').classList.contains('has-error'), focus: document.activeElement?.id, result: document.getElementById('formResult').classList.contains('is-visible') }));
    check('이름 입력 + [선택] 이름 동의 없음 → 차단, 이름 동의로 초점', nm.box && nm.focus === 'c-name' && !nm.result, JSON.stringify(nm));
    await page.fill('#f-name', '');
    await page.uncheck('#c-required');
    await page.click('#quoteForm button[type=submit]');
    const rq = await page.evaluate(() => ({ box: document.getElementById('consent-required-box').classList.contains('has-error'), focus: document.activeElement?.id, nameBox: document.getElementById('consent-name-box').classList.contains('has-error') }));
    check('[필수] 동의 해제 → 차단·초점, 이름을 비우면 이름 동의 오류 없음', rq.box && rq.focus === 'c-required' && !rq.nameBox, JSON.stringify(rq));
    const max = await page.$$eval('#quoteForm input:not([type=checkbox]), #quoteForm textarea', (a) => a.map((x) => x.maxLength));
    check('모든 입력 칸에 글자 수 상한(maxlength)', max.every((m) => m > 0), max.join(','));
    // 입력한 글자용 글꼴(대체 경로 CSS·조각 woff2) 정적 GET만 허용(INNA-653). 그 밖의 요청·쿼리·본문은 0건
    const extra = requests.slice(before).filter((r) => !(r.method === 'GET' && !r.post && !new URL(r.url).search && /^\/company-01\/fonts\/pretendard\/.+\.(woff2|css)$/.test(new URL(r.url).pathname)));
    check('무효 제출 동안 글꼴 파일 외 네트워크 요청 0건·주소 그대로', extra.length === 0 && page.url() === `${BASE}quote/`, extra.map((r) => `${r.method} ${r.url}`).join(','));
    check('콘솔에 입력값 없음', !consoleMsgs.some((m) => Object.values(T).some((v) => m.includes(v)) || m.includes('12345')));
    await context.close();
  }

  // ---------- 10-1. (INNA-644 UX-03) 오류 요약이 칸을 고칠 때마다 개수·문구가 맞고 0개면 숨김, 입력 중 초점 유지, 실패 시 값 보존 ----------
  {
    const { context, page, requests } = await open('quote/', { viewport: { width: 360, height: 740 } });
    const before = requests.length;
    const sum = () => page.evaluate(() => {
      const s = document.getElementById('formSummary');
      return { vis: s.classList.contains('is-visible') && getComputedStyle(s).display !== 'none', text: s.textContent, n: Number((s.textContent.match(/(\d+)개/) ?? [])[1] ?? 0), errs: document.querySelectorAll('#quoteForm .has-error').length, inv: document.querySelectorAll('#quoteForm [aria-invalid="true"]').length, focus: document.activeElement?.id };
    });
    await page.click('#quoteForm button[type=submit]');
    const s0 = await sum();
    await page.focus('#f-company');
    await page.keyboard.type(T.company);
    const s1 = await sum();
    check('견적 요약: 빈 제출 4개 → 회사명을 입력하면 바로 3개, 칸별 오류·aria-invalid도 3개, 초점은 회사명 그대로', s0.vis && s0.n === 4 && s1.vis && s1.n === 3 && s1.errs === 3 && s1.inv === 3 && s1.focus === 'f-company' && !s1.text.includes('회사명을'), JSON.stringify({ s0, s1 }));
    await page.focus('#f-contact');
    await page.keyboard.type('12');
    const s2 = await sum();
    await page.keyboard.type('-3456-7890');
    const s3 = await sum();
    check('견적 요약: 연락처를 치는 중 형식 오류 문구로 바뀌고(3개 유지), 올바르게 고치면 2개, 초점은 연락처 그대로', s2.n === 3 && s2.text.includes('형식') && s3.n === 2 && !s3.text.includes('전화번호') && s3.focus === 'f-contact', JSON.stringify({ s2, s3 }));
    await page.focus('#f-item');
    await page.keyboard.type(T.item);
    await page.focus('#f-name');
    await page.keyboard.type(T.name);
    const s4 = await sum();
    check('견적 요약: 품목을 채우면 1개, 이름을 입력하면 [선택] 이름 동의 문제가 더해져 2개(요약이 떠 있는 동안 실시간)', s4.vis && s4.n === 2 && s4.text.includes('이름 동의') && s4.text.includes('[필수]'), JSON.stringify(s4));
    await page.fill('#f-name', '');
    const s5 = await sum();
    await page.check('#c-required');
    const s6 = await sum();
    check('견적 요약: 이름을 지우면 이름 동의 문제가 사라지고, [필수] 동의에 체크하면 0개 → 요약 비우고 숨김, 오류·aria-invalid 0', s5.n === 1 && !s5.text.includes('이름 동의') && !s6.vis && s6.text === '' && s6.errs === 0 && s6.inv === 0 && s6.focus === 'c-required', JSON.stringify({ s5, s6 }));
    await page.fill('#f-company', '');
    const s7 = await sum();
    check('견적 요약: 숨긴 뒤 다른 칸을 비워도 다시 제출하기 전에는 요약이 나타나지 않음', !s7.vis && s7.errs === 0, JSON.stringify(s7));
    await page.click('#quoteForm button[type=submit]');
    const s8 = await sum();
    const kept = await page.evaluate(() => ({ contact: document.getElementById('f-contact').value.length, item: document.getElementById('f-item').value.length, req: document.getElementById('c-required').checked, result: document.getElementById('formResult').classList.contains('is-visible') }));
    check('견적 재제출: 1개·회사명으로 초점, 나머지 입력값·필수 동의는 지우지 않고 보존, 완료 안내 없음', s8.vis && s8.n === 1 && s8.focus === 'f-company' && kept.contact > 0 && kept.item > 0 && kept.req && !kept.result, JSON.stringify({ s8, kept }));
    check('견적 요약 검사 동안 네트워크 요청 0건·주소 그대로', requests.slice(before).filter((r) => !/^\/company-01\/fonts\/.+\.(woff2|css)$/.test(new URL(r.url).pathname)).length === 0 && page.url() === `${BASE}quote/`);
    await context.close();
  }

  // ---------- 10-2. (INNA-644 UX-04) 사례·견적 제목 단계: h1 다음이 h2, 단계 건너뜀 없음 ----------
  for (const path of ['cases/', 'quote/']) {
    const { context, page } = await open(path);
    const lv = await page.$$eval('main h1, main h2, main h3, main h4, main h5, main h6', (a) => a.map((h) => Number(h.tagName[1])));
    const skip = lv.some((l, i) => i > 0 && l > lv[i - 1] + 1);
    check(`${path} 제목 단계 건너뜀 없음(h1 다음 h2)`, lv[0] === 1 && lv[1] === 2 && !skip, lv.join(','));
    await context.close();
  }

  // ---------- 10-3. (INNA-644 성능·내용) 가공 서비스 첫 그림 지연 로딩 해제, 인증 갱신 연도 일치 ----------
  {
    const { context, page } = await open('services/', { viewport: { width: 412, height: 823 } });
    const imgs = await page.$$eval('main img', (a) => a.map((i) => ({ src: i.getAttribute('src').split('/').pop(), loading: i.getAttribute('loading'), fp: i.getAttribute('fetchpriority'), dec: i.getAttribute('decoding'), reveal: Boolean(i.closest('[data-reveal]')), top: i.getBoundingClientRect().top })));
    check('services: 첫 화면 그림 field-1은 지연 로딩·등장 효과 없음 + fetchpriority=high·decoding=sync, 그 아래 그림은 모두 지연 로딩', imgs[0].src === 'field-1.svg' && !imgs[0].loading && imgs[0].fp === 'high' && imgs[0].dec === 'sync' && !imgs[0].reveal && imgs[0].top < 823 && imgs.slice(1).every((i) => i.loading === 'lazy' && !i.fp && !i.dec), JSON.stringify(imgs.slice(0, 3)));
    await page.goto(BASE);
    const hero = await page.$eval('.hero img', (i) => ({ loading: i.getAttribute('loading'), fp: i.getAttribute('fetchpriority'), dec: i.getAttribute('decoding'), reveal: Boolean(i.closest('[data-reveal]')) }));
    check('홈: 첫 화면 그림 hero는 지연 로딩·등장 효과 없음 + fetchpriority=high·decoding=sync', !hero.loading && hero.fp === 'high' && hero.dec === 'sync' && !hero.reveal, JSON.stringify(hero));
    await page.goto(`${BASE}about/`);
    const fac = await page.$eval('img[src$="factory.svg"]', (i) => ({ loading: i.getAttribute('loading'), fp: i.getAttribute('fetchpriority'), dec: i.getAttribute('decoding'), reveal: Boolean(i.closest('[data-reveal]')), top: i.getBoundingClientRect().top }));
    check('회사 소개: 첫 화면 그림 factory는 지연 로딩·등장 효과 없음 + fetchpriority=high·decoding=sync', !fac.loading && fac.fp === 'high' && fac.dec === 'sync' && !fac.reveal && fac.top < 823, JSON.stringify(fac));
    await page.goto(`${BASE}about/`);
    const cert = await page.$eval('.cert', (e) => e.textContent.replace(/\s+/g, ' '));
    await page.goto(`${BASE}news/quality-certification-renewal/`);
    const date = await page.$eval('main time', (e) => e.getAttribute('datetime') ?? e.textContent).catch(() => '');
    check('회사 소개 인증 카드 갱신 연도(2026)가 인증 갱신 공지 날짜(2026-09-02)와 일치, 가상 표기 유지', cert.includes('2026년 갱신') && cert.includes('가상') && !cert.includes('2025') && date.startsWith('2026'), `${cert} / ${date}`);
    await context.close();
  }

  // ---------- 11. 견적 폼: 유효(전화·이메일) → 샘플 안내, 입력값 지움, 전송·저장 없음 ----------
  for (const contact of [T.phone, T.mail]) {
    const { context, page, requests, consoleMsgs } = await open('quote/', { viewport: { width: 1280, height: 900 } });
    const before = requests.length;
    await page.fill('#f-company', T.company);
    await page.fill('#f-name', T.name);
    await page.fill('#f-contact', contact);
    await page.fill('#f-item', T.item);
    await page.fill('#f-memo', T.memo);
    await page.check('#c-required');
    await page.check('#c-name');
    await page.focus('#f-item');
    await page.keyboard.press('Enter');
    const done = await page.evaluate(() => ({
      result: document.getElementById('formResult').classList.contains('is-visible'),
      text: document.getElementById('formResult').textContent,
      focus: document.activeElement?.id,
      values: [...document.querySelectorAll('#quoteForm input:not([type=checkbox]), #quoteForm textarea')].map((x) => x.value).join(''),
      checks: [...document.querySelectorAll('#quoteForm input[type=checkbox]')].some((x) => x.checked),
      errs: document.querySelectorAll('#quoteForm .has-error').length,
    }));
    const tagC = contact.includes('@') ? '이메일' : '전화';
    check(`유효(${tagC}) Enter 제출 → "실제로 전송되지 않습니다" 안내, 안내로 초점`, done.result && done.text.includes('실제로 전송되지 않습니다') && done.text.includes('접수 알림') && done.focus === 'formResult' && done.errs === 0, JSON.stringify({ ...done, text: done.text.trim().slice(0, 40) }));
    check(`유효(${tagC}): 입력값·동의 체크 즉시 지움`, done.values === '' && !done.checks);
    const html = await page.content();
    // 입력한 글자를 그리려고 글꼴 조각(woff2)·대체 경로 CSS(입력 칸 초점 때 연결, INNA-653)를 받는 GET은 정적 파일 요청이라 허용. 그 밖의 요청·쿼리·본문은 0건이어야 한다.
    const sent = requests.slice(before).filter((r) => !(r.method === 'GET' && !r.post && !new URL(r.url).search && /^\/company-01\/fonts\/.+\.(woff2|css)$/.test(new URL(r.url).pathname)));
    check(`유효(${tagC}): 글꼴 파일 외 네트워크 요청 0건, 주소에 쿼리 없음`, sent.length === 0 && page.url() === `${BASE}quote/`, `글꼴 ${requests.length - before - sent.length}건 / 그 외 ${sent.map((r) => `${r.method} ${r.url}`).join(',')}`);
    check(`유효(${tagC}): 저장소·쿠키 비어 있음, 콘솔·HTML에 입력값 없음`, (await storageEmpty(page)) && !consoleMsgs.some((m) => Object.values(T).some((v) => m.includes(v))) && !Object.values(T).some((v) => html.includes(v)));
    if (contact === T.phone) {
      // 완료 안내가 보이는 상태(초점이 안내 상자로 가며 화면에 들어옴)를 먼저 찍는다
      await page.screenshot({ path: `${OUT}quote-done-1280.png` });
      await page.fill('#f-company', 'x');
      check('다시 입력하면 안내 상자 숨김', !(await page.evaluate(() => document.getElementById('formResult').classList.contains('is-visible'))));
    }
    await context.close();
  }

  // ---------- 12. JS 비활성 ----------
  {
    const { context, page, requests } = await open('quote/', { javaScriptEnabled: false });
    const st = await page.evaluate(() => ({ locked: document.querySelector('[data-sample-lock]').disabled, off: getComputedStyle(document.querySelector('[data-sample-js-off]')).display !== 'none' }));
    check('JS 꺼짐: 폼 fieldset 잠김, 안내 보임', st.locked && st.off, JSON.stringify(st));
    const before = requests.length;
    await page.click('#f-company', { force: true, timeout: 2000 }).catch(() => {});
    await page.keyboard.type(T.company);
    await page.keyboard.press('Enter');
    await page.click('#quoteForm button[type=submit]', { force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    check('JS 꺼짐: 입력·Enter·제출 시도해도 요청 0건·주소 그대로', requests.length === before && page.url() === `${BASE}quote/`, page.url());
    await page.goto(`${BASE}cases/`);
    const cs = await page.evaluate(() => ({ filter: getComputedStyle(document.querySelector('[data-case-filter]')).display, cards: [...document.querySelectorAll('[data-case]')].filter((c) => c.getBoundingClientRect().height > 0).length }));
    check('JS 꺼짐: 사례 9건 모두 보이고 동작하지 않는 필터는 숨김', cs.cards === 9 && cs.filter === 'none', JSON.stringify(cs));
    await page.goto(BASE);
    const vis = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].every((e) => getComputedStyle(e).opacity === '1'));
    check('JS 꺼짐: 등장 효과 대상도 모두 보임', vis);
    await context.close();
  }
  // (INNA-644 UX-06) JS 꺼짐·사이트 스크립트 실패 시 모바일 머리말: 동작하지 않는 메뉴 버튼 대신 펼친 메뉴 목록
  const navFallback = (page) => page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
    return {
      js: document.documentElement.classList.contains('js'),
      toggle: vis(document.querySelector('.menu-toggle')),
      groupBtns: [...document.querySelectorAll('.gnav [data-submenu-toggle]')].filter(vis).length,
      links: [...document.querySelectorAll('.gnav a')].filter(vis).map((a) => a.getAttribute('href').replace('/company-01/', '')),
      over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const NAV_HREFS = ['about/', 'about/#history', 'services/', 'cases/', 'services/#equipment', 'services/#quality', 'news/', 'about/#access', 'quote/'];
  for (const w of [360, 768]) {
    const { context, page } = await open('services/', { viewport: { width: w, height: 800 }, javaScriptEnabled: false });
    const nf = await navFallback(page);
    check(`JS 꺼짐 ${w}: 메뉴 버튼 숨김, 머리말에 메뉴 링크 9개 모두 보이는 목록, 가로 넘침 없음`, !nf.js && !nf.toggle && nf.groupBtns === 0 && NAV_HREFS.every((h) => nf.links.includes(h)) && !nf.over, JSON.stringify(nf));
    await Promise.all([page.waitForURL(`${BASE}about/`), page.click('.gnav a[href="/company-01/about/"]')]);
    check(`JS 꺼짐 ${w}: 목록 링크로 실제 이동`, page.url() === `${BASE}about/`);
    await context.close();
  }
  {
    // 사이트 스크립트가 실행 중 실패하면(matchMedia 오류로 흉내) load 뒤 펼친 목록으로 되돌림
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    await context.addInitScript(() => { window.matchMedia = () => { throw new Error('smoke: 스크립트 실패 흉내'); }; });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    const nf = await navFallback(page);
    check('스크립트 실패 360: 메뉴 버튼 숨김, 메뉴 링크 9개 모두 보이는 목록', !nf.js && !nf.toggle && NAV_HREFS.every((h) => nf.links.includes(h)), JSON.stringify(nf));
    await context.close();
    const ok = await open('', { viewport: { width: 360, height: 740 } });
    const nj = await navFallback(ok.page);
    check('JS 켜짐 360: html.js + 메뉴 준비 표시, 메뉴 버튼만 보이고 목록은 접힘', nj.js && nj.toggle && nj.links.length === 0 && (await ok.page.$('[data-menu-ready]')) !== null, JSON.stringify(nj));
    await ok.context.close();
  }

  // ---------- 13. 움직임 줄이기·등장 효과 ----------
  {
    const r = await open('', { reducedMotion: 'reduce' });
    check('reduced-motion: 등장 효과 꺼짐(js-reveal 없음)', !(await r.page.evaluate(() => document.documentElement.classList.contains('js-reveal'))));
    await r.context.close();
    const n = await open('', { reducedMotion: 'no-preference' });
    const on = await n.page.evaluate(() => document.documentElement.classList.contains('js-reveal'));
    await n.page.waitForTimeout(2700);
    const allIn = await n.page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].every((e) => e.classList.contains('is-in')));
    check('기본: 등장 효과 켜짐, 2.5초 안전장치 뒤 모두 표시', on && allIn);
    await n.context.close();
  }

  // ---------- 14. 키보드: 본문 건너뛰기 ----------
  {
    const { context, page } = await open('services/');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ cls: document.activeElement?.className, top: document.activeElement?.getBoundingClientRect().top }));
    await page.keyboard.press('Enter');
    const main = await page.evaluate(() => document.activeElement?.id);
    check('첫 Tab = 본문으로 바로가기(화면에 보임) → #main', first.cls === 'skip-link' && first.top >= 0 && main === 'main', JSON.stringify({ ...first, main }));
    await context.close();
  }

  // ---------- 15. 404 ----------
  {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const r = await p.goto(`${BASE}no-such-page/`);
    check('없는 주소 404 응답', r.status() === 404);
    const links = await p.$$eval('a', (as) => as.map((a) => a.getAttribute('href')));
    check('루트 404에 company-01 시작 링크', links.includes('/company-01/'), links.join(','));
    const r2 = await p.goto(`${BASE}404.html`);
    const home = await p.getAttribute('.page-head ~ .section a.btn--primary', 'href');
    check('company-01 404 화면(/company-01/404.html)', r2.status() === 200 && home === '/company-01/', home);
    await ctx.close();
  }
} catch (e) {
  check('smoke 실행 오류 없음', false, e.stack);
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
const summary = { site: 'company-01', startedAt, finishedAt: new Date().toISOString(), browser: `chromium ${browser.version()} headless (Playwright)`, total: results.length, passed: results.length - failed.length, failed: failed.length, results };
writeFileSync(`${OUT}smoke.json`, JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed}/${summary.total} 통과 → qa-output/company-01/smoke.json`);
process.exit(failed.length ? 1 : 0);
