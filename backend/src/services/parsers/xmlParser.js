import xml2js from 'xml2js'
import fs from 'fs/promises'

export async function parseXML(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      mergeAttrs: true 
    })

    const result = await parser.parseStringPromise(data)
    const records = extractRecords(result)
    const arrayRecords = Array.isArray(records) ? records : [records]

    return {
      records: arrayRecords,
      metadata: {
        rootKeys: Object.keys(result || {}),
        recordCount: arrayRecords.length
      }
    }
  } catch (error) {
    throw new Error(`Failed to parse XML file: ${error.message}`)
  }
}

function extractRecords(obj) {
  if (Array.isArray(obj)) {
    return obj
  }

  if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        return value
      }
      if (value && typeof value === 'object') {
        const nested = extractRecords(value)
        if (nested) return nested
      }
    }
  }

  return obj
}
