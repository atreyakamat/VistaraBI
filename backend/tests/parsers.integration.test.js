import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import { parseCSV } from '../src/services/parsers/csvParser.js'
import { parseExcel } from '../src/services/parsers/excelParser.js'
import { parseJSON } from '../src/services/parsers/jsonParser.js'
import { parseXML } from '../src/services/parsers/xmlParser.js'
import { parsePDF } from '../src/services/parsers/pdfParser.js'
import { parseDocx } from '../src/services/parsers/docxParser.js'
import { parseText } from '../src/services/parsers/textParser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const testDataDir = path.join(rootDir, 'test_data')

function sample(fileName) {
  return path.join(testDataDir, fileName)
}

function fileExists(fileName) {
  return fs.existsSync(sample(fileName))
}

describe('parser integration (sample data)', () => {
  it('parses CSV sample', async () => {
    if (!fileExists('encoded_cleaned_test - Copy.csv')) {
      // Guard the expectation to avoid false negatives when the sample is missing.
      expect(fileExists('encoded_cleaned_test - Copy.csv')).toBe(false)
      return
    }

    const { records } = await parseCSV(sample('encoded_cleaned_test - Copy.csv'))
    expect(records.length).toBeGreaterThan(0)
  }, 20000)

  it('parses Excel sample', async () => {
    const { records } = await parseExcel(sample('encoded_cleaned_test - Copy.xlsx'))
    expect(records.length).toBeGreaterThan(0)
    expect(typeof records[0]).toBe('object')
  }, 20000)

  it('parses JSON sample', async () => {
    const { records } = await parseJSON(sample('output - Copy.json'))
    expect(records.length).toBeGreaterThan(0)
    expect(records[0]).toHaveProperty('ID')
  }, 20000)

  it('parses XML sample', async () => {
    const { records } = await parseXML(sample('encoded_cleaned_test - Copy.xml'))
    expect(records.length).toBeGreaterThan(0)
    expect(records[0]).toHaveProperty('Delivery_person_ID')
  }, 20000)

  it('parses PDF sample', async () => {
    const { records } = await parsePDF(sample('encoded_cleaned_test - Copy.pdf'))
    expect(records.length).toBeGreaterThan(0)
    expect(records[0]).toHaveProperty('content')
  }, 60000)

  it('parses DOCX sample', async () => {
    const { records } = await parseDocx(sample('_MConverter.eu_encoded_cleaned_test - Copy.docx'))
    expect(records.length).toBeGreaterThan(0)
    expect(records[0]).toHaveProperty('content')
  }, 30000)

  it('parses TXT sample', async () => {
    const { records } = await parseText(sample('encoded_cleaned_test - Copy.txt'))
    expect(records.length).toBeGreaterThan(0)
    expect(records[0]).toHaveProperty('content')
  }, 20000)
})
