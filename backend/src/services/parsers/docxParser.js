import fs from 'fs/promises'
import mammoth from 'mammoth'

export async function parseDocx(filePath) {
  const buffer = await fs.readFile(filePath)
  let extraction

  try {
    extraction = await mammoth.extractRawText({ buffer })
  } catch (error) {
    const message = error.message.toLowerCase().includes('unsupported file type') || error.message.toLowerCase().includes('doc file')
      ? 'Legacy .doc files are not supported. Please convert the document to .docx before uploading.'
      : `Failed to parse DOC/DOCX file: ${error.message}`

    throw new Error(message)
  }

  const rawText = extraction?.value || ''

  const records = rawText
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((content, index) => ({
      lineNumber: index + 1,
      content
    }))

  const metadata = {}

  if (extraction?.messages?.length) {
    metadata.messages = extraction.messages
  }

  return { records, metadata }
}
