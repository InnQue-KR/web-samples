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
    await context.close();
  }

  // ---------- 2. 글꼴·로고 ----------
  {
    const { context, page, requests } = await open('services/');
    await page.evaluate(() => document.fonts.ready);
    const fams = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))]);
    check('로드된 글꼴은 Pretendard Variable·IBM Plex Mono만', fams.length > 0 && fams.every((f) => ['Pretendard Variable', 'IBM Plex Mono'].includes(f)) && fams.includes('IBM Plex Mono'), fams.join(','));
    const woff = requests.filter((r) => r.url.endsWith('.woff2')).map((r) => new URL(r.url).pathname);
    check('글꼴 파일은 /company-01/fonts/ 아래 공식 파일', woff.length > 0 && woff.every((p) => p.startsWith('/company-01/fonts/pretendard/') || p.startsWith('/company-01/fonts/plex-mono/')), `${woff.length}개`);
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
    check('소식 목록 3건(번호 3·2·1, 최신순)', rows.length === 3 && rows.map((r) => r.no).join() === '3,2,1' && rows[0].d === '2027-01-25' && rows[2].d === '2026-09-02', JSON.stringify(rows.map((r) => `${r.no} ${r.d} ${r.t}`)));
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
    check('가장 최근 글: 다음 글 없음 / 이전 글 = 5축', detail[0].next.includes('다음 글이 없습니다') && detail[0].prev.includes('5축 머시닝센터'), `${detail[0].next} | ${detail[0].prev}`);
    check('가운데 글: 다음 = 설 연휴 / 이전 = 품질경영', detail[1].next === '설 연휴 휴무 안내' && detail[1].prev.includes('품질경영시스템'), `${detail[1].next} | ${detail[1].prev}`);
    check('가장 오래된 글: 이전 글 없음', detail[2].prev.includes('이전 글이 없습니다') && detail[2].next.includes('5축'), `${detail[2].next} | ${detail[2].prev}`);
    await page.goto(`${BASE}news/5-axis-machining-center/`);
    await page.click('.article__nav a:first-child');
    await page.waitForLoadState('networkidle');
    check('상세 [다음 글] 누르면 해당 상세로 이동', page.url() === `${BASE}news/seollal-holiday/`, page.url());
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
    check('무효 제출 동안 네트워크 요청 0건·주소 그대로', requests.length === before && page.url() === `${BASE}quote/`);
    check('콘솔에 입력값 없음', !consoleMsgs.some((m) => Object.values(T).some((v) => m.includes(v)) || m.includes('12345')));
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
    // 안내 문구를 그리려고 글꼴 조각(woff2)을 더 받는 GET은 정적 파일 요청이라 허용. 그 밖의 요청·쿼리·본문은 0건이어야 한다.
    const sent = requests.slice(before).filter((r) => !(r.method === 'GET' && !r.post && !new URL(r.url).search && /^\/company-01\/fonts\/.+\.woff2$/.test(new URL(r.url).pathname)));
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
