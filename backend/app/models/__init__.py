from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    LANDLORD = "landlord"
    TENANT = "tenant"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    hashed_password = Column(String(255))
    role = Column(Enum(UserRole))
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    properties = relationship("Property", back_populates="landlord")
    tenant_record = relationship("Tenant", back_populates="user", uselist=False)
    payments = relationship("Payment", back_populates="tenant")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="tenant")

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    landlord_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(255), index=True)
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    description = Column(Text, nullable=True)
    total_units = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    landlord = relationship("User", back_populates="properties")
    units = relationship("Unit", back_populates="property", cascade="all, delete-orphan")

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    unit_number = Column(String(50))
    bedrooms = Column(Integer)
    bathrooms = Column(Float)
    square_feet = Column(Integer, nullable=True)
    monthly_rent = Column(Float)
    is_occupied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    property = relationship("Property", back_populates="units")
    tenants = relationship("Tenant", back_populates="unit")
    rent_bills = relationship("RentBill", back_populates="unit")
    utility_bills = relationship("UtilityBill", back_populates="unit")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="unit")

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    lease_start_date = Column(DateTime)
    lease_end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    deposit_amount = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tenant_record")
    unit = relationship("Unit", back_populates="tenants")
    arrears = relationship("Arrears", back_populates="tenant", uselist=False)
    chat_sessions = relationship("ChatSession", back_populates="tenant")

class RentBill(Base):
    __tablename__ = "rent_bills"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    month = Column(Integer)
    year = Column(Integer)
    amount = Column(Float)
    due_date = Column(DateTime)
    is_paid = Column(Boolean, default=False)
    paid_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    unit = relationship("Unit", back_populates="rent_bills")
    payments = relationship("Payment", back_populates="rent_bill")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"))
    rent_bill_id = Column(Integer, ForeignKey("rent_bills.id"), nullable=True)
    amount = Column(Float)
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(100))
    reference_number = Column(String(100), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("User", back_populates="payments")
    rent_bill = relationship("RentBill", back_populates="payments")

class Arrears(Base):
    __tablename__ = "arrears"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True)
    total_amount_due = Column(Float, default=0)
    months_outstanding = Column(Integer, default=0)
    last_payment_date = Column(DateTime, nullable=True)
    is_escalated = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="arrears")

class UtilityBill(Base):
    __tablename__ = "utility_bills"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    month = Column(Integer)
    year = Column(Integer)
    utility_type = Column(String(50))
    amount = Column(Float)
    usage_value = Column(Float)
    is_anomalous = Column(Boolean, default=False)
    anomaly_reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    unit = relationship("Unit", back_populates="utility_bills")

class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    tenant_id = Column(Integer, ForeignKey("users.id"))
    description = Column(Text)
    category = Column(String(100))
    priority = Column(String(20))
    status = Column(String(50), default="submitted")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_date = Column(DateTime, nullable=True)

    # Relationships
    unit = relationship("Unit", back_populates="maintenance_requests")
    tenant = relationship("User", back_populates="maintenance_requests")
    scheduled_work = relationship("MaintenanceSchedule", back_populates="maintenance_request")

class MaintenanceSchedule(Base):
    __tablename__ = "maintenance_schedules"

    id = Column(Integer, primary_key=True, index=True)
    maintenance_request_id = Column(Integer, ForeignKey("maintenance_requests.id"))
    scheduled_date = Column(DateTime)
    assigned_contractor = Column(String(255), nullable=True)
    estimated_duration_hours = Column(Integer, nullable=True)
    cost_estimate = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    maintenance_request = relationship("MaintenanceRequest", back_populates="scheduled_work")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    session_start = Column(DateTime, default=datetime.utcnow)
    session_end = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    sender = Column(String(50))
    message_text = Column(Text)
    intent = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
