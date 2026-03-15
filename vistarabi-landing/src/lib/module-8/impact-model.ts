/**
 * Calculates the non-linear ramp-up factor using a Logistic Sigmoid Function.
 * This represents how an action's impact gradually increases over time.
 * @param day The current day in the forecast horizon.
 * @param startDay The day the action starts.
 * @param rampDays How many days it takes to reach full impact.
 * @returns A multiplier between 0 and 1.
 */
export function calculateRampFactor(day: number, startDay: number, rampDays: number): number {
  if (day < startDay) return 0;
  if (day >= startDay + rampDays) return 1;
  
  // Midpoint of the ramp-up
  const midpoint = startDay + rampDays / 2;
  // Steepness k: determines how "S" shaped the curve is. 
  // Dividing by 6 gives a nice curve where ends are close to 0 and 1.
  const k = rampDays / 6;
  
  const x = (day - midpoint) / k;
  return 1 / (1 + Math.exp(-x));
}
