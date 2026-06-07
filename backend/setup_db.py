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
