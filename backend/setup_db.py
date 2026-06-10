import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database import Base, engine
    from app.models import (
        User, Property, Unit, Tenant,
        RentBill, Payment, Arrears, UtilityBill,
        MaintenanceRequest, MaintenanceSchedule,
        ChatSession, ChatMessage
    )
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created successfully")
except Exception as e:
    print(f"[ERROR] {e}")
    sys.exit(1)

# Add new columns to existing tables (safe to run multiple times)
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        for col, definition in [
            ("is_paid", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("paid_date", "DATETIME NULL"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE utility_bills ADD COLUMN {col} {definition}"))
                conn.commit()
                print(f"[OK] Added column utility_bills.{col}")
            except Exception:
                pass  # Column already exists
except Exception as e:
    print(f"[WARN] Migration step skipped: {e}")
