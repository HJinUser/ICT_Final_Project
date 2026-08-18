import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getNotifications } from "../api/notificationApi";
import type { Notification } from "../types/Notification";
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
// 서버가 먼저 알려 주는 방식(WebSocket, SSE)이 아니라 브라우저가 주기적으로 물어보는 방식(폴링)을 썼다.
// 상담 요청은 1초를 다투는 알림이 아니고, 폴링은 서버 설정을 따로 하지 않아도 되며
// 나중에 방식을 바꾸더라도 이 파일만 고치면 되기 때문이다.
const NOTIFICATION_INTERVAL = 30_000;

// 알림을 마지막으로 확인한 시각을 보관하는 자리 (회원마다 따로).
//
// 알림 자체는 서버가 그때그때 모아서 주고 "읽음" 여부를 저장하지 않는다.
// 상담·리뷰·승인은 처리하면 목록에서 사라지지만, 공지사항은 그런 계기가 없어서
// 배지 숫자가 계속 남는다. 그래서 "종을 눌러 확인한 시점"을 브라우저에 적어 두고,
// 그보다 나중에 생긴 알림만 새 것으로 센다.
const SEEN_AT_KEY = (memberId: number) => `notificationsSeenAt:${memberId}`;

// 알림 목록 아래에 붙는 "모두 보기" 링크. 역할마다 가야 할 화면이 다르다.
const NOTIFICATION_MORE: Record<User['role'], { label: string; path: string }> = {
   USER: { label: '내 상담 보기', path: '/my-consultations' },
   BROKER: { label: '모두 보기', path: '/broker/mypage' },
   ADMIN: { label: '매물 관리로 이동', path: '/admin/properties' },
};

// 상단 고정 네비게이션 바.
// 메뉴 구성 자체는 types/Navigation.ts가 갖고 있고, 이 파일은 그것을 역할에 맞게 그리기만 한다.
function App({ user, handleLogout }: MenuItemsProps) {
   const navigate = useNavigate();
   const location = useLocation();

   // 로그인한 사용자에게 보이는 알림 목록.
   // 담기는 항목은 서버가 역할에 맞게 정한다.
   //   공통   : 최근 공지사항, 내가 보낸 상담에 도착한 답변
   //   중개인 : 미답변 상담 요청, 미답변 리뷰
   //   관리자 : 승인 대기 매물, 심사 대기 인증 신청
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const timerRef = useRef<number | undefined>(undefined);

   // 마지막으로 알림을 확인한 시각. 이 값보다 나중에 생긴 알림만 배지에 센다.
   const [seenAt, setSeenAt] = useState('');

   // 열려 있는 드롭다운. 한 번에 하나만 열리게 하려고 문자열 하나로 관리한다.
   const [openMenu, setOpenMenu] = useState<'none' | 'user' | 'noti'>('none');

   // 헤더 검색창 입력값. 지도 검색 페이지가 아직 없어서 지금은 안내만 띄운다.
   const [keyword, setKeyword] = useState('');

   const viewerRole = toViewerRole(user);
   const navItems = visibleFor(HEADER_NAV, viewerRole);
   const userMenuItems = visibleFor(USER_MENU, viewerRole);

   useEffect(() => {
      // 비로그인 상태에서는 알림을 조회하지 않는다 (서버도 로그인한 사람만 통과시킨다).
      //
      // 중개인만 거르지 않는 이유: 알림은 이제 역할별로 담기는 내용이 다르다.
      //   공통   : 공지사항, 내가 보낸 상담의 답변
      //   중개인 : 미답변 상담 요청·리뷰
      //   관리자 : 승인 대기 매물, 심사 대기 인증 신청
      // 어떤 항목을 담을지는 서버(NotificationService)가 정하므로 여기서 역할을 가리지 않는다.
      if (!user) {
         setNotifications([]);
         return;
      }

      // 이 회원이 알림을 마지막으로 확인한 시각을 불러온다
      setSeenAt(window.localStorage.getItem(SEEN_AT_KEY(user.id)) ?? '');

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

   // 아직 확인하지 않은 알림 개수.
   // 시각은 "2026-08-13 14:30" 형태라 문자열끼리 비교해도 시간 순서가 맞는다.
   // 시각이 없는 알림은 새 것인지 알 수 없으므로 세지 않는다(배지가 영영 안 사라지는 것을 막는다).
   const unreadCount = notifications.filter(
      (item) => item.createdAt && item.createdAt > seenAt,
   ).length;

   // 종을 눌러 목록을 펼치면 "여기까지 확인했다"고 적어 둔다.
   const toggleNotifications = () => {
      const opening = openMenu !== 'noti';

      setOpenMenu(opening ? 'noti' : 'none');

      if (!opening || !user || notifications.length === 0) return;

      // 지금 목록에서 가장 최근 시각을 확인 지점으로 삼는다
      const newest = notifications
         .map((item) => item.createdAt)
         .filter(Boolean)
         .sort()
         .at(-1);

      if (!newest) return;

      window.localStorage.setItem(SEEN_AT_KEY(user.id), newest);
      setSeenAt(newest);
   };

   const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!keyword.trim()) {
         return;
      }

      // 지도 검색이 keyword 를 지역 필터로 받는다
      navigate(`/map?keyword=${encodeURIComponent(keyword.trim())}`);
   };

   return (
      <header className="site-header">
         <button className="brand" onClick={() => navigate('/')} aria-label="전세역전 홈으로">
            <span className="flip"><span className="face">전</span><span className="face face-back">전</span></span>
            <span className="flip"><span className="face">세</span><span className="face face-back">세</span></span>
            <span>역전</span>
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
               {/* ── 알림 (로그인한 사용자 전체) ─────────────────────
                   종 모양을 누르면 목록이 펼쳐지고, 항목을 누르면 해당 화면으로 이동한다.
                     [공지] 제목      -> 공지 상세 (누구나)
                     상담 답변       -> 내 상담 화면 (누구나)
                     상담 요청·리뷰   -> 답변 화면 (중개인)
                     승인·인증 대기   -> 관리 화면 (관리자)
                   처리하고 나면 목록에서 사라지므로 따로 "읽음" 처리를 하지 않는다. */}
               <div className="menu-wrap">
                  <button
                     className="bell"
                     aria-label="알림"
                     onClick={toggleNotifications}
                  >
                     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                        <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                        <path d="M13.7 20a2 2 0 0 1-3.4 0" />
                     </svg>
                     {/* 확인하지 않은 알림이 있을 때만 숫자를 띄운다.
                         목록을 한 번 펼쳐 보면 사라지고, 새 알림이 오면 다시 생긴다. */}
                     {unreadCount > 0 && <span className="dot">{unreadCount}</span>}
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
                              <button onClick={() => navigate(NOTIFICATION_MORE[user.role].path)}>
                                 {NOTIFICATION_MORE[user.role].label}
                              </button>
                           </>
                        )}
                     </div>
                  )}
               </div>

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
