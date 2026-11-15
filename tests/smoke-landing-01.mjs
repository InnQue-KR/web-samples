// landing-01 핵심 동작 smoke (Playwright Chromium headless). 먼저 npm run build.
// 결과: qa-output/landing-01/smoke.json, 화면 PNG. 하나라도 실패하면 종료 코드 1.
// Chromium 자동화 결과이며 iPhone/Safari 실기기·화면낭독기 확인을 대신하지 않는다.
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { startServer } from '../scripts/serve-dist.mjs';

const OUT = new URL('../qa-output/landing-01/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const server = await startServer(0);
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const URL0 = `${ORIGIN}/landing-01/`;
const TEST_PHONE = '010-1234-5678'; // 합성 테스트 값(실존 번호 아님)
const TEST_NAME = '테스트보호자';
const TEST_Q = '합성테스트문구';

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const browser = await chromium.launch();
const startedAt = new Date().toISOString();

async function open(opts = {}) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, ...opts });
  const page = await context.newPage();
  const requests = [];
  const consoleMsgs = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), post: r.postData() }));
  page.on('console', (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consoleMsgs.push(`pageerror: ${e.message}`));
  const responses = [];
  page.on('response', (r) => responses.push({ url: r.url(), status: r.status() }));
  await page.goto(URL0, { waitUntil: 'networkidle' });
  return { context, page, requests, responses, consoleMsgs };
}

