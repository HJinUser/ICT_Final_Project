import uvicorn
from fastapi import FastAPI

app = FastAPI()


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