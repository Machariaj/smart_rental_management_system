from ml_models import RiskPredictor, IncomeForecaster, UtilityAnomalyDetector
from typing import Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPipeline:
    """Main ML pipeline coordinator"""
    
    def __init__(self, model_path: str = "./models"):
        self.risk_predictor = RiskPredictor(model_path)
        self.income_forecaster = IncomeForecaster(model_path)
        self.anomaly_detector = UtilityAnomalyDetector()
        self.logger = logger
    
    def process_tenant_risk(self, tenant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process tenant payment risk prediction"""
        self.logger.info(f"Processing risk prediction for tenant {tenant_data.get('tenant_id')}")
        
        risk_assessment = self.risk_predictor.predict_risk(tenant_data)
        
        return {
            "tenant_id": tenant_data.get('tenant_id'),
            "assessment_type": "payment_risk",
            "risk_assessment": risk_assessment,
            "recommendations": self._generate_risk_recommendations(risk_assessment)
        }
    
    def process_property_forecast(self, property_data: Dict[str, Any], 
                                  months_ahead: int = 3) -> Dict[str, Any]:
        """Process property income forecast"""
        self.logger.info(f"Processing income forecast for property {property_data.get('property_id')}")
        
        forecast = self.income_forecaster.forecast_income(property_data, months_ahead)
        
        return {
            "property_id": property_data.get('property_id'),
            "forecast_type": "income_forecast",
            "forecast": forecast,
            "recommendations": self._generate_forecast_recommendations(forecast)
        }
    
    def process_utility_anomaly(self, unit_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process utility usage anomaly detection"""
        self.logger.info(f"Processing anomaly detection for unit {unit_data.get('unit_id')}")
        
        current_usage = unit_data.get('current_usage', 0)
        historical_avg = unit_data.get('historical_avg', 0)
        std_dev = unit_data.get('std_dev', 0)
        
        is_anomalous, reason = self.anomaly_detector.detect_anomaly(
            current_usage, historical_avg, std_dev
        )
        
        insights = self.anomaly_detector.get_utility_insights(
            unit_data.get('unit_id'),
            unit_data.get('historical_data', [])
        )
        
        return {
            "unit_id": unit_data.get('unit_id'),
            "anomaly_type": unit_data.get('utility_type'),
            "is_anomalous": is_anomalous,
            "reason": reason,
            "insights": insights
        }
    
    def _generate_risk_recommendations(self, risk_assessment: Dict[str, Any]) -> list:
        """Generate recommendations based on risk assessment"""
        recommendations = []
        risk_score = risk_assessment.get('risk_score', 0)
        
        if risk_score > 70:
            recommendations.append({
                "severity": "high",
                "action": "Send final payment notice",
                "priority": 1
            })
            recommendations.append({
                "severity": "high",
                "action": "Consider escalation procedures",
                "priority": 2
            })
        elif risk_score > 40:
            recommendations.append({
                "severity": "medium",
                "action": "Send payment reminder",
                "priority": 1
            })
            recommendations.append({
                "severity": "medium",
                "action": "Monitor closely next 30 days",
                "priority": 2
            })
        else:
            recommendations.append({
                "severity": "low",
                "action": "Continue regular monitoring",
                "priority": 1
            })
        
        return recommendations
    
    def _generate_forecast_recommendations(self, forecast: Dict[str, Any]) -> list:
        """Generate recommendations based on forecast"""
        recommendations = []
        avg_forecast = forecast.get('average_forecast', 0)
        
        if avg_forecast < 5000:
            recommendations.append({
                "severity": "high",
                "action": "Review occupancy rates and collection efficiency",
                "priority": 1
            })
        elif avg_forecast < 8000:
            recommendations.append({
                "severity": "medium",
                "action": "Monitor market conditions for rate adjustments",
                "priority": 2
            })
        else:
            recommendations.append({
                "severity": "low",
                "action": "Strong income projection, maintain current operations",
                "priority": 3
            })
        
        return recommendations

# Initialize pipeline
ml_pipeline = MLPipeline()
