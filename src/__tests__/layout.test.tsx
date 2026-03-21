/**
 * Layout test — covers UX-04
 * Tests: Figtree + Poppins font variables, metadata title
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
const layoutSource = fs.readFileSync(layoutPath, 'utf-8')

describe('layout.tsx — brand fonts and metadata', () => {
  it('imports Figtree and Poppins (not Geist)', () => {
    expect(layoutSource).toContain("import { Figtree, Poppins } from 'next/font/google'")
    expect(layoutSource).not.toContain('Geist')
  })

  it('declares --font-figtree and --font-poppins CSS variables', () => {
    expect(layoutSource).toContain("variable: '--font-figtree'")
    expect(layoutSource).toContain("variable: '--font-poppins'")
  })

  it('sets metadata title to "Foot Scanner — If The Shoe Fits"', () => {
    // Check for the title string (literal em dash character U+2014)
    expect(layoutSource).toContain('Foot Scanner \u2014 If The Shoe Fits')
  })
})
