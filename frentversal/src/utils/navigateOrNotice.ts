/*
  메뉴를 눌렀을 때 실제 페이지로 보낼지, "준비 중" 안내만 띄울지 결정하는 함수.

  메뉴 구성은 프로토타입(디자인 확정본) 기준으로 미리 다 넣어 두었지만
  아직 만들지 않은 화면이 많다. 그런 메뉴로 이동시키면 빈 화면이 나오므로
  NavItem.ready가 false인 동안에는 안내만 보여주고 이동을 막는다.

  나중에 그 페이지가 만들어지면 Navigation.ts에서 ready를 true로 바꾸고
  AppRoutes.tsx에 라우트만 추가하면 되고, 이 파일이나 화면 코드는 건드릴 필요가 없다.
*/

import type { NavItem } from '../types/Navigation';

// react-router의 navigate 함수 형태. useNavigate()가 돌려주는 값을 그대로 받는다.
type NavigateFn = (path: string) => void;

export function navigateOrNotice(item: NavItem, navigate: NavigateFn): void {
    if (!item.ready) {
        window.alert(`"${item.label}" 화면은 준비 중입니다.`);
        return;
    }
    navigate(item.path);
}
