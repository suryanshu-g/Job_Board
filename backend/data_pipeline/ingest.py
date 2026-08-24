import json
import re
import uuid
import pandas as pd
from pathlib import Path
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

RAW_DATA_PATH = Path("query_result_2026-08-19T11_42_24.242228274Z.json")
DEAD_COLUMNS = ["maxSalary", "minSalary", "relevantScore", "dataToShow",
                "createdAt", "updatedBy", "updatedAt", "publishedAt", "roles"]

PLATFORM_KEYWORDS = {
    "linkedin": "LinkedIn", "bebee": "BeBee", "trabajo": "Trabajo.org",
    "grabjobs": "GrabJobs", "glassdoor": "Glassdoor", "talents jobs": "Talents Jobs",
    "elite job": "The Elite Job", "jobi.ai": "Jobi.ai", "iitjobs": "Iitjobs",
    "internshala": "Internshala", "freshteam": "Freshteam", "recruit.net": "Recruit.net",
    "whatjobs": "WhatJobs", "shine": "Shine", "learn4good": "Learn4Good",
    "boston consulting group": "Boston Consulting Group", "jobvision": "Jobvision.in",
    "the muse": "The Muse", "adobe careers": "Adobe Careers", "post job": "Post Job",
    "wellfound": "Wellfound", "expertini": "Expertini", "echojobs": "EchoJobs",
    "foundit": "Foundit.in", "simplyhired": "SimplyHired",
    "smart recruiters": "Smart Recruiters Jobs", "hitachi careers": "Hitachi Careers",
    "accenture": "Accenture", "mogul": "Mogul", "jobrapido": "Jobrapido.com",
    "united airlines": "United Airlines Jobs", "freshersvoice": "Freshersvoice.com",
    "virtusa": "Virtusa",
}

SLUG_TITLE_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*-\d+$")


def load_raw_data(path: Path) -> pd.DataFrame:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return pd.DataFrame(data)


def drop_dead_columns(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df.columns)
    df = df.drop(columns=DEAD_COLUMNS)
    print(f"Dropped {before - len(df.columns)} dead columns: {DEAD_COLUMNS}")
    return df


def normalize_via(raw: str) -> str:
    if not isinstance(raw, str) or not raw.strip():
        return "Unknown"
    cleaned = re.sub(r"^via\s+", "", raw.strip(), flags=re.IGNORECASE)
    lowered = cleaned.lower()
    for keyword, canonical in PLATFORM_KEYWORDS.items():
        if keyword in lowered:
            return canonical
    return cleaned


def apply_via_normalization(df: pd.DataFrame, min_count_threshold: int = 20) -> pd.DataFrame:
    df["source_platform"] = df["via"].apply(normalize_via)
    counts = df["source_platform"].value_counts()
    known = set(PLATFORM_KEYWORDS.values())
    long_tail = counts[(~counts.index.isin(known)) & (counts < min_count_threshold)].index
    other_count = df["source_platform"].isin(long_tail).sum()
    df.loc[df["source_platform"].isin(long_tail), "source_platform"] = "Other"
    print(f"source_platform: {other_count} bucketed to 'Other', "
          f"{df['source_platform'].nunique()} final unique values")
    return df


def safe_double_parse(val):
    if not isinstance(val, str) or val.strip() == "" or val.strip() == "null":
        return None
    try:
        parsed = json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return None
    if isinstance(parsed, str):
        if parsed.strip() == "null" or parsed.strip() == "":
            return None
        try:
            parsed = json.loads(parsed)
        except (json.JSONDecodeError, TypeError):
            return None
    return parsed


