// 이메일 찾기(이름+전화번호 확인 -> 문자 인증 -> 가려진 이메일 표시) 흐름의 요청/응답 타입.
// 백엔드 FindEmailSendCodeDto / FindEmailVerifyDto 와 1:1로 맞춘다.

export type FindEmailSendCodeRequest = {
    name: string;
    phone: string;
};

export type FindEmailVerifyRequest = {
    phone: string;
    code: string;
};

// 서버가 로컬 파트 일부만 남기고 가려서 내려준다. 예: "hjin****@gmail.com"
export type FindEmailVerifyResponse = {
    email: string;
};
