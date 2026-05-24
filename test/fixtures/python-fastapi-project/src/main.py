import subprocess
import os
from fastapi import FastAPI, HTTPException
from src.services.file_service import read_user_file
from src.services.payment_service import charge_card
from src.routes import users

app = FastAPI()
app.include_router(users.router)

# RISK: trust-boundary — cmd comes directly from query param, no validation
@app.get("/run")
def run_command(cmd: str):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return {"output": result.stdout}

# RISK: trust-boundary — path not validated against allowed root
@app.get("/files")
async def get_file(path: str):
    content = read_user_file(path)
    return {"content": content}

# RISK: error-propagation — bare except swallows all errors
@app.post("/charge")
async def charge(amount: float, card_token: str):
    try:
        result = await charge_card(amount, card_token)
        return result
    except:
        return {"status": "unknown"}
