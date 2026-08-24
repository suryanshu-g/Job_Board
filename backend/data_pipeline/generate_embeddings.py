"""
Phase 3, Part B — generate embeddings for all jobs using a local model.
Standalone script, run once. Model: all-MiniLM-L6-v2 (384-dim) — chosen
over all-mpnet-base-v2 for CPU speed (mpnet projected ~6+ hours; MiniLM
is roughly 5x faster with a modest quality tradeoff, acceptable for this timeline).
"""
import time
from sqlalchemy import select
from sentence_transformers import SentenceTransformer
from app.database import SessionLocal
from app.models import Job

BATCH_SIZE = 100
COMMIT_EVERY_BATCHES = 10


def main():
    print("Loading model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Model loaded. Fetching records...")

    db = SessionLocal()
    try:
        jobs = db.execute(select(Job)).scalars().all()
        total = len(jobs)
        print(f"Total records to embed: {total}")

        start = time.time()
        batches_since_commit = 0

        for batch_start in range(0, total, BATCH_SIZE):
            batch = jobs[batch_start:batch_start + BATCH_SIZE]
            texts = [(job.description or "")[:2000] for job in batch]

            embeddings = model.encode(texts, show_progress_bar=False)

            for job, emb in zip(batch, embeddings):
                job.embedding = emb.tolist()

            batches_since_commit += 1
            if batches_since_commit >= COMMIT_EVERY_BATCHES:
                db.commit()
                batches_since_commit = 0

            done = min(batch_start + BATCH_SIZE, total)
            elapsed = time.time() - start
            rate = done / elapsed
            remaining = (total - done) / rate if rate > 0 else 0
            if done % 500 < BATCH_SIZE:
                print(f"  {done}/{total} ({elapsed:.0f}s elapsed, ~{remaining/60:.1f}min remaining)")

        db.commit()
        elapsed = time.time() - start
        print(f"\nDone. {total} records embedded in {elapsed/60:.1f} minutes.")
    finally:
        db.close()


if __name__ == "__main__":
    main()