// 중개사무소 정보. 매물 상세, 중개사무소 목록/상세, 내 중개사무소 페이지 등에서 공통으로 재사용
export interface Agency {
    id: number;
    name: string;           // 중개사무소 이름
    registrationNo: string; // 등록번호
    address: string;        // 중개사무소 주소
    phone: string;          // 전화번호
    agentName: string;      // 담당 공인중개사 이름
    available: boolean;     // 상담 가능 여부
}