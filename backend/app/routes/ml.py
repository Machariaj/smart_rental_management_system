from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Tenant, RentBill, Payment, UtilityBill, Arrears
from app.security import get_landlord_user
import random

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/predict/risk/{tenant_id}")
def predict_tenant_risk(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    unpaid = db.query(RentBill).filter(RentBill.unit_id == tenant.unit_id, RentBill.is_paid == False).count()
    total = db.query(RentBill).filter(RentBill.unit_id == tenant.unit_id).count()
    arrears = db.query(Arrears).filter(Arrears.tenant_id == tenant_id).first()

    missed_rate = (unpaid / total) if total > 0 else 0
    arrears_months = arrears.months_outstanding if arrears else 0

    risk_score = min(100, int((missed_rate * 60) + (arrears_months * 10)))
    level = "High" if risk_score > 70 else "Medium" if risk_score > 40 else "Low"

    return {
        "tenant_id": tenant_id,
        "risk_score": risk_score,
        "risk_level": level,
        "missed_payments": unpaid,
        "total_bills": total,
        "arrears_months": arrears_months,
        "recommendation": "Send final notice" if risk_score > 70 else "Send reminder" if risk_score > 40 else "Good standing"
    }


@router.get("/predict/income/{property_id}")
def predict_property_income(
    property_id: int,
    months_ahead: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    from app.models import Unit, Property
    from sqlalchemy import func

    prop = db.query(Property).filter(Property.id == property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    from datetime import date

    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    occupied = [u for u in units if u.is_occupied]
    unit_ids = [u.id for u in units]
    monthly_potential = sum(u.monthly_rent for u in units)
    monthly_actual = sum(u.monthly_rent for u in occupied)
    occupancy_rate = len(occupied) / len(units) if units else 0

    # Build the 6-month window of actual collected payments
    today = date.today()
    monthly_collected = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12; y -= 1
        bills_that_month = db.query(RentBill).filter(
            RentBill.unit_id.in_(unit_ids),
            RentBill.month == m, RentBill.year == y
        ).all()
        collected = sum(b.amount for b in bills_that_month if b.is_paid)
        monthly_collected.append(collected)

    # Collection rate from history
    total_billed_hist = sum(
        b.amount for b in db.query(RentBill).filter(RentBill.unit_id.in_(unit_ids)).all()
    )
    total_paid_hist = sum(
        b.amount for b in db.query(RentBill).filter(
            RentBill.unit_id.in_(unit_ids), RentBill.is_paid == True
        ).all()
    )
    collection_rate = (total_paid_hist / total_billed_hist) if total_billed_hist > 0 else occupancy_rate

    # Fit a linear trend through the 6-month history (simple linear regression)
    non_zero = [(i, v) for i, v in enumerate(monthly_collected) if v > 0]
    if len(non_zero) >= 2:
        xs = [p[0] for p in non_zero]
        ys = [p[1] for p in non_zero]
        n = len(xs)
        x_mean = sum(xs) / n
        y_mean = sum(ys) / n
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
        denominator = sum((x - x_mean) ** 2 for x in xs)
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        # Project forward from the end of the 6-month window
        last_x = max(xs)
        forecasts = [
            round(max(0, min(intercept + slope * (last_x + 1 + i), monthly_potential)), 2)
            for i in range(months_ahead)
        ]
    elif non_zero:
        # Only 1 data point — use it flat
        baseline = non_zero[0][1]
        forecasts = [round(baseline, 2) for _ in range(months_ahead)]
    else:
        # No history — estimate from occupancy × collection rate
        forecasts = [round(monthly_potential * collection_rate, 2) for _ in range(months_ahead)]

    return {
        "property_id": property_id,
        "total_units": len(units),
        "occupied_units": len(occupied),
        "occupancy_rate": round(occupancy_rate * 100, 1),
        "monthly_potential": monthly_potential,
        "monthly_actual": round(monthly_actual, 2),
        "collection_rate": round(collection_rate * 100, 1),
        "historical_monthly": monthly_collected,
        "forecast": forecasts,
        "average_forecast": round(sum(forecasts) / len(forecasts), 2) if forecasts else 0,
    }


@router.get("/alerts/utility/{property_id}")
def get_utility_anomalies(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_landlord_user)
):
    from app.models import Unit, Property

    prop = db.query(Property).filter(Property.id == property_id, Property.landlord_id == current_user.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    unit_ids = [u.id for u in units]
    unit_map = {u.id: u for u in units}

    anomalies = db.query(UtilityBill).filter(
        UtilityBill.unit_id.in_(unit_ids), UtilityBill.is_anomalous == True
    ).all()

    return {
        "property_id": property_id,
        "anomaly_count": len(anomalies),
        "anomalies": [
            {
                "unit": unit_map[a.unit_id].unit_number if a.unit_id in unit_map else "",
                "utility_type": a.utility_type,
                "month": a.month, "year": a.year,
                "amount": a.amount, "usage": a.usage_value,
                "reason": a.anomaly_reason,
            }
            for a in anomalies
        ]
    }
