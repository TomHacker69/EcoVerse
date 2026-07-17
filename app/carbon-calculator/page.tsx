'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Leaf, AlertCircle, Car, Zap } from 'lucide-react';

// Emission factors (kg CO₂ per unit) based on commonly cited averages.
const EMISSION_FACTORS = {
  carKm: 0.17, // per km driven by average petrol car
  electricityKwh: 0.42, // per kWh (grid average)
  gasM3: 2.03, // per m³ of natural gas
  flightKm: 0.25, // per km short-haul flight
  publicTransitKm: 0.05, // per km bus/metro
};

type FieldKey = keyof typeof EMISSION_FACTORS;

const FIELD_META: Record<FieldKey, { label: string; unit: string; icon: string }> = {
  carKm: { label: 'Car travel distance', unit: 'km', icon: '🚗' },
  flightKm: { label: 'Flight distance', unit: 'km', icon: '✈️' },
  publicTransitKm: { label: 'Public transit distance', unit: 'km', icon: '🚌' },
  electricityKwh: { label: 'Electricity usage', unit: 'kWh', icon: '⚡' },
  gasM3: { label: 'Natural gas usage', unit: 'm³', icon: '🔥' },
};

function validateValue(raw: string, key: FieldKey): string | null {
  const trimmed = raw.trim();

  if (trimmed === '') return null; // empty is allowed (treated as 0)

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    return `${FIELD_META[key].label} must be a valid number.`;
  }

  if (value < 0) {
    return `${FIELD_META[key].label} cannot be negative. Enter a value of 0 or more.`;
  }

  return null;
}

export default function CarbonFootprintCalculatorPage() {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    carKm: '',
    flightKm: '',
    publicTransitKm: '',
    electricityKwh: '',
    gasM3: '',
  });
  const [result, setResult] = useState<number | null>(null);

  const errors: Partial<Record<FieldKey, string>> = {};
  (Object.keys(values) as FieldKey[]).forEach((key) => {
    const err = validateValue(values[key], key);
    if (err) errors[key] = err;
  });

  const hasErrors = Object.keys(errors).length > 0;

  const handleChange = (key: FieldKey, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }));
    setResult(null);
  };

  const handleCalculate = () => {
    // Guard: do not calculate if any field is invalid.
    if (hasErrors) return;

    let total = 0;
    (Object.keys(values) as FieldKey[]).forEach((key) => {
      const numeric = Number(values[key]);
      if (Number.isFinite(numeric) && numeric > 0) {
        total += numeric * EMISSION_FACTORS[key];
      }
    });

    setResult(total);
  };

  const handleReset = () => {
    setValues({
      carKm: '',
      flightKm: '',
      publicTransitKm: '',
      electricityKwh: '',
      gasM3: '',
    });
    setResult(null);
  };

  const total =
    result ??
    (Object.keys(values) as FieldKey[]).reduce((sum, key) => {
      const numeric = Number(values[key]);
      return Number.isFinite(numeric) && numeric > 0
        ? sum + numeric * EMISSION_FACTORS[key]
        : sum;
    }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-green-900 flex items-center gap-2">
            <Calculator className="h-8 w-8 text-green-700" />
            Carbon Footprint Calculator
          </h1>
          <p className="text-gray-600 mt-2">
            Estimate your CO₂ emissions by entering your monthly usage. Negative
            values are not accepted.
          </p>
        </div>

        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the highlighted inputs before calculating. Negative
              values are invalid.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-emerald-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Travel & Transport
              </CardTitle>
              <CardDescription className="text-gray-600">
                Distance travelled this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['carKm', 'flightKm', 'publicTransitKm'] as FieldKey[]).map(
                (key) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key}>
                      {FIELD_META[key].icon} {FIELD_META[key].label} ({FIELD_META[key].unit})
                    </Label>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      value={values[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      aria-invalid={!!errors[key]}
                      className={errors[key] ? 'border-red-500' : ''}
                    />
                    {errors[key] && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors[key]}
                      </p>
                    )}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <Card className="bg-emerald-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Energy Usage
              </CardTitle>
              <CardDescription className="text-gray-600">
                Household energy consumption this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['electricityKwh', 'gasM3'] as FieldKey[]).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key}>
                    {FIELD_META[key].icon} {FIELD_META[key].label} ({FIELD_META[key].unit})
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    placeholder="0"
                    value={values[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    aria-invalid={!!errors[key]}
                    className={errors[key] ? 'border-red-500' : ''}
                  />
                  {errors[key] && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCalculate}
            disabled={hasErrors}
            className="bg-green-600 hover:bg-green-700"
          >
            <Calculator className="h-4 w-4 mr-1" />
            Calculate Footprint
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>

        <Card className="bg-green-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Estimated Footprint
            </CardTitle>
            <CardDescription className="text-gray-600">
              Total estimated CO₂ emissions for the values entered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900">
              {total.toFixed(1)} kg CO₂
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {hasErrors
                ? 'Resolve invalid inputs to see an accurate estimate.'
                : 'Enter your usage above and calculate for a detailed breakdown.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
