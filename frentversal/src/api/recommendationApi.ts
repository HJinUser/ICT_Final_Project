/*
  맞춤 추천과 취향 설정 API 호출을 모아 둔 파일.

  모든 요청이 로그인한 사용자 본인의 자료를 다루므로 axiosInstance 를 쓴다.
  raw axios 를 쓰면 토큰이 붙지 않아 전부 401 로 막힌다.
*/

import axiosInstance from './axiosInstance';
import type { Preference, PreferenceResponse } from '../types/Preference';
import type { RecommendationFeedbackRequest, RecommendationResponse } from '../types/Recommendation';

// 저장해 둔 취향을 불러온다. 사이드바의 초기값으로 쓴다.
export async function getPreference(): Promise<PreferenceResponse> {
    const response = await axiosInstance.get<PreferenceResponse>('/recommendation/preferences');
    return response.data;
}

// 화면에서 고른 취향을 저장한다.
// 수정이므로 POST 가 아니라 PUT 을 쓴다.
export async function savePreference(preference: Preference): Promise<void> {
    await axiosInstance.put('/recommendation/preferences', preference);
}

/*
  맞춤 추천 결과를 불러온다.

  shownIds 는 이미 화면에 보여 준 매물 id 다. 다른 추천 보기를 눌렀을 때 넘기면
  같은 매물이 다시 나오지 않는다. 별표로 지정한 매물은 서버가 첫 자리에 계속 남겨 둔다.
*/
export async function getRecommendations(shownIds: number[] = []): Promise<RecommendationResponse> {
    const params = new URLSearchParams();
    shownIds.forEach((id) => params.append('shownIds', String(id)));

    const response = await axiosInstance.get<RecommendationResponse>('/recommendation', {
        params: shownIds.length > 0 ? params : undefined,
    });

    return response.data;
}

// 추천 카드에서 누른 좋아요, 싫어요 평가를 보낸다.
export async function sendFeedback(request: RecommendationFeedbackRequest): Promise<void> {
    await axiosInstance.post('/recommendation/feedback', request);
}

// 고른 매물을 내 BEST 로 지정한다. BEST 는 한 사람당 하나만 유지된다.
export async function setBest(propertyId: number): Promise<void> {
    await axiosInstance.put(`/recommendation/best/${propertyId}`);
}

// 지정해 둔 BEST 를 해제한다.
export async function clearBest(): Promise<void> {
    await axiosInstance.delete('/recommendation/best');
}

/*
  취향 초기설정을 마쳤다고 알린다.

  취향 저장과 샘플 매물 평가를 모두 마친 뒤에만 부른다.
  이 호출이 끝나야 다음 로그인부터 초기설정 화면을 다시 보지 않는다.
*/
export async function completePreferenceSetup(): Promise<void> {
    await axiosInstance.post('/recommendation/preference-complete');
}
