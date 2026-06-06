from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Tenant, Unit, Property
from app.schemas import UserCreate, UserResponse
from app.security import hash_password, get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/landlords", response_model=list[UserResponse])
def list_landlords(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    return db.query(User).filter(User.role == "landlord").all()


@router.post("/landlords", response_model=UserResponse)
def create_landlord(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        hashed_password=hash_password(user_data.password),
        role="landlord",
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.patch("/landlords/{user_id}/deactivate", response_model=UserResponse)
def deactivate_landlord(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id, User.role == "landlord").first()
    if not user:
        raise HTTPException(status_code=404, detail="Landlord not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/landlords/{user_id}/activate", response_model=UserResponse)
def activate_landlord(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id, User.role == "landlord").first()
    if not user:
        raise HTTPException(status_code=404, detail="Landlord not found")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.get("/tenants")
def list_all_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    tenants = db.query(Tenant).all()
    result = []
    for t in tenants:
        user = db.query(User).filter(User.id == t.user_id).first()
        unit = db.query(Unit).filter(Unit.id == t.unit_id).first()
        prop = db.query(Property).filter(Property.id == unit.property_id).first() if unit else None
        result.append({
            "id": t.id, "user_id": t.user_id,
            "name": user.full_name if user else "", "email": user.email if user else "",
            "phone": user.phone if user else "",
            "unit": unit.unit_number if unit else "", "unit_id": t.unit_id,
            "property": prop.name if prop else "", "property_id": prop.id if prop else None,
            "lease_start": t.lease_start_date, "lease_end": t.lease_end_date,
            "is_active": t.is_active, "deposit": t.deposit_amount,
        })
    return result


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    total_landlords = db.query(User).filter(User.role == "landlord").count()
    active_landlords = db.query(User).filter(User.role == "landlord", User.is_active == True).count()
    total_tenants = db.query(User).filter(User.role == "tenant").count()
    return {
        "total_landlords": total_landlords,
        "active_landlords": active_landlords,
        "inactive_landlords": total_landlords - active_landlords,
        "total_tenants": total_tenants,
    }
