import sys
import json
import traceback

def main():
    try:
        # Read from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
            
        request = json.loads(input_data)
        
        # We try to import prophet here. If it fails, the Node side will catch 
        # the error code and use the fallback linear forecaster.
        try:
            import pandas as pd
            from prophet import Prophet
        except ImportError:
            # We exit with code 1 so the Node bridge knows to use fallback
            sys.stderr.write("Prophet or pandas not installed.\n")
            sys.exit(1)
            
        history = request.get('kpiHistory', [])
        horizon_days = request.get('horizonDays', 30)
        
        if len(history) < 2:
            sys.exit(1)
            
        df = pd.DataFrame(history)
        df.rename(columns={'date': 'ds', 'value': 'y'}, inplace=True)
        df['ds'] = pd.to_datetime(df['ds'])
        
        # Action-aware regressors could be added here in a more advanced implementation
        
        m = Prophet(yearly_seasonality=True, weekly_seasonality=True)
        m.fit(df)
        
        future = m.make_future_dataframe(periods=horizon_days)
        forecast = m.predict(future)
        
        # Get only the future part
        future_forecast = forecast.tail(horizon_days)
        
        result = []
        for i, row in enumerate(future_forecast.itertuples()):
            result.append({
                "date": row.ds.strftime('%Y-%m-%d'),
                "day": i,
                "yhat": float(row.yhat),
                "yhatLower": float(row.yhat_lower),
                "yhatUpper": float(row.yhat_upper)
            })
            
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
