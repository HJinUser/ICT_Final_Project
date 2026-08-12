import './App.css';

// 외부 컴포넌트 import하기
// import 컴포넌트이름 from '경로와 파일명';
import MenuItems from './ui/MenuItems';
import SiteFooter from './ui/SiteFooter';
import AppRoutes from './routes/AppRoutes';
import React, { useEffect, useState } from 'react';
import type { User } from './types/User';
import { useNavigate } from 'react-router-dom';
import customAxios from './api/axiosInstance.tsx';


function App() {
  const appName = "ICT Final Project";

  const [user, setUser] = useState<User | null>(null);

  // 매개변수 2개 (동작 2개), []는 한번만 하는 것을 의미
  useEffect(() => {
    const loginUser = localStorage.getItem('user');

    // 타입을 확인하는 함수
    if (typeof loginUser === 'string') {
      const parsed = JSON.parse(loginUser);
      setUser(parsed);
    }
  }, []);



  // 로그인 성공시 처리해야 할 동작을 명시하는 함수
  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('로그인 성공');
  };

  const navigate = useNavigate();

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
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // 로그아웃 시 저장된 refresh token 도 함께 제거한다
    console.log('로그 아웃 성공');
    navigate('/member/login');
  };

  return (
    <>
      <MenuItems appName={appName} user={user} handleLogout={handleLogout} />
      <AppRoutes user={user} handleLoginSuccess={handleLoginSuccess} />
      <SiteFooter />
    </>
  );
}

export default App;
