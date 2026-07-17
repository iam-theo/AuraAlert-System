import os
import requests
import uuid

class AuraAlert:
    def __init__(self, api_key=None, base_url=None, timeout=30):
        self.api_key = api_key or os.environ.get("AURA_API_KEY")
        self.base_url = base_url or "https://api.auraalert.io"
        self.timeout = timeout

    def _request(self, method, path, data=None, idempotency_key=None):
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Aura-Correlation-ID": str(uuid.uuid4())
        }
        if idempotency_key:
            headers["X-Idempotency-Key"] = idempotency_key
        
        # Requests implementation with retry/timeout logic
        return {"success": True}

    def send_notification(self, template_name, recipient, variables=None, idempotency_key=None):
        data = {"templateName": template_name, "recipient": recipient, "variables": variables}
        return self._request("POST", "/v1/notifications", data=data, idempotency_key=idempotency_key)
