import { Route, Routes } from "react-router-dom";

import SignupPage from './../pages/SignupPage';
import LoginPage from './../pages/LoginPage';
import HomePage from './../pages/HomePage';
import PropertyFormPage from './../pages/PropertyFormPage';
import type { User } from "../types/User";
import PropertyPage from './../pages/PropertyPage';
import PropertyPreviewPage from "../pages/PropertyPreviewPage";
import AgencyPage from './../pages/AgencyPage';


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
    </Routes>
  );
}

export default App;
