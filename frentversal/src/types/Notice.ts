type NoticeCategory = "중요" | "안내" | "점검";
export interface Notice {
  id:number;
  category: NoticeCategory;
  title: string;
  date: string;
  dateTime: string;
}
function NoticePanel() {
    return(
  const notices: Notice[] = [
    {
      id: 1,
      category: "중요",
      title: "허위 매물 신고 접수 기준이 강화되었습니다.",
      date: "2026.08.05",
      dateTime: "2026-08-05",
    },
    {
      id: 2,
      category: "안내",
      title: "안전한 거래를 위해 계약 전 매물 정보를 확인해 주세요.",
      date: "2026.08.05",
      dateTime: "2026-08-05",
    },
    {
      id: 3,
      category: "점검",
      title: "서비스 안정화를 위한 시스템 점검이 예정되어 있습니다.",
      date: "2026.08.05",
      dateTime: "2026-08-05",
    },
  ];
    <section className="notice-panel" aria-labelledby="notice-heading">
      <div className="notice-heading">
        <h3 id="notice-heading">공지사항</h3>
        <span>중개 플랫폼 안내</span>
      </div>
      <ul className="notice-list">
        {notices.map((notice: Notice) => (
          <li className="notice-item" key={notice.id}>
            <span className="notice-chip">{notice.category}</span>
            <div className="notice-copy">
              <h5 className="notice-title">{notice.title}</h5>
              <time className="notice-date"
                dateTime={notice.dateTime}
              >
                {notice.date}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
export default NoticePanel;