import { Route, Routes } from "react-router-dom";

import SignupPage from './../pages/SignupPage';
import LoginPage from './../pages/LoginPage';
import HomePage from './../pages/HomePage';
import PropertyFormPage from './../pages/PropertyFormPage';
import type { User } from "../types/User";
import PropertyPage from './../pages/PropertyPage';
import PropertyPreviewPage from "../pages/PropertyPreviewPage";
import AgencyPage from './../pages/AgencyPage';
import AgencyDetailPage from './../pages/AgencyDetailPage';
import BrokerMyPage from './../pages/BrokerMyPage';
import MyAgencyPage from './../pages/MyAgencyPage';
import ConsultationReplyPage from './../pages/ConsultationReplyPage';
import BrokerVerificationPage from './../pages/BrokerVerificationPage';


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
      <Route path='/property/form' element={<PropertyFormPage />} />
      <Route path="/property/:id" element={<PropertyPage user={user} />} />
      <Route path="/property/preview" element={<PropertyPreviewPage />} />
      <Route path="/agency" element={<AgencyPage />} />
      <Route path="/agency/:id" element={<AgencyDetailPage user={user} />} />

      {/* 중개인 전용 화면. 서버에서도 /my-agency/** 를 중개인만 통과시킨다. */}
      <Route path="/broker/mypage" element={<BrokerMyPage user={user} />} />
      <Route path="/broker/agency" element={<MyAgencyPage />} />
      <Route path="/broker/consultations/:id" element={<ConsultationReplyPage />} />
      <Route path="/broker/verification" element={<BrokerVerificationPage />} />
    </Routes>
  );
}

export default App;
