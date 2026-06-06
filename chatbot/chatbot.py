import json
from typing import Optional, Dict, Any, List
from anthropic import Anthropic
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TenantChatbot:
    """Chatbot for tenant interactions using Claude API"""
    
    def __init__(self, api_key: str):
        self.client = Anthropic()
        self.api_key = api_key
        self.system_prompt = """You are a helpful Real Estate Management Chatbot assistant for tenants. 
You help tenants with:
- Rent balance and payment information
- Utility bill inquiries
- Maintenance request submissions and tracking
- Payment reminders and due dates
- General property and lease questions

You have access to the tenant's account information and can help them understand their bills and make maintenance requests.
Always be professional, empathetic, and helpful. If you need specific account information, guide the tenant on how to access it.
For critical issues, always recommend escalating to the landlord immediately."""
        
        self.intent_classifier = IntentClassifier()
    
    def process_message(self, message: str, tenant_context: Dict[str, Any], 
                       conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Process a tenant message and generate response"""
        
        logger.info(f"Processing message: {message[:50]}...")
        
        # Classify intent
        intent = self.intent_classifier.classify(message)
        
        # Build messages for Claude
        messages = conversation_history.copy()
        messages.append({"role": "user", "content": message})
        
        # Add context about tenant
        context_str = self._format_tenant_context(tenant_context)
        
        # Create prompt with context
        full_system = f"""{self.system_prompt}

Current tenant information:
{context_str}

Intent detected: {intent.get('category')}"""
        
        # Get response from Claude
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=full_system,
                messages=messages
            )
            
            assistant_message = response.content[0].text
            
            # Parse any recommended actions
            actions = self._parse_actions(assistant_message, intent)
            
            return {
                "success": True,
                "message": assistant_message,
                "intent": intent,
                "actions": actions,
                "should_escalate": intent.get('category') == 'escalation'
            }
        
        except Exception as e:
            logger.error(f"Error getting response from Claude: {str(e)}")
            return {
                "success": False,
                "message": "Sorry, I encountered an error. Please try again or contact support.",
                "intent": intent,
                "actions": [],
                "should_escalate": True
            }
    
    def _format_tenant_context(self, tenant_context: Dict[str, Any]) -> str:
        """Format tenant context for Claude"""
        return f"""
Tenant ID: {tenant_context.get('tenant_id')}
Unit: {tenant_context.get('unit_number')}
Outstanding Rent: ${tenant_context.get('outstanding_rent', 0):.2f}
Utility Balance: ${tenant_context.get('utility_balance', 0):.2f}
Arrears: ${tenant_context.get('arrears_amount', 0):.2f}
Active Maintenance Requests: {tenant_context.get('active_maintenance', 0)}
Last Payment: {tenant_context.get('last_payment_date', 'N/A')}
"""
    
    def _parse_actions(self, message: str, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse recommended actions from response"""
        actions = []
        
        if intent.get('category') == 'maintenance_request':
            actions.append({
                "type": "maintenance_request",
                "action": "Create maintenance request",
                "priority": intent.get('priority', 'medium')
            })
        
        elif intent.get('category') == 'payment':
            actions.append({
                "type": "payment",
                "action": "Process payment",
                "template": "payment_form"
            })
        
        elif intent.get('category') == 'escalation':
            actions.append({
                "type": "escalation",
                "action": "Notify landlord",
                "priority": "high"
            })
        
        return actions
    
    def handle_maintenance_request(self, description: str, category: str, 
                                  priority: str) -> Dict[str, Any]:
        """Handle maintenance request submission"""
        # This would integrate with the backend API
        return {
            "status": "success",
            "message": "Your maintenance request has been submitted",
            "request_data": {
                "description": description,
                "category": category,
                "priority": priority
            }
        }
    
    def handle_payment(self, amount: float, payment_method: str) -> Dict[str, Any]:
        """Handle payment submission"""
        # This would integrate with the backend API
        return {
            "status": "pending_verification",
            "message": "Payment submitted and awaiting verification",
            "payment_data": {
                "amount": amount,
                "method": payment_method
            }
        }


class IntentClassifier:
    """Classify user intents from messages"""
    
    def __init__(self):
        self.intent_mapping = {
            'balance': ['balance', 'owe', 'rent', 'amount due', 'how much'],
            'payment': ['pay', 'payment', 'transfer money', 'send payment'],
            'maintenance': ['broken', 'fix', 'repair', 'maintenance', 'issue', 'problem', 'pipe', 'leak'],
            'utility': ['water', 'electricity', 'gas', 'utility', 'bill', 'usage', 'high bill'],
            'schedule': ['when', 'due date', 'due', 'deadline'],
            'history': ['history', 'past', 'previous', 'statement'],
            'escalation': ['landlord', 'property manager', 'manager', 'owner', 'escalate', 'urgent']
        }
    
    def classify(self, message: str) -> Dict[str, Any]:
        """Classify intent from message"""
        message_lower = message.lower()
        
        for intent, keywords in self.intent_mapping.items():
            for keyword in keywords:
                if keyword in message_lower:
                    return {
                        "category": intent,
                        "confidence": 0.8,
                        "priority": self._get_priority(intent)
                    }
        
        # Default intent
        return {
            "category": "general",
            "confidence": 0.5,
            "priority": "low"
        }
    
    def _get_priority(self, intent: str) -> str:
        """Get priority based on intent"""
        high_priority = ['escalation', 'maintenance']
        medium_priority = ['payment', 'utility']
        
        if intent in high_priority:
            return "high"
        elif intent in medium_priority:
            return "medium"
        else:
            return "low"


class ConversationManager:
    """Manage conversation history and sessions"""
    
    def __init__(self, max_history: int = 20):
        self.max_history = max_history
    
    def initialize_session(self, tenant_id: int) -> Dict[str, Any]:
        """Initialize a new chat session"""
        return {
            "tenant_id": tenant_id,
            "session_id": f"session_{tenant_id}_{int(__import__('time').time())}",
            "messages": [],
            "started_at": str(__import__('datetime').datetime.utcnow())
        }
    
    def add_message(self, session: Dict[str, Any], role: str, content: str):
        """Add message to conversation"""
        session['messages'].append({
            "role": role,
            "content": content,
            "timestamp": str(__import__('datetime').datetime.utcnow())
        })
        
        # Trim history if too long
        if len(session['messages']) > self.max_history:
            session['messages'] = session['messages'][-self.max_history:]
    
    def get_conversation_history(self, session: Dict[str, Any]) -> List[Dict[str, str]]:
        """Get conversation history for Claude"""
        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in session['messages']
        ]
