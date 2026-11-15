/**
 * 전화·메일·외부 링크 대신 "샘플 사이트" 안내만 보여 준다.
 * [data-sample-notice="키"] 요소를 누르면 messages[키]를 toast(role=status)에 4초 표시한다.
 * 실제 연결(tel:, mailto:, 외부 URL)은 만들지 않는다.
 */
export function bindSampleNotices(toast: HTMLElement, messages: Record<string, string>, ms = 4000): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  document.querySelectorAll<HTMLElement>('[data-sample-notice]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      const msg = messages[el.dataset.sampleNotice ?? ''];
      if (!msg) return;
      toast.textContent = msg;
      toast.classList.add('is-visible');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('is-visible'), ms);
    });
  });
}
