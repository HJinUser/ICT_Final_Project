// 로그인 인증(JWT)을 자동으로 처리해주는 커스텀 axios 설정 파일
// get방식 post방식 등을 계속해서 요청하지 않고 자동으로 하게 만드는 파일

// 즉, API 요청할 때마다 토큰 붙이고
// 인증 실패(401)하면 자동 로그 아웃까지 처리해주는 구조입니다.
// 전체 과정 : 토큰확인 - 토큰이 없거나 올바르지 않은 토큰일 경우 삭제 후 로그인 페이지로 보내서 새로운 토큰 생성 유도

import axios from "axios";
import { API_BASE_URL } from "../config/config";

// withCredentials: true 항목은 세션 방식 설정이므로 jwt를 사용하면 삭제하도록 합니다.
const axiosInstance = axios.create({
    baseURL: API_BASE_URL
});

// 인터셉터(interceptor) : 요청(Request)이나 응답(Response)을 가로 채서 공통 로직을 처리하는 기능입니다.
// 요청(Request) : ~하기 전에 가로채기 (사전)
// 응답(Response) : ~한 후에 가로채기 (사후)
// 요청을 보내기 전에 인터셉터가 자동으로 JWT 붙이기 (사전에 가로채기)
// 토큰을 확인하는 과정
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken"); // 로컬 저장소에 accessToken이라는 이름으로 만들어 놓음
        console.log("interceptors.request 토큰 확인 : ", token);

        if (token) { // token가 undefined일 수 있으므로...
            config.headers = config.headers || {};
            // Bearer 단어 대소문자 주의 바람
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 처리 : 401 에러 발생 시 refresh token으로 access token 재발급 (사후에 가로채기)
// 401에러 : 인증이 필요하거나 실패했다는 의미
// [refresh] access token 이 만료되어 401 이 오면, 저장해 둔 refresh token 으로 새 access token 을 받아 원래 요청을 자동 재시도한다.
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => { // [refresh] 재발급을 위해 await 를 써야 하므로 async 함수로 만든다
        const originalRequest: any = error.config; // [refresh] 실패했던 원래 요청 설정. _retry 플래그를 붙이려고 any 로 다룬다
        const status = error.response?.status; // [refresh] 응답 상태 코드(401 등)를 꺼낸다
        const url: string = originalRequest?.url || ""; // [refresh] 어떤 요청이 실패했는지 URL 을 확인한다

        // [refresh] 로그인/재발급 요청 자체의 401 은 재발급 대상에서 제외한다(무한 루프 방지).
        const isAuthRequest = url.includes("/member/login") || url.includes("/member/refresh"); // [refresh]

        // [refresh] access token 만료(401)이고, 인증용 요청이 아니며, 아직 재시도한 적 없을 때만 재발급을 시도한다
        if (status === 401 && !isAuthRequest && !originalRequest?._retry) { // [refresh]
            originalRequest._retry = true; // [refresh] 같은 요청을 두 번 이상 재발급-재시도하지 않도록 표시한다

            const refreshToken = localStorage.getItem("refreshToken"); // [refresh] 저장해 둔 refresh token 을 꺼낸다

            // [refresh] refresh token 이 아예 없으면 재발급이 불가능하므로 바로 로그아웃 처리한다
            if (!refreshToken) { // [refresh]
                localStorage.removeItem("accessToken"); // [refresh] access token 제거
                localStorage.removeItem("user"); // [refresh] 저장된 사용자 정보 제거
                window.location.replace("/member/login"); // [refresh] 로그인 페이지로 이동
                return Promise.reject(error); // [refresh] 원래 에러를 그대로 돌려준다
            }

            try {
                // [refresh] 재발급 요청은 인터셉터를 거치지 않도록 기본 axios 로 보낸다(만료된 access token 이 붙거나 다시 401 처리되는 재귀 방지).
                const res = await axios.post(`${API_BASE_URL}/member/refresh`, { refreshToken }); // [refresh] 서버 /member/refresh 로 refresh token 전송

                const newAccessToken: string = res.data.accessToken; // [refresh] 응답에서 새 access token 을 꺼낸다
                localStorage.setItem("accessToken", newAccessToken); // [refresh] 새 access token 을 저장한다

                originalRequest.headers = originalRequest.headers || {}; // [refresh] 원래 요청의 헤더 객체가 없으면 만든다
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`; // [refresh] 새 토큰으로 Authorization 헤더를 교체한다
                return axiosInstance(originalRequest); // [refresh] 새 토큰을 붙여 실패했던 원래 요청을 다시 보낸다(재시도)

            } catch (refreshError) { // [refresh] 재발급 자체가 실패 = refresh token 도 만료/무효
                localStorage.removeItem("accessToken"); // [refresh] access token 제거
                localStorage.removeItem("refreshToken"); // [refresh] refresh token 제거
                localStorage.removeItem("user"); // [refresh] 사용자 정보 제거
                window.location.replace("/member/login"); // [refresh] 로그인 페이지로 강제 이동
                return Promise.reject(refreshError); // [refresh] 재발급 에러를 돌려준다
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
