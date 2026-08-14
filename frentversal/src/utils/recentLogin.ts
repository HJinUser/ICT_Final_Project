/*
  최근 로그인 수단을 저장하고 읽어 오는 함수 모음.

  로그인 화면에서 "지난번에는 이 방법으로 들어왔습니다"를 보여 주기 위한 것이다.
  저장 위치는 localStorage 이고, 담는 값은 로그인 수단과 이메일뿐이다.
  (비밀번호·토큰은 담지 않는다. 토큰은 기존대로 accessToken/refreshToken 키가 따로 관리한다)
*/

import type { RecentLogin, RecentLoginMethod } from '../types/RecentLogin';

const STORAGE_KEY = 'recentLogin';

// 소셜 로그인은 페이지를 완전히 떠났다가 돌아오기 때문에, 어떤 제공자를 눌렀는지
// 버튼을 누르는 순간 여기에 적어 두었다가 돌아왔을 때 꺼내 쓴다.
const PENDING_SOCIAL_KEY = 'pendingSocialProvider';

export function saveRecentLogin(method: RecentLoginMethod, email: string): void {
    try {
        const value: RecentLogin = { method, email, savedAt: new Date().toISOString() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
        // 사생활 보호 모드 등으로 저장이 막혀도 로그인 자체는 계속돼야 한다.
        console.error('최근 로그인 정보를 저장하지 못했습니다.', error);
    }
}

export function loadRecentLogin(): RecentLogin | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<RecentLogin>;
        if (!parsed || typeof parsed.method !== 'string' || typeof parsed.email !== 'string') {
            return null;
        }

        return {
            method: parsed.method as RecentLoginMethod,
            email: parsed.email,
            savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
        };
    } catch (error) {
        // 값이 깨져 있으면 없는 것으로 본다 (화면은 그냥 안내를 감춘다)
        console.error('최근 로그인 정보를 읽지 못했습니다.', error);
        return null;
    }
}

export function clearRecentLogin(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('최근 로그인 정보를 지우지 못했습니다.', error);
    }
}

// ── 소셜 로그인 제공자 임시 보관 ─────────────────────────────

export function markPendingSocial(provider: string): void {
    try {
        sessionStorage.setItem(PENDING_SOCIAL_KEY, provider);
    } catch (error) {
        console.error('소셜 로그인 제공자를 기록하지 못했습니다.', error);
    }
}

// 한 번 읽으면 지운다. 다음 로그인에 잘못 남는 것을 막기 위해서다.
export function takePendingSocial(): string | null {
    try {
        const provider = sessionStorage.getItem(PENDING_SOCIAL_KEY);
        sessionStorage.removeItem(PENDING_SOCIAL_KEY);
        return provider;
    } catch (error) {
        console.error('소셜 로그인 제공자를 읽지 못했습니다.', error);
        return null;
    }
}
