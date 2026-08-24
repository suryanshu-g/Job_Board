import io
import re
import pdfplumber

# A starter keyword list drawn from common tech/data-science/web-dev skills.
# This is intentionally simple keyword matching, not NLP — good enough for
# a first-pass extraction from resume text.
SKILL_KEYWORDS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "React", "Vue.js", "Angular", "Node.js", "Django", "Flask", "FastAPI",
    "HTML", "CSS", "REST", "GraphQL",
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "Git",
    "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "Keras",
    "Machine Learning", "Deep Learning", "NLP", "Data Analysis",
    "Excel", "Tableau", "Power BI", "R",
    # --- added for job-posting coverage (Phase 3) ---
    "AI", "Artificial Intelligence", "Data Science", "Data Engineering",
    "ETL", "Spark", "Hadoop", "Airflow", "Snowflake", "BigQuery",
    "Oracle", "Oracle HCM", "SAP", "Workday", "Salesforce", "ServiceNow",
    "ERP", "CRM", "HCM", "Payroll", "SharePoint",
    "Product Management", "Agile", "Scrum", "JIRA", "UI/UX", "Figma",
    "DevOps", "Linux", "Java Spring", "Spring Boot", ".NET", "PHP",
    # --- added from real-data frequency analysis (Phase 3, Part A) ---
    "GCP", "RESTful", "HTML5", "CSS3", "Redux", "Express.js", "NoSQL",
    "Jenkins", "ReactJS", "Bootstrap", "Kafka", "jQuery", "SQL Server",
    "Microservices", "Jest", "Webpack", "Next.js",
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_skills(text: str) -> list[str]:
    found = []
    lower_text = text.lower()
    for skill in SKILL_KEYWORDS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, lower_text):
            found.append(skill)
    return found


def parse_resume(file_bytes: bytes) -> dict:
    text = extract_text_from_pdf(file_bytes)
    skills = extract_skills(text)
    return {
        "raw_text_length": len(text),
        "skills": skills,
    }