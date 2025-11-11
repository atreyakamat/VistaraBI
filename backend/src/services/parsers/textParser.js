import fs from 'fs/promises'

export async function parseText(filePath) {
  const content = await fs.readFile(filePath, 'utf-8')

  const records = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .map((line, index) => ({
      lineNumber: index + 1,
      content: line
    }))

  return {
    records,
    metadata: {
      lineCount: records.length
    }
  }
}
