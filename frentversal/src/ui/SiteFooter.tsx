import { useNavigate } from "react-router-dom";

import { FOOTER_GROUPS } from "../types/Navigation";
import { navigateOrNotice } from "../utils/navigateOrNotice";
import "../styles/SiteFooter.css";

// 화면 맨 아래 안내메뉴.
// 메뉴 구성은 types/Navigation.ts의 FOOTER_GROUPS가 갖고 있고, 여기서는 그리기만 한다.
// 아직 만들지 않은 페이지는 navigateOrNotice가 "준비 중" 안내로 대신 처리한다.
function App() {
    const navigate = useNavigate();

    return (
        <footer className="site-footer">
            <div className="rv-wrap">
                <div className="fgrid">
                    <div>
                        <div className="brand">
                            <span className="flip">전</span><span className="flip">세</span><span>역전</span>
                        </div>
                        <p className="intro">
                            공공 실거래가를 바탕으로 동네 시세를 파악하고, 취향에 맞는 집을 골라 드립니다.
                        </p>
                    </div>

                    {FOOTER_GROUPS.map((group) => (
                        <div key={group.title}>
                            <h4>{group.title}</h4>
                            {group.items.map((item) => (
                                <button
                                    key={`${group.title}-${item.label}`}
                                    onClick={() => navigateOrNotice(item, navigate)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="fbot">
                    <span>공공 실거래가 기반 시세 예측 서비스입니다.</span>
                    <span>&copy; 2026 전세역전</span>
                </div>
            </div>
        </footer>
    );
};

export default App;
