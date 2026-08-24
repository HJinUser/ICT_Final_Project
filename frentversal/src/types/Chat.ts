// AI 챗봇에서 쓰는 타입

// 대화 한 줄의 주인. 사용자가 쓴 말과 챗봇이 한 말만 구분한다.
// 도구 호출 기록은 서버 안에서만 쓰고 화면까지 내려오지 않는다.
export type ChatRole = 'user' | 'assistant';

// 서버에 보내는 대화 한 줄
export type ChatMessage = {
    role: ChatRole;
    content: string;
};

// 답변과 함께 내려오는 매물 카드 한 장.
// 누르면 매물 상세로 가야 하므로 id 는 반드시 있다.
export type ChatPropertyCard = {
    id: number;
    name: string | null;
    dealType: string | null;
    priceLabel: string | null;
    address: string | null;
    areaLabel: string | null;
    typeLabel: string | null;
    thumbnailUrl: string | null;
};

/*
  사용자가 지금 보고 있는 화면 정보.

  "이 매물 시세 적정해?" 처럼 지시대명사로 물었을 때 무엇을 가리키는지 서버가 알 수 있게 함께 보낸다.
  매물 상세가 아닌 화면에서는 propertyId 가 없다.
*/
export type ChatPageContext = {
    path: string;
    propertyId?: number;
};

// 화면이 서버로 보내는 요청 전체
export type ChatRequest = {
    messages: ChatMessage[];
    pageContext: ChatPageContext;
};

// 서버가 돌려주는 응답 전체
export type ChatResponse = {
    reply: string;
    properties: ChatPropertyCard[];
};

/*
  화면에 그리는 대화 한 줄.

  서버로 보낼 때는 role 과 content 만 필요하지만, 화면에는 그 답변에 딸려 온
  매물 카드도 함께 보여 줘야 한다. 그래서 화면 전용으로 한 겹 더 둔다.
*/
export type ChatTurn = ChatMessage & {
    properties?: ChatPropertyCard[];
};
