import { useState } from "react";
import { useNavigate } from "react-router-dom";

import customAxios from "../api/axiosInstance.tsx";
import "../styles/PreferenceSetupPage.css";

// 취향 초기 설정 화면. 지금은 자리만 잡아둔 상태(실제 키워드 선택·매물 평가 UI는 아직 없음)이고,
// "메인으로 가기" 버튼 하나만 있다.
// (목업 onboarding.html은 키워드 선택/매물 평가/취향 분석 3단계 위저드까지 그려져 있지만,
//  그 실제 로직·API는 아직 없어서 지금은 그 카드 컨테이너(.onboarding-card) 스타일만 재사용하고
//  내용은 기존 "준비 중" 문구를 그대로 둔다. 실제 위저드가 붙을 때 이 파일을 그 흐름으로 바꾸면 된다.)
//
// 이 버튼을 누르면 서버에 취향 설정을 완료 처리한다(PATCH /member/preference/complete).
// 이렇게 해야 일반 사용자가 다음 로그인부터 이 화면을 다시 보지 않는다(preferenceCompleted=true).
// 나중에 실제 취향 설정 UI가 들어오면, 지금 이 "완료 처리" 호출을 그 흐름의 마지막 단계로 옮기면 된다.
function PreferenceSetupPage() {
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const goToMain = async () => {
        try {
            await customAxios.patch('/member/preference/complete');
            navigate('/');
        } catch (err) {
            console.error('취향 설정 완료 처리 중 오류가 발생했습니다.', err);
            setError('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Personalize</div>
                        <h1>취향 초기 설정</h1>
                        <p>
                            회원가입 이후 처음 한 번만 진행합니다. 선택한 값은 맞춤
                            추천의 기본 기준이 되며 마이페이지에서 언제든 바꿀 수
                            있습니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <div
                        className="onboarding-card"
                        style={{ maxWidth: 480, textAlign: "center" }}
                    >
                        <h2>취향 초기 설정</h2>
                        <p className="muted" style={{ marginTop: 12, marginBottom: 24 }}>
                            취향 초기 설정 기능은 아직 준비 중입니다.
                            <br />
                            지금은 메인 화면으로 이동해 주세요.
                        </p>

                        {error && (
                            <div className="preference-alert danger">{error}</div>
                        )}

                        <button
                            type="button"
                            className="solid-btn"
                            style={{ width: "100%" }}
                            onClick={goToMain}
                        >
                            메인으로 가기
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default PreferenceSetupPage;
