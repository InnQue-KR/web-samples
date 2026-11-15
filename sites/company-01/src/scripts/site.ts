/**
 * 모든 페이지 공통 동작: 모바일 메뉴, 하위 메뉴, 샘플 안내창, 등장 효과.
 * 네트워크 요청·저장소·쿠키를 쓰지 않는다. data-track 속성은 표시용이며 이벤트를 연결하지 않는다(기업 DELUXE 범위 밖).
 */
const $ = <T extends Element>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

/* 1) 모바일 메뉴 + 하위 메뉴 (1023px 이하는 눌러서 펼침, 그 위는 hover/포커스)
 *  - 펼침 메뉴가 열린 동안 머리말 밖(본문 건너뛰기·샘플 띠·본문·바닥글)은 inert: 초점이 메뉴 뒤 가려진 본문으로 가지 않는다.
 *    닫기·Esc·링크 이동·1024 경계 넘기·뒤로 가기 복원 때 모두 setMenu(false)로 inert와 스크롤 잠금을 함께 푼다.
 *  - 데스크톱 하위 메뉴는 CSS :hover/:focus-within으로 열린다. Esc를 누르면 li.is-dismissed로 숨기고,
 *    포인터와 초점이 모두 그 메뉴를 벗어나거나 다시 명시적으로 열 때(클릭·포인터 진입) 해제한다.
 *    aria-expanded는 실제 표시 여부(계산된 display)를 그대로 따른다.
 *  - JS가 없으면 html.js가 없어 CSS가 메뉴를 펼친 목록으로 보여 준다. 여기까지 오면 data-menu-ready를 붙인다(머리 인라인 스크립트가 확인). */
