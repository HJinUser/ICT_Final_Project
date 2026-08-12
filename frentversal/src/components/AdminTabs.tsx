import { Link, useLocation } from 'react-router-dom';

// 관리자 화면들 사이를 오가는 탭.
//
// 상단바의 관리자 메뉴는 화면정의서대로 "매물 관리" 하나만 두고,
// 관리자 화면 안에서는 이 탭으로 옮겨 다니게 한다.
const ADMIN_TABS = [
    { path: '/admin/properties', label: '매물 승인' },
    { path: '/admin/brokers', label: '중개인 인증' },
];

function AdminTabs() {
    const { pathname } = useLocation();

    return (
        <div className="tabs">
            {ADMIN_TABS.map((tab) => (
                <Link
                    className={`tab-btn${pathname === tab.path ? ' on' : ''}`}
                    to={tab.path}
                    key={tab.path}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}

export default AdminTabs;
