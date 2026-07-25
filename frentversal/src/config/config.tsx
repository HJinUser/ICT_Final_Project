// 이 파일은 백앤드의 url과 포트 번호를 저장해 놓은 설정용 파일입니다.
const API_HOST = "localhost"; // 호스트 컴퓨터의 이름(127.0.0.1)

const API_PORT = "9022"; // 스프링 부트의 Port 번호

// export 키워드를 적어 주어야 외부에서 이 파일을 접근할 수 있습니다.
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

// 앞으로 http://localhost:9000를 적지 말고, API_BASE_URL를 사용하면 됩니다.