const header = $<HTMLElement>('[data-component="SiteHeader"]');
const toggle = $<HTMLButtonElement>('.menu-toggle');
const mobile = window.matchMedia('(max-width: 1023px)');
if (header && toggle) {
  const groups = $$<HTMLLIElement>('.gnav li').filter((li) => $('[data-submenu-toggle]', li));
  const btnOf = (li: HTMLLIElement) => $<HTMLButtonElement>('[data-submenu-toggle]', li)!;
  const shown = (li: HTMLLIElement) => getComputedStyle($<HTMLElement>('.submenu', li)!).display !== 'none';
  const sync = () => groups.forEach((li) => btnOf(li).setAttribute('aria-expanded', String(shown(li))));
  let inerted: HTMLElement[] = [];
  const setMenu = (open: boolean) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.classList.toggle('menu-open', open);
    inerted.forEach((el) => { el.inert = false; });
    inerted = open ? [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== header && !el.inert && el.tagName !== 'SCRIPT') : [];
    inerted.forEach((el) => { el.inert = true; });
  };
  const dismiss = (li: HTMLLIElement, on: boolean) => li.classList.toggle('is-dismissed', on);
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (header.classList.contains('is-open')) { setMenu(false); toggle.focus(); return; }
    if (mobile.matches) return;
    // 데스크톱: 보이는 하위 메뉴를 모두 숨기고, 하위 메뉴 안에 초점이 있었으면 그 그룹 버튼으로 돌린다
    const open = groups.filter(shown);
    if (!open.length) return;
    const inSub = (document.activeElement as HTMLElement | null)?.closest('.submenu')?.parentElement as HTMLLIElement | null;
    open.forEach((li) => { li.classList.remove('is-open'); dismiss(li, true); });
    if (inSub) btnOf(inSub).focus();
    sync();
  });
  groups.forEach((li) => {
    btnOf(li).addEventListener('click', () => {
      // 지금 보이면 닫고(데스크톱은 hover·초점이 남아 있어도 숨김), 안 보이면 연다
      const open = !shown(li);
      li.classList.toggle('is-open', open);
      dismiss(li, !open && !mobile.matches);
      sync();
    });
    li.addEventListener('pointerenter', () => { dismiss(li, false); sync(); });
    li.addEventListener('pointerleave', () => { if (!li.contains(document.activeElement)) dismiss(li, false); sync(); });
    li.addEventListener('focusout', (e) => {
      if (li.contains(e.relatedTarget as Node | null)) return;
      // 초점이 그룹 밖으로 나가면 데스크톱에서는 눌러 연 상태도 닫는다(다른 메뉴 위에 겹쳐 남지 않게)
      if (!mobile.matches) li.classList.remove('is-open');
      if (!li.matches(':hover')) dismiss(li, false);
      setTimeout(sync);
    });
    li.addEventListener('focusin', () => setTimeout(sync));
  });
  // 링크를 누르면 펼침 메뉴를 닫는다. 같은 페이지 앵커면 그 구역으로 초점을 옮겨 키보드 위치도 따라가게 한다
  $$<HTMLAnchorElement>('.gnav a').forEach((a) => a.addEventListener('click', () => {
    if (!header.classList.contains('is-open')) return;
    setMenu(false);
    const target = a.pathname === location.pathname && a.hash ? document.getElementById(decodeURIComponent(a.hash.slice(1))) : null;
    if (target) requestAnimationFrame(() => {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }));
  // 1024 경계를 넘으면 펼침 상태·숨김 표시를 풀고, 보이지 않게 된 요소에 있던 초점을 보이는 자리로 옮긴다
  mobile.addEventListener('change', (e) => {
    const active = document.activeElement;
    setMenu(false);
    groups.forEach((li) => { dismiss(li, false); if (!e.matches) li.classList.remove('is-open'); });
    if (e.matches) {
      groups.filter((li) => li.classList.contains('is-current')).forEach((li) => li.classList.add('is-open'));
      if (active && header.querySelector('.gnav')?.contains(active)) toggle.focus();
    } else if (active === toggle) {
      $<HTMLElement>('.logo', header)?.focus();
    }
    sync();
  });
  // 뒤로 가기로 페이지가 복원될 때 펼친 메뉴·inert가 남지 않게 한다
  window.addEventListener('pageshow', (e) => { if (e.persisted && header.classList.contains('is-open')) setMenu(false); });
  // 현재 페이지가 속한 하위 메뉴는 모바일에서 처음부터 펼쳐 둔다. 처음 상태는 계산된 스타일을 읽지 않고 직접 맞춘다
  // (불러올 때 getComputedStyle을 부르면 첫 그리기 전에 스타일 계산을 강제해 LCP 측정이 나빠짐, INNA-644 측정)
  if (mobile.matches) groups.filter((li) => li.classList.contains('is-current')).forEach((li) => { li.classList.add('is-open'); btnOf(li).setAttribute('aria-expanded', 'true'); });
  header.dataset.menuReady = '';
}

/* 2) 샘플 안내창 (전화·메일 등). 닫으면 누른 요소로 초점 복귀 */
const dlg = $<HTMLDialogElement>('#sampleDialog');
const msg = $<HTMLElement>('#sampleDialogMsg');
if (dlg && msg) {
  const messages = JSON.parse(dlg.dataset.messages ?? '{}') as Record<string, string>;
  let opener: HTMLElement | null = null;
  $$<HTMLElement>('[data-sample-notice]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      msg.textContent = messages[el.dataset.sampleNotice ?? ''] ?? messages.external ?? '';
      opener = el;
      dlg.showModal();
    });
  });
  dlg.addEventListener('close', () => { opener?.focus(); opener = null; });
}

/* 3) 등장 효과 1종(12px 올라오며 나타남). 움직임 줄이기 설정이면 켜지 않음. 스크립트가 켠 뒤에만 숨김 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const targets = $$<HTMLElement>('[data-reveal]');
if (!reduce && 'IntersectionObserver' in window && targets.length) {
  document.documentElement.classList.add('js-reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((t) => io.observe(t));
  // 안전장치: 2.5초 뒤에는 모두 표시
  setTimeout(() => targets.forEach((t) => t.classList.add('is-in')), 2500);
}
