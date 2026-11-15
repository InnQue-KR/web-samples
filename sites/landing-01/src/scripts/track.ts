/**
 * 버튼 클릭 측정 시연(3종). 이벤트 이름과 횟수만 이 페이지의 메모리에 센다.
 * 네트워크 전송·쿠키·브라우저 저장소·콘솔 출력 없음. 새로고침하면 0으로 돌아간다.
 * 접수 완료 수는 세지 않는다(폼 제출 버튼에는 data-track이 없다).
 * QA 확인: 개발자 도구 콘솔에서 sampleTrack.counts()
 */
import site from '../data/site.json';

export function setupTrack(): void {
  const counts = new Map<string, number>(site.track.map((t) => [t.event, 0]));
  document.addEventListener('click', (ev) => {
    const el = (ev.target as Element | null)?.closest?.('[data-track]');
    const name = el?.getAttribute('data-track');
    if (name && counts.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }, { capture: true });
  Object.defineProperty(window, 'sampleTrack', {
    value: Object.freeze({
      events: () => [...counts.keys()],
      counts: () => Object.fromEntries(counts),
    }),
  });
}
