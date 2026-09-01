import { NextResponse } from 'next/server';

import type { IncomeInput, IncomeStability, TaxRegime } from '@corpus/core';

import { updateIncome } from '@/lib/snapshot';

const STABILITIES: IncomeStability[] = [
  'Salaried, permanent',
  'Salaried, contract',
  'Self-employed',
  'Variable',
];

const REGIMES: TaxRegime[] = ['Old regime', 'New regime'];

const MONEY_FIELDS = [
  'monthlyTakeHome',
  'rentalIncome',
  'freelanceAndOther',
  'expectedAnnualBonus',
] as const;

/**
 * Updates the income the plan is built from and returns the recomputed
 * snapshot.
 *
 * Input is validated here rather than trusted from the form: a negative salary
 * or a bogus tax regime would produce a plan that looks authoritative and is
 * wrong.
 */
export async function PATCH(request: Request) {
  let body: { income?: Partial<IncomeInput> };
  try {
    body = (await request.json()) as { income?: Partial<IncomeInput> };
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const income = body.income;
  if (!income) {
    return NextResponse.json({ error: 'Missing income.' }, { status: 400 });
  }

  for (const field of MONEY_FIELDS) {
    const value = income[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: `${field} must be a number of rupees, zero or more.` },
        { status: 422 },
      );
    }
  }

  if (!income.stability || !STABILITIES.includes(income.stability)) {
    return NextResponse.json({ error: 'Unknown income stability.' }, { status: 422 });
  }

  if (!income.taxRegime || !REGIMES.includes(income.taxRegime)) {
    return NextResponse.json({ error: 'Unknown tax regime.' }, { status: 422 });
  }

  const snapshot = await updateIncome({
    monthlyTakeHome: income.monthlyTakeHome!,
    rentalIncome: income.rentalIncome!,
    freelanceAndOther: income.freelanceAndOther!,
    expectedAnnualBonus: income.expectedAnnualBonus!,
    bonusMonth: income.bonusMonth ?? 4,
    stability: income.stability,
    taxRegime: income.taxRegime,
  });

  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