def parse_json_fields(df: pd.DataFrame) -> pd.DataFrame:
    df["apply_options_parsed"] = df["apply_options"].apply(safe_double_parse)
    df["salaries_parsed"] = df["salaries"].apply(safe_double_parse)
    df["ratings_parsed"] = df["ratings"].apply(safe_double_parse)

    apply_ok = df["apply_options_parsed"].apply(lambda x: isinstance(x, list)).sum()
    salaries_ok = df["salaries_parsed"].apply(lambda x: isinstance(x, list)).sum()
    ratings_ok = df["ratings_parsed"].apply(lambda x: isinstance(x, list)).sum()
    print(f"Parsed successfully — apply_options: {apply_ok}/{len(df)}, "
          f"salaries: {salaries_ok}/{len(df)}, ratings: {ratings_ok}/{len(df)}")
    return df


def extract_cross_posting(df: pd.DataFrame) -> pd.DataFrame:
    def get_platforms(parsed):
        if not isinstance(parsed, list):
            return []
        return [entry.get("title", "").replace("Apply on ", "").strip()
                for entry in parsed if isinstance(entry, dict)]

    df["cross_posted_platforms"] = df["apply_options_parsed"].apply(get_platforms)
    df["is_cross_posted"] = df["cross_posted_platforms"].apply(lambda x: len(x) > 1)
    cross_posted_count = df["is_cross_posted"].sum()
    print(f"Cross-posted records (2+ apply platforms): {cross_posted_count} "
          f"({cross_posted_count/len(df):.1%})")
    return df


def extract_salary(df: pd.DataFrame) -> pd.DataFrame:
    def get_salary_fields(parsed):
        if not isinstance(parsed, list) or len(parsed) == 0:
            return pd.Series([None, None, None])
        first = parsed[0]
        if not isinstance(first, dict):
            return pd.Series([None, None, None])
        return pd.Series([first.get("salary_from"), first.get("salary_to"), first.get("source")])

    df[["salary_from", "salary_to", "salary_source"]] = df["salaries_parsed"].apply(get_salary_fields)
    have_salary = df["salary_from"].notna().sum()
    print(f"Records with usable salary data: {have_salary} ({have_salary/len(df):.1%})")
    return df


def extract_company_rating(df: pd.DataFrame) -> pd.DataFrame:
    def get_rating_fields(parsed):
        if not isinstance(parsed, list) or len(parsed) == 0:
            return pd.Series([None, None])
        first = parsed[0]
        if not isinstance(first, dict):
            return pd.Series([None, None])
        return pd.Series([first.get("rating"), first.get("source")])

    df[["company_rating", "company_rating_source"]] = df["ratings_parsed"].apply(get_rating_fields)
    have_rating = df["company_rating"].notna().sum()
    print(f"Records with usable rating data: {have_rating} ({have_rating/len(df):.1%})")
    return df


def normalize_remote_type(raw: str) -> str:
    if not isinstance(raw, str):
        return None
    lowered = raw.strip().lower()
    if not lowered or "not mentioned" in lowered:
        return None
    if "remote" in lowered:
        return "Remote"
    if "hybrid" in lowered:
        return "Hybrid"
    if "onsite" in lowered or "on-site" in lowered or "on site" in lowered:
        return "Onsite"
    return None


def normalize_schedule_type(raw: str) -> str:
    if not isinstance(raw, str) or not raw.strip():
        return None
    return raw.replace("\u2013", "-").strip()


def apply_field_normalizations(df: pd.DataFrame) -> pd.DataFrame:
    df["remote_type"] = df["locationRequirement"].apply(normalize_remote_type)
    df["schedule_type_clean"] = df["schedule_type"].apply(normalize_schedule_type)
    remote_count = df["remote_type"].notna().sum()
    print(f"remote_type classified: {remote_count} ({remote_count/len(df):.1%}), "
          f"rest NULL (not mentioned/empty)")
    return df


