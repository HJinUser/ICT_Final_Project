// 상담 상태를 화면에 표시할 때 쓰는 값들을 한곳에 모아 둔 파일
//
// 마이페이지·내 중개사무소·답변하기 세 화면이 같은 배지 색과 같은 필터를 쓰기 때문에,
// 각 화면에 흩어 두면 나중에 상태가 하나 늘었을 때 세 군데를 모두 고쳐야 한다.
//
// 한글 이름(statusLabel)은 서버가 내려주므로 여기서 정하지 않는다.
// 색상은 화면 표현이라 서버가 아니라 프론트에서 정한다.

import type { ConsultationStatus } from '../types/MyAgency';

// common.css 의 .status.green / .orange / .purple / .gray 와 짝을 이룬다
export const CONSULTATION_STATUS_COLORS: Record<ConsultationStatus, string> = {
    REQUESTED: 'orange', // 상담 요청 - 답변이 필요하므로 눈에 띄는 색
    ACCEPTED: 'purple',  // 상담 확정
    DONE: 'green',       // 상담 완료
    CLOSED: 'gray',      // 종료
};

// 문의 관리의 드롭다운 필터.
// value 는 서버의 ConsultationStatus 이름과 똑같아야 한다(ALL 만 예외로 '전체'를 뜻한다).
export const CONSULTATION_FILTERS = [
    { value: 'ALL', label: '전체' },
    { value: 'REQUESTED', label: '상담 요청' },
    { value: 'ACCEPTED', label: '상담 확정' },
    { value: 'DONE', label: '상담 완료' },
    { value: 'CLOSED', label: '종료' },
];
