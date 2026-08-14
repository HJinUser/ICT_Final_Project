import DOMPurify from 'dompurify';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteNotice, getNotice } from '../api/noticeApi';
import type { Notice } from '../types/Notice';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Notice.css';

interface NoticeDetailPageProps {
    user: User | null;
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function NoticeDetailPage({ user }: NoticeDetailPageProps) {
    const { id } = useParams();
    const noticeId = Number(id);
    const navigate = useNavigate();
    const [notice, setNotice] = useState<Notice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const noticeRequestRef = useRef<{ id: number; request: Promise<Notice> } | null>(null);

    useEffect(() => {
        let active = true;

        const loadNotice = async () => {
            if (!Number.isInteger(noticeId) || noticeId < 1) {
                setError('올바르지 않은 공지사항 번호입니다.');
                setLoading(false);
                return;
            }

            try {
                // StrictMode에서 화면 효과가 두 번 실행되어도 상세 조회 API는 한 번만 호출합니다.
                if (!noticeRequestRef.current || noticeRequestRef.current.id !== noticeId) {
                    noticeRequestRef.current = {
                        id: noticeId,
                        request: getNotice(noticeId),
                    };
                }

                const data = await noticeRequestRef.current.request;
                if (active) setNotice(data);
            } catch (requestError) {
                if (noticeRequestRef.current?.id === noticeId) {
                    noticeRequestRef.current = null;
                }
                console.error('공지사항 상세 조회 실패', requestError);
                if (active) setError('공지사항을 찾을 수 없거나 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadNotice();
        return () => { active = false; };
    }, [noticeId]);

    const handleDelete = async () => {
        if (!notice || !window.confirm('이 공지사항을 삭제하시겠습니까?')) return;

        setDeleting(true);
        try {
            await deleteNotice(notice.id);
            navigate('/notice', { replace: true });
        } catch (requestError) {
            console.error('공지사항 삭제 실패', requestError);
            setError('공지사항을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
            setDeleting(false);
        }
    };

    return (
        <main className="notice-detail-main">
            <section className="section">
                <div className="wrap notice-wrap">
                    <div className="breadcrumb"><Link to="/">홈</Link> / <Link to="/notice">공지사항</Link></div>

                    {loading && <div className="notice-state">공지사항을 불러오는 중입니다.</div>}
                    {!loading && error && !notice && <div className="notice-state notice-error">{error}</div>}

                    {!loading && notice && (
                        <article className="notice-detail-card">
                            <header className="notice-detail-head">
                                <span className="status purple">공지</span>
                                <h1>{notice.title}</h1>
                                <div className="notice-meta">
                                    <span>등록 {formatDateTime(notice.createdAt)}</span>
                                    {notice.updatedAt !== notice.createdAt && (
                                        <span>수정 {formatDateTime(notice.updatedAt)}</span>
                                    )}
                                    <span>조회 {notice.viewCount.toLocaleString('ko-KR')}</span>
                                </div>
                            </header>
                            <div
                                className="notice-content ck-content"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(notice.content),
                                }}
                            />
                        </article>
                    )}

                    {error && notice && <div className="notice-inline-error">{error}</div>}

                    <div className="notice-actions">
                        <Link className="ghost-btn" to="/notice">목록으로</Link>
                        {notice && user?.role === 'ADMIN' && (
                            <div className="notice-admin-actions">
                                <Link className="outline-btn" to={`/notice/${notice.id}/edit`}>수정</Link>
                                <button className="danger-btn" type="button" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? '삭제 중' : '삭제'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default NoticeDetailPage;
