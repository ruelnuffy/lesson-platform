import hashlib
import hmac
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import get_settings


class PaymentGatewayError(Exception):
    pass


@dataclass
class PaymentInitResult:
    authorization_url: str
    access_code: str
    reference: str


@dataclass
class PaymentVerifyResult:
    is_paid: bool
    amount_kobo: int
    reference: str
    raw: dict[str, Any]


class PaymentProvider(ABC):
    @abstractmethod
    def initialize_transaction(
        self,
        *,
        email: str,
        amount_kobo: int,
        reference: str,
        callback_url: str,
        metadata: dict[str, Any] | None = None,
    ) -> PaymentInitResult:
        raise NotImplementedError

    @abstractmethod
    def verify_transaction(self, reference: str) -> PaymentVerifyResult:
        raise NotImplementedError

    @abstractmethod
    def verify_webhook_signature(self, raw_body: bytes, signature: str | None) -> bool:
        raise NotImplementedError


class PaystackPaymentProvider(PaymentProvider):
    BASE_URL = "https://api.paystack.co"

    def __init__(self, secret_key: str, webhook_secret: str | None = None) -> None:
        self.secret_key = secret_key
        self.webhook_secret = webhook_secret or secret_key

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def initialize_transaction(
        self,
        *,
        email: str,
        amount_kobo: int,
        reference: str,
        callback_url: str,
        metadata: dict[str, Any] | None = None,
    ) -> PaymentInitResult:
        if not self.secret_key:
            raise PaymentGatewayError("Paystack secret key is not configured")

        payload: dict[str, Any] = {
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
            "callback_url": callback_url,
            "metadata": metadata or {},
        }
        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    headers=self._headers(),
                    json=payload,
                )
            data = response.json()
        except Exception as exc:
            raise PaymentGatewayError(f"Paystack initialize request failed: {exc}") from exc

        if response.status_code >= 400 or not data.get("status"):
            raise PaymentGatewayError(data.get("message") or "Failed to initialize Paystack transaction")

        tx_data = data["data"]
        return PaymentInitResult(
            authorization_url=tx_data["authorization_url"],
            access_code=tx_data.get("access_code", ""),
            reference=tx_data.get("reference", reference),
        )

    def verify_transaction(self, reference: str) -> PaymentVerifyResult:
        if not self.secret_key:
            raise PaymentGatewayError("Paystack secret key is not configured")

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers=self._headers(),
                )
            data = response.json()
        except Exception as exc:
            raise PaymentGatewayError(f"Paystack verify request failed: {exc}") from exc

        if response.status_code >= 400 or not data.get("status"):
            raise PaymentGatewayError(data.get("message") or "Failed to verify Paystack transaction")

        tx_data = data.get("data") or {}
        is_paid = tx_data.get("status") == "success"
        amount_kobo = int(tx_data.get("amount") or 0)
        return PaymentVerifyResult(
            is_paid=is_paid,
            amount_kobo=amount_kobo,
            reference=tx_data.get("reference", reference),
            raw=tx_data,
        )

    def verify_webhook_signature(self, raw_body: bytes, signature: str | None) -> bool:
        if not signature or not self.webhook_secret:
            return False
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)


def get_payment_provider() -> PaymentProvider:
    settings = get_settings()
    return PaystackPaymentProvider(
        secret_key=settings.paystack_secret_key,
        webhook_secret=settings.paystack_webhook_secret or settings.paystack_secret_key,
    )
