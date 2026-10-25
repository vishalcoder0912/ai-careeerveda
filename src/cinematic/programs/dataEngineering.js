import {Bot, Cloud, Code2, Database, FolderKanban, GraduationCap, Map as MapIcon, ShieldCheck, Trophy, Workflow} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

// The cinematic page for the PG Program in Data Engineering with Agentic & Gen AI.
export const dataEngineeringContent = buildProgramContent("data-engineering", {
  hero: {
    title: ["Data", "Engineering"],
    sub: "Ingest it. Model it. Transform it. Orchestrate it. Trust it — from raw sources to AI-ready data platforms.",
    badges: ["8 MONTHS", "21 MODULES", "LIVE ONLINE", "SPARK · AIRFLOW · KAFKA", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Sources to Platforms",
    title: ["The Making", "of a Data Engineer"],
    chapters: [
      [1, 3, "SQL & Python Foundations", "What data engineers own, then the SQL and Python every pipeline is written in."],
      [4, 6, "Modeling & Pipelines", "Warehouse design, ETL and ELT, and ingestion from real source systems."],
      [7, 9, "Lakes, Warehouses & Spark", "Lakehouse architecture, cloud warehouses and distributed processing with Spark."],
      [10, 12, "Orchestration & Streaming", "Airflow schedules, dbt transformations and real-time streams with Kafka."],
      [13, 16, "Quality, Governance & DataOps", "Data tests, lineage and security, CI/CD for data and pipelines that stay up."],
      [17, 21, "AI for Data & Capstone", "Gen AI, embedding pipelines and agentic data ops — then a capstone and career prep."],
    ],
  },

  skills: {
    sub: "From a raw source to a trusted, AI-ready platform — five domains, one engineering discipline.",
    tag: "Builder · Architect · Operator",
    items: [
      ["SQL & Python", Code2, "The two languages every pipeline, model and data test is written in.", ["Advanced SQL", "Window Functions", "Python", "pandas", "APIs", "File Formats", "Git"]],
      ["Modeling & Warehousing", Database, "Design storage that stays fast, cheap and correct as data grows.", ["Dimensional Modeling", "Star Schema", "Snowflake", "BigQuery", "Delta Lake", "Lakehouse", "Partitioning"]],
      ["Pipelines & Processing", Workflow, "Move and transform data in batch and in real time.", ["ETL / ELT", "Apache Spark", "Airflow", "dbt", "Kafka", "Streaming", "CDC"]],
      ["DataOps & Governance", ShieldCheck, "Keep data tested, documented, secure and on time.", ["Data Quality", "Great Expectations", "Lineage", "Data Security", "CI/CD", "Terraform", "Monitoring"]],
      ["AI for Data", Bot, "Build the pipelines AI runs on — and let agents run the routine work.", ["Gen AI", "Embeddings", "Vector DBs", "RAG Pipelines", "Agentic Ops", "LLM Automation", "Data Contracts"]],
    ],
  },

  quote: {
    lines: ["EVERY INSIGHT", "NEEDS A PIPELINE.", "GOOD ENGINEERS", "KEEP IT FLOWING."],
    cite: "— the data engineer’s credo",
  },

  architecture: {
    title: ["The Data", "Engineering Stack"],
    sub: "Nine layers, built in order — each one a foundation for the next.",
    layers: [
      ["Foundations", "The data engineer’s role → SQL → Python"],
      ["Data Modeling", "Dimensional models → warehouse design → schemas"],
      ["Ingestion", "Source systems → APIs → ETL & ELT"],
      ["Storage", "Data lakes → lakehouses → cloud warehouses"],
      ["Processing", "Apache Spark → distributed compute → batch jobs"],
      ["Orchestration & Transformation", "Airflow → dbt → scheduling and dependencies"],
      ["Streaming", "Kafka → real-time pipelines → event processing"],
      ["Reliability & Governance", "Data quality → lineage → security → DataOps → monitoring"],
      ["AI-Ready Data", "Gen AI → embedding pipelines → agentic data operations"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from SQL to AI-ready data platforms — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Data engineering, SQL, Python and warehouse design.", "Foundations", 1, 4],
      ["Pipelines & Storage", "ETL and ELT, ingestion, lakehouses and cloud warehouses.", "Pipelines", 5, 8],
      ["Process & Orchestrate", "Spark, Airflow, dbt and Kafka streaming.", "Process", 9, 12],
      ["Reliability", "Data quality, governance, DataOps and pipeline monitoring.", "Reliability", 13, 16],
      ["AI & Launch", "Gen AI, vector pipelines, agentic data ops, the capstone and career readiness.", "Launch", 17, 21],
    ],
    art: {"01": "foundations", "02": "data", "03": "gear", "04": "target", "05": "agents"},
  },

  system: {
    title: ["The Data", "Platform"],
    sub: "Everything a data engineer connects — sources, storage, compute and consumers — around one pipeline.",
    center: {title: "PIPELINE", sub: "ingest · transform · serve", art: art("gear")},
    nodes: [
      ["SOURCES", agentArt("api")],
      ["INGESTION", art("discover")],
      ["LAKEHOUSE", art("data")],
      ["AIRFLOW", art("map")],
      ["SPARK", art("labs")],
      ["WAREHOUSE", agentArt("rag")],
      ["STREAMING", art("megaphone")],
      ["QUALITY", agentArt("eval")],
      ["SECURITY", agentArt("security")],
      ["AI & BI", art("genai")],
    ],
  },

  workflow: {
    title: ["From Source", "to Platform"],
    lead: "Ten steps, one pipeline loop — the order you learn to take raw source data to a trusted, AI-ready platform.",
    pipeline: ["source", "ingest", "store", "model", "transform", "orchestrate", "stream", "test", "govern", "serve"],
    steps: [
      ["Source", "Databases, APIs, files & events"],
      ["Ingest", "Batch loads, CDC & connectors"],
      ["Store", "Data lakes, lakehouses & warehouses"],
      ["Model", "Dimensional models & schemas"],
      ["Transform", "Spark jobs & dbt models"],
      ["Orchestrate", "Airflow DAGs & scheduling"],
      ["Stream", "Kafka topics & real-time processing"],
      ["Test", "Data quality checks & contracts"],
      ["Govern", "Lineage, access & security"],
      ["Serve", "BI, ML features & AI pipelines"],
    ],
  },

  projects: {
    items: [
      ["Batch ETL Pipeline", ["Python", "SQL", "ETL"], "Load, clean and model a real dataset into an analytics warehouse."],
      ["Star-Schema Warehouse", ["Dimensional Modeling", "Snowflake", "SQL"], "A warehouse design that answers business questions in seconds."],
      ["Lakehouse on Delta", ["Delta Lake", "Spark", "Partitioning"], "A medallion lakehouse with bronze, silver and gold layers."],
      ["Spark Processing Job", ["Apache Spark", "PySpark", "Optimisation"], "Process millions of rows with a tuned, distributed Spark job."],
      ["Airflow + dbt Platform", ["Airflow", "dbt", "Scheduling"], "Orchestrated, tested transformations that run every night on time."],
      ["Kafka Streaming Pipeline", ["Kafka", "Streaming", "Real-Time"], "A real-time pipeline that processes events as they happen."],
      ["Embedding Pipeline", ["Embeddings", "Vector DB", "RAG"], "Turn documents into vectors an AI assistant can search."],
      ["Capstone Data Platform", ["End-to-End", "DataOps", "Monitoring"], "A complete, monitored data platform from source to dashboard."],
    ],
    categories: ["Batch Pipelines", "Warehousing", "Lakehouse", "Big Data", "Orchestration", "Streaming", "AI Pipelines", "Capstone"],
    sideLeft: ["Sources", "Pipelines", "Platforms", "Real Impact"],
    sideRight: ["Ingest", "Transform", "Serve"],
    footLeft: "Real pipelines · real portfolio",
    footRight: "Build the platform, not just the query",
  },

  careers: {
    lead: "The data engineering roles this track opens — one role at a time.",
    roles: [
      ["Data Engineer", "Fresher", "Pipelines · SQL · Python", "Build and maintain the pipelines that feed analytics and AI.", ["SQL", "Python", "ETL", "Airflow", "Spark"]],
      ["ETL Developer", "Fresher", "Integration · Loads · Quality", "Integrate source systems and load them reliably.", ["ETL", "SQL", "Data Quality", "Scheduling", "Python"]],
      ["Analytics Engineer", "Fresher", "dbt · Models · Metrics", "Turn raw tables into tested, documented analytics models.", ["dbt", "SQL", "Data Modeling", "Testing", "BI"]],
      ["Big Data Developer", "Fresher", "Spark · Scale · Processing", "Write distributed jobs that process data at scale.", ["Apache Spark", "PySpark", "Partitioning", "Cloud", "SQL"]],
      ["Senior Data Engineer", "Mid-level", "Architecture · Reliability · Ownership", "Own data pipelines and their reliability end to end.", ["Spark", "Airflow", "Kafka", "Data Modeling", "Mentoring"]],
      ["Cloud Data Engineer", "Mid-level", "Cloud · Warehouses · Cost", "Build data platforms on AWS, Azure or GCP within budget.", ["Snowflake", "BigQuery", "Terraform", "Cost Control", "IAM"]],
      ["Streaming Data Engineer", "Mid-level", "Kafka · Real-Time · Events", "Build pipelines that process events the moment they happen.", ["Kafka", "Flink", "Streaming", "CDC", "Monitoring"]],
      ["DataOps Engineer", "Mid-level", "CI/CD · Quality · Observability", "Automate testing, deployment and monitoring of data pipelines.", ["CI/CD", "Data Quality", "Observability", "Docker", "Git"]],
      ["Data Platform Architect", "Experienced", "Platforms · Governance · Scale", "Design the data platform an organisation runs on.", ["Architecture", "Governance", "Lakehouse", "Security", "Strategy"]],
      ["Data Engineering Manager", "Experienced", "Teams · Roadmaps · Delivery", "Lead a data engineering team and its platform roadmap.", ["Team Leadership", "Roadmapping", "Hiring", "Stakeholders", "Delivery"]],
    ],
  },

  stats: {modulesNote: "SQL to capstone"},

  learning: {
    title: ["Learn.", "Build. Scale."],
    projects: "Every module ships a working pipeline or platform piece",
    items: [
      ["Cloud Platform Labs", "Hands-on Snowflake, Spark, Airflow and Kafka labs", Cloud],
      ["Data Engineering Interview Mastery", "SQL, system design and pipeline case rounds", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-DE-01", "PG Program in Data Engineering with Agentic & Gen AI", "Pipelines · Platforms · AI", "program", "Build data platforms end to end — ingestion, modeling, Spark, Airflow, Kafka, DataOps and AI pipelines.", ["Spark", "Airflow", "Kafka", "dbt"]],
      ["PG-DEI-02", "Data Engineering Internship", "ETL · Orchestration · Quality", "Internship program", "Real-world pipeline work — ETL and warehouse builds, orchestration, data quality and AI for data ops.", ["ETL", "Warehousing", "Orchestration", "Data Quality"]],
      ["PG-DEC-03", "Pipeline Ownership & Communication", "Documentation · Debugging · Ownership", "Soft-skills program", "Document clearly, debug systematically and own pipeline reliability with your team.", ["Documentation", "Debugging", "Collaboration", "Ownership"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and ownership certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A lakehouse, a Spark job, an Airflow + dbt platform and a streaming pipeline.", FolderKanban],
      ["Portfolio", "Every pipeline in one GitHub portfolio a hiring manager can run.", MapIcon],
    ],
    note: "A portfolio your future team can run — pipelines, platforms and tests you can point to.",
  },

  cta: {word: "Your Data Engineering", sub: "From raw sources to AI-ready data platforms."},
  footer: "Data Platforms.",
});
