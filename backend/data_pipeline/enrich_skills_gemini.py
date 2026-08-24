"""
Phase 3, Part A — Gemini fallback batch write.
Resumable: only processes records still flagged skills_needs_enrichment=True
AND skills_enrichment_method IS NULL. Safe to re-run across sessions.
Rotates through all available API keys on 429; stops only when every key
is exhausted for this run (progress up to that point is already committed).
"""
import asyncio
import json
import re
import time
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Job
from app.config import settings
from app.services.gemini_client import call_gemini, GeminiError

BATCH_LIMIT = 1000         # records to attempt this run (across all keys)
THROTTLE_SECONDS = 5.5     # ~10-11 RPM per key, within 70-80% of 15 RPM cap
COMMIT_EVERY = 25          # commit to DB every N successful records

PROMPT_TEMPLATE = """Extract technical and professional skills mentioned in this job description. Return ONLY a JSON array of skill names (strings), nothing else. If no clear skills are mentioned, return an empty array [].

Job description:
{description}

JSON array:"""


def parse_gemini_skills(raw_text: str):
    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return [str(s).strip() for s in result if str(s).strip()]
    except (json.JSONDecodeError, ValueError):
        pass
    return None


async def call_with_rotation(prompt, keys, key_index):
    """Try the current key; on 429, rotate to the next key and retry once per key.
    Returns (raw_response, new_key_index) or raises GeminiError if all keys exhausted."""
    attempts = 0
    while attempts < len(keys):
        try:
            raw = await call_gemini(keys[key_index], prompt)
            return raw, key_index
        except GeminiError as e:
            if e.status_code == 429:
                attempts += 1
                key_index = (key_index + 1) % len(keys)
                continue
            raise
    raise GeminiError(429, "All API keys exhausted (rate limited)")


async def main():
    keys = settings.gemini_keys_list
    print(f"Loaded {len(keys)} Gemini API key(s)")
    if not keys:
        print("No keys configured. Aborting.")
        return

    key_index = 0
    db = SessionLocal()
    try:
        jobs = db.execute(
            select(Job)
            .where(Job.skills_needs_enrichment == True)
            .where(Job.skills_enrichment_method.is_(None))
            .limit(BATCH_LIMIT)
        ).scalars().all()

        print(f"Processing {len(jobs)} records this run (limit {BATCH_LIMIT})")

        gemini_success = 0
        unresolved = 0
        api_errors = 0
        parse_fails = 0
        since_commit = 0
        start = time.time()

        for i, job in enumerate(jobs):
            prompt = PROMPT_TEMPLATE.format(description=(job.description or "")[:2000])
            try:
                raw, key_index = await call_with_rotation(prompt, keys, key_index)
                parsed = parse_gemini_skills(raw)

                if parsed is None:
                    parse_fails += 1
                    print(f"[{i+1}/{len(jobs)}] PARSE FAIL: {job.title[:50]}")
                elif len(parsed) == 0:
                    job.skills = []
                    job.skills_enrichment_method = "unresolved"
                    job.skills_needs_enrichment = False
                    unresolved += 1
                    since_commit += 1
                    print(f"[{i+1}/{len(jobs)}] UNRESOLVED: {job.title[:50]}")
                else:
                    job.skills = parsed
                    job.skills_enrichment_method = "gemini"
                    job.skills_needs_enrichment = False
                    gemini_success += 1
                    since_commit += 1
                    print(f"[{i+1}/{len(jobs)}] OK (key #{key_index+1}): {job.title[:50]} -> {len(parsed)} skills")

            except GeminiError as e:
                api_errors += 1
                print(f"[{i+1}/{len(jobs)}] API ERROR ({e.status_code}): {job.title[:50]} -> {e.message}")
                if e.status_code == 429:
                    print("All keys rate-limited — stopping run, progress saved.")
                    break

            if since_commit >= COMMIT_EVERY:
                db.commit()
                since_commit = 0

            await asyncio.sleep(THROTTLE_SECONDS)

        db.commit()  # final partial batch
        elapsed = time.time() - start

        print(f"\nDone in {elapsed/60:.1f} min.")
        print(f"Gemini-resolved: {gemini_success}")
        print(f"Unresolved (empty, thin descriptions): {unresolved}")
        print(f"Parse failures (left for next run): {parse_fails}")
        print(f"API errors: {api_errors}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())