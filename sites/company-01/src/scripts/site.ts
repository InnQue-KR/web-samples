/**
 * 모든 페이지 공통 동작: 모바일 메뉴, 하위 메뉴, 샘플 안내창, 등장 효과.
 * 네트워크 요청·저장소·쿠키를 쓰지 않는다. data-track 속성은 표시용이며 이벤트를 연결하지 않는다(기업 DELUXE 범위 밖).
 */
const $ = <T extends Element>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

/* 1) 모바일 메뉴 + 하위 메뉴 (1023px 이하는 눌러서 펼침, 그 위는 hover/포커스) */
const header = $<HTMLElement>('[data-component="SiteHeader"]');
const toggle = $<HTMLButtonElement>('.menu-toggle');
const mobile = window.matchMedia('(max-width: 1023px)');
if (header && toggle) {
  const setMenu = (open: boolean) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.classList.toggle('menu-open', open);
  };
  const closeSubmenus = () => $$<HTMLLIElement>('.gnav li.is-open').forEach((li) => {
    li.classList.remove('is-open');
    $('[data-submenu-toggle]', li)?.setAttribute('aria-expanded', 'false');
  });
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (header.classList.contains('is-open')) { setMenu(false); toggle.focus(); return; }
    // 데스크톱: 펼친 하위 메뉴를 닫고, 하위 메뉴 안에 초점이 있었으면 그 그룹 버튼으로 돌린다
    const inSub = (document.activeElement as HTMLElement | null)?.closest('.submenu')?.parentElement;
    closeSubmenus();
    if (inSub) $<HTMLButtonElement>('[data-submenu-toggle]', inSub)?.focus();
  });
  $$<HTMLButtonElement>('.gnav [data-submenu-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.parentElement!;
      const open = !li.classList.contains('is-open');
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  // 같은 페이지 안 앵커(예: 회사 소개 → 연혁·인증)로 이동할 때 펼침 메뉴를 닫는다
  $$<HTMLAnchorElement>('.gnav a').forEach((a) => a.addEventListener('click', () => { if (header.classList.contains('is-open')) setMenu(false); }));
  // 화면이 넓어지면 펼침 상태를 풀어 스크롤 잠금이 남지 않게 한다
  mobile.addEventListener('change', (e) => { if (!e.matches) setMenu(false); });
  // 현재 페이지가 속한 하위 메뉴는 모바일에서 처음부터 펼쳐 둔다
  if (mobile.matches) {
    $$<HTMLLIElement>('.gnav li.is-current').forEach((li) => {
      li.classList.add('is-open');
      $('[data-submenu-toggle]', li)?.setAttribute('aria-expanded', 'true');
    });
  }
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