try {
  // ---------- 1. 로드·자원·구역 ----------
  {
    const { context, page, requests, responses, consoleMsgs } = await open();
    const ext = requests.filter((r) => !r.url.startsWith(ORIGIN));
    check('외부 요청 0건', ext.length === 0, ext.map((r) => r.url).join(', '));
    const outside = requests.filter((r) => r.url.startsWith(ORIGIN) && !new URL(r.url).pathname.startsWith('/landing-01/'));
    check('모든 자원이 /landing-01/ 아래', outside.length === 0, outside.map((r) => r.url).join(', '));
    const bad = responses.filter((r) => r.status >= 400);
    check('자원 응답 모두 200대', bad.length === 0, bad.map((r) => `${r.status} ${r.url}`).join(', '));
    const ids = await page.$$eval('main > section', (s) => s.map((x) => x.id));
    check('8개 구역 순서', JSON.stringify(ids) === JSON.stringify(['top', 'method', 'classes', 'teachers', 'process', 'faq', 'location', 'apply']), ids.join(','));
    check('noindex,nofollow', (await page.getAttribute('meta[name=robots]', 'content')) === 'noindex, nofollow');
    const strip = await page.$eval('[data-sample-strip]', (e) => ({ t: e.textContent, y: e.getBoundingClientRect().top }));
    check('샘플 띠가 맨 위(y=0)', strip.y === 0 && strip.t.includes('샘플 사이트'), JSON.stringify(strip));
    check('바닥글 AI·가상 고지', (await page.textContent('.site-footer__notice')).includes('AI를 활용'));
    await page.evaluate(() => document.fonts.ready);
    const font = await page.evaluate(() => ({ check: document.fonts.check('800 16px "Pretendard Variable"', '셈틈 막힌 곳'), family: getComputedStyle(document.body).fontFamily }));
    const fontReqs = requests.filter((r) => r.url.endsWith('.woff2'));
    check('Pretendard Variable 로드', font.check && fontReqs.length > 0, `woff2 ${fontReqs.length}개 요청, family=${font.family.slice(0, 40)}`);
    const fontNames = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
    check('로드된 글꼴은 Pretendard Variable만', fontNames.every((f) => f.replace(/"/g, '') === 'Pretendard Variable'), [...new Set(fontNames)].join(','));
    const logo = await page.$eval('.site-header__logo img', (i) => ({ ok: i.complete && i.naturalWidth > 0, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height }));
    check('로고 이미지 표시', logo.ok && logo.h > 20, JSON.stringify(logo));
    const imgs = await page.$$eval('img', (a) => a.map((i) => ({ src: i.getAttribute('src'), ok: i.complete ? i.naturalWidth > 0 : null })));
    check('img 깨짐 없음(로드된 것 기준)', imgs.every((i) => i.ok !== false), JSON.stringify(imgs.filter((i) => i.ok === false)));
    const bytesOf = (u) => statSync(new URL(`../dist${new URL(u).pathname.replace(/\/$/, '/index.html')}`, import.meta.url)).size;
    const urls = [...new Set(requests.map((r) => r.url))];
    const total = urls.reduce((s, u) => s + bytesOf(u), 0);
    const fontBytes = fontReqs.reduce((s, r) => s + bytesOf(r.url), 0);
    check('첫 로드 파일 합계 ≤ 1.5MB(압축 전)', total <= 1.5 * 1024 * 1024, `${urls.length}개 ${(total / 1024).toFixed(0)}KB, 그중 글꼴 ${fontReqs.length}개 ${(fontBytes / 1024).toFixed(0)}KB`);
    check('콘솔 오류 없음',!consoleMsgs.some((m) => /^(error|pageerror)/.test(m)), consoleMsgs.join(' | '));
    await context.close();
  }

  // ---------- 2. 반응형 가로 넘침 + 화면 ----------
  for (const w of [320, 360, 390, 768, 1024, 1280, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(URL0, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`${w}px 가로 넘침 없음`, sw <= w, `scrollWidth=${sw}`);
    const sticky = await p.$eval('#sticky-cta', (e) => getComputedStyle(e).display);
    check(`${w}px 하단 고정 CTA ${w < 768 ? '표시' : '숨김'}`, w < 768 ? sticky !== 'none' : sticky === 'none', sticky);
    if (w === 360 || w === 1280) {
      await p.screenshot({ path: `${OUT}first-${w}.png` });
      await p.screenshot({ path: `${OUT}full-${w}.png`, fullPage: true });
    }
    await ctx.close();
  }

  // ---------- 3. 클릭 측정 3종 (메모리) ----------
  {
    const { context, page, requests } = await open();
    const before = requests.length;
    const events = await page.evaluate(() => window.sampleTrack.events());
    check('측정 이벤트 정확히 3종', JSON.stringify(events) === JSON.stringify(['cta_hero_apply', 'cta_sticky_apply', 'cta_phone']), events.join(','));
    check('처음 횟수 0', JSON.stringify(await page.evaluate(() => window.sampleTrack.counts())) === JSON.stringify({ cta_hero_apply: 0, cta_sticky_apply: 0, cta_phone: 0 }));
    await page.click('.hero [data-track=cta_hero_apply]');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    await page.click('#sticky-cta a');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('.site-header [data-track=cta_phone]');
    const toast = await page.textContent('#toast');
    check('전화 버튼은 샘플 안내만', toast.includes('샘플 사이트입니다') && page.url().startsWith(URL0), toast);
    await page.click('#location [data-track=cta_phone]');
    await page.click('.site-header__actions .icon-btn');
    const counts = await page.evaluate(() => window.sampleTrack.counts());
    check('횟수: hero1 sticky1 phone3', JSON.stringify(counts) === JSON.stringify({ cta_hero_apply: 1, cta_sticky_apply: 1, cta_phone: 3 }), JSON.stringify(counts));
    check('측정 중 네트워크 요청 0건', requests.length === before, `${requests.length - before}건`);
    const store = await page.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length, ck: document.cookie }));
    check('저장소·쿠키 비어 있음', store.ls === 0 && store.ss === 0 && store.ck === '', JSON.stringify(store));
    await page.reload({ waitUntil: 'networkidle' });
    const after = await page.evaluate(() => window.sampleTrack.counts());
    check('새로고침 후 0으로 초기화', Object.values(after).every((v) => v === 0), JSON.stringify(after));
    await context.close();
  }

  // ---------- 4. 하단 고정 버튼 접힘 ----------
  {
    const { context, page } = await open();
    check('처음엔 하단 버튼 보임', !(await page.$eval('#sticky-cta', (e) => e.classList.contains('is-hidden'))));
    await page.$eval('#apply', (e) => e.scrollIntoView());
    await page.waitForTimeout(800);
    const st = await page.$eval('#sticky-cta', (e) => ({ hidden: e.classList.contains('is-hidden'), inert: e.inert }));
    check('상담 구역에서 하단 버튼 접힘·inert', st.hidden && st.inert, JSON.stringify(st));
    await context.close();
  }

  // ---------- 5. FAQ·동의 내용 열기 ----------
  {
    const { context, page } = await open({ viewport: { width: 1280, height: 900 } });
    const first = page.locator('.faq-item').first();
    await first.locator('summary').click();
    check('FAQ 클릭으로 열림', await first.evaluate((d) => d.open));
    await first.locator('summary').focus();
    await page.keyboard.press('Enter');
    check('FAQ Enter로 닫힘', !(await first.evaluate((d) => d.open)));
    await page.keyboard.press('Space');
    check('FAQ Space로 열림', await first.evaluate((d) => d.open));
    const consentBox = page.locator('.consent__box');
    await consentBox.locator('summary').click();
    const body = await consentBox.textContent();
    check('개인정보 내용 열림·미전송 설명', (await consentBox.evaluate((d) => d.open)) && body.includes('보내지 않고') && body.includes('저장소'), '');
    await context.close();
  }

  // ---------- 6. 폼: 무효/동의거부/유효/초기화/재시도/키보드 ----------
  {
    const { context, page, requests, consoleMsgs } = await open({ viewport: { width: 1280, height: 900 } });
    const before = requests.length;
    check('JS 켜지면 잠금 해제', !(await page.$eval('fieldset[data-sample-lock]', (f) => f.disabled)) && (await page.$eval('[data-sample-js-off]', (e) => e.hidden)));
    const submit = () => page.click('#apply-form button[type=submit]');
    const summary = () => page.textContent('#form-summary');
    const focusedId = () => page.evaluate(() => document.activeElement?.id);

    await submit();
    check('빈 제출: 오류 2개·요약', (await summary()).includes('2개'), await summary());
    check('빈 제출: 첫 오류(연락처)로 초점', (await focusedId()) === 'f-phone', await focusedId());
    check('빈 제출: aria-invalid', (await page.getAttribute('#f-phone', 'aria-invalid')) === 'true');

    await page.fill('#f-phone', '123');
    await page.check('#f-consent');
    await submit();
    check('잘못된 번호: 형식 오류', (await page.textContent('#f-phone-err')).includes('형식'), await page.textContent('#f-phone-err'));

    await page.fill('#f-phone', TEST_PHONE);
    await page.fill('#f-name', TEST_NAME);
    await submit();
    check('이름만 있고 이름 동의 없음: 차단', (await page.textContent('#f-name-err')).includes('동의') && (await focusedId()) === 'f-name');

    await page.check('#f-name-consent');
    await page.uncheck('#f-consent');
    await submit();
    check('필수 동의 거부: 차단·초점', (await page.textContent('#f-consent-err')).includes('동의') && (await focusedId()) === 'f-consent' && !(await page.isVisible('#form-done')));

    // 키보드로 학년·시간 선택
    await page.focus('#apply-form input[name=grade] >> nth=0');
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    const grade = await page.$eval('#apply-form input[name=grade]:checked', (i) => i.value);
    check('학년 칩 키보드 선택', grade === '중1', grade);
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement.nextElementSibling).outlineStyle);
    check('칩 초점 표시(outline)', ring === 'solid', ring);
    await page.click('#apply-form label.chip:has(input[name=time][value="토요일"])');
    check('시간 칩 클릭 선택', (await page.$eval('#apply-form input[name=time]:checked', (i) => i.value)) === '토요일');
    await page.fill('#f-question', TEST_Q);
    await page.check('#f-consent');
    await page.focus('#f-question');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    check('Tab 순서: 동의 → 내용 열기 → 제출', (await page.evaluate(() => document.activeElement?.textContent?.trim())) === '상담 신청 보내기', await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60)));
    await page.keyboard.press('Enter');
    await page.waitForSelector('#form-done.is-visible');
    check('유효 제출: 샘플 안내 표시', (await page.textContent('#form-done')).includes('실제로 전송되지 않습니다'));
    check('유효 제출: 완료 상자로 초점', (await focusedId()) === 'form-done');
    const vals = await page.evaluate(() => ({ n: document.getElementById('f-name').value, p: document.getElementById('f-phone').value, q: document.getElementById('f-question').value, c: document.getElementById('f-consent').checked, g: document.querySelector('input[name=grade]:checked') }));
    check('유효 제출 후 입력값 지움', !vals.n && !vals.p && !vals.q && !vals.c && !vals.g, JSON.stringify(vals));
    check('주소 변경 없음(쿼리 없음)', page.url() === URL0, page.url());
    const sent = requests.slice(before);
    const leak = sent.filter((r) => [TEST_PHONE, '01012345678', encodeURIComponent(TEST_NAME), TEST_NAME, TEST_Q].some((v) => r.url.includes(v) || (r.post ?? '').includes(v)));
    check('폼 동작 중 네트워크 요청 0건', sent.length === 0 && leak.length === 0, sent.map((r) => `${r.method} ${r.url}`).join(', '));
    const store = await page.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length, ck: document.cookie }));
    check('저장소·쿠키 비어 있음', store.ls === 0 && store.ss === 0 && store.ck === '', JSON.stringify(store));
    check('콘솔에 입력값 없음', !consoleMsgs.some((m) => [TEST_PHONE, TEST_NAME, TEST_Q].some((v) => m.includes(v))), consoleMsgs.join(' | '));
    check('측정 횟수에 접수 없음', !Object.keys(await page.evaluate(() => window.sampleTrack.counts())).some((k) => /submit|done|complete/.test(k)));

    await page.click('#form-reset');
    check('초기화: 폼 다시 보임·성함 칸 초점', (await page.isVisible('#apply-form')) && (await focusedId()) === 'f-name');
    check('초기화: 오류·요약 없음', !(await page.isVisible('#form-summary')) && (await page.$$('#apply-form .has-error')).length === 0);
    await page.fill('#f-phone', '01098765432');
    await page.check('#f-consent');
    await submit();
    check('재시도: 다시 샘플 안내', await page.isVisible('#form-done.is-visible'));
    await page.screenshot({ path: `${OUT}form-done-1280.png` });
    await context.close();
  }

  // ---------- 7. 본문 건너뛰기·초점 ----------
  {
    const { context, page } = await open({ viewport: { width: 1280, height: 900 } });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ cls: document.activeElement?.className, top: document.activeElement?.getBoundingClientRect().top }));
    check('첫 Tab = 본문으로 건너뛰기(화면에 보임)', first.cls === 'skip-link' && first.top >= 0, JSON.stringify(first));
    await page.keyboard.press('Enter');
    check('건너뛰기 후 #main', page.url().endsWith('#main'));
    await context.close();
  }

  // ---------- 8. reduced-motion ----------
  {
    const { context, page } = await open({ reducedMotion: 'reduce' });
    const r = await page.evaluate(() => ({
      motion: document.documentElement.classList.contains('motion'),
      hidden: [...document.querySelectorAll('.reveal, .hero__title .line')].filter((e) => getComputedStyle(e).opacity !== '1').length,
      lines: [...document.querySelectorAll('.step__line')].map((e) => getComputedStyle(e).transform).filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)').length,
      anim: getComputedStyle(document.querySelector('.hero__title .line')).animationName,
    }));
    check('reduced-motion: 효과 꺼짐·내용 모두 보임', !r.motion && r.hidden === 0 && r.lines === 0 && r.anim === 'none', JSON.stringify(r));
    await context.close();
    const n = await open();
    const m = await n.page.evaluate(() => ({ motion: document.documentElement.classList.contains('motion'), anim: getComputedStyle(document.querySelector('.hero__title .line')).animationName }));
    check('기본 모드: 효과 켜짐', m.motion && m.anim !== 'none', JSON.stringify(m));
    await n.context.close();
  }

  // ---------- 9. JS 비활성 ----------
  {
    const { context, page, requests } = await open({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const before = requests.length;
    const s = await page.evaluate(() => ({ locked: document.querySelector('fieldset[data-sample-lock]').disabled, msg: !document.querySelector('[data-sample-js-off]').hidden }));
    check('JS 꺼짐: 폼 잠김·안내 보임', s.locked && s.msg, JSON.stringify(s));
    await page.click('#f-phone', { force: true }).catch(() => {});
    await page.keyboard.type(TEST_PHONE);
    await page.keyboard.press('Enter');
    await page.click('#apply-form button[type=submit]', { force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
    const after = requests.slice(before);
    check('JS 꺼짐: 전송·주소 변경 없음', after.length === 0 && page.url() === URL0, `${after.map((r) => r.url).join(', ')} url=${page.url()}`);
    check('JS 꺼짐: 내용·CTA 보임', (await page.isVisible('.hero [data-track=cta_hero_apply]')) && (await page.isVisible('#faq')));
    await context.close();
  }

  // ---------- 10. 404 ----------
  {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const r = await p.goto(`${URL0}no-such-page/`);
    check('없는 주소 404 응답', r.status() === 404);
    const r2 = await p.goto(`${URL0}404.html`);
    const home = await p.getAttribute('a.btn', 'href');
    check('landing-01 404 페이지(/landing-01/404.html)', r2.status() === 200 && home === '/landing-01/', home);
    await ctx.close();
  }
} catch (e) {
  check('예외 없이 완료', false, e.stack);
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(`${OUT}smoke.json`, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), browser: `chromium ${browser.version()}`, total: results.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} 통과 → qa-output/landing-01/smoke.json`);
process.exit(failed.length ? 1 : 0);
