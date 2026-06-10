from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, Property, Unit, Tenant, RentBill, Payment, UtilityBill, Arrears, MaintenanceRequest
from app.schemas import (
    PropertyCreate, PropertyResponse, UnitCreate, UnitResponse,
    RentBillCreate, RentBillResponse, ArrearsResponse, UtilityBillResponse,
    MaintenanceRequestResponse
)
from app.security import get_landlord_user, hash_password
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class TenantCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    unit_id: int
    lease_start_date: datetime
    lease_end_date: Optional[datetime] = None
    deposit_amount: Optional[float] = None

class RentBillCreate(BaseModel):
    unit_id: int
    month: int
    year: int
    amount: float
    due_date: datetime

router = APIRouter(prefix="/landlord", tags=["landlord"])

# ============ PROPERTY MANAGEMENT ============

@router.post("/properties", response_model=PropertyResponse)
def register_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Register a new property"""
    db_property = Property(
        landlord_id=current_user.id,
        **property_data.model_dump()
    )
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    return db_property

@router.get("/properties", response_model=list[PropertyResponse])
def list_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """List all properties for landlord"""
    properties = db.query(Property).filter(Property.landlord_id == current_user.id).all()
    return properties

@router.put("/properties/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int,
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    for key, value in property_data.model_dump().items():
        setattr(prop, key, value)
    prop.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/properties/{property_id}")
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(prop)
    db.commit()
    return {"message": "Property deleted"}


@router.get("/properties/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Get property details"""
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return prop

# ============ UNIT MANAGEMENT ============

