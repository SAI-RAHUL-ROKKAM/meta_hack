import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Complaint ID required' })
  const { data, error } = await supabase
    .from('complaints')
    .select('id,summary,department,urgency,status,estimated_resolution,created_at')
    .eq('id', id)
    .single()
  if (error) return res.status(404).json({ error: 'Complaint not found' })
  res.status(200).json(data)
}
