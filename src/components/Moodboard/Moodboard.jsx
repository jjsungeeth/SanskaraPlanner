import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../App'
import { Plus, Trash2, Image, Pen, Move, Layers, Upload, ChevronUp, ChevronDown } from 'lucide-react'

export default function Moodboard({ chapterId }) {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tool, setTool] = useState('move') // 'move' | 'draw'
  const [selectedId, setSelectedId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [drawColor, setDrawColor] = useState('#8B3A52')
  const [drawSize, setDrawSize] = useState(3)

  const boardRef = useRef(null)
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const pathRef = useRef([])
  const dragRef = useRef({ active: false, startX: 0, startY: 0, itemX: 0, itemY: 0 })

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from('moodboard_items')
      .select('*').eq('chapter_id', chapterId).order('z_index')
    setItems(data || [])
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetchItems() }, [fetchItems])

  // ── Drawing canvas setup ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
  }, [])

  function getPos(e, el) {
    const rect = el.getBoundingClientRect()
    const touch = e.touches?.[0] || e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  function onCanvasMouseDown(e) {
    if (tool !== 'draw') return
    drawingRef.current = true
    pathRef.current = []
    const pos = getPos(e, canvasRef.current)
    pathRef.current.push(pos)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function onCanvasMouseMove(e) {
    if (!drawingRef.current) return
    const pos = getPos(e, canvasRef.current)
    pathRef.current.push(pos)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = drawSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  async function onCanvasMouseUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (pathRef.current.length < 2) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Save drawing as item
    const drawing_data = { path: pathRef.current, color: drawColor, size: drawSize }
    const { data } = await supabase.from('moodboard_items').insert({
      chapter_id: chapterId,
      item_type: 'drawing',
      drawing_data,
      pos_x: 0, pos_y: 0,
      z_index: items.length,
    }).select().single()

    if (data) setItems(p => [...p, data])

    // Clear canvas
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pathRef.current = []
  }

  // ── Image upload ─────────────────────────────────────────
  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Only JPG and PNG images allowed.')
      return
    }
    setUploading(true)
    const path = `${session.user.id}/moodboard/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('moodboard').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('moodboard').getPublicUrl(path)
      const { data } = await supabase.from('moodboard_items').insert({
        chapter_id: chapterId,
        item_type: 'image',
        content_url: urlData.publicUrl,
        pos_x: 50, pos_y: 50,
        width: 200, height: 200,
        z_index: items.length,
      }).select().single()
      if (data) setItems(p => [...p, data])
    }
    setUploading(false)
  }

  // ── Drag to move ──────────────────────────────────────────
  function startDrag(e, item) {
    if (tool !== 'move') return
    e.preventDefault()
    setSelectedId(item.id)
    const pos = getPos(e, boardRef.current)
    dragRef.current = { active: true, startX: pos.x, startY: pos.y, itemX: item.pos_x, itemY: item.pos_y, id: item.id }
  }

  function onBoardMouseMove(e) {
    if (!dragRef.current.active) return
    const pos = getPos(e, boardRef.current)
    const dx = pos.x - dragRef.current.startX
    const dy = pos.y - dragRef.current.startY
    setItems(p => p.map(it => it.id === dragRef.current.id
      ? { ...it, pos_x: dragRef.current.itemX + dx, pos_y: dragRef.current.itemY + dy }
      : it
    ))
  }

  async function onBoardMouseUp() {
    if (!dragRef.current.active) return
    const item = items.find(it => it.id === dragRef.current.id)
    if (item) await supabase.from('moodboard_items').update({ pos_x: item.pos_x, pos_y: item.pos_y }).eq('id', item.id)
    dragRef.current.active = false
  }

  async function deleteItem(id) {
    setItems(p => p.filter(it => it.id !== id))
    await supabase.from('moodboard_items').delete().eq('id', id)
    if (selectedId === id) setSelectedId(null)
  }

  async function changeZ(id, dir) {
    const item = items.find(it => it.id === id)
    if (!item) return
    const newZ = item.z_index + dir
    await supabase.from('moodboard_items').update({ z_index: newZ }).eq('id', id)
    setItems(p => p.map(it => it.id === id ? { ...it, z_index: newZ } : it))
  }

  if (loading) return <div className="p-8 text-sink-muted text-sm">Loading…</div>

  return (
    <div className="space-y-4 fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title">Mood Board</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tool toggle */}
          <div className="flex rounded-lg border border-scream-darker overflow-hidden">
            {[
              { id: 'move', icon: Move, label: 'Move' },
              { id: 'draw', icon: Pen, label: 'Draw' },
            ].map(t => (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-body transition-colors ${tool === t.id ? 'bg-srose text-white' : 'bg-white text-sink-muted hover:bg-scream'}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {tool === 'draw' && (
            <>
              <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-scream-darker" title="Brush colour" />
              <select value={drawSize} onChange={e => setDrawSize(Number(e.target.value))} className="input !w-auto !py-1 !px-2 text-xs">
                {[1, 2, 3, 5, 8, 12].map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
            </>
          )}

          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Add image'}
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <p className="text-sm text-sink-muted font-body">
        Upload inspiration images, draw sketches, and move elements freely. Use Move mode to drag items, Draw mode to sketch.
      </p>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative w-full bg-white border-2 border-scream-darker rounded-2xl overflow-hidden"
        style={{ height: '600px', cursor: tool === 'move' ? 'default' : 'crosshair' }}
        onMouseMove={onBoardMouseMove}
        onMouseUp={onBoardMouseUp}
        onMouseLeave={onBoardMouseUp}
      >
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Image className="w-12 h-12 text-sink-light mx-auto mb-2" />
              <p className="font-display text-xl text-sink-light">Your mood board is empty</p>
              <p className="text-sm text-sink-light font-body mt-1">Upload images or draw to get started</p>
            </div>
          </div>
        )}

        {/* Render image items */}
        {items.filter(it => it.item_type === 'image').sort((a, b) => a.z_index - b.z_index).map(item => (
          <div
            key={item.id}
            className={`absolute group cursor-move rounded-lg overflow-hidden border-2 transition-colors ${selectedId === item.id ? 'border-srose' : 'border-transparent hover:border-srose-light'}`}
            style={{ left: item.pos_x, top: item.pos_y, width: item.width, height: item.height, zIndex: item.z_index }}
            onMouseDown={e => startDrag(e, item)}
            onClick={() => setSelectedId(item.id)}
          >
            <img src={item.content_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" draggable={false} />
            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); changeZ(item.id, 1) }} className="w-5 h-5 bg-white/90 rounded flex items-center justify-center shadow"><ChevronUp className="w-3 h-3" /></button>
              <button onClick={(e) => { e.stopPropagation(); changeZ(item.id, -1) }} className="w-5 h-5 bg-white/90 rounded flex items-center justify-center shadow"><ChevronDown className="w-3 h-3" /></button>
              <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} className="w-5 h-5 bg-white/90 rounded flex items-center justify-center shadow text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}

        {/* Render drawing items (as SVG paths) */}
        {items.filter(it => it.item_type === 'drawing').map(item => {
          if (!item.drawing_data?.path?.length) return null
          const path = item.drawing_data.path
          const d = path.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '')
          return (
            <svg key={item.id} className="absolute inset-0 pointer-events-none" style={{ zIndex: item.z_index }}
              width="100%" height="100%">
              <path d={d} stroke={item.drawing_data.color} strokeWidth={item.drawing_data.size}
                fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )
        })}

        {/* Live drawing canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 100, pointerEvents: tool === 'draw' ? 'auto' : 'none' }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
        />
      </div>
    </div>
  )
}
