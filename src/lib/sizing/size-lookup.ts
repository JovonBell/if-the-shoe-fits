import type { MeasurementResult } from '@/lib/cv/types'

export interface ShoeSize {
  us_womens: string
  us_mens: string
  eu: string
  uk: string
}

// Foot length ranges in mm mapped to sizes (Brannock-based)
// Source: calculator.net conversion table, verified 2026-03-21
const SIZE_TABLE: Array<{ min_mm: number; max_mm: number } & ShoeSize> = [
  { min_mm: 210, max_mm: 215, us_womens: '4',   us_mens: '',   eu: '34', uk: '2'   },
  { min_mm: 215, max_mm: 222, us_womens: '5',   us_mens: '',   eu: '35', uk: '3'   },
  { min_mm: 222, max_mm: 229, us_womens: '6',   us_mens: '',   eu: '36', uk: '4'   },
  { min_mm: 229, max_mm: 237, us_womens: '7',   us_mens: '5',  eu: '37', uk: '5'   },
  { min_mm: 237, max_mm: 246, us_womens: '8',   us_mens: '6',  eu: '38', uk: '6'   },
  { min_mm: 246, max_mm: 254, us_womens: '9',   us_mens: '7',  eu: '39', uk: '7'   },
  { min_mm: 254, max_mm: 262, us_womens: '10',  us_mens: '8',  eu: '40', uk: '7.5' },
  { min_mm: 262, max_mm: 271, us_womens: '11',  us_mens: '9',  eu: '41', uk: '8'   },
  { min_mm: 271, max_mm: 279, us_womens: '12',  us_mens: '10', eu: '43', uk: '9'   },
  { min_mm: 279, max_mm: 288, us_womens: '13',  us_mens: '11', eu: '44', uk: '10'  },
  { min_mm: 288, max_mm: 296, us_womens: '',    us_mens: '12', eu: '45', uk: '11'  },
  { min_mm: 296, max_mm: 305, us_womens: '',    us_mens: '13', eu: '46', uk: '12'  },
  { min_mm: 305, max_mm: 315, us_womens: '',    us_mens: '14', eu: '48', uk: '13'  },
]

export function lookupSize(length_mm: number): ShoeSize {
  const entry = SIZE_TABLE.find(s => length_mm >= s.min_mm && length_mm < s.max_mm)
  return entry
    ? { us_womens: entry.us_womens, us_mens: entry.us_mens, eu: entry.eu, uk: entry.uk }
    : { us_womens: '?', us_mens: '?', eu: '?', uk: '?' }
}

// UX-06: use larger foot for recommendation
export function getRecommendedSize(
  left: MeasurementResult | null,
  right: MeasurementResult | null
): ShoeSize {
  const lengths = [left?.length_mm, right?.length_mm].filter((v): v is number => v != null)
  if (lengths.length === 0) return { us_womens: '?', us_mens: '?', eu: '?', uk: '?' }
  return lookupSize(Math.max(...lengths))
}
