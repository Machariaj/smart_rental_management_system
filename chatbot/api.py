from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Tenant, ChatSession, ChatMessage
from app.schemas import ChatMessageCreate
from app.security import get_tenant_user
from datetime import datetime
from .chatbot import TenantChatbot, ConversationManager
import json
from app.config import settings

router = APIRouter(prefix="/chat", tags=["chatbot"])

# Initialize chatbot and manager
chatbot = TenantChatbot(settings.ANTHROPIC_API_KEY)
conversation_manager = ConversationManager()

@router.post("/start-session")
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
    
    return {
        "session_id": session.id,
        "tenant_id": tenant.id,
        "message": "Chat session started. How can I help you today?"
    }

@router.post("/send-message/{session_id}")
def send_message(
    session_id: int,
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Send a message to the chatbot"""
    
    # Validate session belongs to user
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.tenant_id == tenant.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Save tenant message
    tenant_msg = ChatMessage(
        session_id=session.id,
        sender="tenant",
        message_text=message.message_text
    )
    db.add(tenant_msg)
    db.commit()
    
    # Get tenant context
    tenant_context = {
        "tenant_id": tenant.id,
        "unit_number": tenant.unit.unit_number if tenant.unit else "N/A",
        "outstanding_rent": 1000,  # Would be calculated from DB
        "utility_balance": 150,     # Would be calculated from DB
        "arrears_amount": 0,        # Would be from arrears table
        "active_maintenance": 0,    # Would be counted from requests
        "last_payment_date": None   # Would be from payments table
    }
    
    # Get conversation history
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.timestamp).all()
    
    conversation_history = [
        {"role": msg.sender if msg.sender in ["user", "assistant"] else "user", 
         "content": msg.message_text}
        for msg in messages[:-1]  # Exclude the message we just added
    ]
    
    # Process message with chatbot
    response = chatbot.process_message(
        message.message_text,
        tenant_context,
        conversation_history
    )
    
    # Save chatbot response
    if response.get('success'):
        chatbot_msg = ChatMessage(
            session_id=session.id,
            sender="chatbot",
            message_text=response['message'],
            intent=response['intent'].get('category')
        )
        db.add(chatbot_msg)
        db.commit()
    
    return {
        "session_id": session.id,
        "tenant_message": message.message_text,
        "chatbot_response": response['message'],
        "intent": response['intent'],
        "actions": response.get('actions', []),
        "should_escalate": response.get('should_escalate', False)
    }

@router.get("/session-history/{session_id}")
def get_session_history(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """Get conversation history for a session"""
    
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.tenant_id == tenant.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.timestamp).all()
    
    return {
        "session_id": session.id,
        "session_start": session.session_start,
        "session_end": session.session_end,
        "is_active": session.is_active,
        "messages": [
            {
                "id": msg.id,
                "sender": msg.sender,
                "content": msg.message_text,
                "intent": msg.intent,
                "timestamp": msg.timestamp
            }
            for msg in messages
        ]
    }

@router.post("/session/{session_id}/end")
def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_user)
):
    """End a chat session"""
    
    tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant record not found")
    
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.tenant_id == tenant.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session.is_active = False
    session.session_end = datetime.utcnow()
    db.commit()
    
    return {"message": "Chat session ended"}
