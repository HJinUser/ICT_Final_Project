import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { NavItem } from '../types/Navigation';
import type { User } from '../types/User';
import { navigateOrNotice } from '../utils/navigateOrNotice';

// 관리자 콘솔의 껍데기(레이아웃).
//
// 프로토타입(admin.html)처럼 왼쪽 사이드바로 관리 기능을 오간다.
// 실제 화면은 각 하위 라우트가 그리고, 이 파일은 사이드바와 자리만 잡는다(<Outlet/>).
//
// 아직 만들지 않은 메뉴는 ready: false 로 두면 navigateOrNotice 가 "준비 중" 안내만 띄우고
// 이동을 막는다. 헤더 메뉴와 같은 방식이라, 나중에 화면이 생기면 ready 만 true 로 바꾸고
// AppRoutes 에 라우트를 추가하면 된다.

interface Props {
    user: User | null;
}

// 사이드바 메뉴. 순서와 이름은 프로토타입을 그대로 따랐다.
const ADMIN_MENU: NavItem[] = [
    { label: '대시보드(통계)', path: '/admin/dashboard', ready: false },
    { label: '회원 관리', path: '/admin/members', ready: false },
    { label: '중개인 인증 심사', path: '/admin/brokers', ready: true },
    { label: '매물 관리', path: '/admin/properties', ready: true },
    { label: '동네 관리', path: '/admin/neighborhoods', ready: true },
    { label: '신고/한줄평 관리', path: '/admin/reports', ready: true },
    { label: '모델 관리', path: '/admin/models', ready: true },
    // 공지사항은 사용자도 보는 화면이라 콘솔 밖(/notice)에 있다.
    // 관리자에게는 그 화면에서 작성·수정 버튼이 함께 보인다.
    { label: '공지사항 관리', path: '/notice', ready: true },
];

function AdminConsolePage({ user }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    // 관리자가 아니면 홈으로 보낸다 (서버에서도 /admin/** 을 관리자만 통과시킨다)
    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user) {
        return (
            <main>
                <section className="section"><div className="wrap">
                    <p className="dim">로그인이 필요한 화면입니다.</p>
                    <Link className="solid-btn" to="/member/login" style={{ marginTop: 14, display: 'inline-block' }}>
                        로그인하러 가기
                    </Link>
                </div></section>
            </main>
        );
    }

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Admin Console</div>
                        <h1>관리자 콘솔</h1>
                        <p>중개인 인증, 매물 승인, 신고, 공지사항을 한곳에서 관리합니다.</p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    <div className="app-layout">
                        <aside className="sidebar">
                            <div className="side-title">관리 메뉴</div>

                            <div className="side-nav">
                                {ADMIN_MENU.map((item) => (
                                    <button
                                        key={item.path}
                                        className={location.pathname === item.path ? 'on' : ''}
                                        onClick={() => navigateOrNotice(item, navigate)}
                                    >
                                        {item.label}<span>›</span>
                                    </button>
                                ))}
                            </div>

                            <div className="side-note">
                                관리 작업과 상태 변경은 서버에서 관리자 권한을 확인한 뒤 실행됩니다.
                            </div>
                        </aside>

                        {/* 선택한 메뉴의 화면이 이 자리에 그려진다 */}
                        <div>
                            <Outlet />
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default AdminConsolePage;
