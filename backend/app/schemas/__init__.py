from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str  # 'landlord' or 'tenant'

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Property Schemas
class PropertyBase(BaseModel):
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    total_units: int
    description: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyResponse(PropertyBase):
    id: int
    landlord_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Unit Schemas
class UnitBase(BaseModel):
    unit_number: str
    bedrooms: int
    bathrooms: float
    square_feet: Optional[int] = None
    monthly_rent: float

class UnitCreate(UnitBase):
    property_id: int

class UnitResponse(UnitBase):
    id: int
    property_id: int
    is_occupied: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Tenant Schemas
class TenantBase(BaseModel):
    unit_id: int
    lease_start_date: datetime
    lease_end_date: Optional[datetime] = None
    deposit_amount: Optional[float] = None

class TenantCreate(TenantBase):
    user_id: int

class TenantResponse(TenantBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Rent Bill Schemas
class RentBillBase(BaseModel):
    month: int
    year: int
    amount: float
    due_date: datetime

class RentBillCreate(RentBillBase):
    unit_id: int

class RentBillResponse(RentBillBase):
    id: int
    unit_id: int
    is_paid: bool
    paid_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    amount: float
    payment_method: str
    reference_number: Optional[str] = None

class PaymentCreate(PaymentBase):
    rent_bill_id: Optional[int] = None

class PaymentResponse(PaymentBase):
    id: int
    tenant_id: int
    rent_bill_id: Optional[int]
    payment_date: datetime
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Arrears Schemas
class ArrearsResponse(BaseModel):
    id: int
    tenant_id: int
    total_amount_due: float
    months_outstanding: int
    last_payment_date: Optional[datetime]
    is_escalated: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Utility Bill Schemas
class UtilityBillBase(BaseModel):
    utility_type: str
    month: int
    year: int
    amount: float
    usage_value: float

class UtilityBillCreate(UtilityBillBase):
    unit_id: int

class UtilityBillResponse(UtilityBillBase):
    id: int
    unit_id: int
    is_anomalous: bool
    anomaly_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Maintenance Request Schemas
class MaintenanceRequestBase(BaseModel):
    description: str
    category: str
    priority: str  # low, medium, high, urgent

class MaintenanceRequestCreate(MaintenanceRequestBase):
    unit_id: Optional[int] = None

class MaintenanceRequestResponse(MaintenanceRequestBase):
    id: int
    unit_id: int
    tenant_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    completed_date: Optional[datetime]
    
    class Config:
        from_attributes = True

# Maintenance Schedule Schemas
class MaintenanceScheduleBase(BaseModel):
    scheduled_date: datetime
    assigned_contractor: Optional[str] = None
    estimated_duration_hours: Optional[int] = None
    cost_estimate: Optional[float] = None
    notes: Optional[str] = None

class MaintenanceScheduleCreate(MaintenanceScheduleBase):
    maintenance_request_id: int

class MaintenanceScheduleResponse(MaintenanceScheduleBase):
    id: int
    maintenance_request_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Chat Schemas
class ChatMessageCreate(BaseModel):
    message_text: str

class ChatMessageResponse(BaseModel):
    id: int
    sender: str
    message_text: str
    intent: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: int
    tenant_id: int
    session_start: datetime
    session_end: Optional[datetime]
    is_active: bool
    messages: List[ChatMessageResponse] = []
    
    class Config:
        from_attributes = True
