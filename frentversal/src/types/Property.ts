export interface Property {
    id?: number;
    name: string;                   // 매물명
    description: string;            // 소개 글
    propertyType: string;           // 원/투룸, 아파트, 주택/빌라, 오피스텔
    dealType: string;               // 매매, 전세, 월세
    address: string;                // 주소
    area: number;                   // 면적
    floor: number;                  // 층
    roomCount: number;              // 방 개수
    bathroomCount: number;          // 화장실 개수
    price: number;                  // 가격
    maintenanceFee: number;         // 관리비
    maintenanceIncludes: string[];  //관리비 포함 항목
    moveInDate: string;             // 입주 가능일
    contractStatus: string;         // 계약 가능 상태
    photos: string[];               // 백엔드가 S3 업로드 후 돌려주는 URL 목록
    options: string[];              // 주변 시설·옵션
    detailDescription: string;      // 상세 설명
}