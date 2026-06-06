from celery import shared_task
from app.database import SessionLocal
from app.models import RentBill, Payment, UtilityBill, Tenant
from sqlalchemy import func
from datetime import datetime, timedelta
import logging
import numpy as np
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from ml_module.pipeline import ml_pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@shared_task
def retrain_risk_model():
    """Retrain payment risk model monthly"""
    logger.info("Starting risk model retraining...")
    
    db = SessionLocal()
    try:
        # Collect historical payment data
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
        X_data = []
        y_data = []
        
        for tenant in tenants:
            # Extract tenant features
            bills = db.query(RentBill).filter(RentBill.unit_id == tenant.unit_id).all()
            payments = db.query(Payment).filter(Payment.tenant_id == tenant.user_id).all()
            
            if not bills:
                continue
            
            # Calculate features
            days_overdue = sum(1 for b in bills if not b.is_paid and b.due_date < datetime.utcnow())
            payment_history_score = len([p for p in payments if p.is_verified]) / len(payments) * 100 if payments else 0
            
            features = [
                days_overdue,
                payment_history_score,
                sum(1 for b in bills if not b.is_paid),
                0,  # avg delay - would need more data
                0,  # utility anomalies
                0   # maintenance frequency
            ]
            
            # Label: 1 if tenant is high risk (has arrears), 0 otherwise
            label = 1 if days_overdue > 30 else 0
            
            X_data.append(features)
            y_data.append(label)
        
        if len(X_data) > 10:  # Only retrain if we have enough data
            X_array = np.array(X_data)
            y_array = np.array(y_data)
            ml_pipeline.risk_predictor.train_on_data(X_array, y_array)
            logger.info(f"Risk model retrained with {len(X_data)} samples")
        
    except Exception as e:
        logger.error(f"Error retraining risk model: {str(e)}")
    finally:
        db.close()

@shared_task
def retrain_forecast_model():
    """Retrain income forecast model monthly"""
    logger.info("Starting forecast model retraining...")
    
    db = SessionLocal()
    try:
        # Collect historical income data
        X_data = []
        y_data = []
        
        # This would require aggregating historical income data
        # For now, we'll keep the existing model
        logger.info("Forecast model check completed")
        
    except Exception as e:
        logger.error(f"Error retraining forecast model: {str(e)}")
    finally:
        db.close()

@shared_task
def detect_utility_anomalies():
    """Detect utility usage anomalies daily"""
    logger.info("Starting utility anomaly detection...")
    
    db = SessionLocal()
    try:
        utilities = db.query(UtilityBill).filter(
            UtilityBill.created_at >= datetime.utcnow() - timedelta(days=30)
        ).all()
        
        anomalies_found = 0
        
        for util in utilities:
            # Get historical average for same utility type and unit
            historical = db.query(func.avg(UtilityBill.usage_value)).filter(
                UtilityBill.unit_id == util.unit_id,
                UtilityBill.utility_type == util.utility_type,
                UtilityBill.created_at < util.created_at
            ).scalar() or 0
            
            # Get standard deviation
            std_dev = db.query(func.stddev(UtilityBill.usage_value)).filter(
                UtilityBill.unit_id == util.unit_id,
                UtilityBill.utility_type == util.utility_type
            ).scalar() or 0
            
            # Check for anomaly
            is_anomalous, reason = ml_pipeline.anomaly_detector.detect_anomaly(
                util.usage_value, historical, std_dev
            )
            
            if is_anomalous:
                util.is_anomalous = True
                util.anomaly_reason = reason
                anomalies_found += 1
        
        db.commit()
        logger.info(f"Found and marked {anomalies_found} utility anomalies")
        
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
    finally:
        db.close()

@shared_task
def calculate_payment_arrears():
    """Calculate and update payment arrears daily"""
    logger.info("Starting arrears calculation...")
    
    db = SessionLocal()
    try:
        from app.models import Arrears
        
        overdue_bills = db.query(RentBill).filter(
            RentBill.is_paid == False,
            RentBill.due_date < datetime.utcnow()
        ).all()
        
        for bill in overdue_bills:
            # Get tenant for this unit
            tenants = db.query(Tenant).filter(Tenant.unit_id == bill.unit_id).all()
            
            for tenant in tenants:
                arrears = db.query(Arrears).filter(Arrears.tenant_id == tenant.id).first()
                
                if not arrears:
                    arrears = Arrears(tenant_id=tenant.id)
                    db.add(arrears)
                
                arrears.total_amount_due += bill.amount
                arrears.months_outstanding += 1
                arrears.updated_at = datetime.utcnow()
        
        db.commit()
        logger.info("Arrears calculation completed")
        
    except Exception as e:
        logger.error(f"Error calculating arrears: {str(e)}")
    finally:
        db.close()

@shared_task
def send_payment_reminders():
    """Send payment reminders for upcoming due bills"""
    logger.info("Starting payment reminder notifications...")
    
    db = SessionLocal()
    try:
        # Get bills due in next 5 days
        upcoming_date = datetime.utcnow() + timedelta(days=5)
        upcoming_bills = db.query(RentBill).filter(
            RentBill.is_paid == False,
            RentBill.due_date >= datetime.utcnow(),
            RentBill.due_date <= upcoming_date
        ).all()
        
        logger.info(f"Found {len(upcoming_bills)} upcoming bills for reminders")
        # Send notifications would go here (email, SMS, etc)
        
    except Exception as e:
        logger.error(f"Error sending reminders: {str(e)}")
    finally:
        db.close()
