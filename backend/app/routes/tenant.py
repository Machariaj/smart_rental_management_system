from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import User, Tenant, RentBill, Payment, Arrears, UtilityBill, MaintenanceRequest, ChatSession
from app.schemas import (
    RentBillResponse, PaymentCreate, PaymentResponse,
    UtilityBillResponse, MaintenanceRequestCreate, MaintenanceRequestResponse,
    ChatMessageCreate, ChatSessionResponse
)
from app.security import get_tenant_user
from datetime import datetime

router = APIRouter(prefix="/tenant", tags=["tenant"])

# ============ BALANCE & PAYMENTS ============

@router.get("/balance")
def get_tenant_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Get rent and utility balance for current tenant"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    # Get outstanding rent
    outstanding_rent_bills = db.query(RentBill).filter(
        RentBill.unit_id == tenant.unit_id,
        RentBill.is_paid == False
    ).all()
    
    total_outstanding_rent = sum(bill.amount for bill in outstanding_rent_bills)
    
    # Get utility balance
    outstanding_utilities = db.query(UtilityBill).filter(
        UtilityBill.unit_id == tenant.unit_id
    ).order_by(desc(UtilityBill.created_at)).all()
    
    total_utility_balance = sum(util.amount for util in outstanding_utilities[:3])  # Last 3 months
    
    # Get arrears
    arrears = db.query(Arrears).filter(Arrears.tenant_id == tenant.id).first()
    
    return {
        "tenant_id": tenant.id,
        "outstanding_rent": total_outstanding_rent,
        "utility_balance": total_utility_balance,
        "total_balance": total_outstanding_rent + total_utility_balance,
        "arrears": {
            "amount": arrears.total_amount_due if arrears else 0,
            "months_outstanding": arrears.months_outstanding if arrears else 0
        }
    }

@router.get("/bills", response_model=list[RentBillResponse])
def get_tenant_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Get all rent bills for tenant"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    bills = db.query(RentBill).filter(RentBill.unit_id == tenant.unit_id).order_by(
        desc(RentBill.year),
        desc(RentBill.month)
    ).all()
    
    return bills

@router.post("/payment", response_model=PaymentResponse)
def make_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Make a rent payment"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    # Create payment
    db_payment = Payment(
        tenant_id=current_user.id,
        **payment.model_dump()
    )
    
    # Mark bill as paid if specified
    if payment.rent_bill_id:
        bill = db.query(RentBill).filter(RentBill.id == payment.rent_bill_id).first()
        if bill:
            bill.is_paid = True
            bill.paid_date = datetime.utcnow()
    
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@router.get("/payment-history")
def get_payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Get payment history timeline"""
    payments = db.query(Payment).filter(
        Payment.tenant_id == current_user.id
    ).order_by(desc(Payment.payment_date)).all()
    
    return {
        "total_payments": len(payments),
        "payments": payments
    }

# ============ UTILITY INFORMATION ============

@router.get("/utilities", response_model=list[UtilityBillResponse])
def get_tenant_utilities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Get utility bills for tenant"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    utilities = db.query(UtilityBill).filter(
        UtilityBill.unit_id == tenant.unit_id
    ).order_by(desc(UtilityBill.year), desc(UtilityBill.month)).all()
    
    return utilities

# ============ MAINTENANCE REQUESTS ============

@router.post("/maintenance", response_model=MaintenanceRequestResponse)
def submit_maintenance_request(
    request_data: MaintenanceRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Submit a maintenance request"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    data = {k: v for k, v in request_data.model_dump().items() if k != 'unit_id'}
    db_request = MaintenanceRequest(
        tenant_id=current_user.id,
        unit_id=tenant.unit_id,
        **data
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    return db_request

@router.get("/maintenance", response_model=list[MaintenanceRequestResponse])
def list_maintenance_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """List all maintenance requests for tenant"""
    requests = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.tenant_id == current_user.id
    ).order_by(desc(MaintenanceRequest.created_at)).all()
    
    return requests

# ============ NOTIFICATIONS ============

@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Get notifications/reminders"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    # Get upcoming due bills
    upcoming_bills = db.query(RentBill).filter(
        RentBill.unit_id == tenant.unit_id,
        RentBill.is_paid == False,
        RentBill.year == datetime.utcnow().year,
        RentBill.month >= datetime.utcnow().month
    ).all()
    
    # Get pending maintenance
    pending_maintenance = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.tenant_id == current_user.id,
        MaintenanceRequest.status.in_(["submitted", "approved"])
    ).all()
    
    return {
        "upcoming_bills": len(upcoming_bills),
        "pending_maintenance": len(pending_maintenance),
        "items": {
            "bills": upcoming_bills,
            "maintenance": pending_maintenance
        }
    }

# ============ CHATBOT ============

@router.post("/chat/session")
def start_chat_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Start a new chat session"""
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    # End previous active session
    old_session = db.query(ChatSession).filter(
        ChatSession.tenant_id == tenant.id,
        ChatSession.is_active == True
    ).first()
    
    if old_session:
        old_session.is_active = False
        old_session.session_end = datetime.utcnow()
    
    # Create new session
    session = ChatSession(tenant_id=tenant.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {"session_id": session.id}

@router.post("/chat/{session_id}/message")
def send_chat_message(
    session_id: int,
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Send a message to the support chatbot and get a response"""
    from app.models import ChatMessage

    user_msg = ChatMessage(session_id=session_id, sender="tenant", message_text=message.message_text)
    db.add(user_msg)

    text = message.message_text.lower()
    if any(w in text for w in ["rent", "pay", "payment", "bill", "outstanding", "balance"]):
        reply = ("To make a payment, go to 'My Bills' in the sidebar and click 'Record Payment'. "
                 "Enter the amount, select your payment method (M-Pesa, Cash, Bank Transfer), "
                 "and include your reference number. Your landlord will verify the payment.")
    elif any(w in text for w in ["maintenance", "repair", "fix", "broken", "leak", "pipe", "electric"]):
        reply = ("To report a maintenance issue, go to 'Maintenance' in the sidebar and click 'New Request'. "
                 "Select the category and priority, describe the issue in detail, then submit. "
                 "Your landlord will review and approve the request.")
    elif any(w in text for w in ["lease", "contract", "expire", "end date", "move out", "notice"]):
        reply = ("Your lease details are set by your landlord. Check your dashboard for lease start and end dates. "
                 "For lease renewals or early termination, please contact your landlord directly.")
    elif any(w in text for w in ["utility", "water", "electricity", "gas", "bill"]):
        reply = ("Utility bills are managed by your landlord. You can view your current utility charges "
                 "in the 'My Bills' section. If you notice an unusual spike, report it as a maintenance issue.")
    elif any(w in text for w in ["hello", "hi", "hey", "good morning", "good afternoon"]):
        reply = ("Hello! I'm your property assistant. I can help with:\n"
                 "• Rent payments and bills\n"
                 "• Maintenance requests\n"
                 "• Lease information\n"
                 "• Utility queries\n"
                 "What do you need help with?")
    elif any(w in text for w in ["thank", "thanks", "ok", "okay", "got it", "understood"]):
        reply = "You're welcome! Let me know if you need anything else."
    else:
        reply = ("I can help you with rent payments, maintenance requests, lease information, and utility queries. "
                 "Please describe what you need help with and I'll do my best to assist.")

    bot_msg = ChatMessage(session_id=session_id, sender="bot", message_text=reply)
    db.add(bot_msg)
    db.commit()

    return {"session_id": session_id, "reply": reply}
