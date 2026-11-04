import { describe, it, expect } from 'vitest'
import { searchCivicKnowledge, answerCivicQuery } from '../../lib/ai/civicRag'

describe('Civic RAG Search and Knowledge Retrieval', () => {
  it('retrieves house tax knowledge for English and Hinglish queries', () => {
    const resultsEnglish = searchCivicKnowledge('How do I pay property tax in Lucknow?')
    expect(resultsEnglish.length).toBeGreaterThan(0)
    expect(resultsEnglish[0].doc.id).toBe('lmc-house-tax')
    expect(resultsEnglish[0].doc.helplines.some(h => h.number === '1533')).toBe(true)

    const resultsHinglish = searchCivicKnowledge('Makan tax kaise bhare Lucknow nagar nigam?')
    expect(resultsHinglish.length).toBeGreaterThan(0)
    expect(resultsHinglish[0].doc.id).toBe('lmc-house-tax')
  })

  it('retrieves sanitation and waste management docs for garbage queries', () => {
    const results = searchCivicKnowledge('kachra uthane wala nahi aaya lane me')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].doc.id).toBe('lmc-sanitation-garbage')
    expect(results[0].doc.helplines.some(h => h.number === '1533')).toBe(true)
  })

  it('retrieves Jal Sansthan details for drinking water and sewer queries', () => {
    const results = searchCivicKnowledge('urgent water tanker booking in Gomti Nagar')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].doc.id).toBe('jal-sansthan-water-sewer')
    expect(results[0].doc.helplines.some(h => h.number.includes('0522-2239611'))).toBe(true)
  })

  it('retrieves LESA electricity helpline for power cuts and streetlights', () => {
    const results = searchCivicKnowledge('transformer sparking and street light pole broken')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].doc.id).toBe('lesa-electricity')
    expect(results[0].doc.helplines.some(h => h.number === '1912')).toBe(true)
  })

  it('retrieves UPMRC Lucknow Metro fare and timings', () => {
    const results = searchCivicKnowledge('Lucknow metro timings and GoSmart card discount')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].doc.id).toBe('upmrc-lucknow-metro')
  })

  it('synthesizes a structured answer with action steps and helplines', async () => {
    const answer = await answerCivicQuery('How to lodge a complaint about broken streetlights in Lucknow?')
    expect(answer.answer).toBeTruthy()
    expect(answer.helplines.length).toBeGreaterThan(0)
    expect(answer.helplines.some(h => h.number === '1533' || h.number === '1912')).toBe(true)
  })
})
