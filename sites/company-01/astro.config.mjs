// @ts-check
import { defineConfig } from 'astro/config';

// 공개 주소(도메인)는 아직 정해지지 않았다. site를 넣지 않고 하위 경로만 고정한다.
export default defineConfig({
  base: '/company-01/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
