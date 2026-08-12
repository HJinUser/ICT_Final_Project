import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getNotices } from '../api/noticeApi';
import type { Notice } from '../types/Notice';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Notice.css';

interface NoticeListPageProps {
    user: User | null;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(value));
}

function NoticeListPage({ user }: NoticeListPageProps) {
    const navigate = useNavigate();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadNotices = async () => {
            try {
                const data = await getNotices();
                if (active) setNotices(data);
            } catch (requestError) {
                console.error('공지사항 목록 조회 실패', requestError);
                if (active) setError('공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadNotices();
        return () => { active = false; };
    }, []);

    const filteredNotices = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        if (!normalizedKeyword) return notices;

        return notices.filter((notice) =>
            notice.title.toLowerCase().includes(normalizedKeyword)
            || notice.content.toLowerCase().includes(normalizedKeyword)
        );
    }, [keyword, notices]);

    return (
        <main>
            <section className="page-hero notice-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Notice</div>
                        <h1>공지사항</h1>
                        <p>서비스 이용에 필요한 새로운 소식과 주요 안내를 확인해 주세요.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">등록된 공지</span>
                        <strong>{notices.length}건</strong>
                        <span className="xs dim">최신 등록순</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap notice-wrap">
                    <div className="notice-toolbar">
                        <label className="notice-search">
                            <span className="sr-only">공지사항 검색</span>
                            <input
                                className="search-box"
                                type="search"
                                placeholder="제목 또는 내용 검색"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                            />
                        </label>
                        {user?.role === 'ADMIN' && (
                            <button
                                className="solid-btn notice-register-btn"
                                type="button"
                                onClick={() => navigate('/notice/new')}
                            >
                                ＋ 공지사항 등록
                            </button>
                        )}
                    </div>

                    {loading && <div className="notice-state">공지사항을 불러오는 중입니다.</div>}
                    {!loading && error && <div className="notice-state notice-error">{error}</div>}
                    {!loading && !error && filteredNotices.length === 0 && (
                        <div className="notice-state">
                            {keyword ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}
                        </div>
                    )}

                    {!loading && !error && filteredNotices.length > 0 && (
                        <div className="notice-table-wrap">
                            <table className="notice-table">
                                <thead>
                                    <tr>
                                        <th scope="col">번호</th>
                                        <th scope="col">제목</th>
                                        <th scope="col">등록일</th>
                                        <th scope="col">조회</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredNotices.map((notice) => (
                                        <tr key={notice.id}>
                                            <td className="notice-number">{notice.id}</td>
                                            <td>
                                                <Link className="notice-link" to={`/notice/${notice.id}`}>
                                                    {notice.title}
                                                </Link>
                                            </td>
                                            <td>{formatDate(notice.createdAt)}</td>
                                            <td>{notice.viewCount.toLocaleString('ko-KR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default NoticeListPage;
