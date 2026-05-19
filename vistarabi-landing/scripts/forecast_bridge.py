import sys
import json
import pandas as pd
from prophet import Prophet
import datetime
import math

def apply_actions(date_idx, actions):
    uplift = 0
    for action in actions:
        start_day = action.get('startDayOffset', 0)
        ramp_days = action.get('rampDays', 0)
        expected_uplift = action.get('expectedUplift', 0)
        
        # Current day index (1-based to match JS implementation)
        day = date_idx + 1
        
        if day <= start_day:
            continue
        
        if ramp_days > 0:
            # linear ramp
            progress = min(1.0, (day - start_day) / ramp_days)
            uplift += expected_uplift * progress
        else:
            uplift += expected_uplift
            
    return uplift

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            sys.exit(1)
        
        req = json.loads(input_data)
        history = req.get('kpiHistory', [])
        horizon_days = req.get('horizonDays', 30)
        actions = req.get('actions', [])
        confidence = req.get('confidenceLevel', 0.8)
        
        if len(history) < 2:
            print(json.dumps({"error": "Insufficient history for Prophet"}), file=sys.stderr)
            sys.exit(1)
            
        df = pd.DataFrame(history)
        df.rename(columns={'date': 'ds', 'value': 'y'}, inplace=True)
        df['ds'] = pd.to_datetime(df['ds'])
        
        # Initialize and fit Prophet with the requested confidence interval
        m = Prophet(interval_width=confidence)
        m.fit(df)
        
        # Forecast
        future = m.make_future_dataframe(periods=horizon_days)
        forecast = m.predict(future)
        
        # Extract only the future predictions
        future_forecast = forecast.tail(horizon_days).reset_index(drop=True)
        
        results = []
        for i, row in future_forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            yhat = row['yhat']
            yhat_lower = row['yhat_lower']
            yhat_upper = row['yhat_upper']
            
            # Apply business strategy actions
            uplift = apply_actions(i, actions)
            
            final_yhat = max(0, yhat + uplift)
            final_lower = max(0, yhat_lower + uplift)
            final_upper = max(0, yhat_upper + uplift)
            
            results.append({
                "date": date_str,
                "day": i + 1,
                "yhat": float(final_yhat),
                "yhatLower": float(final_lower),
                "yhatUpper": float(final_upper)
            })
            
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
