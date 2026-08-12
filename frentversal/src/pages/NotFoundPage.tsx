import { useNavigate } from "react-router-dom";

import "../styles/NotFoundPage.css";

// 라우트에 등록되지 않은 주소로 들어왔을 때 보여 주는 화면.
// 이게 없으면 주소를 잘못 입력했을 때 헤더/푸터만 있고 가운데가 빈 화면이 나와서
// 사용자가 무엇이 잘못됐는지 알 수 없다.
function App() {
    const navigate = useNavigate();

    return (
        <div className="notfound">
            <div className="code rv-num">404</div>
            <h2>찾으시는 화면이 없습니다</h2>
            <p>주소가 바뀌었거나, 아직 준비 중인 화면일 수 있습니다.</p>

            <div className="actions">
                <button className="auth-solid-btn" onClick={() => navigate('/')}>홈으로 가기</button>
                <button className="auth-outline-btn" onClick={() => navigate(-1)}>이전 화면으로</button>
            </div>
        </div>
    );
};

export default App;
