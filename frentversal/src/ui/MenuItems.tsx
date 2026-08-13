import { useEffect, useRef, useState } from "react";
import { Navbar, Container, Nav, Badge, Dropdown } from "react-bootstrap";

import { useNavigate } from "react-router-dom";
import { getNotifications } from "../api/myAgencyApi";
import type { Notification } from "../types/MyAgency";
import type { User } from "../types/User";

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

function App({ appName, user, handleLogout }: MenuItemsProps) {
   const navigate = useNavigate();

   // 중개인에게만 보이는 알림 목록
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const timerRef = useRef<number | undefined>(undefined);

   useEffect(() => {
      // 중개인이 아니면 알림을 조회하지 않는다 (서버도 중개인만 통과시킨다)
      if (user?.role !== "BROKER") {
         return;
      }

      const load = () => {
         getNotifications().then((data) => setNotifications(data.content));
      };

      load(); // 로그인 직후 한 번
      timerRef.current = window.setInterval(load, NOTIFICATION_INTERVAL);

      // 다른 화면으로 옮기거나 로그아웃하면 타이머를 정리한다
      return () => window.clearInterval(timerRef.current);
   }, [user]);

   // user 프롭스를 사용하여 상단에 보이는 메뉴를 분기 처리합니다.
   const renderMenu = () => {
      if (user) {
         // 로그인 상태 : 관리자는 관리 메뉴가 추가되고, 공통으로 로그아웃을 노출한다.
         return (
            <>
               {user.role === 'ADMIN' && (
                  <Nav.Link onClick={() => navigate('/admin/reports')}>신고 관리</Nav.Link>
               )}
               <Nav.Link onClick={handleLogout}>로그 아웃</Nav.Link>
            </>
         );
      }
      // 비로그인 상태 : 로그인 / 회원 가입 메뉴 노출
      return (
         <>
            <Nav.Link onClick={() => navigate(`/member/login`)}>로그인</Nav.Link>
            <Nav.Link onClick={() => navigate(`/member/signup`)}>회원 가입</Nav.Link>
         </>
      );
   };

   return (
      <Navbar bg="dark" variant="dark" expand="lg">
         <Container>
            <Navbar.Brand href='/'>{appName}</Navbar.Brand>
            <Nav className="me-auto">
               {/* 로그인 여부와 상관없이 항상 보이는 메뉴 */}
               <Nav.Link onClick={() => navigate(`/agency`)}>중개사무소 안내</Nav.Link>
               <Nav.Link onClick={() => navigate('/neighborhood')}>동네 탐색</Nav.Link>
               <Nav.Link onClick={() => navigate('/report/history')}>신고 처리 내역</Nav.Link>

               {/* 중개인에게만 보이는 메뉴 */}
               {user?.role === "BROKER" && (
                  <Nav.Link onClick={() => navigate(`/broker/mypage`)}>마이페이지</Nav.Link>
               )}

               <Nav.Link onClick={() => navigate('/notice')}>공지사항</Nav.Link>
               {renderMenu()}
            </Nav>

            {/* ── 알림 (중개인 전용) ─────────────────────────────
                종 모양을 누르면 목록이 펼쳐지고, 항목을 누르면 해당 화면으로 이동한다.
                답변을 하면 목록에서 사라지므로 따로 "읽음" 처리를 하지 않는다. */}
            {user?.role === "BROKER" && (
               <Dropdown align="end">
                  <Dropdown.Toggle variant="dark" id="notification-menu" className="border-0">
                     🔔
                     {notifications.length > 0 && (
                        <Badge bg="danger" className="ms-1">{notifications.length}</Badge>
                     )}
                  </Dropdown.Toggle>

                  <Dropdown.Menu style={{ minWidth: 320, maxHeight: 420, overflowY: "auto" }}>
                     <Dropdown.Header>알림 {notifications.length}건</Dropdown.Header>

                     {notifications.length === 0 && (
                        <Dropdown.ItemText className="text-muted small">새 알림이 없습니다.</Dropdown.ItemText>
                     )}

                     {notifications.map((notification) => (
                        <Dropdown.Item
                           key={`${notification.type}-${notification.targetId}`}
                           onClick={() => navigate(notification.linkPath)}
                        >
                           <div className="fw-bold small">{notification.title}</div>
                           <div className="text-muted small text-wrap">{notification.message}</div>
                           <div className="text-muted" style={{ fontSize: 11 }}>{notification.createdAt}</div>
                        </Dropdown.Item>
                     ))}

                     {notifications.length > 0 && (
                        <>
                           <Dropdown.Divider />
                           <Dropdown.Item onClick={() => navigate("/broker/mypage")}>모두 보기</Dropdown.Item>
                        </>
                     )}
                  </Dropdown.Menu>
               </Dropdown>
            )}
         </Container>
      </Navbar >
   );
}

export default App;
