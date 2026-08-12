import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getNotifications } from "../api/myAgencyApi";
import type { Notification } from "../types/MyAgency";
import type { User } from "../types/User";
import { HEADER_NAV, USER_MENU, toViewerRole, visibleFor } from "../types/Navigation";
import { navigateOrNotice } from "../utils/navigateOrNotice";
import "../styles/SiteHeader.css";

type MenuItemsProps = {
   appName: string;
   user: User | null; // 이 데이터는 null일 수도 있습니다.
   handleLogout: (event: React.MouseEvent<HTMLElement>) => void;
};

// 알림을 다시 확인하는 주기(밀리초). 30초마다 서버에 물어본다.
//
// 서버가 먼저 알려 주는 방식(WebSocket, SSE)이 아니라 브라우저가 주기적으로 물어보는 방식(폴링)을 썼다.
// 상담 요청은 1초를 다투는 알림이 아니고, 폴링은 서버 설정을 따로 하지 않아도 되며
// 나중에 방식을 바꾸더라도 이 파일만 고치면 되기 때문이다.
const NOTIFICATION_INTERVAL = 30_000;

// 상단 고정 네비게이션 바.
// 메뉴 구성 자체는 types/Navigation.ts가 갖고 있고, 이 파일은 그것을 역할에 맞게 그리기만 한다.
function App({ user, handleLogout }: MenuItemsProps) {
   const navigate = useNavigate();
   const location = useLocation();

   // 중개인에게만 보이는 알림 목록
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const timerRef = useRef<number | undefined>(undefined);

   // 열려 있는 드롭다운. 한 번에 하나만 열리게 하려고 문자열 하나로 관리한다.
   const [openMenu, setOpenMenu] = useState<'none' | 'user' | 'noti'>('none');

   // 헤더 검색창 입력값. 지도 검색 페이지가 아직 없어서 지금은 안내만 띄운다.
   const [keyword, setKeyword] = useState('');

   const viewerRole = toViewerRole(user);
   const navItems = visibleFor(HEADER_NAV, viewerRole);
   const userMenuItems = visibleFor(USER_MENU, viewerRole);

   useEffect(() => {
      // 중개인이 아니면 알림을 조회하지 않는다 (서버도 중개인만 통과시킨다)
      if (user?.role !== "BROKER") {
         setNotifications([]);
         return;
      }

      const load = () => {
         getNotifications()
            .then((data) => setNotifications(data.content))
            .catch((error) => {
               // 알림은 부가 기능이라, 실패해도 화면 전체를 막지 않고 조용히 비워 둔다.
               console.error('알림을 불러오지 못했습니다.', error);
               setNotifications([]);
            });
      };

      load(); // 로그인 직후 한 번
      timerRef.current = window.setInterval(load, NOTIFICATION_INTERVAL);

      // 다른 화면으로 옮기거나 로그아웃하면 타이머를 정리한다
      return () => window.clearInterval(timerRef.current);
   }, [user]);

   // 다른 화면으로 이동하면 열려 있던 드롭다운을 닫는다.
   useEffect(() => {
      setOpenMenu('none');
   }, [location.pathname]);

   const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!keyword.trim()) {
         return;
      }
      // 지도 검색 페이지가 생기면 navigate(`/map?keyword=${keyword}`) 형태로 바꾼다.
      window.alert('"지도 검색" 화면은 준비 중입니다.');
   };

   return (
      <header className="site-header">
         <button className="brand" onClick={() => navigate('/')} aria-label="전세역전 홈으로">
            <span className="flip">전</span><span className="flip">세</span><span>역전</span>
         </button>

         <nav className="nav">
            {navItems.map((item) => (
               <button
                  // 중개인/관리자의 "매물 관리"처럼 label이 겹칠 수 있어 path까지 합쳐 키로 쓴다
                  key={`${item.label}-${item.path}`}
                  className={location.pathname === item.path ? 'here' : ''}
                  onClick={() => navigateOrNotice(item, navigate)}
               >
                  {item.label}
               </button>
            ))}
         </nav>

         <span className="spacer" />

         <form className="minisearch" onSubmit={submitSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
               <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
            </svg>
            <input
               type="text"
               placeholder="지역, 지하철, 단지명 검색"
               aria-label="검색"
               value={keyword}
               onChange={(e) => setKeyword(e.target.value)}
            />
         </form>

         {!user ? (
            // 비로그인
            <div className="auth">
               <button onClick={() => navigate('/member/login')}>로그인</button>
               <button className="btn-join" onClick={() => navigate('/member/signup')}>회원가입</button>
            </div>
         ) : (
            // 로그인
            <div className="auth">
               {/* 알림은 중개인만 받는다 (서버도 중개인만 통과시킨다) */}
               {user.role === 'BROKER' && (
                  <div className="menu-wrap">
                     <button
                        className="bell"
                        aria-label="알림"
                        onClick={() => setOpenMenu(openMenu === 'noti' ? 'none' : 'noti')}
                     >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                           <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                           <path d="M13.7 20a2 2 0 0 1-3.4 0" />
                        </svg>
                        {notifications.length > 0 && <span className="dot">{notifications.length}</span>}
                     </button>

                     {openMenu === 'noti' && (
                        <div className="dropdown wide">
                           <div className="head">알림 {notifications.length}건</div>

                           {notifications.length === 0 ? (
                              <div className="empty">새 알림이 없습니다.</div>
                           ) : (
                              notifications.map((notification) => (
                                 <button
                                    key={`${notification.type}-${notification.targetId}`}
                                    onClick={() => navigate(notification.linkPath)}
                                 >
                                    <div className="noti-title">{notification.title}</div>
                                    <div className="noti-msg">{notification.message}</div>
                                    <div className="noti-time">{notification.createdAt}</div>
                                 </button>
                              ))
                           )}

                           {notifications.length > 0 && (
                              <>
                                 <div className="divider" />
                                 <button onClick={() => navigate('/broker/mypage')}>모두 보기</button>
                              </>
                           )}
                        </div>
                     )}
                  </div>
               )}

               <div className="menu-wrap">
                  <button
                     style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                     onClick={() => setOpenMenu(openMenu === 'user' ? 'none' : 'user')}
                  >
                     <span className="avatar">{user.name.charAt(0)}</span>
                     {user.name} 님
                  </button>

                  {openMenu === 'user' && (
                     <div className="dropdown">
                        {userMenuItems.map((item) => (
                           <button
                              key={`${item.label}-${item.path}`}
                              onClick={() => navigateOrNotice(item, navigate)}
                           >
                              {item.label}
                           </button>
                        ))}
                        <div className="divider" />
                        <button onClick={handleLogout}>로그아웃</button>
                     </div>
                  )}
               </div>
            </div>
         )}
      </header>
   );
}

export default App;
