import type { UnitSystem } from '@/lib/preferences/types'

import type { Quantity } from './types'

interface Conversion {
  to: string
  factor?: number
  convert?: (value: number) => number
  digits: number
}

const TO_IMPERIAL: Record<string, Conversion> = {
  mm: { to: 'in', factor: 1 / 25.4, digits: 1 },
  cm: { to: 'in', factor: 1 / 2.54, digits: 1 },
  m: { to: 'ft', factor: 3.28084, digits: 1 },
  g: { to: 'oz', factor: 0.035274, digits: 1 },
  kg: { to: 'lb', factor: 2.20462, digits: 1 },
  C: { to: 'F', convert: (c) => (c * 9) / 5 + 32, digits: 0 },
}

const TO_METRIC: Record<string, Conversion> = {
  in: { to: 'mm', factor: 25.4, digits: 0 },
  ft: { to: 'm', factor: 0.3048, digits: 2 },
  oz: { to: 'g', factor: 28.3495, digits: 0 },
  lb: { to: 'kg', factor: 0.453592, digits: 1 },
  F: { to: 'C', convert: (f) => ((f - 32) * 5) / 9, digits: 0 },
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

export function convertQuantity(q: Quantity, system: UnitSystem): Quantity {
  const conversion = (system === 'imperial' ? TO_IMPERIAL : TO_METRIC)[q.unit]
  if (!conversion) return q

  const value = conversion.convert
    ? conversion.convert(q.value)
    : q.value * (conversion.factor ?? 1)
  return { value: round(value, conversion.digits), unit: conversion.to }
}

export function unitLabel(unit: string): string {
  return unit === 'C' || unit === 'F' ? `°${unit}` : unit
}
