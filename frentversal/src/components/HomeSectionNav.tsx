/*
  메인 홈페이지 - 섹션 목차 (스크롤스파이).

  프로토타입 index.html의 .subnav / data-spy / IntersectionObserver 동작을 그대로 옮긴 것이다.
  - 목차를 클릭하면 해당 구역으로 스크롤 이동한다 (html { scroll-behavior: smooth }는 common.css에 이미 있다).
  - 스크롤하며 화면 가운데 얇은 띠(위 42% ~ 아래 50% 사이)에 걸친 구역을 "지금 보는 구역"으로 보고
    그 항목만 강조 표시한다.

  중개인/관리자 전용 블록(요약·상세)은 목차에 넣지 않는다.
  이 목차는 모든 역할에게 공통으로 보이는 구역만을 위한 것이다.
*/

import { useEffect, useRef, useState } from 'react';

export type SectionNavItem = {
    id: string;
    label: string;
};

interface Props {
    items: SectionNavItem[];
}

function HomeSectionNav({ items }: Props) {
    const [activeId, setActiveId] = useState(items[0]?.id ?? '');
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sections = items
            .map((item) => document.getElementById(item.id))
            .filter((el): el is HTMLElement => el !== null);

        if (sections.length === 0) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-42% 0px -50% 0px', threshold: 0 },
        );

        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
        // items는 컴포넌트 생애주기 동안 값이 바뀌지 않는 상수 배열이라 최초 1회만 관찰을 건다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="home-subnav" ref={navRef}>
            <div className="rv-wrap inner">
                {items.map((item, index) => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={activeId === item.id ? 'on' : ''}
                    >
                        <span className="n">{String(index + 1).padStart(2, '0')}</span>
                        {item.label}
                    </a>
                ))}
            </div>
        </div>
    );
}

export default HomeSectionNav;
