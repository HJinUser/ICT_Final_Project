// 중개사무소 관련 API 호출을 모아 둔 파일
// 화면(AgencyPage.tsx)은 이 파일의 함수만 호출하므로, 서버 주소나 응답 구조가 바뀌어도
// 이 파일만 고치면 되고 화면 코드는 그대로 둘 수 있다.

import customAxios from './axiosInstance';
import type {
    AgencyDetail,
    AgencyListResponse,
    AgencyReview,
    ConsultationRequest,
} from '../types/Agency';

export interface AgencySearchParams {
    keyword?: string; // 사무소명 또는 공인중개사명
    region?: string;  // 구 (주소에 포함된 문자열, 예: "서초구")
    dong?: string;    // 동 (주소 검색이 채워 준 dong 컬럼과 맞춘다, 예: "반포동")
}

// 중개사무소 목록 조회
// GET /agency?keyword=&region=&dong=
// 값이 비어 있는 파라미터는 보내지 않는다(서버에서 null 로 받아 조건 없이 처리됨).
export async function getAgencies(params: AgencySearchParams = {}): Promise<AgencyListResponse> {
    const response = await customAxios.get<AgencyListResponse>('/agency', {
        params: {
            keyword: params.keyword?.trim() || undefined,
            region: params.region?.trim() || undefined,
            dong: params.dong?.trim() || undefined,
        },
    });

    return response.data;
}

// 중개사무소 상세 조회 (상세 페이지용)
// GET /agency/{id}
// 사무소 정보 + 담당 매물 + 후기 개수까지 한 번에 받아온다.
export async function getAgencyDetail(id: number): Promise<AgencyDetail> {
    const response = await customAxios.get<AgencyDetail>(`/agency/${id}`);

    return response.data;
}

// 이용자 평가(후기) 목록 조회
// GET /agency/{id}/reviews  (비회원도 볼 수 있다)
export async function getAgencyReviews(id: number): Promise<AgencyReview[]> {
    const response = await customAxios.get<AgencyReview[]>(`/agency/${id}/reviews`);

    return response.data;
}

// 내가 후기를 쓸 수 있는지 확인
// GET /agency/{id}/reviews/eligibility  (로그인 필요)
// 비회원이면 서버가 401 을 주므로, 여기서 false 로 바꿔서 돌려준다.
export async function canWriteReview(id: number): Promise<boolean> {
    try {
        const response = await customAxios.get<{ eligible: boolean }>(`/agency/${id}/reviews/eligibility`);
        return response.data.eligible;
    } catch {
        return false;
    }
}

// 상담 요청 보내기
// POST /agency/{id}/consultations  (로그인 + 정보 제공 동의 필요)
export async function requestConsultation(id: number, request: ConsultationRequest): Promise<string> {
    const response = await customAxios.post<{ message: string }>(`/agency/${id}/consultations`, request);

    return response.data.message;
}

// 후기 작성
// POST /agency/{id}/reviews  (상담을 요청한 적이 있는 회원만 가능)
export async function writeReview(id: number, rating: number, content: string): Promise<string> {
    const response = await customAxios.post<{ message: string }>(`/agency/${id}/reviews`, { rating, content });

    return response.data.message;
}
