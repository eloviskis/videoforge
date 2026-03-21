import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (window.location.port === '3000' ? 'http://localhost:3001/api' : `${window.location.origin}/api`)

const STYLES = [
  { id: 'cartoon', icon: '🎨', label: '2D Cartoon', desc: 'Ilustração vetorial animada', time: '~5s', cost: '~$0.05' },
  { id: '3d', icon: '🧊', label: '3D Avatar', desc: 'Personagem 3D estilizado', time: '~5s', cost: '~$0.05' },
  { id: 'realistic', icon: '📸', label: 'Realista', desc: 'Fotorrealista com IA', time: '~8s', cost: '~$0.05' },
]

// ── Mesh Warping Helpers ──
// Subset of MediaPipe 468 landmarks: face oval + features
const KEY_LM = [...new Set([
  // Face oval (perimeter)
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  // Left eye
  33, 133, 160, 159, 158, 144, 145, 153,
  // Right eye
  362, 263, 387, 386, 385, 373, 374, 380,
  // Left eyebrow
  70, 63, 105, 66, 107,
  // Right eyebrow
  300, 293, 334, 296, 336,
  // Nose
  1, 2, 5, 4, 6, 168, 195, 197, 98, 327,
  // Lips outer
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
  375, 321, 405, 314, 17, 84, 181, 91, 146,
  // Lips inner
  78, 308, 13, 14,
  // Forehead / center
  151, 9, 50, 280,
])]

function inCircum([ax, ay], [bx, by], [cx, cy], [px, py]) {
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  if (Math.abs(D) < 1e-10) return false
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D
  return (px - ux) ** 2 + (py - uy) ** 2 < (ax - ux) ** 2 + (ay - uy) ** 2
}

function computeDelaunay(pts) {
  const n = pts.length
  if (n < 3) return []
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const dmax = Math.max(maxX - minX, maxY - minY) * 3 + 1
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2
  const allPts = [...pts, [mx - dmax, my - dmax], [mx, my + dmax], [mx + dmax, my - dmax]]
  let tris = [[n, n + 1, n + 2]]
  for (let i = 0; i < n; i++) {
    const p = allPts[i]
    let edges = []
    tris = tris.filter(([a, b, c]) => {
      if (inCircum(allPts[a], allPts[b], allPts[c], p)) {
        edges.push([a, b], [b, c], [c, a])
        return false
      }
      return true
    })
    edges = edges.filter((e, i) => !edges.some((f, j) => i !== j && e[0] === f[1] && e[1] === f[0]))
    edges.forEach(([a, b]) => tris.push([a, b, i]))
  }
  return tris.filter(([a, b, c]) => a < n && b < n && c < n)
}

