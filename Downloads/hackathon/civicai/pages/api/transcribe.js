import formidable from 'formidable'
import fs from 'fs'
import os from 'os'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const form = formidable({ uploadDir: os.tmpdir(), keepExtensions: true })

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'File parse failed' })
    try {
      const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio
      if (!audioFile) return res.status(400).json({ error: 'No audio file received' })

      // Read file as buffer (fixes stream incompatibility with native fetch)
      const fileBuffer = fs.readFileSync(audioFile.filepath)
      const fileName = audioFile.originalFilename || 'audio.webm'
      const mimeType = audioFile.mimetype || 'audio/webm'

      // Use Web FormData (native to Node 18+) instead of the npm form-data package
      const formData = new FormData()
      const blob = new Blob([fileBuffer], { type: mimeType })
      formData.append('file', blob, fileName)
      formData.append('model', 'whisper-1')

      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        fs.unlink(audioFile.filepath, () => {})
        return res.status(500).json({
          error: 'No OpenAI API key configured',
          useBrowserFallback: true
        })
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      })

      const data = await response.json()
      fs.unlink(audioFile.filepath, () => {})

      if (!response.ok) {
        console.error('OpenAI Transcription error:', response.status, data)
        return res.status(500).json({
          error: 'Transcription service failed',
          detail: data.error?.message || JSON.stringify(data),
          useBrowserFallback: true
        })
      }

      if (!data.text) throw new Error('No transcription text returned')
      res.status(200).json({ text: data.text })
    } catch (err) {
      console.error('Transcription error:', err)
      res.status(500).json({
        error: 'Transcription failed',
        detail: err.message,
        useBrowserFallback: true
      })
    }
  })
}
