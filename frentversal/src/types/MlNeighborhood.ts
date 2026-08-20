/*
  행정동 ML 분석 결과 타입.

  이 화면이 다루는 adminCode 는 통계청 "행정동" 코드다.
  동네 탐색(types/Neighborhood.ts)의 Neighborhood.id / dong 은 "법정동" 기준이라
  코드 체계가 서로 다르다. 두 값을 서로 바꿔 넣으면 안 된다.

  값의 출처는 파이썬(K-Means / 텍스트마이닝)이고,
  Spring 의 GET /neighborhoods/ml/{adminCode} 가 그대로 전달한다.

  keywords 와 reviewDocumentCount 는 텍스트마이닝 담당이 채우는 자리다.
  API 는 이미 값을 내려주지만 화면에 붙이는 것은 그쪽 작업이라, 여기서는 타입만 열어 둔다.
*/

export type MlNeighborhoodResponse = {
    adminCode: string;
    adminName: string;
    districtName: string;

    // 이 동네가 속한 군집 번호와 사람이 읽는 군집 이름(예: "녹지·교육 중심형")
    clusterId: number;
    clusterName: string;

    // 동네 한줄평에서 뽑은 대표 키워드. 분석 결과가 없는 동네는 빈 배열이다.
    keywords: string[];
    // 위 키워드를 뽑는 데 쓰인 한줄평 문서 수
    reviewDocumentCount: number;
};