function warpTriangle(ctx, img, [[x1, y1], [x2, y2], [x3, y3]], [[dx1, dy1], [dx2, dy2], [dx3, dy3]]) {
  const det = (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  if (Math.abs(det) < 1e-6) return
  const a = ((dx1 - dx3) * (y2 - y3) - (dx2 - dx3) * (y1 - y3)) / det
  const c = ((dx2 - dx3) * (x1 - x3) - (dx1 - dx3) * (x2 - x3)) / det
  const e = dx1 - a * x1 - c * y1
  const b = ((dy1 - dy3) * (y2 - y3) - (dy2 - dy3) * (y1 - y3)) / det
  const d = ((dy2 - dy3) * (x1 - x3) - (dy1 - dy3) * (x2 - x3)) / det
  const f = dy1 - b * x1 - d * y1
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(dx1, dy1); ctx.lineTo(dx2, dy2); ctx.lineTo(dx3, dy3)
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

export default function AvatarStudio({ onBack, user }) {
  // ── State ──
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('cartoon')
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [activeAvatar, setActiveAvatar] = useState(null)
  const [library, setLibrary] = useState([])
  const [presets, setPresets] = useState([])
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [msg, setMsg] = useState('')
  const [trackingActive, setTrackingActive] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const animFrameRef = useRef(null)
  const faceLandmarkerRef = useRef(null)
  const faceDetectedRef = useRef(null) // { cx, cy, width, height, angle }
  const faceMeshBusyRef = useRef(false)
  const onResultsCallbackRef = useRef(null)   // override callback for avatar detection
  const liveAllLandmarksRef = useRef(null)    // full 468 live landmarks each frame
  const avatarLandmarksRef = useRef(null)     // avatar image rest-pose landmarks
  const avatarTrianglesRef = useRef(null)     // Delaunay triangle indices into KEY_LM
  const [faceMeshStatus, setFaceMeshStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [faceOk, setFaceOk] = useState(false)

  // ── Load FaceMesh via MediaPipe ──
  useEffect(() => {
    let cancelled = false
    async function loadFaceDetection() {
      try {
        // Carregar MediaPipe scripts via CDN
        if (!window._mpFaceDetectionLoaded) {
          await new Promise((resolve, reject) => {
            const s1 = document.createElement('script')
            s1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
            s1.crossOrigin = 'anonymous'
            s1.onload = () => {
              const s2 = document.createElement('script')
              s2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
              s2.crossOrigin = 'anonymous'
              s2.onload = () => { window._mpFaceDetectionLoaded = true; resolve() }
              s2.onerror = reject
              document.head.appendChild(s2)
            }
            s1.onerror = reject
            document.head.appendChild(s1)
          })
        }
        if (cancelled) return
        // Inicializar FaceMesh
        const faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        })
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        })
        faceMesh.onResults((results) => {
          faceMeshBusyRef.current = false
          // Avatar landmark detection takes priority
          if (onResultsCallbackRef.current) {
            const cb = onResultsCallbackRef.current
            onResultsCallbackRef.current = null
            cb(results)
            return
          }
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const lm = results.multiFaceLandmarks[0]
            liveAllLandmarksRef.current = lm
            const topHead = lm[10]
            const chin = lm[152]
            const leftEar = lm[234]
            const rightEar = lm[454]

            const cx = (leftEar.x + rightEar.x) / 2
            const cy = (topHead.y + chin.y) / 2
            const faceW = Math.abs(rightEar.x - leftEar.x)
            const faceH = Math.abs(chin.y - topHead.y)
            const angle = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x)

            faceDetectedRef.current = { cx, cy, width: faceW, height: faceH, angle }
            setFaceOk(true)
          } else {
            liveAllLandmarksRef.current = null
            faceDetectedRef.current = null
            setFaceOk(false)
          }
        })
        // Inicializar WASM (crítico — sem isso o send() falha silenciosamente)
        await faceMesh.initialize()
        faceLandmarkerRef.current = faceMesh
        if (!cancelled) setFaceMeshStatus('ready')
        console.log('FaceMesh inicializado com sucesso')
      } catch (e) {
        console.warn('FaceMesh não carregou:', e.message)
        if (!cancelled) setFaceMeshStatus('error')
      }
    }
    loadFaceDetection()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    loadLibrary()
    loadPresets()
    return () => {
      stopCamera()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ── Load data ──
  async function loadLibrary() {
    try {
      const { data } = await axios.get(`${API_URL}/avatar/library`)
      setLibrary(data.avatars || [])
    } catch {}
  }

  async function loadPresets() {
    try {
      const { data } = await axios.get(`${API_URL}/avatar/presets`)
      setPresets(data.presets || [])
    } catch {}
  }

  // ── Avatar Landmark Detection (rest pose) ──
  async function detectAvatarFace(imgEl) {
    if (!faceLandmarkerRef.current) return null
    return new Promise((resolve) => {
      onResultsCallbackRef.current = (results) => {
        if (results.multiFaceLandmarks?.length > 0) resolve(results.multiFaceLandmarks[0])
        else resolve(null)
      }
      faceLandmarkerRef.current.send({ image: imgEl }).catch(() => {
        onResultsCallbackRef.current = null
        resolve(null)
      })
    })
  }

  // When avatar changes: detect its rest-pose landmarks + compute Delaunay triangles
  useEffect(() => {
    avatarLandmarksRef.current = null
    avatarTrianglesRef.current = null
    if (!activeAvatar?.image_url) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const lm = await detectAvatarFace(img)
      if (!lm) return
      avatarLandmarksRef.current = lm
      const pts = KEY_LM.map(i => [lm[i].x * img.naturalWidth, lm[i].y * img.naturalHeight])
      avatarTrianglesRef.current = computeDelaunay(pts)
    }
    img.src = activeAvatar.image_url
  }, [activeAvatar?.image_url])

  // ── Camera ──
  async function startCamera() {
    try {
      setCameraError('')

      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não suporta acesso à câmera. Use Chrome ou Safari atualizado.')
        return
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true
        })
      } catch (e) {
        // Fallback 1: sem restrição de resolução
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
        } catch (e2) {
          // Fallback 2: sem áudio (alguns celulares bloqueiam áudio separadamente)
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }
      }
      streamRef.current = stream
      // Ativar a câmera primeiro para que o <video> seja renderizado no DOM
      setCameraActive(true)
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permissão da câmera negada. Verifique as configurações do navegador.'
          : err.name === 'NotFoundError'
            ? 'Nenhuma câmera encontrada neste dispositivo.'
            : err.name === 'NotReadableError'
              ? 'Câmera em uso por outro app. Feche outros apps e tente novamente.'
              : 'Erro ao acessar câmera: ' + err.message
      )
    }
  }

  // Conectar stream ao <video> assim que ele existir no DOM
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return
    const video = videoRef.current
    if (!video) return

    video.setAttribute('autoplay', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.srcObject = streamRef.current

    const onReady = () => {
      video.play().catch(() => {})
      startTracking()
    }
    if (video.readyState >= 1) {
      onReady()
    } else {
      video.addEventListener('loadedmetadata', onReady, { once: true })
    }
  }, [cameraActive])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setTrackingActive(false)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    smoothedFaceRef.current = null
    faceDetectedRef.current = null
  }

  // ── Face Tracking (Canvas overlay com MediaPipe) ──
  const smoothedFaceRef = useRef(null)

  function startTracking() {
    setTrackingActive(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    canvas.width = vw
    canvas.height = vh

    let avatarImg = null
    if (activeAvatar?.image_url) {
      avatarImg = new Image()
      avatarImg.crossOrigin = 'anonymous'
      avatarImg.src = activeAvatar.image_url
    }

    // Enviar frames para FaceMesh a cada ~33ms (~30fps detecção)
    let lastSendTime = 0
    const SEND_INTERVAL = 33

    // Canvas offscreen reutilizável para máscara do avatar
    const maskCanvas = document.createElement('canvas')
    const maskCtx = maskCanvas.getContext('2d')

    function lerp(a, b, t) { return a + (b - a) * t }

    // Desenha avatar com máscara elíptica suave no offscreen e retorna
    function drawMaskedAvatar(img, w, h) {
      const iw = Math.ceil(w) || 1
      const ih = Math.ceil(h) || 1
      if (maskCanvas.width !== iw || maskCanvas.height !== ih) {
        maskCanvas.width = iw
        maskCanvas.height = ih
      }
      maskCtx.clearRect(0, 0, iw, ih)
      maskCtx.drawImage(img, 0, 0, iw, ih)
      // Máscara elíptica com borda suave (feathering)
      maskCtx.globalCompositeOperation = 'destination-in'
      maskCtx.save()
      maskCtx.translate(iw / 2, ih / 2)
      maskCtx.scale(1, ih / iw) // alongar para elipse
      const r = iw / 2
      const grad = maskCtx.createRadialGradient(0, 0, 0, 0, 0, r)
      grad.addColorStop(0, 'rgba(0,0,0,1)')
      grad.addColorStop(0.6, 'rgba(0,0,0,1)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      maskCtx.fillStyle = grad
      maskCtx.fillRect(-iw / 2, -iw / 2, iw, iw) // quadrado no espaço escalado
      maskCtx.restore()
      maskCtx.globalCompositeOperation = 'source-over'
    }

    function drawFrame() {
      if (!streamRef.current) return
      const now = performance.now()

      // Enviar frame para MediaPipe FaceMesh (com back-pressure)
      if (faceLandmarkerRef.current && !faceMeshBusyRef.current &&
          now - lastSendTime > SEND_INTERVAL &&
          video.readyState >= 2 && video.videoWidth > 0) {
        lastSendTime = now
        faceMeshBusyRef.current = true
        try {
          faceLandmarkerRef.current.send({ image: video })
            .catch(() => { faceMeshBusyRef.current = false })
        } catch (_) {
          faceMeshBusyRef.current = false
        }
      }
      // Safety: reset busy flag se travou por mais de 2s
      if (faceMeshBusyRef.current && now - lastSendTime > 2000) {
        faceMeshBusyRef.current = false
      }

      // Desenhar vídeo espelhado (como espelho, natural para webcam)
      ctx.save()
      ctx.translate(vw, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, vw, vh)
      ctx.restore()

      if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
        const liveLm = liveAllLandmarksRef.current
        const avatarLm = avatarLandmarksRef.current
        const triangles = avatarTrianglesRef.current

        if (liveLm && avatarLm && triangles && triangles.length > 0) {
          // ── Mesh Warping: per-triangle affine warp (boca, olhos, cabeça) ──
          const iw = avatarImg.naturalWidth
          const ih = avatarImg.naturalHeight
          for (const [a, b, c] of triangles) {
            const la = KEY_LM[a], lb = KEY_LM[b], lc = KEY_LM[c]
            warpTriangle(
              ctx, avatarImg,
              [[avatarLm[la].x * iw, avatarLm[la].y * ih],
               [avatarLm[lb].x * iw, avatarLm[lb].y * ih],
               [avatarLm[lc].x * iw, avatarLm[lc].y * ih]],
              [[(1 - liveLm[la].x) * vw, liveLm[la].y * vh],
               [(1 - liveLm[lb].x) * vw, liveLm[lb].y * vh],
               [(1 - liveLm[lc].x) * vw, liveLm[lc].y * vh]]
            )
          }
        } else {
          // ── Fallback: ellipse overlay (enquanto landmarks carregam) ──
          const face = faceDetectedRef.current
          if (face) {
            const t = 0.3
            if (!smoothedFaceRef.current) {
              smoothedFaceRef.current = { ...face }
            } else {
              const s = smoothedFaceRef.current
              s.cx = lerp(s.cx, face.cx, t)
              s.cy = lerp(s.cy, face.cy, t)
              s.width = lerp(s.width, face.width, t)
              s.height = lerp(s.height, face.height, t)
              s.angle = lerp(s.angle, face.angle, t)
            }
            const sf = smoothedFaceRef.current
            const faceCx = (1 - sf.cx) * vw
            const faceCy = sf.cy * vh
            const faceW = sf.width * vw * 2.0
            const faceH = sf.height * vh * 2.2
            drawMaskedAvatar(avatarImg, faceW, faceH)
            ctx.save()
            ctx.translate(faceCx, faceCy)
            ctx.rotate(-sf.angle)
            ctx.drawImage(maskCanvas, -faceW / 2, -faceH / 2, faceW, faceH)
            ctx.restore()
          } else {
            const faceW = vw * 0.5
            const faceH = vh * 0.7
            drawMaskedAvatar(avatarImg, faceW, faceH)
            ctx.drawImage(maskCanvas, (vw - faceW) / 2, vh * 0.08, faceW, faceH)
          }
        }
      } else if (!avatarImg) {
        // Mostrar grid de tracking quando não tem avatar
        ctx.strokeStyle = 'rgba(34,197,94,0.4)'
        ctx.lineWidth = 1
        const cx = vw / 2, cy = vh * 0.46
        ctx.beginPath()
        ctx.ellipse(cx, cy, vw * 0.19, vh * 0.33, 0, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx, vh * 0.12); ctx.lineTo(cx, vh * 0.79)
        ctx.moveTo(vw * 0.31, cy); ctx.lineTo(vw * 0.69, cy)
        ctx.stroke()

        // Indicar status do FaceMesh
        const statusColor = faceMeshStatus === 'ready' ? 'rgba(34,197,94,0.7)'
          : faceMeshStatus === 'error' ? 'rgba(239,68,68,0.7)' : 'rgba(234,179,8,0.7)'
        const statusText = faceMeshStatus === 'ready' ? '👤 Posicione seu rosto no centro'
          : faceMeshStatus === 'error' ? '⚠️ Face tracking indisponível'
          : '⏳ Carregando face tracking...'
        ctx.fillStyle = statusColor
        ctx.font = `${Math.max(12, vw * 0.022)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(statusText, cx, vh * 0.9)
      }

      animFrameRef.current = requestAnimationFrame(drawFrame)
    }
    // Reset smoothing ao iniciar
    smoothedFaceRef.current = null
    drawFrame()
  }

  // Restart tracking when avatar changes
  useEffect(() => {
    if (cameraActive && canvasRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      startTracking()
    }
  }, [activeAvatar, cameraActive])

  // ── Generate Avatar ──
  async function handleGenerate(customPrompt, customStyle) {
    const finalPrompt = customPrompt || prompt
    const finalStyle = customStyle || selectedStyle
    if (!finalPrompt.trim()) {
      setMsg('Digite um prompt para o avatar')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    try {
      setGenerating(true)
      setGenProgress('🎨 Criando personagem...')

      const { data } = await axios.post(`${API_URL}/avatar/generate`, {
        prompt: finalPrompt,
        style: finalStyle,
      })

      setGenProgress('⏳ Aplicando estilo...')

      // Poll até ficar pronto
      const avatarId = data.avatarId
      let attempts = 0
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 2000))
        attempts++
        try {
          const { data: status } = await axios.get(`${API_URL}/avatar/${avatarId}/status`)
          if (status.status === 'ready') {
            setGenProgress('✅ Pronto!')
            setActiveAvatar(status)
            loadLibrary()
            setTimeout(() => setGenProgress(''), 1500)
            return
          }
          if (status.status === 'error') {
            throw new Error('Falha na geração')
          }
          setGenProgress(`⏳ Gerando... (${attempts * 2}s)`)
        } catch (e) {
          if (e.message === 'Falha na geração') throw e
        }
      }
      throw new Error('Timeout na geração do avatar')
    } catch (e) {
      setMsg('Erro: ' + (e.response?.data?.error || e.message))
      setTimeout(() => setMsg(''), 5000)
    } finally {
      setGenerating(false)
      setGenProgress('')
    }
  }

  // ── Recording ──
  function startRecording() {
    if (!canvasRef.current || !streamRef.current) return

    const canvasStream = canvasRef.current.captureStream(30)
    // Add audio from webcam
    const audioTracks = streamRef.current.getAudioTracks()
    audioTracks.forEach(t => canvasStream.addTrack(t))

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    })
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `avatar-video-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('✅ Vídeo salvo!')
      setTimeout(() => setMsg(''), 3000)
    }

    recorder.start(1000)
    recorderRef.current = recorder
    setRecording(true)
    setRecordTime(0)
    timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    setRecording(false)
    clearInterval(timerRef.current)
  }

  // ── Delete ──
  async function handleDelete(id) {
    if (!confirm('Excluir este avatar?')) return
    try {
      await axios.delete(`${API_URL}/avatar/${id}`)
      if (activeAvatar?.id === id) setActiveAvatar(null)
      loadLibrary()
      setMsg('✅ Avatar excluído')
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setMsg('Erro: ' + (e.response?.data?.error || e.message))
    }
  }

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── UI ──
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15,15,35,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <button onClick={onBack} style={{
          padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
        }}>← Voltar</button>
        <h1 style={{
          fontSize: '22px', fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #f472b6, #8b5cf6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>🎭 Avatar Studio</h1>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cameraActive ? '#22c55e' : '#64748b' }} />
          <span style={{ fontSize: '11px', color: '#64748b' }}>Câmera</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeAvatar ? '#8b5cf6' : '#64748b', marginLeft: 8 }} />
          <span style={{ fontSize: '11px', color: '#64748b' }}>Avatar</span>
          {cameraActive && <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', marginLeft: 8, background: faceOk ? '#22c55e' : faceMeshStatus === 'ready' ? '#eab308' : faceMeshStatus === 'error' ? '#ef4444' : '#64748b', transition: 'background 0.3s' }} />
            <span style={{ fontSize: '11px', color: faceOk ? '#22c55e' : '#64748b' }}>{faceOk ? 'Rosto ✓' : faceMeshStatus === 'loading' ? 'Carregando...' : faceMeshStatus === 'error' ? 'Sem tracking' : 'Sem rosto'}</span>
          </>}
          {recording && <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginLeft: 8, animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>REC {formatTime(recordTime)}</span>
          </>}
        </div>
      </div>

      {/* Mensagem */}
      {msg && (
        <div style={{
          textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: 600,
          background: msg.includes('Erro') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          color: msg.includes('Erro') ? '#fca5a5' : '#86efac',
        }}>{msg}</div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* ═══ COLUNA ESQUERDA — Preview ═══ */}
        <div style={{ flex: '1 1 480px', minWidth: '320px' }}>
          {/* Preview Box */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', overflow: 'hidden', position: 'relative',
          }}>
            {!cameraActive ? (
              <div style={{
                width: '100%', aspectRatio: '4/3', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '16px',
                background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08), transparent)',
              }}>
                <div style={{ fontSize: '64px' }}>📷</div>
                <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6, margin: 0 }}>
                  Autorize a câmera para ver o preview com seu avatar AI
                </p>
                <div style={{
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: '10px', padding: '10px 16px', fontSize: '11px', color: '#86efac',
                  maxWidth: '280px', textAlign: 'center', lineHeight: 1.5,
                }}>
                  🔒 O vídeo da webcam é 100% local — nunca sai do seu dispositivo
                </div>
                {cameraError && (
                  <p style={{ color: '#fca5a5', fontSize: '12px', margin: 0 }}>{cameraError}</p>
                )}
                <button onClick={startCamera} style={{
                  padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
                  fontWeight: 700, fontSize: '15px',
                }}>📹 Autorizar Câmera</button>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
                <video ref={videoRef} autoPlay playsInline webkit-playsinline="" style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: activeAvatar ? 0.3 : 1 }} muted />
                <canvas ref={canvasRef} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* Ações do preview */}
          {cameraActive && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              {!recording ? (
                <button onClick={startRecording} disabled={!activeAvatar} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: activeAvatar ? 'pointer' : 'not-allowed',
                  background: activeAvatar ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.05)',
                  color: activeAvatar ? '#fff' : '#64748b', fontWeight: 700, fontSize: '13px',
                  opacity: activeAvatar ? 1 : 0.5,
                }}>⏺ Iniciar Gravação</button>
              ) : (
                <button onClick={stopRecording} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontWeight: 700, fontSize: '13px',
                  animation: 'pulse 1.5s infinite',
                }}>⏹ Parar ({formatTime(recordTime)})</button>
              )}
              <button onClick={stopCamera} style={{
                padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
              }}>📷 Desligar</button>
            </div>
          )}

          {/* Biblioteca de avatares */}
          {library.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#c4b5fd', marginBottom: '10px' }}>
                📚 Seus Avatares ({library.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                {library.filter(a => a.status === 'ready').map(av => (
                  <div key={av.id} onClick={() => setActiveAvatar(av)} style={{
                    borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', position: 'relative',
                    border: activeAvatar?.id === av.id ? '2px solid #8b5cf6' : '2px solid rgba(255,255,255,0.08)',
                    transition: 'border-color 0.2s',
                  }}>
                    <img src={av.image_url} alt={av.prompt} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    <button onClick={e => { e.stopPropagation(); handleDelete(av.id) }} style={{
                      position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)',
                      border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '4px',
                      fontSize: '10px', padding: '2px 4px',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ COLUNA DIREITA — Controles ═══ */}
        <div style={{ flex: '1 1 380px', minWidth: '300px' }}>
          {/* Seletor de estilo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Estilo do Avatar
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setSelectedStyle(s.id)} style={{
                  flex: 1, padding: '12px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: selectedStyle === s.id ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
                  outline: selectedStyle === s.id ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: selectedStyle === s.id ? '#c4b5fd' : '#e2e8f0' }}>{s.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{s.time} • {s.cost}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
              Descreva seu Avatar
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ex: jovem apresentador de cabelo castanho, estilo descontraído, camiseta azul..."
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0', fontSize: '14px', outline: 'none', resize: 'vertical',
                fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Botão Gerar */}
          <button onClick={() => handleGenerate()} disabled={generating || !prompt.trim()} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            cursor: (generating || !prompt.trim()) ? 'not-allowed' : 'pointer',
            background: (generating || !prompt.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8b5cf6, #a855f7)',
            color: (generating || !prompt.trim()) ? '#64748b' : '#fff',
            fontWeight: 700, fontSize: '15px', marginBottom: '12px',
            opacity: (generating || !prompt.trim()) ? 0.6 : 1,
          }}>
            {generating ? genProgress || '⏳ Gerando...' : '🎭 Gerar Avatar'}
          </button>

          {/* Progress */}
          {generating && (
            <div style={{
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '10px', padding: '12px', marginBottom: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '13px', color: '#c4b5fd', fontWeight: 600 }}>{genProgress}</div>
              <div style={{
                width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px', marginTop: '8px', overflow: 'hidden',
              }}>
                <div style={{
                  width: '60%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #c084fc)',
                  borderRadius: '2px', animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            </div>
          )}

          {/* Presets */}
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => setShowPresets(!showPresets)} style={{
              width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.15)',
              background: 'transparent', color: '#8b5cf6', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}>
              {showPresets ? '✕ Fechar Presets' : '⚡ Presets Prontos (5 avatares)'}
            </button>
            {showPresets && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {presets.map(p => (
                  <button key={p.id} onClick={() => { setPrompt(p.prompt); setSelectedStyle(p.style); handleGenerate(p.prompt, p.style) }} disabled={generating} style={{
                    padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '13px',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span>{p.name}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>{p.style}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar ativo */}
          {activeAvatar && (
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '12px', padding: '16px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>🎭 Avatar Ativo</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={activeAvatar.image_url} alt="Avatar" style={{ width: 60, height: 60, borderRadius: '10px', objectFit: 'cover' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#c4b5fd' }}>{activeAvatar.prompt}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>Estilo: {activeAvatar.style}</p>
                </div>
              </div>
              <button onClick={() => setActiveAvatar(null)} style={{
                marginTop: '8px', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '12px',
              }}>Remover avatar</button>
            </div>
          )}

          {/* Info de privacidade */}
          <div style={{
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#86efac', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>🔒 Privacidade</div>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>A webcam é processada 100% no seu navegador</li>
              <li>O stream de vídeo nunca é enviado ao servidor</li>
              <li>Apenas a imagem do avatar gerada é salva</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(200%) } }
      `}</style>
    </div>
  )
}
