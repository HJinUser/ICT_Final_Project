// 백엔드 API 요청용 기본 주소
//
// 배포 환경: nginx가 /api 로 시작하는 요청을 백엔드(9000)로 넘겨줌 (/api는 떼고)
// 로컬 개발: vite.config.ts의 proxy가 /api를 localhost:9000으로 넘겨줌
//
// 그래서 절대주소(http://localhost:9000) 대신 상대경로 "/api"를 씀
// → 프론트와 백엔드가 같은 주소로 서비스되므로 호스트/포트를 적을 필요가 없음
export const API_BASE_URL = "/api";

// 앞으로 http://localhost:9000 대신 API_BASE_URL를 사용하면 됨
// 예: `${API_BASE_URL}/product/list` → "/api/product/list"