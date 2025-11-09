import fs from 'fs'

export async function parseJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(data)

    // If it's an array, return as is
    if (Array.isArray(parsed)) {
      return parsed
    }

    // If it's an object, wrap it in an array
    return [parsed]
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error.message}`)
  }
}

export function inferSchemaFromJSON(records) {
  if (records.length === 0) {
    return {}
  }

  const schema = {}
  
  // Flatten nested objects and infer types
  function flattenObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}_${key}` : key

      if (value === null || value === undefined) {
        schema[fullKey] = 'TEXT'
      } else if (Array.isArray(value)) {
        schema[fullKey] = 'JSONB'
      } else if (typeof value === 'object') {
        flattenObject(value, fullKey)
      } else if (typeof value === 'number') {
        schema[fullKey] = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE PRECISION'
      } else if (typeof value === 'boolean') {
        schema[fullKey] = 'BOOLEAN'
      } else {
        schema[fullKey] = 'TEXT'
      }
    }
  }

  flattenObject(records[0])
  return schema
}
