/*
  헤더/푸터에 들어가는 메뉴 정의.

  메뉴 구성이 화면 코드(JSX) 안에 흩어져 있으면 "이 메뉴가 어느 역할에게 보이는지"를
  파악하기 어려워서, 데이터로 한곳에 모아 두고 화면은 이 배열을 그리기만 하도록 했다.
  나중에 메뉴가 추가되거나 역할별 노출이 바뀌면 이 파일만 고치면 된다.
*/

import type { User } from './User';

// 로그인하지 않은 상태까지 포함한 "화면에서 구분해야 하는 역할"
// User['role']에는 없는 'GUEST'가 필요해서 별도 타입으로 둔다.
export type ViewerRole = 'GUEST' | User['role'];

export type NavItem = {
    label: string;
    // 이동할 경로. ready가 false면 이동하지 않으므로 이 값은 나중에 페이지가 생겼을 때 쓸 예정 주소다.
    path: string;
    // 실제 페이지가 만들어졌는지 여부. false면 클릭 시 "준비 중" 안내만 띄운다.
    ready: boolean;
    // 이 메뉴를 볼 수 있는 역할. 값이 없으면 모두에게 보인다.
    roles?: ViewerRole[];
};

export type FooterGroup = {
    title: string;
    items: NavItem[];
};

// 현재 로그인 상태를 화면에서 쓰는 역할 값으로 바꾼다.
export function toViewerRole(user: User | null): ViewerRole {
    return user ? user.role : 'GUEST';
}

// 역할에 맞는 메뉴만 걸러낸다.
export function visibleFor(items: NavItem[], role: ViewerRole): NavItem[] {
    return items.filter((item) => !item.roles || item.roles.includes(role));
}

// ── 헤더 좌측 메뉴 ────────────────────────────────────────────
// 지도 검색·동네 탐색·매물 확인·맞춤 추천은 아직 페이지가 없어서 ready: false다.
// 페이지가 만들어지면 ready만 true로 바꾸고 라우트를 등록하면 된다.
export const HEADER_NAV: NavItem[] = [
    { label: '지도 검색', path: '/map', ready: false },
    { label: '동네 탐색', path: '/neighborhood', ready: false },
    { label: '매물 확인', path: '/listings', ready: false },
    { label: '맞춤 추천', path: '/recommend', ready: false, roles: ['GUEST', 'USER'] },
    // 중개사무소 목록·상세는 서버도 비회원까지 열어 둔 공개 화면이라 역할을 가리지 않고 보여 준다.
    // (기획서 매트릭스에는 사용자 전용으로 되어 있으니, 되돌리려면 roles: ['GUEST', 'USER'] 를 다시 붙이면 된다)
    { label: '중개사무소 안내', path: '/agency', ready: true },
    // 공지사항은 상단 메뉴에서 빼고 메인 화면에 자리를 마련했다.
    // (비회원도 볼 수 있고, 전체 목록은 메인의 "전체 보기"로 들어간다)
    // 중개인은 매물을 "찾는" 쪽이 아니라 "관리"하는 쪽이라 다른 메뉴를 본다.
    { label: '매물 관리', path: '/broker/mypage', ready: true, roles: ['BROKER'] },
    // 관리자의 운영 기능은 상단 메뉴에 두지 않는다.
    // 콘솔(/admin) 한 곳에 모아 두고, 우측 프로필 메뉴의 "관리자 콘솔"로 들어간다.
];

// ── 로그인한 사용자의 우측 드롭다운 메뉴 ──────────────────────
export const USER_MENU: NavItem[] = [
    // 마이페이지 안의 "내 활동 > 알림내역"에서 상담 답변(/my-consultations)을 확인한다.
    { label: '마이페이지', path: '/mypage', ready: true, roles: ['USER', 'ADMIN'] },
    { label: '마이페이지', path: '/broker/mypage', ready: true, roles: ['BROKER'] },
    { label: '내 매물 관리', path: '/broker/properties', ready: true, roles: ['BROKER'] },
    { label: '관심 목록', path: '/favorites', ready: true, roles: ['USER'] },
    { label: '내 중개사무소', path: '/broker/agency', ready: true, roles: ['BROKER'] },
    // 내가 접수한 신고 내역. 관리자는 위 헤더의 "신고 관리"에서 전체를 처리하므로 여기 넣지 않는다.
    { label: '내 신고', path: '/report/me', ready: true, roles: ['USER', 'BROKER'] },
    { label: '관리자 콘솔', path: '/admin', ready: true, roles: ['ADMIN'] },
];

// ── 푸터 안내메뉴 ─────────────────────────────────────────────
// 푸터는 역할과 상관없이 같은 내용을 보여준다(비회원에게도 서비스 전체를 안내하는 자리라서).
export const FOOTER_GROUPS: FooterGroup[] = [
    {
        title: '둘러보기',
        items: [
            { label: '지도 검색', path: '/map', ready: false },
            { label: '동네 탐색', path: '/neighborhood', ready: false },
            { label: '매물 확인', path: '/listings', ready: false },
            { label: '맞춤 추천', path: '/recommend', ready: false },
            { label: '관심 목록', path: '/favorites', ready: true },
        ],
    },
    {
        title: '이용안내',
        items: [
            { label: '공지사항', path: '/notice', ready: true },
            { label: '자주 묻는 질문', path: '/support', ready: false },
            { label: '중개사무소 안내', path: '/agency', ready: true },
            { label: '중개인 등록', path: '/member/signup', ready: true },

        ],
    },
    {
        title: '데이터 출처',
        items: [
            { label: '국토교통부 실거래가', path: '/data/molit', ready: false },
            { label: '서울 열린데이터광장', path: '/data/seoul', ready: false },
            { label: '예측 정확도 공개', path: '/report', ready: false },
            { label: '개인정보처리 방침', path: '/personalInfo', ready: false}
        ],
    },
];
