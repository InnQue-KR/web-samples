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

/* 2) 상담 신청 구역이 보이면 하단 고정 버튼을 접는다. 접힌 동안 키보드 초점도 받지 않게 inert. */
const sticky = document.getElementById('sticky-cta');
const apply = document.getElementById('apply');
if (sticky && apply && 'IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    const hide = entries[0]?.isIntersecting ?? false;
    sticky.classList.toggle('is-hidden', hide);
    sticky.inert = hide;
  }, { threshold: 0.15 }).observe(apply);
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

  const clearErrors = () => {
    [[nameInput, 'f-name-err'], [phoneInput, 'f-phone-err'], [consent, 'f-consent-err']].forEach(([el, id]) => setError(el as HTMLInputElement, id as string, ''));
    summary.textContent = '';
    summary.classList.remove('is-visible');
  };

  armSampleForm(form, {
    validate: () => {
      const problems = check();
      if (!problems.length) return true;
      summary.textContent = `확인이 필요한 항목이 ${problems.length}개 있습니다. ${problems.map((p) => p.msg).join(' / ')}`;
      summary.classList.add('is-visible');
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

  /* 오류가 난 칸은 고치는 즉시 다시 검사 */
  (['input', 'change'] as const).forEach((type) => {
    form.addEventListener(type, (e) => {
      if ((e.target as Element).closest('.field, .consent')?.classList.contains('has-error')) check();
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
