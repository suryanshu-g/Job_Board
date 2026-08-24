from sqlalchemy import create_engine, text

engine = create_engine("postgresql+psycopg2://jobboard:jobboard_dev_pw@localhost:5433/jobboard")
with engine.connect() as conn:
    result = conn.execute(text("SELECT pg_size_pretty(pg_total_relation_size('jobs'));"))
    print(result.scalar())