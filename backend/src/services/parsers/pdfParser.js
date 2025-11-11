import fs from 'fs/promises'
import pdfParse from 'pdf-parse'

export async function parsePDF(filePath) {
  const buffer = await fs.readFile(filePath)
  const parsed = await pdfParse(buffer)
  const rawText = parsed.text || ''

  const records = rawText
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((content, index) => ({
      lineNumber: index + 1,
      content
    }))

  const metadata = {}

  if (parsed.numpages) {
    metadata.pageCount = parsed.numpages
  }

  if (parsed.info && Object.keys(parsed.info).length > 0) {
    metadata.documentInfo = parsed.info
  }

  return { records, metadata }
}
