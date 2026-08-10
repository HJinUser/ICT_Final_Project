import { Navbar, Container, Nav } from "react-bootstrap";

import { useNavigate } from "react-router-dom";
import type { User } from "../types/User";

type MenuItemsProps = {
   appName: string;
   user: User | null; // 이 데이터는 null일 수도 있습니다.
   handleLogout: (event: React.MouseEvent<HTMLElement>) => void;
};


function App({ appName, user, handleLogout }: MenuItemsProps) {
   const navigate = useNavigate();

   // user 프롭스를 사용하여 상단에 보이는 메뉴를 분기 처리합니다.
   const renderMenu = () => {
      if (user) {
         // 로그인 상태 : 로그 아웃 메뉴만 노출
         return (
            <Nav.Link onClick={handleLogout}>로그 아웃</Nav.Link>
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

               {renderMenu()}
            </Nav>
         </Container>
      </Navbar >
   );
}

export default App;