@router.post("/units", response_model=UnitResponse)
def create_unit(
    unit_data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Create a new unit in a property"""
    # Verify property ownership
    prop = db.query(Property).filter(
        Property.id == unit_data.property_id,
        Property.landlord_id == current_user.id
    ).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    db_unit = Unit(**unit_data.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.get("/properties/{property_id}/units", response_model=list[UnitResponse])
def list_property_units(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """List all units in a property"""
    # Verify property ownership
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    return units

@router.put("/units/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: int,
    unit_data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    for key, value in unit_data.model_dump().items():
        setattr(unit, key, value)
    unit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}")
def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    db.delete(unit)
    db.commit()
    return {"message": "Unit deleted"}


@router.get("/units/{unit_id}/tenants", response_model=list)
def list_unit_tenants(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    tenants = db.query(Tenant).filter(Tenant.unit_id == unit_id, Tenant.is_active == True).all()
    return tenants

# ============ TENANT MANAGEMENT ============

@router.get("/tenants")
def list_all_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    props = db.query(Property).filter(Property.landlord_id == current_user.id).all()
    prop_ids = [p.id for p in props]
    units = db.query(Unit).filter(Unit.property_id.in_(prop_ids)).all()
    unit_ids = [u.id for u in units]
    unit_map = {u.id: u for u in units}
    prop_map = {p.id: p for p in props}
    tenants = db.query(Tenant).filter(Tenant.unit_id.in_(unit_ids)).all()
    result = []
    for t in tenants:
        user = db.query(User).filter(User.id == t.user_id).first()
        unit = unit_map.get(t.unit_id)
        prop = prop_map.get(unit.property_id) if unit else None
        result.append({
            "id": t.id, "user_id": t.user_id,
            "name": user.full_name if user else "", "email": user.email if user else "",
            "phone": user.phone if user else "",
            "unit": unit.unit_number if unit else "", "unit_id": t.unit_id,
            "property": prop.name if prop else "", "property_id": prop.id if prop else None,
            "monthly_rent": unit.monthly_rent if unit else 0,
            "lease_start": str(t.lease_start_date), "lease_end": str(t.lease_end_date) if t.lease_end_date else None,
            "is_active": t.is_active, "deposit": t.deposit_amount,
        })
    return result

@router.post("/tenants")
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    unit = db.query(Unit).filter(Unit.id == data.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    prop = db.query(Property).filter(Property.id == unit.property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=403, detail="Not your property")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, full_name=data.full_name, phone=data.phone,
                hashed_password=hash_password(data.password), role="tenant", is_active=True)
    db.add(user)
    db.flush()
    tenant = Tenant(user_id=user.id, unit_id=data.unit_id,
                    lease_start_date=data.lease_start_date, lease_end_date=data.lease_end_date,
                    deposit_amount=data.deposit_amount, is_active=True)
    db.add(tenant)
    unit.is_occupied = True
    db.commit()
    return {"message": "Tenant created", "user_id": user.id, "tenant_id": tenant.id}

@router.delete("/tenants/{tenant_id}")
def remove_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.is_active = False
    unit = db.query(Unit).filter(Unit.id == tenant.unit_id).first()
    if unit:
        unit.is_occupied = False
    db.commit()
    return {"message": "Tenant removed"}

# ============ RENT BILLS ============

@router.get("/rent-bills")
def list_rent_bills(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    prop = db.query(Property).filter(Property.id == property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_ids = [u.id for u in units]
    unit_map = {u.id: u for u in units}
    bills = db.query(RentBill).filter(RentBill.unit_id.in_(unit_ids)).order_by(RentBill.year.desc(), RentBill.month.desc()).all()
    result = []
    for b in bills:
        unit = unit_map.get(b.unit_id)
        tenant = db.query(Tenant).filter(Tenant.unit_id == b.unit_id, Tenant.is_active == True).first()
        tenant_user = db.query(User).filter(User.id == tenant.user_id).first() if tenant else None
        amount_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.rent_bill_id == b.id).scalar()
        balance_due = round(max(0, b.amount - float(amount_paid)), 2)
        result.append({
            "id": b.id, "unit": unit.unit_number if unit else "", "unit_id": b.unit_id,
            "tenant_name": tenant_user.full_name if tenant_user else "Vacant",
            "month": b.month, "year": b.year, "amount": b.amount,
            "amount_paid": float(amount_paid),
            "balance_due": balance_due,
            "due_date": str(b.due_date), "is_paid": b.is_paid, "paid_date": str(b.paid_date) if b.paid_date else None,
        })
    return result

@router.post("/rent-bills")
def create_rent_bill(
    data: RentBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    bill = RentBill(unit_id=data.unit_id, month=data.month, year=data.year,
                    amount=data.amount, due_date=data.due_date)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill

@router.get("/payments")
def list_payments(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    prop = db.query(Property).filter(Property.id == property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_ids = [u.id for u in units]
    # Get all tenants (including inactive) for this property's units
    tenant_records = db.query(Tenant).filter(Tenant.unit_id.in_(unit_ids)).all()
    tenant_user_ids = [t.user_id for t in tenant_records]
    unit_map = {t.user_id: unit_id for t, unit_id in
                [(t, t.unit_id) for t in tenant_records]}
    unit_obj_map = {u.id: u for u in units}
    # Fetch ALL payments by tenants in this property (with or without a bill)
    payments = db.query(Payment).filter(
        Payment.tenant_id.in_(tenant_user_ids)
    ).order_by(Payment.payment_date.desc()).all()
    result = []
    for p in payments:
        user = db.query(User).filter(User.id == p.tenant_id).first()
        unit_id = unit_map.get(p.tenant_id)
        unit = unit_obj_map.get(unit_id)
        result.append({
            "id": p.id, "tenant_name": user.full_name if user else "",
            "unit": unit.unit_number if unit else "—",
            "amount": p.amount, "method": p.payment_method,
            "reference": p.reference_number, "date": str(p.payment_date),
            "is_verified": p.is_verified,
            "rent_bill_id": p.rent_bill_id,
        })
    return result

class PaymentRecordCreate(BaseModel):
    tenant_id: int
    rent_bill_id: Optional[int] = None
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    mark_bill_paid: bool = True

@router.post("/payments")
def record_payment(
    data: PaymentRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Landlord records a payment received from a tenant"""
    payment = Payment(
        tenant_id=data.tenant_id,
        rent_bill_id=data.rent_bill_id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        is_verified=True,
    )
    if data.rent_bill_id and data.mark_bill_paid:
        bill = db.query(RentBill).filter(RentBill.id == data.rent_bill_id).first()
        if bill:
            bill.is_paid = True
            bill.paid_date = datetime.utcnow()
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return {"message": "Payment recorded", "payment_id": payment.id}

@router.patch("/payments/{payment_id}/verify")
def verify_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.is_verified = True
    db.commit()
    return {"message": "Payment verified"}

# ============ UTILITY BILLS ============

class UtilityBillCreate(BaseModel):
    unit_id: int
    utility_type: str   # water, electricity, gas
    month: int
    year: int
    amount: float
    usage_value: float

@router.get("/utility-bills")
def list_utility_bills(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    prop = db.query(Property).filter(Property.id == property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_ids = [u.id for u in units]
    unit_map = {u.id: u for u in units}
    bills = db.query(UtilityBill).filter(
        UtilityBill.unit_id.in_(unit_ids)
    ).order_by(UtilityBill.year.desc(), UtilityBill.month.desc()).all()
    return [{
        "id": b.id,
        "unit": unit_map[b.unit_id].unit_number if b.unit_id in unit_map else "",
        "unit_id": b.unit_id,
        "utility_type": b.utility_type,
        "month": b.month, "year": b.year,
        "amount": b.amount, "usage_value": b.usage_value,
        "is_anomalous": b.is_anomalous,
        "anomaly_reason": b.anomaly_reason,
        "is_paid": b.is_paid,
        "paid_date": str(b.paid_date) if b.paid_date else None,
        "created_at": str(b.created_at),
    } for b in bills]

@router.post("/utility-bills")
def create_utility_bill(
    data: UtilityBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    # Get historical average for same unit + utility type (last 6 months)
    history = db.query(UtilityBill).filter(
        UtilityBill.unit_id == data.unit_id,
        UtilityBill.utility_type == data.utility_type,
    ).order_by(UtilityBill.year.desc(), UtilityBill.month.desc()).limit(6).all()

    is_anomalous = False
    anomaly_reason = None

    if len(history) >= 2:
        avg_usage = sum(h.usage_value for h in history) / len(history)
        avg_amount = sum(h.amount for h in history) / len(history)
        if avg_usage > 0 and data.usage_value > avg_usage * 1.5:
            pct = int(((data.usage_value - avg_usage) / avg_usage) * 100)
            is_anomalous = True
            anomaly_reason = f"Usage is {pct}% above {len(history)}-month average ({avg_usage:.1f} units)"
        elif avg_amount > 0 and data.amount > avg_amount * 1.5:
            pct = int(((data.amount - avg_amount) / avg_amount) * 100)
            is_anomalous = True
            anomaly_reason = f"Amount is {pct}% above {len(history)}-month average (KShs {avg_amount:.0f})"

    bill = UtilityBill(
        unit_id=data.unit_id, utility_type=data.utility_type,
        month=data.month, year=data.year,
        amount=data.amount, usage_value=data.usage_value,
        is_anomalous=is_anomalous, anomaly_reason=anomaly_reason,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return {"id": bill.id, "is_anomalous": is_anomalous, "anomaly_reason": anomaly_reason}

@router.patch("/utility-bills/{bill_id}/mark-paid")
def mark_utility_bill_paid(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill.is_paid = not bill.is_paid
    bill.paid_date = datetime.utcnow() if bill.is_paid else None
    db.commit()
    return {"id": bill.id, "is_paid": bill.is_paid}

@router.delete("/utility-bills/{bill_id}")
def delete_utility_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    bill = db.query(UtilityBill).filter(UtilityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
    return {"message": "Deleted"}

# ============ SEED TEST DATA ============

@router.post("/seed-test-data/{property_id}")
def seed_test_data(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Populate 10 test tenants + 6 months of bills, payments, and utility data"""
    import random
    from datetime import date

    TEST_NAMES = [
        ("Alice Wanjiru", "alice.wanjiru"), ("Brian Omondi", "brian.omondi"),
        ("Catherine Muthoni", "catherine.muthoni"), ("David Kipchoge", "david.kipchoge"),
        ("Esther Akinyi", "esther.akinyi"), ("Francis Kamau", "francis.kamau"),
        ("Grace Njeri", "grace.njeri"), ("Hassan Abdi", "hassan.abdi"),
        ("Irene Chebet", "irene.chebet"), ("James Otieno", "james.otieno"),
    ]
    RENT_AMOUNTS = [8000, 10000, 12000, 15000, 18000]

    prop = db.query(Property).filter(Property.id == property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # ── Ensure 10 units exist ──────────────────────────────────────────────────
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    existing_count = len(units)
    units_created_count = 0
    for i in range(existing_count, 10):
        unit_number = f"House {i + 1}"
        if not any(u.unit_number == unit_number for u in units):
            rent = random.choice(RENT_AMOUNTS)
            new_unit = Unit(
                property_id=property_id, unit_number=unit_number,
                monthly_rent=rent, bedrooms=random.randint(1, 3),
                bathrooms=1, is_occupied=False,
            )
            db.add(new_unit)
            units_created_count += 1
    db.flush()
    units = db.query(Unit).filter(Unit.property_id == property_id).order_by(Unit.id).all()

    # ── Ensure each of the first 10 units has a test tenant ───────────────────
    tenants_created_count = 0
    unit_tenant_pairs = []
    for i, unit in enumerate(units[:10]):
        tenant = db.query(Tenant).filter(Tenant.unit_id == unit.id, Tenant.is_active == True).first()
        if not tenant:
            name, slug = TEST_NAMES[i]
            email = f"{slug}.test{property_id}@smartrental.test"
            if not db.query(User).filter(User.email == email).first():
                user = User(
                    email=email, full_name=name,
                    hashed_password=hash_password("Test@1234"),
                    role="tenant", is_active=True,
                )
                db.add(user)
                db.flush()
                lease_start = datetime(date.today().year - 1, date.today().month, 1)
                tenant = Tenant(
                    user_id=user.id, unit_id=unit.id,
                    lease_start_date=lease_start, deposit_amount=unit.monthly_rent * 2,
                    is_active=True,
                )
                db.add(tenant)
                unit.is_occupied = True
                db.flush()
                tenants_created_count += 1
        unit_tenant_pairs.append((unit, tenant))

    # ── Build 6-month window ───────────────────────────────────────────────────
    today = date.today()
    months = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12; y -= 1
        months.append((m, y))

    bills_created = 0
    payments_created = 0
    utilities_created = 0
    anomalies_created = 0

    for unit, tenant in unit_tenant_pairs:
        for idx, (month, year) in enumerate(months):
            # Rent bill
            existing = db.query(RentBill).filter(
                RentBill.unit_id == unit.id, RentBill.month == month, RentBill.year == year
            ).first()
            if not existing:
                due = datetime(year, month, 5)
                bill = RentBill(unit_id=unit.id, month=month, year=year,
                                amount=unit.monthly_rent, due_date=due)
                db.add(bill)
                db.flush()
                bills_created += 1

                if tenant and random.random() < 0.85:
                    pay_day = random.randint(1, 10)
                    payment = Payment(
                        tenant_id=tenant.user_id,
                        rent_bill_id=bill.id,
                        amount=unit.monthly_rent,
                        payment_method=random.choice(["mpesa", "cash", "bank_transfer"]),
                        reference_number=f"REF{random.randint(100000, 999999)}",
                        payment_date=datetime(year, month, pay_day),
                        is_verified=True,
                    )
                    db.add(payment)
                    bill.is_paid = True
                    bill.paid_date = datetime(year, month, pay_day)
                    payments_created += 1

            # Utility bills: water + electricity
            for util_type, base_usage, base_amount in [("water", 12.0, 800), ("electricity", 90.0, 2200)]:
                eu = db.query(UtilityBill).filter(
                    UtilityBill.unit_id == unit.id,
                    UtilityBill.utility_type == util_type,
                    UtilityBill.month == month, UtilityBill.year == year
                ).first()
                if not eu:
                    is_spike = (idx == 3 and unit.id % 3 == 0)
                    usage = round(base_usage * (3.0 if is_spike else random.uniform(0.8, 1.2)), 1)
                    amount = round(base_amount * (3.0 if is_spike else random.uniform(0.8, 1.2)))

                    history = db.query(UtilityBill).filter(
                        UtilityBill.unit_id == unit.id,
                        UtilityBill.utility_type == util_type
                    ).all()
                    is_anomalous = False
                    anomaly_reason = None
                    if len(history) >= 2:
                        avg_u = sum(h.usage_value for h in history) / len(history)
                        if avg_u > 0 and usage > avg_u * 1.5:
                            pct = int(((usage - avg_u) / avg_u) * 100)
                            is_anomalous = True
                            anomaly_reason = f"Usage is {pct}% above {len(history)}-month average ({avg_u:.1f} units)"
                            anomalies_created += 1

                    ub = UtilityBill(
                        unit_id=unit.id, utility_type=util_type,
                        month=month, year=year, amount=amount, usage_value=usage,
                        is_anomalous=is_anomalous, anomaly_reason=anomaly_reason,
                    )
                    db.add(ub)
                    utilities_created += 1

    db.commit()
    return {
        "message": "Test data seeded successfully",
        "units_created": units_created_count,
        "tenants_created": tenants_created_count,
        "rent_bills_created": bills_created,
        "payments_created": payments_created,
        "utility_bills_created": utilities_created,
        "anomalies_detected": anomalies_created,
        "note": "Test tenant password: Test@1234",
    }

# ============ FINANCIAL REPORTS ============

@router.get("/reports/financial")
def get_financial_report(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Generate financial report for property"""
    # Verify property ownership
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get all units in property
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_ids = [u.id for u in units]
    
    # Calculate totals
    total_rent_billed = db.query(func.sum(RentBill.amount)).filter(
        RentBill.unit_id.in_(unit_ids)
    ).scalar() or 0
    
    total_rent_paid = db.query(func.sum(RentBill.amount)).filter(
        RentBill.unit_id.in_(unit_ids),
        RentBill.is_paid == True
    ).scalar() or 0
    
    total_pending = total_rent_billed - total_rent_paid
    
    # Get utility revenue
    total_utilities = db.query(func.sum(UtilityBill.amount)).filter(
        UtilityBill.unit_id.in_(unit_ids)
    ).scalar() or 0
    
    return {
        "property_id": property_id,
        "total_rent_billed": total_rent_billed,
        "total_rent_paid": total_rent_paid,
        "total_pending": total_pending,
        "total_utilities": total_utilities,
        "collection_rate": (total_rent_paid / total_rent_billed * 100) if total_rent_billed > 0 else 0
    }

# ============ ALERTS & MONITORING ============

@router.get("/alerts/utility")
def get_utility_alerts(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Get utility usage alerts (anomalies from ML)"""
    # Verify property ownership
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get anomalous bills
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_ids = [u.id for u in units]
    
    anomalies = db.query(UtilityBill).filter(
        UtilityBill.unit_id.in_(unit_ids),
        UtilityBill.is_anomalous == True
    ).all()
    
    return {
        "property_id": property_id,
        "anomalies": anomalies,
        "count": len(anomalies)
    }

@router.get("/alerts/arrears")
def get_arrears_alerts(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Get rent arrears alerts"""
    # Verify property ownership
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get arrears for property units
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    
    arrears_list = []
    for unit in units:
        tenants = db.query(Tenant).filter(Tenant.unit_id == unit.id).all()
        for tenant in tenants:
            arrears = db.query(Arrears).filter(Arrears.tenant_id == tenant.id).first()
            if arrears and arrears.total_amount_due > 0:
                arrears_list.append(arrears)
    
    return {
        "property_id": property_id,
        "arrears_list": arrears_list,
        "total_arrears_amount": sum(a.total_amount_due for a in arrears_list)
    }

# ============ MAINTENANCE MANAGEMENT ============

@router.get("/maintenance-requests")
def list_maintenance_requests(
    property_id: int,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """List maintenance requests for property"""
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.landlord_id == current_user.id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_map = {u.id: u for u in units}
    unit_ids = list(unit_map.keys())

    query = db.query(MaintenanceRequest).filter(MaintenanceRequest.unit_id.in_(unit_ids))
    if status:
        query = query.filter(MaintenanceRequest.status == status)

    result = []
    for req in query.order_by(MaintenanceRequest.created_at.desc()).all():
        unit = unit_map.get(req.unit_id)
        result.append({
            "id": req.id,
            "unit_id": req.unit_id,
            "unit_number": unit.unit_number if unit else f"Unit {req.unit_id}",
            "tenant_id": req.tenant_id,
            "title": getattr(req, "title", None),
            "description": req.description,
            "category": req.category,
            "priority": req.priority,
            "status": req.status,
            "created_at": req.created_at,
        })
    return result

@router.patch("/maintenance-requests/{request_id}/approve")
def approve_maintenance_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    """Approve a maintenance request"""
    maintenance = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    
    maintenance.status = "approved"
    maintenance.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Maintenance request approved"}
