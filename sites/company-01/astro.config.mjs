// @ts-check
import { defineConfig } from 'astro/config';
import { SAMPLE_ORIGIN } from '@web-samples/sample-kit/origin';

// site는 공유 미리보기(og:image·og:url) 전체 주소용 **예정** origin이다. 넣었다고 공개된 것이 아니다(배포는 대표 승인 뒤).
export default defineConfig({
  site: SAMPLE_ORIGIN,
  base: '/company-01/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
