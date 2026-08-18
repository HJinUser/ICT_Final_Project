import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getNoticePage } from '../api/noticeApi';
import NoticePagination from './components/NoticePagination';
import type { Notice } from '../types/Notice';
import type { User } from '../types/User';
import '../styles/NoticeListPage.css';

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
    const listTopRef = useRef<HTMLDivElement>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 0 || nextPage >= totalPages || nextPage === page) return;

        setPage(nextPage);
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        let active = true;

        const loadNotices = async () => {
            setLoading(true);
            setError('');

            try {
                const data = await getNoticePage(page, keyword);
                if (active) {
                    setNotices(data.content);
                    setTotalPages(data.totalPages);
                    setTotalCount(data.totalCount);
                }
            } catch (requestError) {
                console.error('공지사항 목록 조회 실패', requestError);
                if (active) {
                    setNotices([]);
                    setTotalPages(0);
                    setTotalCount(0);
                    setError('공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadNotices();
        return () => { active = false; };
    }, [keyword, page]);

    return (
        <main>
            <section className="page-hero notice-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Notice</div>
                        <h1>공지사항</h1>
                        <p>안전하고 편리한 부동산 거래를 위한 서비스 소식과 주요 안내를 확인해 주세요.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">등록된 공지</span>
                        <strong>{totalCount}건</strong>
                        <span className="xs dim">최신 등록순</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap notice-wrap">
                    <div className="notice-toolbar" ref={listTopRef}>
                        <label className="notice-search">
                            <span className="sr-only">공지사항 검색</span>
                            <input
                                className="search-box"
                                type="search"
                                placeholder="제목 또는 내용 검색"
                                value={keyword}
                                onChange={(event) => {
                                    setKeyword(event.target.value);
                                    setPage(0);
                                }}
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
                    {!loading && !error && notices.length === 0 && (
                        <div className="notice-state">
                            {keyword ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}
                        </div>
                    )}

                    {!loading && !error && notices.length > 0 && (
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
                                    {notices.map((notice) => (
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

                    {!loading && !error && (
                        <NoticePagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </section>
        </main>
    );
}

export default NoticeListPage;
