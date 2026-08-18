import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "../types/User";
import type { RecentLoginMethod } from "../types/RecentLogin";
import { saveRecentLogin, takePendingSocial } from "../utils/recentLogin";

interface Props {
    // onLogin 프롭스는 User 형식으로 매개 변수를 받고, 반환 타입이 없습니다.
    onLogin: (user: User) => void;
}

// OAuth2LoginSuccessHandler(백엔드)가 카카오 로그인 성공 후 리다이렉트시키는 도착 지점.
// 일반 LoginPage.handleLogin이 axios 응답에서 하던 일(토큰 저장, onLogin 호출)을
// 여기서는 URL 쿼리 파라미터에서 꺼내서 똑같이 한다.
function App({ onLogin }: Props) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const id = searchParams.get('id');
        const name = searchParams.get('name');
        const email = searchParams.get('email');
        const role = searchParams.get('role');
        const preferenceCompleted = searchParams.get('preferenceCompleted');

        if (!accessToken || !refreshToken || !id || !name || !email || !role || preferenceCompleted === null) {
            alert('소셜 로그인 처리 중 오류가 발생했습니다.');
            navigate('/member/login');
            return;
        }

        const userData: User = {
            id: Number(id),
            name,
            email,
            role: role as User['role'],
            preferenceCompleted: preferenceCompleted === 'true',
        };

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        // 로그인 화면에서 눌렀던 소셜 제공자를 꺼내 "최근 로그인"으로 남긴다.
        // 제공자를 알 수 없는 경우(주소로 직접 들어온 경우 등)에는 남기지 않는다.
        const provider = takePendingSocial();
        if (provider === 'kakao' || provider === 'naver' || provider === 'google') {
            saveRecentLogin(provider as RecentLoginMethod, userData.email);
        }

        onLogin(userData);

        // 일반 로그인(LoginPage)과 동일한 규칙: 일반 사용자(USER)가 아직 취향 초기 설정을 안 했으면 그 화면으로 먼저 보낸다.
        if (userData.role === 'USER' && !userData.preferenceCompleted) {
            navigate('/preference-setup');
        } else {
            navigate('/');
        }
        // 이 페이지는 리다이렉트로 딱 한 번 들어오는 화면이라 최초 진입 시 한 번만 실행한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="text-center py-5">
            로그인 처리 중입니다...
        </div>
    );
};

export default App;
