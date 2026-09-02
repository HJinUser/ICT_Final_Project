// 외부 컴포넌트 import하기
// import 컴포넌트이름 from '경로와 파일명';
import MenuItems from './ui/MenuItems';
import SiteFooter from './ui/SiteFooter';
import ChatWidget from './ui/ChatWidget';
import AppRoutes from './routes/AppRoutes';
import React, { useEffect, useState } from 'react';
import type { User, RefreshResponse } from './types/User';
import { useLocation, useNavigate } from 'react-router-dom';
import customAxios from './api/axiosInstance.tsx';
import { setAccessToken } from './api/tokenStore';

// 취향 초기 설정 화면의 주소. 가드가 이 주소로 되돌린다.
const PREFERENCE_SETUP_PATH = '/preference-setup';

/*
  취향 초기 설정을 마치지 않은 사용자에게도 열어 두어야 하는 주소.

  로그인과 회원가입을 막으면 계정을 바꿔 들어올 수 없고,
  소셜 로그인 도착 지점을 막으면 로그인 처리 자체가 끝나지 않는다.
  약관은 가입 과정에서 확인하는 문서라 함께 열어 둔다.
*/
const SETUP_ALLOWED_PATHS = [
    PREFERENCE_SETUP_PATH,
    '/member/login',
    '/member/signup',
    '/member/passwordless',
    '/oauth/callback',
    '/oauth/signup',
    '/terms',
];

function App() {
  const appName = "ICT Final Project";

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 매개변수 2개 (동작 2개), []는 한번만 하는 것을 의미
  useEffect(() => {
    customAxios.post<RefreshResponse>('/member/refresh', {}, { withCredentials: true })
        .then((res) => {
          const { accessToken, ...userData } = res.data;
          setAccessToken(accessToken);
          setUser(userData);
        })
        .catch(() => {
          // 쿠키가 없거나 만료됨 → 로그아웃 상태로 둔다
        })
        .finally(() => {
            setAuthLoading(false);
        });
  }, []);


  // 로그인 성공시 처리해야 할 동작을 명시하는 함수
  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    console.log('로그인 성공');
  };

  /*
    취향 초기 설정을 마쳤을 때 로그인 정보를 갱신하는 함수.

    서버에서는 완료로 바뀌었지만 화면이 들고 있는 사용자 정보는 아직 미완료 상태다.
    이것을 함께 바꾸지 않으면 아래 가드가 계속 초기 설정 화면으로 되돌려서,
    설정을 마치고도 빠져나가지 못하고 같은 화면을 반복해서 보게 된다.
  */
  const handlePreferenceComplete = () => {
    setUser((previous) => {
      if (!previous) return previous;
      return { ...previous, preferenceCompleted: true };
    });
  };

  const navigate = useNavigate();
  const location = useLocation();

  /*
    취향 초기 설정을 마치지 않은 일반 사용자를 그 화면으로 되돌리는 가드.

    로그인 직후에만 보내면 주소창에 다른 주소를 직접 쳐서 빠져나갈 수 있다.
    회원가입 뒤 첫 로그인이라면 반드시 거치게 해야 하므로 주소가 바뀔 때마다 확인한다.

    중개인과 관리자는 맞춤 추천을 쓰지 않으므로 대상이 아니다.
  */
  useEffect(() => {
    if (!user || user.role !== 'USER' || user.preferenceCompleted) {
      return;
    }

    const allowed = SETUP_ALLOWED_PATHS.some((path) => location.pathname.startsWith(path));

    if (!allowed) {
      navigate(PREFERENCE_SETUP_PATH, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // 사용자가 '로그 아웃' 메뉴 클릭
  const handleLogout = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();

    try {
      // 서버에 저장된 refresh token 을 지워서 이후 그 토큰으로 재발급이 안 되게 만든다.
      await customAxios.post('/member/logout');
    } catch (error) {
      // 서버 호출이 실패해도(네트워크 오류 등) 로컬 로그아웃은 계속 진행한다.
      console.error('서버 로그아웃 처리 중 오류가 발생했습니다.', error);
    }

    setUser(null);
    setAccessToken(null);
    console.log('로그 아웃 성공');
    navigate('/member/login');
  };

  /*
    취향 초기 설정 화면에서는 상단 메뉴와 아래 안내를 감춘다.

    설정을 반드시 거치게 해 놓고 메뉴를 그대로 두면, 눌렀다가 곧바로 되돌아오는 일이 반복되어
    화면이 고장 난 것처럼 보인다. 아예 나갈 곳을 보여 주지 않는 편이 덜 혼란스럽다.
    로그아웃은 메뉴가 아니라 이 화면 안에 두지 않았으므로, 계정을 바꾸려면 로그인 화면 주소로 간다.
  */
  const inPreferenceSetup = location.pathname.startsWith(PREFERENCE_SETUP_PATH);

    if (authLoading) {
        return null;
    }

  return (
    <>
      {!inPreferenceSetup && (
        <MenuItems appName={appName} user={user} handleLogout={handleLogout} />
      )}
      <AppRoutes
        user={user}
        handleLoginSuccess={handleLoginSuccess}
        handlePreferenceComplete={handlePreferenceComplete}
      />
      {!inPreferenceSetup && <SiteFooter />}
      {/*
        AI 챗봇. 헤더·푸터와 같은 자리에 두어 어느 화면에서든 오른쪽 아래에 떠 있게 한다.
        취향 초기 설정 화면에서만 감추는 것은 위 메뉴·푸터와 같은 이유다.
        그 화면은 설정을 마치기 전까지 다른 곳으로 나갈 수 없어야 한다.
      */}
      {!inPreferenceSetup && <ChatWidget user={user} />}
    </>
  );
}

export default App;
