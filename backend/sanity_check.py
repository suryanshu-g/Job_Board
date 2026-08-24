"""
Sanity check script for the AI-Powered Job Board API (Phase 2).
Run this with the server already running: uvicorn app.main:app --reload
Usage: python sanity_check.py
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8000"
REAL_JOB_ID = "d55a9ced-bb07-4e21-8b51-63dec8a90fb6"  # known-good ID from the live dataset

passed = 0
failed = 0


def check(name, condition):
    global passed, failed
    if condition:
        print(f"[PASS] {name}")
        passed += 1
    else:
        print(f"[FAIL] {name}")
        failed += 1


def main():
    # 1. GET /jobs
    r = requests.get(f"{BASE_URL}/jobs", params={"page": 1, "page_size": 3})
    check("GET /jobs returns 200", r.status_code == 200)
    data = r.json()
    check("GET /jobs total matches known dataset size", data.get("total") == 46189)
    check("GET /jobs returns requested page_size", len(data.get("results", [])) == 3)

    # 2. GET /jobs/{job_id}
    r = requests.get(f"{BASE_URL}/jobs/{REAL_JOB_ID}")
    check("GET /jobs/{job_id} returns 200 for known job", r.status_code == 200)
    check("GET /jobs/{job_id} returns correct job_id", r.json().get("job_id") == REAL_JOB_ID)

    r = requests.get(f"{BASE_URL}/jobs/00000000-0000-0000-0000-000000000000")
    check("GET /jobs/{job_id} returns 404 for unknown job", r.status_code == 404)

    # 3. POST /resume/upload (skipped by default — requires a real PDF file)
    print("[SKIP] POST /resume/upload — run manually with a real PDF via /docs")

    # 4. POST /recommend
    r = requests.post(
        f"{BASE_URL}/recommend",
        json={
            "skills": ["Python", "SQL", "Docker"],
            "domain": "Data Science",
            "limit": 5,
        },
    )
    check("POST /recommend returns 200", r.status_code == 200)
    check("POST /recommend returns a results list", isinstance(r.json().get("results"), list))
        # 5. GET /jobs/search (semantic search)
    r = requests.get(f"{BASE_URL}/jobs/search", params={"q": "remote entry-level python roles"})
    check("GET /jobs/search returns 200", r.status_code == 200)
    check("GET /jobs/search returns a results list", isinstance(r.json().get("results"), list))
    check("GET /jobs/search returns non-empty results", len(r.json().get("results", [])) > 0)
    # 6. POST /assistant/chat (skipped by default — requires a real Gemini key)
    print("[SKIP] POST /assistant/chat — run manually with your Gemini key via /docs")

    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()