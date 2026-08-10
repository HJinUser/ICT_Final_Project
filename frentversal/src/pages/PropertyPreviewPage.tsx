import PropertyPage from "./PropertyPage";
import type { PropertyDetail } from "../types/PropertyDetail";

// TEMP: 백엔드 연동 전 디자인 확인용. 다 확인했으면 이 파일과 라우트를 통째로 삭제하면 됩니다.
const DUMMY_PROPERTY: PropertyDetail = {
    id: 1,
    ownerId: 1, // PREVIEW_USER의 id와 같음 → "내 매물" 로직(중개인 전용 버튼) 확인용
    dealStatus: "게시중",
    isPublic: true,
    priceStatus: "하락", // "가격 하락" 배지 확인용. null로 바꾸면 배지가 안 보임
    name: "반포 리버뷰 84㎡",
    description: "매물 정보, AI 시세예측, 주변환경, 중개사무소와 실제 거주 한줄평을 한 화면에서 확인합니다.",
    propertyType: "아파트",
    dealType: "전세",
    address: "서울 서초구 반포동",
    area: 84,
    floor: 12,
    roomCount: 3,
    bathroomCount: 2,
    price: 49000,
    maintenanceFee: 18,
    maintenanceIncludes: [],
    moveInDate: "",
    contractStatus: "즉시 입주",
    photos: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=75",
        "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=700&q=70",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=70",
    ],
    options: [],
    detailDescription: "",
    aiEstimatedPrice: 54200,
    priceHistory: [
        { year: "2023", price: 42000 },
        { year: "2024", price: 45000 },
        { year: "2025", price: 49000 },
        { year: "2026", price: 54200 },
    ],
    tags: ["🚇 반포역 도보 4분", "🚌 버스정류장 2분", "🛒 대형마트 6분", "🌳 한강공원 8분", "🤫 야간 소음 낮음", "🅿️ 세대당 1.2대", "🏥 병원 5분", "☀️ 남향 채광"],
    reviews: [
        { id: 1, rating: 5, content: "밤에 조용하고 교통이 편합니다. 다만 저녁에는 주차 자리가 빨리 찹니다.", createdAt: "2026.07.12" },
        { id: 2, rating: 4, content: "한강 산책과 장보기가 편해서 생활 만족도가 높았습니다.", createdAt: "2026.06.23" },
    ],
    agency: {
        id: 1,
        name: "반포역전 공인중개사",
        registrationNo: "11650-2024-00123",
        address: "서울 서초구 반포대로 123",
        phone: "02-1234-5678",
        agentName: "박지훈",
        available: true,
    },
    isFavorited: false,
};

// 역할 바꿔가며 확인하고 싶으면 이 값의 role만 "USER" | "AGENT" | "ADMIN"으로 바꿔서 새로고침
// role을 "AGENT"로 바꾸면 id가 DUMMY_PROPERTY.ownerId(1)와 같아서 "내 매물" 전용 버튼도 보입니다.
// undefined로 바꾸면(= 아예 user prop을 안 넘기면) 비회원 화면도 확인 가능합니다.
const PREVIEW_USER = { id: 1, name: "김서초", email: "test@test.com", role: "ADMIN" as const };

function PropertyPreviewPage() {
    return <PropertyPage user={PREVIEW_USER} mockData={DUMMY_PROPERTY} />;
}

export default PropertyPreviewPage;