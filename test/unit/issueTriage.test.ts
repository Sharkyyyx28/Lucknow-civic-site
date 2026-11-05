import { describe, it, expect } from 'vitest'
import { triageCivicIssue } from '../../lib/ai/issueTriage'

describe('AI Issue Triage and Municipal Routing', () => {
  it('correctly triages a pothole / road cave-in issue', async () => {
    const result = await triageCivicIssue({
      description: 'Huge pothole and road crater near Hazratganj crossing causing accidents',
      lat: 26.8556,
      lng: 80.943,
      wardName: 'Hazratganj',
    })

    expect(result.category).toBe('issue')
    expect(result.subcategory).toBe('pothole')
    expect(result.severity).toBe('high')
    expect(result.severityScore).toBeGreaterThanOrEqual(4)
    expect(result.responsibleAgency).toContain('Lucknow Municipal Corporation')
    expect(result.jansunwaiDraft).toContain('सेवा में')
    expect(result.jansunwaiDraft).toContain('Hazratganj')
    expect(result.tweetDraft).toContain('@LMC_Lucknow')
  })

  it('correctly detects critical safety hazards for live electrical wires', async () => {
    const result = await triageCivicIssue({
      description: 'Live wire hanging low from pole with sparking near primary school in Alambagh',
      wardName: 'Alambagh',
    })

    expect(result.category).toBe('issue')
    expect(result.subcategory).toBe('electrical')
    expect(result.severity).toBe('critical')
    expect(result.severityScore).toBe(5)
    expect(result.detectedHazards.length).toBeGreaterThan(0)
    expect(result.responsibleAgency).toContain('LESA')
    expect(result.helpline).toContain('1912')
  })

  it('correctly triages uncollected garbage mounds with municipal sanitation routing', async () => {
    const result = await triageCivicIssue({
      description: 'Massive garbage dump not cleared for five days, foul smell in Indira Nagar block B',
      wardName: 'Indira Nagar',
    })

    expect(result.category).toBe('issue')
    expect(result.subcategory).toBe('garbage')
    expect(result.responsibleAgency).toContain('Sanitation')
    expect(result.helpline).toContain('1533')
  })
})
