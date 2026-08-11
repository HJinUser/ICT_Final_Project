// 중개인 인증 신청 API (/broker/**)

import customAxios from './axiosInstance';
import type { BrokerVerification } from '../types/MyAgency';

// 내 인증 상태 조회
// 아직 신청한 적이 없으면 서버가 verifyStatus 만 UNVERIFIED 로 채워서 돌려준다.
export async function getMyVerification(): Promise<BrokerVerification> {
    const response = await customAxios.get<BrokerVerification>('/broker/verification');

    return response.data;
}

// 인증 신청(또는 반려 후 재신청)
//
// 자격증 사진(파일)과 입력값을 함께 보내야 해서 FormData(multipart)로 만든다.
// info 파트는 JSON 으로 보내야 서버가 DTO 로 받을 수 있어서 Blob 으로 타입을 지정한다.
// (그냥 문자열로 넣으면 Content-Type 이 text/plain 이 되어 서버에서 415 오류가 난다)
export async function submitVerification(
    info: {
        licenseNumber: string;
        businessName: string;
        officeAddress: string;
        ownerName: string;
        registeredDate: string;
    },
    licenseImage: File | null,
): Promise<string> {
    const formData = new FormData();

    formData.append('info', new Blob([JSON.stringify(info)], { type: 'application/json' }));

    if (licenseImage) {
        formData.append('licenseImage', licenseImage);
    }

    const response = await customAxios.post<{ message: string }>('/broker/verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.message;
}
