from fastapi import FastAPI

app = FastAPI(title="NetShield AI")

@app.get("/")
def home():
    return {"message": "NetShield AI Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}