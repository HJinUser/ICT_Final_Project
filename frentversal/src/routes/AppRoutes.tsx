import { Route, Routes } from "react-router-dom";

import SignupPage from './../pages/SignupPage';
import LoginPage from './../pages/LoginPage';
import HomePage from './../pages/HomePage';
import PropertyFormPage from './../pages/PropertyFormPage';
import type { User } from "../types/User";
import PropertyPage from './../pages/PropertyPage';
import PropertyPreviewPage from "../pages/PropertyPreviewPage";
import AgencyPage from './../pages/AgencyPage';
import NoticeListPage from '../pages/NoticeListPage';
import NoticeDetailPage from '../pages/NoticeDetailPage';
import NoticeFormPage from '../pages/NoticeFormPage';
import ReportFormPage from '../pages/ReportFormPage';
import MyReportPage from '../pages/MyReportPage';
import ReportAdminListPage from '../pages/ReportAdminListPage';
import ReportAdminDetailPage from '../pages/ReportAdminDetailPage';
import AgencyDetailPage from './../pages/AgencyDetailPage';
import OAuthCallbackPage from './../pages/OAuthCallbackPage';
import SocialSignupPage from './../pages/SocialSignupPage';
import PreferenceSetupPage from './../pages/PreferenceSetupPage';
import BrokerMyPage from './../pages/BrokerMyPage';
import MyAgencyPage from './../pages/MyAgencyPage';
import ConsultationReplyPage from './../pages/ConsultationReplyPage';
import BrokerVerificationPage from './../pages/BrokerVerificationPage';
import NotFoundPage from './../pages/NotFoundPage';
import AdminConsolePage from './../pages/AdminConsolePage';
import AdminHomePanel from './../pages/AdminHomePanel';
import AdminPropertyPage from './../pages/AdminPropertyPage';
import AdminBrokerPage from './../pages/AdminBrokerPage';
import MyConsultationPage from './../pages/MyConsultationPage';
import MyPage from './../pages/MyPage';


interface AppProps {
  user: User | null;
  handleLoginSuccess: (userData: User) => void;
}

function App({ user, handleLoginSuccess }: AppProps) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path='/member/signup' element={<SignupPage />} />
      <Route path='/member/login' element={<LoginPage onLogin={handleLoginSuccess} />} />
      {/* 카카오 로그인 성공 후 백엔드가 돌려보내는 도착 지점 (기존 회원) */}
      <Route path='/oauth/callback' element={<OAuthCallbackPage onLogin={handleLoginSuccess} />} />
      {/* 카카오 최초 로그인 시 추가정보를 받는 페이지 (신규 회원) */}
      <Route path='/oauth/signup' element={<SocialSignupPage />} />
      {/* 일반 사용자(USER)가 최초 로그인 시 1회 거치는 취향 초기 설정. 지금은 스텁 화면이다. */}
      <Route path='/preference-setup' element={<PreferenceSetupPage />} />
      <Route path='/property/form' element={<PropertyFormPage />} />
      <Route path="/property/:id" element={<PropertyPage user={user} />} />
      <Route path="/property/preview" element={<PropertyPreviewPage />} />
      <Route path="/agency" element={<AgencyPage />} />
      <Route path="/agency/:id" element={<AgencyDetailPage user={user} />} />

      {/* 공지사항. 목록·상세는 누구나 볼 수 있고, 작성·수정은 화면에서 관리자만 열린다. */}
      <Route path="/notice" element={<NoticeListPage user={user} />} />
      <Route path="/notice/new" element={<NoticeFormPage user={user} />} />
      <Route path="/notice/:id" element={<NoticeDetailPage user={user} />} />
      <Route path="/notice/:id/edit" element={<NoticeFormPage user={user} />} />

      {/* 신고. 접수와 내 신고 내역은 사용자·중개인, 신고 관리는 관리자 화면이다. */}
      <Route path="/report/form" element={<ReportFormPage user={user} />} />
      <Route path="/report/me" element={<MyReportPage user={user} />} />

      {/* 사용자 마이페이지. 내 활동 > 알림내역에서 상담 답변 화면으로 간다. */}
      <Route path="/mypage" element={<MyPage user={user} />} />
      <Route path="/my-consultations" element={<MyConsultationPage user={user} />} />

      {/* 중개인 전용 화면. 서버에서도 /my-agency/** 를 중개인만 통과시킨다. */}
      <Route path="/broker/mypage" element={<BrokerMyPage user={user} />} />
      <Route path="/broker/agency" element={<MyAgencyPage />} />
      <Route path="/broker/consultations/:id" element={<ConsultationReplyPage />} />
      <Route path="/broker/verification" element={<BrokerVerificationPage />} />

      {/* 관리자 콘솔. 왼쪽 사이드바(AdminConsolePage)는 그대로 두고 오른쪽 내용만 바뀐다.
          서버에서도 /admin/** 를 관리자만 통과시킨다. */}
      <Route path="/admin" element={<AdminConsolePage user={user} />}>
        <Route index element={<AdminHomePanel />} />
        <Route path="properties" element={<AdminPropertyPage user={user} />} />
        <Route path="brokers" element={<AdminBrokerPage user={user} />} />
        <Route path="reports" element={<ReportAdminListPage user={user} />} />
        <Route path="reports/:id" element={<ReportAdminDetailPage user={user} />} />
      </Route>

      {/*
        위 어느 경로에도 걸리지 않는 주소는 모두 404 화면으로 보낸다.
        헤더/푸터 메뉴에는 아직 안 만든 화면이 있는데, 그쪽은 navigateOrNotice가
        "준비 중" 안내로 막아 주므로 여기까지 오지 않는다.
        이 라우트는 사용자가 주소를 직접 잘못 입력한 경우를 위한 것이다.
      */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
