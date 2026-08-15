# FastAPI 서버 시작점, router 등록

import uvicorn
from fastapi import FastAPI

app = FastAPI()

# "@" 이 기호는 데코레이터(decorator)임
# FastAPI에서는 이 데코레이터를 이용해서 "/ 주소로 GET 요청이 들어오면 바로 아래 함수를 실행해라"라고 등록함
@app.get("/")
def root():
    return {"message": "Hello"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        # 호스트를 마음대로 설정 가능
        # host="127.0.0.1",
        # 포트번호를 마음대로 설정 가능
        # port=8000,
        reload=True
    )