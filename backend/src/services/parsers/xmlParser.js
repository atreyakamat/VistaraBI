import xml2js from 'xml2js'
import fs from 'fs'

export async function parseXML(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      mergeAttrs: true 
    })

    const result = await parser.parseStringPromise(data)
    
    // Try to find the data array
    // Common patterns: root.items.item, root.data, root.records
    const records = extractRecords(result)
    
    return Array.isArray(records) ? records : [records]
  } catch (error) {
    throw new Error(`Failed to parse XML file: ${error.message}`)
  }
}

function extractRecords(obj) {
  // Try to find array of records
  if (Array.isArray(obj)) {
    return obj
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      return value
    }
    if (typeof value === 'object' && value !== null) {
      const nested = extractRecords(value)
      if (nested) return nested
    }
  }

  return [obj]
}

export function inferSchemaFromXML(records) {
  if (records.length === 0) {
    return {}
  }

  const schema = {}
  
  function flattenObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}_${key}` : key

      if (value === null || value === undefined) {
        schema[fullKey] = 'TEXT'
      } else if (Array.isArray(value)) {
        schema[fullKey] = 'JSONB'
      } else if (typeof value === 'object') {
        flattenObject(value, fullKey)
      } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
        schema[fullKey] = Number.isInteger(Number(value)) ? 'INTEGER' : 'DOUBLE PRECISION'
      } else {
        schema[fullKey] = 'TEXT'
      }
    }
  }

  flattenObject(records[0])
  return schema
}
