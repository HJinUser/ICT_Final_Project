// AI 챗봇 API 레이어
//
// React 는 파이썬(FastAPI)을 직접 부르지 않는다. nginx 가 /api 요청을 스프링으로만 넘기고
// ML 서버는 바깥에 열려 있지 않기 때문이다. 스프링이 대신 받아 파이썬으로 전달한다.

import axiosInstance from './axiosInstance';
import type { ChatRequest, ChatResponse } from '../types/Chat';

// 대화와 화면 정보를 보내고 챗봇 답변을 받아온다.
// 로그인해야 쓸 수 있는 경로라서 axiosInstance 로 부른다(토큰을 자동으로 붙여 준다).
export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
    const response = await axiosInstance.post<ChatResponse>('/chat', payload);

    return response.data;
}
