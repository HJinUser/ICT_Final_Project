import type { Notice, NoticePayload } from '../types/Notice';

const NOTICE_STORAGE_KEY = 'rentversal.mock.notices';

// 백엔드 API를 연결하기 전 화면 구현과 시연에 사용하는 초기 공지사항 데이터입니다.
const INITIAL_NOTICES: Notice[] = [
    {
        id: 5,
        title: '렌트버설 서비스 이용 안내',
        content: `안녕하세요. 렌트버설입니다.\n\n렌트버설에서는 매물 검색, 중개사무소 상담, 후기 및 신고 기능을 이용할 수 있습니다.\n서비스 이용 중 궁금한 사항은 고객지원 메뉴를 통해 문의해 주세요.`,
        viewCount: 128,
        createdAt: '2026-08-12T09:00:00',
        updatedAt: '2026-08-12T09:00:00',
    },
    {
        id: 4,
        title: '허위 매물 신고 및 처리 기준 안내',
        content: `실제 거래 가액과 다르거나 이미 거래가 완료된 매물은 신고할 수 있습니다.\n\n관리자가 신고 내용과 매물 정보를 확인한 뒤 처리 결과를 안내합니다. 정확한 확인을 위해 신고 사유를 구체적으로 작성해 주세요.`,
        viewCount: 94,
        createdAt: '2026-08-11T14:30:00',
        updatedAt: '2026-08-11T14:30:00',
    },
    {
        id: 3,
        title: '개인정보 보호를 위한 안전 수칙',
        content: `계약 전 주민등록번호, 계좌 비밀번호 등의 민감한 정보를 상대방에게 전달하지 마세요.\n의심스러운 연락이나 결제 요청을 받은 경우 거래를 중단하고 고객지원으로 신고해 주세요.`,
        viewCount: 76,
        createdAt: '2026-08-08T11:00:00',
        updatedAt: '2026-08-08T11:00:00',
    },
    {
        id: 2,
        title: '시스템 정기 점검 안내',
        content: `안정적인 서비스 제공을 위해 정기 점검을 진행합니다.\n\n점검 시간에는 로그인과 매물 등록 기능이 일시적으로 제한될 수 있습니다. 이용에 불편을 드려 죄송합니다.`,
        viewCount: 61,
        createdAt: '2026-08-05T17:00:00',
        updatedAt: '2026-08-05T17:00:00',
    },
    {
        id: 1,
        title: '렌트버설에 오신 것을 환영합니다',
        content: `렌트버설 공지사항 게시판이 개설되었습니다.\n새로운 기능, 서비스 점검 및 중요한 정책 변경 내용을 이곳에서 안내하겠습니다.`,
        viewCount: 152,
        createdAt: '2026-08-01T10:00:00',
        updatedAt: '2026-08-01T10:00:00',
    },
];

function cloneNotice(notice: Notice): Notice {
    return { ...notice };
}

function isNotice(value: unknown): value is Notice {
    if (!value || typeof value !== 'object') return false;

    const notice = value as Partial<Notice>;
    return typeof notice.id === 'number'
        && typeof notice.title === 'string'
        && typeof notice.content === 'string'
        && typeof notice.viewCount === 'number'
        && typeof notice.createdAt === 'string'
        && typeof notice.updatedAt === 'string';
}

function readNotices(): Notice[] {
    const storedNotices = window.localStorage.getItem(NOTICE_STORAGE_KEY);

    if (storedNotices) {
        try {
            const parsed: unknown = JSON.parse(storedNotices);
            if (Array.isArray(parsed) && parsed.every(isNotice)) {
                return parsed.map(cloneNotice);
            }
        } catch {
            // 저장값이 손상된 경우 초기 하드코딩 데이터로 다시 시작합니다.
        }
    }

    const initialNotices = INITIAL_NOTICES.map(cloneNotice);
    writeNotices(initialNotices);
    return initialNotices;
}

function writeNotices(notices: Notice[]) {
    window.localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(notices));
}

function findNoticeOrThrow(notices: Notice[], id: number): Notice {
    const notice = notices.find((item) => item.id === id);
    if (!notice) throw new Error('공지사항을 찾을 수 없습니다.');
    return notice;
}

export async function getNotices(): Promise<Notice[]> {
    return readNotices().sort((a, b) => b.id - a.id);
}

export async function getNotice(id: number): Promise<Notice> {
    const notices = readNotices();
    const notice = findNoticeOrThrow(notices, id);
    notice.viewCount += 1;
    writeNotices(notices);
    return cloneNotice(notice);
}

export async function createNotice(payload: NoticePayload): Promise<Notice> {
    const notices = readNotices();
    const now = new Date().toISOString();
    const nextId = notices.reduce((maxId, notice) => Math.max(maxId, notice.id), 0) + 1;
    const createdNotice: Notice = {
        id: nextId,
        title: payload.title,
        content: payload.content,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
    };

    notices.push(createdNotice);
    writeNotices(notices);
    return cloneNotice(createdNotice);
}

export async function updateNotice(id: number, payload: NoticePayload): Promise<Notice> {
    const notices = readNotices();
    const notice = findNoticeOrThrow(notices, id);
    notice.title = payload.title;
    notice.content = payload.content;
    notice.updatedAt = new Date().toISOString();
    writeNotices(notices);
    return cloneNotice(notice);
}

export async function deleteNotice(id: number): Promise<void> {
    const notices = readNotices();
    findNoticeOrThrow(notices, id);
    writeNotices(notices.filter((notice) => notice.id !== id));
}
