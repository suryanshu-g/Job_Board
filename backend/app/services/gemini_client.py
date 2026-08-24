import httpx

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"


class GeminiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


async def call_gemini(api_key: str, prompt: str) -> str:
    url = f"{GEMINI_API_URL}?key={api_key}"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)
        except httpx.RequestError:
            raise GeminiError(502, "Could not reach the Gemini API. Please try again.")

    if response.status_code == 400:
        raise GeminiError(400, "Invalid Gemini API key or malformed request.")
    if response.status_code == 401 or response.status_code == 403:
        raise GeminiError(401, "Invalid or expired Gemini API key.")
    if response.status_code == 429:
        raise GeminiError(429, "Gemini API rate limit exceeded. Please wait and try again.")
    if response.status_code >= 500:
        raise GeminiError(502, "Gemini API is currently unavailable. Please try again later.")
    if response.status_code != 200:
        raise GeminiError(response.status_code, f"Gemini API returned an unexpected error: {response.status_code}")

    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise GeminiError(502, "Gemini API returned an unexpected response format.")
