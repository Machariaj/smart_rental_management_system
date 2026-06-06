"""
Services layer for business logic
"""

def calculate_arrears(outstanding_bills: list, months_threshold: int = 30) -> dict:
    """Calculate payment arrears"""
    if not outstanding_bills:
        return {"total": 0, "months": 0}
    
    total = sum(bill.amount for bill in outstanding_bills if not bill.is_paid)
    months = len([b for b in outstanding_bills if not b.is_paid])
    
    return {
        "total_amount": total,
        "months_outstanding": months,
        "is_escalated": months > months_threshold
    }

def calculate_collection_rate(rent_bills: list) -> float:
    """Calculate payment collection rate"""
    if not rent_bills:
        return 0.0
    
    paid = len([b for b in rent_bills if b.is_paid])
    return (paid / len(rent_bills)) * 100

def generate_payment_schedule(monthly_rent: float, start_date, lease_duration_months: int) -> list:
    """Generate payment schedule for lease"""
    from datetime import datetime, timedelta
    
    schedule = []
    current_date = start_date
    
    for month in range(lease_duration_months):
        schedule.append({
            "month": month + 1,
            "due_date": current_date,
            "amount": monthly_rent,
            "paid": False
        })
        current_date += timedelta(days=30)
    
    return schedule

def calculate_occupancy(units: list) -> float:
    """Calculate property occupancy rate"""
    if not units:
        return 0.0
    
    occupied = len([u for u in units if u.is_occupied])
    return (occupied / len(units)) * 100
