/*
  메인 홈페이지 - 맞춤 추천 미리보기 블록.

  역할과 상관없이 로그인한 회원이면 모두 볼 수 있고,
  비회원에게는 블록 자체는 그대로 보여 주되 내용을 가리고 로그인 안내를 얹는다.
  (화면 구조를 역할마다 다르게 만들지 않으려고 숨기지 않고 잠그는 쪽을 택했다.)
*/

import { useNavigate } from 'react-router-dom';

import type { HomeRecommendation } from '../types/Home';
import type { NavItem } from '../types/Navigation';
import type { User } from '../types/User';
import { navigateOrNotice } from '../utils/navigateOrNotice';

// 맞춤 추천 페이지는 아직 없다. 만들어지면 ready를 true로 바꾼다.
const RECOMMEND_ITEM: NavItem = { label: '맞춤 추천', path: '/recommend', ready: false };

interface Props {
    id: string;
    // 구역 배경색 클래스(tone-gray / tone-white).
    // 교대 순서는 HomePage가 한 곳에서 정해 내려 준다.
    tone: string;
    user: User | null;
    items: HomeRecommendation[];
}

function HomeRecommend({ id, tone, user, items }: Props) {
    const navigate = useNavigate();

    const locked = !user;

    if (items.length === 0) {
        return null;
    }

    return (
        <section className={`home-sec ${tone}`} id={id}>
            <div className="rv-wrap">
                <div className="home-shead">
                    <div>
                        <h2>회원님 취향에 맞춘 집</h2>
                        <p>
                            취향 초기 설정, 최근 검색, 관심 매물, 평가 기록을 종합해 골랐습니다.
                            취향을 바꾸면 결과도 바로 달라집니다.
                        </p>
                    </div>

                    {!locked && (
                        <button className="home-more" onClick={() => navigateOrNotice(RECOMMEND_ITEM, navigate)}>
                            추천 전체 보기
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="home-lockwrap">
                    {/* 비회원에게는 흐리게 처리하고 클릭도 막는다 */}
                    <div className={`home-reclist${locked ? ' blurred' : ''}`} aria-hidden={locked}>
                        {items.map((item) => (
                            <button
                                key={item.id}
                                className="home-reccard"
                                tabIndex={locked ? -1 : 0}
                                onClick={() => {
                                    if (locked) {
                                        return;
                                    }
                                    navigate(`/property/${item.id}`);
                                }}
                            >
                                <div className="ph" style={{ backgroundImage: `url('${item.imageUrl}')` }} />

                                <div className="pb">
                                    <div className="price">{item.priceLabel}</div>
                                    <div className="meta">{item.summary}</div>

                                    <div className="home-fit">
                                        <div className="bar">
                                            <div className="on" style={{ width: `${item.fitScore}%` }} />
                                        </div>
                                        <span className="rv-num val">{item.fitScore}%</span>
                                    </div>

                                    <p className="why">{item.reason}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {locked && (
                        <div className="home-lock">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                                <rect x="4" y="10" width="16" height="10" rx="2" />
                                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            </svg>
                            <strong>로그인 후 이용 가능한 서비스입니다.</strong>
                            <p>
                                로그인하고 집 몇 개만 평가해 두면, 그 기준으로 골라 보여드립니다.
                            </p>
                            <div className="btns">
                                <button className="solid-btn" onClick={() => navigate('/member/login')}>
                                    로그인
                                </button>
                                <button className="ghost-btn" onClick={() => navigate('/member/signup')}>
                                    회원가입
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default HomeRecommend;