def flag_dirty_fields(df: pd.DataFrame) -> pd.DataFrame:
    df["title_is_slug"] = df["title"].astype(str).apply(lambda t: bool(SLUG_TITLE_PATTERN.match(t)))
    df["description_needs_enrichment"] = df["description"].astype(str).str.len() < 50
    df["skills_needs_enrichment"] = (
        (df["skills"].astype(str).str.strip().str.lower() == "not mentioned") |
        (df["skills"].astype(str).str.strip() == "")
    )

    print(f"Slug-style titles: {df['title_is_slug'].sum()}")
    print(f"Descriptions needing enrichment (<50 chars): {df['description_needs_enrichment'].sum()}")
    print(f"Skills needing enrichment: {df['skills_needs_enrichment'].sum()}")
    return df


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    df["posted_at_parsed"] = pd.to_datetime(df["posted_at"], errors="coerce")
    df = df.sort_values("posted_at_parsed", ascending=False)
    df = df.drop_duplicates(subset=["title", "company_name", "location"], keep="first")
    after = len(df)
    print(f"Deduplication: {before} -> {after} records ({before - after} duplicates removed, "
          f"{(before - after)/before:.1%})")
    return df


def build_final_table(df: pd.DataFrame) -> pd.DataFrame:
    def parse_skills(raw):
        if not isinstance(raw, str):
            return []
        raw = raw.strip()
        if not raw or raw.lower() == "not mentioned":
            return []
        return [s.strip() for s in raw.split(",") if s.strip()]

    out = pd.DataFrame()
    out["job_id"] = df["job_id"]
    out["title"] = df["title"]
    out["company_name"] = df["company_name"]
    out["location"] = df["location"]
    out["description"] = df["description"]
    out["formatted_description"] = df["formattedDescription"]
    out["domain"] = df["domain"]
    out["employment_type"] = df["employmentType"]
    out["schedule_type"] = df["schedule_type_clean"]
    out["query_category"] = df["query"]
    out["skills"] = df["skills"].apply(parse_skills)
    out["min_experience"] = pd.to_numeric(df["minExperienceRequired"], errors="coerce").astype("Int64")
    out["max_experience"] = pd.to_numeric(df["maxExperienceRequired"], errors="coerce").astype("Int64")
    out["posted_at"] = df["posted_at_parsed"]
    out["source_platform"] = df["source_platform"]
    out["cross_posted_platforms"] = df["cross_posted_platforms"]
    out["apply_link"] = df["apply_options_parsed"].apply(
        lambda x: x[0].get("link") if isinstance(x, list) and len(x) > 0 and isinstance(x[0], dict) else None
    )
    out["salary_from"] = pd.to_numeric(df["salary_from"], errors="coerce")
    out["salary_to"] = pd.to_numeric(df["salary_to"], errors="coerce")
    out["salary_source"] = df["salary_source"]
    out["company_rating"] = pd.to_numeric(df["company_rating"], errors="coerce")
    out["company_rating_source"] = df["company_rating_source"]
    out["remote_type"] = df["remote_type"]
    out["company_logo_url"] = df["thumbnail"]
    out["title_is_slug"] = df["title_is_slug"]
    out["description_needs_enrichment"] = df["description_needs_enrichment"]
    out["skills_needs_enrichment"] = df["skills_needs_enrichment"]
    out["embedding"] = None

    print(f"Final table shape: {out.shape}")
    print(f"Columns: {list(out.columns)}")
    return out


def load_to_postgres(out: pd.DataFrame):
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    print(f"DATABASE_URL loaded: {db_url}")
    engine = create_engine(db_url)
    out.to_sql("jobs", engine, if_exists="append", index=False, method="multi", chunksize=1000)
    print(f"Loaded {len(out)} records into Postgres 'jobs' table")


if __name__ == "__main__":
    df = load_raw_data(RAW_DATA_PATH)
    print(f"Loaded {len(df)} records, {len(df.columns)} columns")

    df = drop_dead_columns(df)
    df = apply_via_normalization(df)
    df = parse_json_fields(df)
    df = extract_cross_posting(df)
    df = extract_salary(df)
    df = extract_company_rating(df)
    df = apply_field_normalizations(df)
    df = flag_dirty_fields(df)
    df = deduplicate(df)

    final_df = build_final_table(df)
    load_to_postgres(final_df)

    print(f"\nFinal dataframe shape: {df.shape}")