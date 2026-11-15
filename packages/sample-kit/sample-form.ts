/**
 * 샘플 폼 잠금 해제. 입력값은 어디로도 보내거나 저장하지 않는다.
 *
 * HTML 쪽 약속 (스크립트가 없거나 실패해도 새지 않게):
 *  - 입력 칸 전체를 <fieldset data-sample-lock disabled>로 감싼다. disabled 칸은 제출 데이터에 들어가지 않고,
 *    제출 버튼도 disabled라 Enter 암묵 제출도 일어나지 않는다.
 *  - 개인정보 입력 칸(이름·연락처·본문)에는 name 속성을 두지 않는다. 혹시 제출돼도 주소에 값이 붙지 않는다.
 *  - [data-sample-js-off] 안내는 스크립트가 켜지면 숨긴다.
 *
 * 순서가 중요하다: submit 차단을 먼저 붙이고, 그다음에만 잠금을 푼다.
 */
export interface SampleFormHandlers {
  /** 문제가 없으면 true. 오류 표시와 초점 이동은 호출하는 쪽이 한다. */
  validate: () => boolean;
  /** 검사 통과 직후. 이 시점에 입력값은 이미 지워져 있다. */
  onDone: () => void;
}

export function armSampleForm(form: HTMLFormElement, handlers: SampleFormHandlers): void {
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!handlers.validate()) return;
    form.reset();
    handlers.onDone();
  });
  form.querySelectorAll<HTMLFieldSetElement>('fieldset[data-sample-lock]').forEach((fs) => { fs.disabled = false; });
  form.querySelectorAll<HTMLElement>('[data-sample-js-off]').forEach((el) => { el.hidden = true; });
}
