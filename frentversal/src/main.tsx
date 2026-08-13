import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import 'bootstrap/dist/css/bootstrap.min.css';
import './theme.css'   // 부트스트랩 색상 오버라이드
import './index.css'
// 전세역전 디자인 토큰(색·글꼴·간격). index.css 가 :root 에 잡아 둔 기본값을 덮어써야 해서
// 반드시 index.css 다음에 불러온다.
import './styles/tokens.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
