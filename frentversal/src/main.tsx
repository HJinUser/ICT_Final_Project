import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

/*
  전역 골격 CSS. 여기 네 개만 앱 전체에 깔리고, 나머지 CSS 는 각 페이지가 자기 것만 가져간다.

  순서를 바꾸면 화면이 바뀐다. 아래 순서는 리팩터링 전에 실제로 주입되던 순서와 같다.
    index.css      : #root 레이아웃, body 여백, h1/h2 기본 크기
    tokens.css     : 색·글꼴·간격 토큰
    common.css     : 디자인 시스템 본체 (헤더/푸터/버튼/표/폼/페이지 히어로)
    responsive.css : 화면 폭별 보정. common.css 를 덮어써야 하므로 반드시 마지막.

  App.tsx import 는 반드시 이 아래에 둔다. import 는 적힌 순서대로 실행되므로,
  App 을 먼저 쓰면 각 페이지 CSS 가 이 골격보다 먼저 깔려 우선순위가 뒤집힌다.
*/
import './index.css'
import './styles/tokens.css'
import './styles/common.css'
import './styles/responsive.css'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
