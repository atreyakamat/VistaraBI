import { describe, it, expect } from 'vitest'
import { resolveFileKind } from '../src/services/fileProcessor.js'

describe('resolveFileKind', () => {
  it('detects csv by extension', () => {
    expect(resolveFileKind('sales.csv', '')).toBe('csv')
  })

  it('detects tsv by extension', () => {
    expect(resolveFileKind('metrics.TSV', '')).toBe('tsv')
  })

  it('detects excel by extension', () => {
    expect(resolveFileKind('report.xlsx', '')).toBe('excel')
    expect(resolveFileKind('legacy.xls', '')).toBe('excel')
  })

  it('detects json by mime type when extension missing', () => {
    expect(resolveFileKind('', 'application/json')).toBe('json')
  })

  it('detects xml by mime type substring', () => {
    expect(resolveFileKind('', 'application/xml;charset=utf-8')).toBe('xml')
  })

  it('detects pdf files', () => {
    expect(resolveFileKind('brochure.pdf', '')).toBe('pdf')
  })

  it('detects doc and docx files', () => {
    expect(resolveFileKind('proposal.docx', '')).toBe('docx')
    expect(resolveFileKind('legacy.doc', '')).toBe('docx')
  })

  it('detects plain text by mime type', () => {
    expect(resolveFileKind('', 'text/plain')).toBe('text')
  })

  it('returns null for unsupported files', () => {
    expect(resolveFileKind('image.png', 'image/png')).toBeNull()
  })
})
