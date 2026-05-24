from fastapi import APIRouter
import subprocess

router = APIRouter(prefix="/users")

# RISK: trust-boundary — username from URL path used in shell command
@router.get("/{username}/report")
def generate_report(username: str):
    # RISK: shell=True with f-string interpolation = command injection
    result = subprocess.run(
        f"generate-report --user {username}",
        shell=True,
        capture_output=True,
        text=True,
    )
    return {"report": result.stdout}

@router.get("/{user_id}")
def get_user(user_id: int):
    return {"id": user_id}

@router.post("/")
def create_user(username: str, email: str):
    return {"username": username, "email": email}
