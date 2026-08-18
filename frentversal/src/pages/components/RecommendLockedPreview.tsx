/*
  비회원에게 보여 주는 맞춤 추천 잠금 화면.

  화면을 아예 막고 로그인으로 보내면 무엇을 주는 서비스인지 모른 채 떠나게 된다.
  그래서 화면 구조는 그대로 보여 주되 내용만 흐리게 가리고 그 위에 안내를 얹는다.
  메인 홈페이지의 맞춤 추천 블록도 같은 방식이라 두 화면이 같은 경험을 준다.

  흐리게 가리는 자리에는 실제 매물 자료를 쓰지 않는다.
  비회원은 추천 API 를 부를 수 없어 값을 받아올 수 없고,
  그렇다고 없는 매물을 지어내 보여 주면 흐림이 걷혔을 때 사실과 다른 화면이 되기 때문이다.
  그래서 자리와 크기만 잡은 빈 틀을 깔아 둔다.

  가려 둔 부분은 흐리기만 해서는 안 되고 눌리지도 않아야 한다.
  보이지 않는 버튼이 눌리면 비회원이 무슨 일이 일어났는지 알 수 없다.
*/

import { useNavigate } from 'react-router-dom';

import '../../styles/RecommendLockedPreview.css';

// 흐린 배경에 깔아 둘 빈 카드 수. 로그인 후 보게 될 추천 카드 수와 같게 맞춘다.
const SKELETON_COUNT = 3;

function RecommendLockedPreview() {
    const navigate = useNavigate();

    return (
        <div className="reclock-wrap">
            {/* 흐리게 처리된 빈 틀. 읽을 내용이 없으므로 보조기기에서는 건너뛴다. */}
            <div className="reclock-skeleton" aria-hidden="true">
                <aside className="reclock-side">
                    <div className="bar title" />
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div className="block" key={index}>
                            <div className="bar label" />
                            <div className="chips">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    ))}
                </aside>

                <div className="reclock-main">
                    {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                        <div className={index === 0 ? 'card wide' : 'card'} key={index}>
                            <div className="photo" />
                            <div className="body">
                                <div className="bar short" />
                                <div className="bar price" />
                                <div className="bar" />
                                <div className="chips">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 흐린 화면 위에 얹는 안내 */}
            <div className="reclock-notice">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>

                <strong>로그인 후 이용 가능한 서비스입니다.</strong>
                <p>
                    로그인하고 원하는 조건을 몇 가지만 골라 두면, 그 기준에 맞는 집을 찾아 드립니다.
                </p>

                <div className="btns">
                    <button type="button" className="solid-btn" onClick={() => navigate('/member/login')}>
                        로그인
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => navigate('/member/signup')}>
                        회원가입
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RecommendLockedPreview;
