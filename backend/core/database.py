from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()

_raw_database_url = os.getenv("DATABASE_URL", "").strip()

if _raw_database_url:
    # Honour a fully-qualified DATABASE_URL (e.g. Neon / Railway / Heroku).
    # SQLAlchemy requires the psycopg2 dialect prefix; accept both plain
    # "postgresql://" and the already-prefixed "postgresql+psycopg2://" form.
    if _raw_database_url.startswith("postgresql://"):
        DATABASE_URL = _raw_database_url.replace(
            "postgresql://", "postgresql+psycopg2://", 1
        )
    else:
        DATABASE_URL = _raw_database_url
else:
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", ""))
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME")
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
