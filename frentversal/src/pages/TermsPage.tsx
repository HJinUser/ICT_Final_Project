import { useNavigate, useParams } from "react-router-dom";

import TermsBody from "../components/TermsBody";
import { TERMS_DOCS, findTerms } from "../types/Terms";
import "../styles/Terms.css";

/*
  약관 전문 화면. 두 가지 주소로 들어온다.
    /terms         → 서비스 이용약관(첫 번째 약관)
    /terms/:code   → 해당 약관 (예: /terms/privacy)

  회원가입 화면에서도 같은 내용을 펼쳐 볼 수 있지만, 가입 전이나 가입 후에
  다시 확인할 자리가 필요해서 별도 화면을 둔다. 푸터에서 여기로 연결된다.
*/
function App() {
    const { code } = useParams();
    const navigate = useNavigate();

    // 주소에 코드가 없으면 첫 번째 약관(서비스 이용약관)을 보여준다.
    const current = findTerms(code) ?? TERMS_DOCS[0];

    // 주소는 있는데 그런 약관이 없는 경우(오타 등)에만 안내한다.
    const notFound = !!code && !findTerms(code);

    return (
        <div className="terms-page">
            <h1>약관 및 정책</h1>
            <p className="lead">
                전세역전 서비스 이용과 개인정보 처리에 관한 내용입니다.
                회원가입 시 동의하신 항목을 여기에서 다시 확인할 수 있습니다.
            </p>

            <div className="terms-tabs">
                {TERMS_DOCS.map((doc) => (
                    <button
                        key={doc.code}
                        type="button"
                        className={doc.code === current.code && !notFound ? 'on' : ''}
                        onClick={() => navigate(`/terms/${doc.code}`)}
                    >
                        {doc.title}
                    </button>
                ))}
            </div>

            {notFound ? (
                <div className="terms-doc-head">
                    <h2>없는 약관입니다</h2>
                    <p className="terms-meta">위 목록에서 확인하실 약관을 골라 주세요.</p>
                </div>
            ) : (
                <>
                    <div className="terms-doc-head">
                        <h2>{current.title}</h2>
                        <p className="terms-meta">{current.version} · {current.effectiveDate} 시행</p>
                    </div>

                    <TermsBody sections={current.sections} />
                </>
            )}
        </div>
    );
};

export default App;
