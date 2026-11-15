/** base(/company-01/)를 붙인 내부 주소. 'about/#history' → '/company-01/about/#history', '' → '/company-01/' */
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
export const url = (path = '') => `${BASE}${path.replace(/^\/+/, '')}`;
export const img = (file: string) => url(`images/${file}`);
