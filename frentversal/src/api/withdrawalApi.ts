import customAxios from './axiosInstance';

// 회원 탈퇴. 비밀번호가 있는 계정만 password로 본인 확인하고,
// 없는 계정(소셜·중개인)은 빈 문자열을 보내도 서버가 알아서 건너뛴다.
export async function withdrawMember(password: string): Promise<void> {
    await customAxios.post('/member/withdrawal', { password });
}