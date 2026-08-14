interface NoticePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const PAGE_BUTTON_COUNT = 10;

function NoticePagination({
    currentPage,
    totalPages,
    onPageChange,
}: NoticePaginationProps) {
    if (totalPages < 1) return null;

    const firstVisiblePage = Math.floor(currentPage / PAGE_BUTTON_COUNT) * PAGE_BUTTON_COUNT;
    const visiblePageNumbers = Array.from(
        { length: PAGE_BUTTON_COUNT },
        (_, index) => firstVisiblePage + index,
    );

    return (
        <nav className="notice-pagination" aria-label="공지사항 페이지 이동">
            <div className="notice-page-status" aria-live="polite">
                <span>현재</span>
                <strong>{currentPage + 1}</strong>
                <span>/ {totalPages} 페이지</span>
            </div>

            <button
                className="notice-page-move"
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
            >
                <span aria-hidden="true">←</span>
                이전
            </button>

            {visiblePageNumbers.map((pageNumber) => (
                <button
                    className={`notice-page-number${currentPage === pageNumber ? ' active' : ''}`}
                    type="button"
                    key={pageNumber}
                    onClick={() => onPageChange(pageNumber)}
                    disabled={currentPage === pageNumber || pageNumber >= totalPages}
                    aria-label={pageNumber < totalPages
                        ? `${pageNumber + 1}페이지로 이동`
                        : `${pageNumber + 1}페이지 - 등록된 공지 없음`}
                    aria-current={currentPage === pageNumber ? 'page' : undefined}
                >
                    {pageNumber + 1}
                </button>
            ))}

            <button
                className="notice-page-move"
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
            >
                다음
                <span aria-hidden="true">→</span>
            </button>
        </nav>
    );
}

export default NoticePagination;
