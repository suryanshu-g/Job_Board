from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    allowed_origins: str = "http://localhost:5173"
    # Optional: only used by standalone batch scripts (enrich_skills_gemini.py, etc),
    # not by the live served app. Defaults to empty so the app boots fine on any
    # deploy host that doesn't set this.
    gemini_dev_api_keys: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def gemini_keys_list(self) -> list[str]:
        return [k.strip() for k in self.gemini_dev_api_keys.split(",") if k.strip()]


settings = Settings()