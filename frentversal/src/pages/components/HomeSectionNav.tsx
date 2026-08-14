/*
  메인 홈페이지 - 섹션 목차 (스크롤스파이).

  - 목차를 클릭하면 해당 구역으로 스크롤 이동한다 (html { scroll-behavior: smooth }는 common.css에 이미 있다).
  - 스크롤 위치에 따라 "지금 보는 구역" 하나만 강조 표시한다.

  강조 기준은 목차 바 바로 아래에 그은 가로선(기준선)이다.
  기준선 위로 올라간 구역들 중 가장 마지막(=가장 아래) 구역을 현재 구역으로 본다.

  기준선을 화면 가운데가 아니라 목차 바 바로 아래에 두는 이유:
  구역의 scroll-margin-top이 헤더 + 목차 바 높이(calc(var(--hd) + var(--sub)))라서,
  목차를 눌러 이동하면 그 구역의 윗변이 정확히 기준선 위치에 놓인다.
  즉 "클릭한 항목"과 "강조되는 항목"이 항상 일치한다.

  (이전에는 IntersectionObserver로 화면 가운데 띠에 걸린 구역을 강조했는데,
   목차를 눌러 이동하면 대상 구역의 윗변이 화면 최상단에 오기 때문에
   가운데 띠가 대상 구역이 아니라 그 다음 구역에 걸리는 경우가 있었다.
   또 두 구역이 동시에 띠에 걸리면 콜백에 늦게 도착한 항목이 이겨서
   같은 클릭인데도 강조가 달라지는 문제가 있었다. 기준선 방식은 겹침 없이 하나로 정해진다.)

  중개인/관리자 전용 블록(요약·상세)은 목차에 넣지 않는다.
  이 목차는 모든 역할에게 공통으로 보이는 구역만을 위한 것이다.
*/

import { useEffect, useRef, useState } from 'react';

export type SectionNavItem = {
    id: string;
    label: string;
};

// 기준선을 목차 바 바로 아래(=구역 윗변이 놓이는 지점)보다 몇 px 더 아래에 둔다.
// 브라우저가 스크롤 위치를 소수점으로 계산해 구역 윗변이 기준선보다 0.5px 정도
// 아래에 멈추는 경우가 있어, 그때도 대상 구역이 선택되게 하는 여유값이다.
const LINE_SLACK = 4;

interface Props {
    items: SectionNavItem[];
}

function HomeSectionNav({ items }: Props) {
    const [activeId, setActiveId] = useState(items[0]?.id ?? '');
    const navRef = useRef<HTMLDivElement>(null);

    // 목차 구성이 실제로 바뀔 때만 다시 계산 대상을 잡는다(id 목록을 문자열로 이어 비교).
    // 로그인 사용자(User 정보)는 페이지가 그려진 뒤 비동기로 채워지기 때문에,
    // 예를 들어 관리자 전용 항목("오늘 처리할 일")은 첫 렌더에는 목록에 없다가
    // 로그인 정보가 확인된 다음 렌더에서야 나타난다. 이 경우에도 새로 나타난
    // 구역을 대상에 포함시켜야 클릭·스크롤스파이가 정상 동작한다.
    const idsKey = items.map((item) => item.id).join('|');

    useEffect(() => {
        // items 순서는 화면에 그려지는 구역 순서와 같다(HomePage에서 그렇게 맞춰 넘긴다).
        // 아래 계산은 이 순서를 전제로 한다.
        const sections = items
            .map((item) => document.getElementById(item.id))
            .filter((el): el is HTMLElement => el !== null);

        if (sections.length === 0) {
            return;
        }

        // 스크롤 이벤트는 초당 수십 번 들어오므로, 프레임마다 한 번만 계산한다.
        let frame = 0;

        const sync = () => {
            frame = 0;

            const nav = navRef.current;

            if (!nav) {
                return;
            }

            // 목차 바가 헤더 아래에 붙어 있는 동안에는 이 값이 곧 구역 윗변이 놓이는 위치다.
            // 페이지 최상단(아직 목차 바가 붙기 전)에는 값이 화면 아래쪽이 되어
            // 어떤 구역도 기준선을 넘지 못하므로 첫 항목이 강조된다.
            const line = nav.getBoundingClientRect().bottom + LINE_SLACK;

            let current = sections[0].id;

            for (const section of sections) {
                if (section.getBoundingClientRect().top > line) {
                    break;
                }

                current = section.id;
            }

            setActiveId(current);
        };

        const request = () => {
            if (frame === 0) {
                frame = window.requestAnimationFrame(sync);
            }
        };

        sync();
        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request);

        return () => {
            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }

            window.removeEventListener('scroll', request);
            window.removeEventListener('resize', request);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

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
