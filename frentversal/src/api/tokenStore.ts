// accessToken을 localStorage가 아니라 JS 메모리에만 들고 있는다.
// 새로고침하면 사라지는 게 정상 — 그 복구는 App.tsx가 /member/refresh로 처리한다(쿠키가 자동으로 실려 감).
// refreshToken은 여기서 아예 다루지 않는다: 백엔드가 httpOnly 쿠키로만 관리하므로 JS가 값을 볼 일 자체가 없다.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null): void {
    accessToken = token;
}