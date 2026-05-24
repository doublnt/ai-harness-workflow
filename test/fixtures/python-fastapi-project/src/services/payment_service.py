import requests

PAYMENT_API = "https://api.payments.example.com"

# RISK: external-interaction — requests.post with no timeout
# A slow or unresponsive payment gateway hangs the worker indefinitely
async def charge_card(amount: float, card_token: str) -> dict:
    response = requests.post(
        f"{PAYMENT_API}/charge",
        json={"amount": amount, "token": card_token},
        # timeout not set — default is None (wait forever)
    )
    response.raise_for_status()
    return response.json()

# RISK: state-mutation-safety — no idempotency key; retried requests charge twice
async def refund(charge_id: str) -> dict:
    response = requests.post(
        f"{PAYMENT_API}/refund",
        json={"charge_id": charge_id},
    )
    return response.json()
