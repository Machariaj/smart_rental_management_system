import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import json
from pathlib import Path
from typing import Dict, Any, Tuple
from datetime import datetime, timedelta
import os

class RiskPredictor:
    """ML model for predicting tenant payment risk"""
    
    def __init__(self, model_path: str = "./models"):
        self.model_path = Path(model_path)
        self.model_path.mkdir(parents=True, exist_ok=True)
        self.risk_model = None
        self.scaler = None
        self.feature_names = [
            'days_overdue', 'payment_history_score', 'num_arrears_months',
            'avg_payment_delay', 'utility_anomalies', 'maintenance_frequency'
        ]
        self._load_or_create_model()
    
    def _load_or_create_model(self):
        """Load existing model or create new one"""
        model_file = self.model_path / "risk_model.pkl"
        scaler_file = self.model_path / "risk_scaler.pkl"
        
        if model_file.exists() and scaler_file.exists():
            self.risk_model = joblib.load(model_file)
            self.scaler = joblib.load(scaler_file)
        else:
            # Create new model with default parameters
            self.risk_model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.scaler = StandardScaler()
            # Train with dummy data initially
            X_dummy = np.random.rand(100, 6)
            y_dummy = np.random.randint(0, 2, 100)
            self.scaler.fit(X_dummy)
            self.risk_model.fit(self.scaler.transform(X_dummy), y_dummy)
            self._save_model()
    
    def _save_model(self):
        """Save model to disk"""
        joblib.dump(self.risk_model, self.model_path / "risk_model.pkl")
        joblib.dump(self.scaler, self.model_path / "risk_scaler.pkl")
    
    def extract_features(self, tenant_data: Dict[str, Any]) -> np.ndarray:
        """Extract features from tenant data"""
        features = np.array([
            tenant_data.get('days_overdue', 0),
            tenant_data.get('payment_history_score', 100),
            tenant_data.get('months_with_arrears', 0),
            tenant_data.get('avg_payment_delay_days', 0),
            tenant_data.get('utility_anomalies_count', 0),
            tenant_data.get('maintenance_requests_count', 0)
        ]).reshape(1, -1)
        
        return features
    
    def predict_risk(self, tenant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict payment risk for a tenant"""
        features = self.extract_features(tenant_data)
        scaled_features = self.scaler.transform(features)
        
        # Predict risk (0 = low risk, 1 = high risk)
        prediction = self.risk_model.predict(scaled_features)[0]
        probability = self.risk_model.predict_proba(scaled_features)[0]
        
        risk_score = probability[1] * 100  # Convert to percentage
        
        return {
            "is_high_risk": bool(prediction),
            "risk_score": float(risk_score),
            "risk_probability": {
                "low_risk": float(probability[0] * 100),
                "high_risk": float(probability[1] * 100)
            }
        }
    
    def train_on_data(self, X: np.ndarray, y: np.ndarray):
        """Retrain model with new data"""
        X_scaled = self.scaler.fit_transform(X)
        self.risk_model.fit(X_scaled, y)
        self._save_model()


class IncomeForecaster:
    """ML model for forecasting rental income"""
    
    def __init__(self, model_path: str = "./models"):
        self.model_path = Path(model_path)
        self.model_path.mkdir(parents=True, exist_ok=True)
        self.forecast_model = None
        self.scaler = None
        self.feature_names = [
            'previous_month_income', 'occupancy_rate', 'avg_rent',
            'collection_rate', 'seasonality_index'
        ]
        self._load_or_create_model()
    
    def _load_or_create_model(self):
        """Load existing model or create new one"""
        model_file = self.model_path / "forecast_model.pkl"
        scaler_file = self.model_path / "forecast_scaler.pkl"
        
        if model_file.exists() and scaler_file.exists():
            self.forecast_model = joblib.load(model_file)
            self.scaler = joblib.load(scaler_file)
        else:
            # Create new model
            self.forecast_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
            self.scaler = StandardScaler()
            # Train with dummy data
            X_dummy = np.random.rand(100, 5)
            y_dummy = np.random.rand(100) * 100000
            self.scaler.fit(X_dummy)
            self.forecast_model.fit(self.scaler.transform(X_dummy), y_dummy)
            self._save_model()
    
    def _save_model(self):
        """Save model to disk"""
        joblib.dump(self.forecast_model, self.model_path / "forecast_model.pkl")
        joblib.dump(self.scaler, self.model_path / "forecast_scaler.pkl")
    
    def extract_features(self, property_data: Dict[str, Any]) -> np.ndarray:
        """Extract features from property data"""
        features = np.array([
            property_data.get('previous_month_income', 0),
            property_data.get('occupancy_rate', 1.0),
            property_data.get('avg_rent', 0),
            property_data.get('collection_rate', 0.95),
            property_data.get('seasonality_index', 1.0)
        ]).reshape(1, -1)
        
        return features
    
    def forecast_income(self, property_data: Dict[str, Any], months_ahead: int = 3) -> Dict[str, Any]:
        """Forecast income for next N months"""
        features = self.extract_features(property_data)
        scaled_features = self.scaler.transform(features)
        
        forecast_values = []
        current_features = scaled_features.copy()
        
        for _ in range(months_ahead):
            predicted_income = self.forecast_model.predict(current_features)[0]
            forecast_values.append(float(predicted_income))
            # Update features for next prediction
            current_features[0, 0] = predicted_income
        
        return {
            "property_id": property_data.get('property_id'),
            "forecast_period_months": months_ahead,
            "forecasted_income": forecast_values,
            "average_forecast": float(np.mean(forecast_values)),
            "confidence_interval": {
                "lower": float(np.mean(forecast_values) * 0.8),
                "upper": float(np.mean(forecast_values) * 1.2)
            }
        }
    
    def train_on_data(self, X: np.ndarray, y: np.ndarray):
        """Retrain model with new data"""
        X_scaled = self.scaler.fit_transform(X)
        self.forecast_model.fit(X_scaled, y)
        self._save_model()


class UtilityAnomalyDetector:
    """Detect anomalies in utility usage"""
    
    def __init__(self):
        pass
    
    def detect_anomaly(self, current_usage: float, historical_avg: float, 
                      std_dev: float, threshold: float = 2.0) -> Tuple[bool, str]:
        """
        Detect if usage is anomalous
        Uses z-score method: |usage - avg| / std_dev > threshold
        """
        if std_dev == 0:
            return False, "Insufficient data"
        
        z_score = abs((current_usage - historical_avg) / std_dev)
        
        if z_score > threshold:
            if current_usage > historical_avg:
                reason = f"Usage {z_score:.2f}x higher than average (high consumption)"
            else:
                reason = f"Usage {z_score:.2f}x lower than average (possible meter issue)"
            return True, reason
        
        return False, "Normal"
    
    def get_utility_insights(self, unit_id: int, historical_data: list) -> Dict[str, Any]:
        """Generate insights from utility data"""
        if not historical_data or len(historical_data) < 2:
            return {"status": "insufficient_data"}
        
        usage_values = [d['usage'] for d in historical_data]
        avg_usage = np.mean(usage_values)
        std_usage = np.std(usage_values)
        trend = "increasing" if usage_values[-1] > avg_usage else "decreasing"
        
        return {
            "unit_id": unit_id,
            "average_usage": float(avg_usage),
            "std_deviation": float(std_usage),
            "current_usage": float(usage_values[-1]) if usage_values else 0,
            "trend": trend,
            "comparison_to_average": float((usage_values[-1] - avg_usage) / avg_usage * 100) if avg_usage > 0 else 0
        }
