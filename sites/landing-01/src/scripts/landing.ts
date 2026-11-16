/* 셈틈 랜딩 동작: 1) 등장 효과 2·3  2) 하단 고정 버튼 접기  3) 샘플 안내  4) 상담 폼  5) 클릭 측정 시연 */
import { bindSampleNotices } from '@web-samples/sample-kit/sample-notice';
import { armSampleForm } from '@web-samples/sample-kit/sample-form';
import site from '../data/site.json';
import { setupTrack } from './track';

setupTrack();

/* 1) 카드·표 올라옴 / 단계 선 이어짐. html.motion은 head에서 reduced-motion이 아닐 때만 붙는다. */
const revealTargets = document.querySelectorAll('.reveal, [data-steps]');
if (document.documentElement.classList.contains('motion') && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

/* 2) 상담 신청 구역 위쪽이 화면에 들어온 뒤로는(구역 안·그 아래 바닥글 포함) 하단 고정 버튼을 접는다.
 *    구역 위쪽이 다시 화면 아래로 내려가면 보인다. 보이는 비율이 아니라 위치로 판단해서 구역이 아무리 길어도 맞다.
 *    접힌 동안 키보드 초점도 받지 않게 inert.
 *    관찰자는 구역이 화면 밖→밖으로 한 번에 건너뛰면(바닥글 로고·FAQ 링크 등) 알려 주지 않으므로,
 *    스크롤·창 크기 때마다 현재 위치를 다시 재되 한 프레임에 한 번만 재고, 페이지 복귀(pageshow) 때는 바로 잰다. */
const sticky = document.getElementById('sticky-cta');
const apply = document.getElementById('apply');
if (sticky && apply) {
  let queued = false;
  const sync = () => {
    queued = false;
    const hide = apply.getBoundingClientRect().top < window.innerHeight;
    sticky.classList.toggle('is-hidden', hide);
    sticky.inert = hide;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  const opts = { passive: true };
  addEventListener('scroll', queue, opts);
  addEventListener('resize', queue, opts);
  // 뒤로 가기 복원 직후엔 다음 프레임이 늦을 수 있어(WebKit) 위치가 정해진 pageshow에서 바로 잰다.
  addEventListener('pageshow', sync);
  // 스크롤 없이 위쪽 내용 높이만 바뀌어 구역이 움직이는 경우는 관찰자가 맡는다.
  if ('IntersectionObserver' in window) new IntersectionObserver(queue).observe(apply);
  sync();
}

/* 3) 전화·개인정보처리방침: 연결하지 않고 안내만 */
const toast = document.getElementById('toast');
if (toast) bindSampleNotices(toast, { phone: site.notice.phone, privacy: site.notice.privacy });

/* 4) 상담 신청 폼 */
const form = document.getElementById('apply-form') as HTMLFormElement | null;
if (form) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const summary = $<HTMLElement>('form-summary');
  const done = $<HTMLElement>('form-done');
  const nameInput = $<HTMLInputElement>('f-name');
  const nameConsent = $<HTMLInputElement>('f-name-consent');
  const phoneInput = $<HTMLInputElement>('f-phone');
  const consent = $<HTMLInputElement>('f-consent');

  const setError = (input: HTMLInputElement, errId: string, msg: string) => {
    const field = input.closest('.field, .consent');
    field?.classList.toggle('has-error', Boolean(msg));
    $<HTMLElement>(errId).textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };
  const validPhone = (v: string) => /^0\d{8,10}$/.test(v.replace(/[\s-]/g, ''));

  const check = (): { el: HTMLElement; msg: string }[] => {
    const problems: { el: HTMLElement; msg: string }[] = [];
    if (nameInput.value.trim() && !nameConsent.checked) {
      setError(nameInput, 'f-name-err', '성함을 남기시려면 [선택] 이름 동의에 체크해 주세요. 동의하지 않으시면 성함 칸을 비워 주세요.');
      problems.push({ el: nameInput, msg: '학부모 성함: 이름 동의가 필요합니다' });
    } else setError(nameInput, 'f-name-err', '');

    const phone = phoneInput.value.trim();
    if (!phone) {
      setError(phoneInput, 'f-phone-err', '연락처를 입력해 주세요.');
      problems.push({ el: phoneInput, msg: '연락처를 입력해 주세요' });
    } else if (!validPhone(phone)) {
      setError(phoneInput, 'f-phone-err', '연락처 형식을 확인해 주세요. 예: 010-0000-0000');
      problems.push({ el: phoneInput, msg: '연락처 형식을 확인해 주세요' });
    } else setError(phoneInput, 'f-phone-err', '');

    if (!consent.checked) {
      setError(consent, 'f-consent-err', '개인정보 수집·이용에 동의하셔야 신청할 수 있습니다.');
      problems.push({ el: consent, msg: '개인정보 수집·이용 동의가 필요합니다' });
    } else setError(consent, 'f-consent-err', '');
    return problems;
  };

  /* 요약 상자: 0개면 비우고 숨김. role=alert라 입력 중에는 글자가 실제로 바뀔 때만 다시 써서 같은 내용을 거듭 읽지 않게 하고,
   * 제출 때(force)는 같은 내용이어도 다시 써서 다시 알린다. */
  const showSummary = (problems: { msg: string }[], force = false) => {
    const text = problems.length ? `확인이 필요한 항목이 ${problems.length}개 있습니다. ${problems.map((p) => p.msg).join(' / ')}` : '';
    if (force || summary.textContent !== text) summary.textContent = text;
    summary.classList.toggle('is-visible', problems.length > 0);
  };

  const clearErrors = () => {
    [[nameInput, 'f-name-err'], [phoneInput, 'f-phone-err'], [consent, 'f-consent-err']].forEach(([el, id]) => setError(el as HTMLInputElement, id as string, ''));
    showSummary([]);
  };

  armSampleForm(form, {
    validate: () => {
      const problems = check();
      showSummary(problems, true);
      if (!problems.length) return true;
      problems[0]!.el.focus();
      return false;
    },
    onDone: () => {
      clearErrors();
      form.classList.add('is-hidden');
      done.classList.add('is-visible');
      done.focus();
    },
  });

  /* 오류가 난 칸은 고치는 즉시 다시 검사하고, 요약이 떠 있으면 개수·문구도 함께 맞춘다. 초점은 옮기지 않는다. */
  (['input', 'change'] as const).forEach((type) => {
    form.addEventListener(type, (e) => {
      if (!(e.target as Element).closest('.field, .consent')?.classList.contains('has-error')) return;
      const problems = check();
      if (summary.classList.contains('is-visible')) showSummary(problems);
    });
  });

  $<HTMLButtonElement>('form-reset').addEventListener('click', () => {
    form.reset();
    clearErrors();
    done.classList.remove('is-visible');
    form.classList.remove('is-hidden');
    nameInput.focus();
  });
}
