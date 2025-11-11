import fs from 'fs/promises'

export async function parseJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data)
    const records = Array.isArray(parsed) ? parsed : [parsed]

    return {
      records,
      metadata: {
        topLevelType: Array.isArray(parsed) ? 'array' : typeof parsed,
        recordCount: records.length
      }
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error.message}`)
  }
}
