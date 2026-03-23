import { useState, useEffect, useRef, useCallback } from 'react'

// ── CDN: carregamento sequencial ──
const CDN = [
  'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@2.1.2/lib/three-vrm.js',  // UMD → window.THREE_VRM
  'https://cdn.jsdelivr.net/npm/kalidokit@1.1.2/dist/kalidokit.umd.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
]

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.crossOrigin = 'anonymous'
    s.onload = resolve; s.onerror = () => reject(new Error('Falha ao carregar: ' + src))
    document.head.appendChild(s)
  })
}

export default function VTuberStudio({ onBack }) {
  const videoRef      = useRef(null)   // webcam hidden
  const bgCanvasRef   = useRef(null)   // webcam background visible
  const threeCanvasRef= useRef(null)   // Three.js VRM

  const [phase, setPhase]       = useState('loading') // loading|idle|active|error
  const [phaseMsg, setPhaseMsg] = useState('Carregando bibliotecas 3D...')
  const [vrmLoaded, setVrmLoaded] = useState(false)
  const [cameraOn, setCameraOn]  = useState(false)
  const [recording, setRecording]= useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [showBg, setShowBg]      = useState(true)
  const [msg, setMsg]            = useState('')
  const [trackStatus, setTrackStatus] = useState({ face: false, pose: false, hands: false })

  const sceneRef      = useRef(null)
  const cameraRef     = useRef(null)
  const rendererRef   = useRef(null)
  const vrmRef        = useRef(null)
  const clockRef      = useRef(null)
  const animRef       = useRef(null)
  const holisticRef   = useRef(null)
  const mpCamRef      = useRef(null)
  const streamRef     = useRef(null)
  const recorderRef   = useRef(null)
  const chunksRef     = useRef([])
  const timerRef      = useRef(null)
  const bgCtxRef      = useRef(null)
  // Ready Player Me
  const rpmBonesRef   = useRef(null)   // { boneName: THREE.Bone }
  const rpmMeshRef    = useRef(null)   // SkinnedMesh para morph targets
  const rpmSceneRef   = useRef(null)   // Group/Scene do avatar RPM
  const avatarTypeRef = useRef('vrm')  // 'vrm' | 'rpm'

  const [showRpm, setShowRpm]   = useState(false)

  // Mapeamento KalidoKit (VRM names) → Ready Player Me / Mixamo bone names
  const VRM_TO_RPM = {
    Hips: 'Hips', Spine: 'Spine', Chest: 'Spine1', UpperChest: 'Spine2',
    Neck: 'Neck', Head: 'Head',
    LeftUpperArm: 'LeftArm', LeftLowerArm: 'LeftForeArm', LeftHand: 'LeftHand',
    RightUpperArm: 'RightArm', RightLowerArm: 'RightForeArm', RightHand: 'RightHand',
    LeftUpperLeg: 'LeftUpLeg', LeftLowerLeg: 'LeftLeg', LeftFoot: 'LeftFoot',
    RightUpperLeg: 'RightUpLeg', RightLowerLeg: 'RightLeg', RightFoot: 'RightFoot',
  }
  const showBgRef   = useRef(true)

  useEffect(() => { showBgRef.current = showBg }, [showBg])

  // ── Carregar scripts CDN e iniciar Three.js ──
  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        for (const url of CDN) {
          setPhaseMsg(`Carregando ${url.split('/').slice(-2).join('/')}...`)
          await loadScript(url)
          if (cancelled) return
        }
        initThree()
        setPhase('idle')
        setPhaseMsg('Carregue um modelo .vrm para começar')
      } catch (e) {
        if (!cancelled) { setPhase('error'); setPhaseMsg('Erro: ' + e.message) }
      }
    }
    boot()
    return () => { cancelled = true; cleanup() }
  }, [])

  // ── Three.js: cena + câmera + renderer + loop ──
  function initThree() {
    const THREE = window.THREE
    const canvas = threeCanvasRef.current
    if (!canvas || !THREE) return

    const W = 640, H = 480
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 20)
    cam.position.set(0, 1.35, 3.2)
    cameraRef.current = cam

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = THREE.sRGBEncoding
    rendererRef.current = renderer

    // Iluminação
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const dir1 = new THREE.DirectionalLight(0xfff5e8, 0.9)
    dir1.position.set(1, 2, 3); scene.add(dir1)
    const dir2 = new THREE.DirectionalLight(0xe8f0ff, 0.4)
    dir2.position.set(-2, 1, -2); scene.add(dir2)

    clockRef.current = new THREE.Clock()

    function animate() {
      animRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      if (vrmRef.current) vrmRef.current.update(delta)
      renderer.render(scene, cam)
      // Desenhar webcam espelhada no canvas de fundo
      if (showBgRef.current && bgCtxRef.current && videoRef.current?.readyState >= 2) {
        const bc = bgCanvasRef.current
        bgCtxRef.current.save()
        bgCtxRef.current.translate(bc.width, 0)
        bgCtxRef.current.scale(-1, 1)
        bgCtxRef.current.drawImage(videoRef.current, 0, 0, bc.width, bc.height)
        bgCtxRef.current.restore()
      }
    }
    animate()
  }

  // ── Carregar VRM do arquivo ──
  const loadVRM = useCallback(async (url) => {
    const THREE = window.THREE
    const TVRM = window.THREE_VRM
    if (!THREE || !TVRM || !sceneRef.current) return
    // three-vrm v2: VRMLoaderPlugin em vez de VRM.from()
    const { VRMLoaderPlugin, VRMUtils } = TVRM

    setPhaseMsg('Carregando modelo VRM...')
    if (vrmRef.current) {
      sceneRef.current.remove(vrmRef.current.scene)
      VRMUtils.deepDispose(vrmRef.current.scene)
      vrmRef.current = null
      setVrmLoaded(false)
    }

    const loader = new THREE.GLTFLoader()
    loader.crossOrigin = 'anonymous'
    loader.register(parser => new VRMLoaderPlugin(parser))

    try {
      await new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
          const vrm = gltf.userData.vrm
          if (!vrm) { reject(new Error('Arquivo não é um VRM válido')); return }
          VRMUtils.removeUnnecessaryJoints(vrm.scene)
          vrm.scene.rotation.y = Math.PI
          sceneRef.current.add(vrm.scene)
          vrmRef.current = vrm
          setVrmLoaded(true)
          setPhaseMsg('Modelo pronto! Ligue a câmera.')
          resolve()
        }, undefined, reject)
      })
    } catch (e) {
      setMsg('Erro no VRM: ' + e.message)
      setTimeout(() => setMsg(''), 4000)
      setPhaseMsg('Erro ao carregar. Tente outro .vrm')
    }
  }, [])

  function handleVRMFile(e) {
    const f = e.target.files[0]
    if (!f) return
    loadVRM(URL.createObjectURL(f))
  }

  // ── Carregar avatar Ready Player Me (.glb) ──
  const loadRPMAvatar = useCallback(async (glbUrl) => {
    const THREE = window.THREE
    if (!THREE || !sceneRef.current) return

    // Remover VRM existente
    if (vrmRef.current) {
      sceneRef.current.remove(vrmRef.current.scene)
      window.THREE_VRM?.VRMUtils?.deepDispose(vrmRef.current.scene)
      vrmRef.current = null
    }
    // Remover RPM existente
    if (rpmSceneRef.current) {
      sceneRef.current.remove(rpmSceneRef.current)
      rpmSceneRef.current = null
    }
    rpmBonesRef.current = null
    rpmMeshRef.current  = null
    setVrmLoaded(false)
    setPhaseMsg('Carregando avatar Ready Player Me...')

    // Adicionar parâmetros: morph targets ARKit para expressões faciais
    const url = glbUrl.includes('?')
      ? glbUrl + '&morphTargets=ARKit,Oculus Visemes'
      : glbUrl + '?morphTargets=ARKit,Oculus Visemes&quality=high'

    const loader = new THREE.GLTFLoader()
    loader.crossOrigin = 'anonymous'
    try {
      await new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
          const root = gltf.scene

          // Mapear todos os ossos pelo nome
          const boneMap = {}
          root.traverse(obj => {
            if (obj.isBone || obj.type === 'Bone') boneMap[obj.name] = obj
          })
          rpmBonesRef.current = boneMap

          // Achar SkinnedMesh com morph targets (rosto)
          let faceMesh = null
          root.traverse(obj => {
            if (obj.isSkinnedMesh && obj.morphTargetDictionary && !faceMesh) faceMesh = obj
          })
          rpmMeshRef.current = faceMesh

          // Posicionar na cena
          root.rotation.y = Math.PI
          root.position.set(0, -0.9, 0)
          sceneRef.current.add(root)
          rpmSceneRef.current = root
          avatarTypeRef.current = 'rpm'

          setVrmLoaded(true)
          setPhaseMsg('Avatar pronto! Ligue a câmera.')
          setShowRpm(false)
          resolve()
        }, undefined, reject)
      })
    } catch (e) {
      setMsg('Erro ao carregar avatar: ' + e.message)
      setTimeout(() => setMsg(''), 5000)
      setPhaseMsg('Erro. Tente novamente.')
    }
  }, [])

  // ── Receber URL do Ready Player Me via postMessage ──
  useEffect(() => {
    function onRpmMessage(ev) {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
        if (data?.source === 'readyplayerme' && data?.eventName === 'v1.avatar.exported') {
          loadRPMAvatar(data.data.url)
        }
      } catch (_) {}
    }
    window.addEventListener('message', onRpmMessage)
    return () => window.removeEventListener('message', onRpmMessage)
  }, [loadRPMAvatar])

  // ── Câmera + MediaPipe Holistic ──
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }, audio: true,
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      video.setAttribute('playsinline', '')
      await video.play()

      const bc = bgCanvasRef.current
      bc.width = 640; bc.height = 480
      bgCtxRef.current = bc.getContext('2d')

      await initHolistic(video)
      setCameraOn(true)
    } catch (e) {
      setMsg('Câmera: ' + e.message)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  async function initHolistic(video) {
    const holistic = new window.Holistic({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${f}`,
    })
    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    holistic.onResults(onHolisticResults)
    await holistic.initialize()
    holisticRef.current = holistic

    const mpCam = new window.Camera(video, {
      onFrame: async () => {
        if (holisticRef.current) await holisticRef.current.send({ image: video })
      },
      width: 640, height: 480,
    })
    mpCam.start()
    mpCamRef.current = mpCam
  }

  // ── KalidoKit: landmarks → rotações VRM v2 / RPM ──
  function onHolisticResults(results) {
    const THREE = window.THREE
    const K     = window.KalidoKit
    if (!THREE || !K) return

    const isVrm = avatarTypeRef.current === 'vrm' && vrmRef.current
    const isRpm = avatarTypeRef.current === 'rpm' && rpmBonesRef.current
    if (!isVrm && !isRpm) return

    const hasFace = !!results.faceLandmarks
    const hasPose = !!results.poseLandmarks
    const hasLH   = !!results.leftHandLandmarks
    const hasRH   = !!results.rightHandLandmarks
    setTrackStatus({ face: hasFace, pose: hasPose, hands: hasLH || hasRH })

    // VRM helper
    const camel = s => s.charAt(0).toLowerCase() + s.slice(1)
    const rigRot = (boneName, rot, damp = 1, lerp = 0.25) => {
      if (!rot) return
      if (isVrm) {
        const bone = vrmRef.current.humanoid.getNormalizedBoneNode(camel(boneName))
        if (!bone) return
        bone.quaternion.slerp(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x * damp, rot.y * damp, rot.z * damp, 'XYZ')), lerp
        )
      } else {
        const rpmName = VRM_TO_RPM[boneName] || boneName
        const bone = rpmBonesRef.current[rpmName]
        if (!bone) return
        bone.quaternion.slerp(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x * damp, rot.y * damp, rot.z * damp, 'XYZ')), lerp
        )
      }
    }
    const rigPos = (boneName, pos, damp = 1, lerp = 0.1) => {
      if (!pos) return
      if (isVrm) {
        const bone = vrmRef.current.humanoid.getNormalizedBoneNode(camel(boneName))
        if (!bone) return
        bone.position.lerp(new THREE.Vector3(pos.x * damp, pos.y * damp, pos.z * damp), lerp)
      } else {
        const rpmName = VRM_TO_RPM[boneName] || boneName
        const bone = rpmBonesRef.current[rpmName]
        if (!bone) return
        bone.position.lerp(new THREE.Vector3(pos.x * damp, pos.y * damp, pos.z * damp), lerp)
      }
    }

    // ── ROSTO ──
    if (hasFace) {
      try {
        const fRig = K.Face.solve(results.faceLandmarks, { runtime: 'mediapipe', video: videoRef.current })
        if (fRig) {
          rigRot('Neck', fRig.head, 0.65, 0.3)
          rigRot('Head', fRig.head, 0.65, 0.3)

          if (isVrm) {
            const em = vrmRef.current.expressionManager
            if (em) {
              em.setValue('blinkLeft',  1 - (fRig.eye?.l ?? 1))
              em.setValue('blinkRight', 1 - (fRig.eye?.r ?? 1))
              em.setValue('aa', fRig.mouth?.shape?.A ?? 0)
              em.setValue('ee', fRig.mouth?.shape?.E ?? 0)
              em.setValue('ih', fRig.mouth?.shape?.I ?? 0)
              em.setValue('oh', fRig.mouth?.shape?.O ?? 0)
              em.setValue('ou', fRig.mouth?.shape?.U ?? 0)
            }
          } else if (rpmMeshRef.current?.morphTargetDictionary) {
            // RPM: morph targets ARKit
            const dict = rpmMeshRef.current.morphTargetDictionary
            const inf  = rpmMeshRef.current.morphTargetInfluences
            const setMorph = (name, val) => { if (dict[name] !== undefined) inf[dict[name]] = Math.max(0, Math.min(1, val)) }
            setMorph('eyeBlinkLeft',  1 - (fRig.eye?.l ?? 1))
            setMorph('eyeBlinkRight', 1 - (fRig.eye?.r ?? 1))
            setMorph('jawOpen',       fRig.mouth?.shape?.A ?? 0)
            setMorph('mouthSmileLeft',  fRig.mouth?.shape?.E ?? 0)
            setMorph('mouthSmileRight', fRig.mouth?.shape?.E ?? 0)
          }
        }
      } catch (_) {}
    }

    // ── POSE ──
    if (hasPose) {
      try {
        const poseWorld = results.poseWorldLandmarks || results.ea
        const pRig = K.Pose.solve(poseWorld, results.poseLandmarks, { runtime: 'mediapipe', video: videoRef.current })
        if (pRig) {
          rigRot('Hips', pRig.Hips?.rotation, 1, 0.1)
          rigPos('Hips', pRig.Hips?.position
            ? { x: pRig.Hips.position.x, y: pRig.Hips.position.y + 1, z: -pRig.Hips.position.z }
            : null, 1, 0.07)
          rigRot('Chest', pRig.Spine, 0.5, 0.25)
          rigRot('Spine', pRig.Spine, 0.3, 0.25)
          rigRot('RightUpperArm', pRig.RightUpperArm, 1, 0.3)
          rigRot('RightLowerArm', pRig.RightLowerArm, 1, 0.3)
          rigRot('LeftUpperArm',  pRig.LeftUpperArm,  1, 0.3)
          rigRot('LeftLowerArm',  pRig.LeftLowerArm,  1, 0.3)
          rigRot('RightUpperLeg', pRig.RightUpperLeg, 1, 0.3)
          rigRot('RightLowerLeg', pRig.RightLowerLeg, 1, 0.3)
          rigRot('LeftUpperLeg',  pRig.LeftUpperLeg,  1, 0.3)
          rigRot('LeftLowerLeg',  pRig.LeftLowerLeg,  1, 0.3)
        }
      } catch (_) {}
    }

    // ── MÃOS ──
    const applyHand = (landmarks, side) => {
      try {
        const hRig = K.Hand.solve(landmarks, side)
        if (!hRig) return
        Object.entries(hRig).forEach(([key, rot]) => { if (rot) rigRot(key, rot, 1, 0.3) })
      } catch (_) {}
    }
    if (hasRH) applyHand(results.rightHandLandmarks, 'Right')
    if (hasLH) applyHand(results.leftHandLandmarks,  'Left')
  }

  // ── Parar câmera / cleanup ──
  function cleanup() {
    mpCamRef.current?.stop()
    mpCamRef.current = null
    holisticRef.current?.close()
    holisticRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }
  function stopCamera() { cleanup(); setCameraOn(false) }

  // ── Gravação ──
  function startRec() {
    const canvas = threeCanvasRef.current
    if (!canvas) return
    const stream = canvas.captureStream(30)
    streamRef.current?.getAudioTracks().forEach(t => stream.addTrack(t))
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunksRef.current, { type: 'video/webm' }))
      Object.assign(document.createElement('a'), { href: url, download: `vtuber-${Date.now()}.webm` }).click()
      setMsg('✅ Vídeo salvo!')
      setTimeout(() => setMsg(''), 3000)
    }
    rec.start(1000); recorderRef.current = rec
    setRecording(true); setRecordTime(0)
    timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
  }
  function stopRec() {
    recorderRef.current?.state !== 'inactive' && recorderRef.current.stop()
    setRecording(false); clearInterval(timerRef.current)
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── UI ──
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Header */}
      <div style={{ background: 'rgba(15,15,35,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← Voltar</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#a78bfa,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🧬 VTuber Studio
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 5, padding: '2px 6px', marginLeft: 8, verticalAlign: 'middle' }}>BETA</span>
        </h1>
        <span style={{ flex: 1 }} />
        {recording && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            REC {fmt(recordTime)}
          </span>
        )}
      </div>

      {msg && <div style={{ textAlign: 'center', padding: 8, fontSize: 13, fontWeight: 600, background: msg.includes('rro') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: msg.includes('rro') ? '#fca5a5' : '#86efac' }}>{msg}</div>}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>

        {/* ─── Preview ─── */}
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          <div style={{ position: 'relative', background: '#050510', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '4/3' }}>
            {/* Webcam bg */}
            <canvas ref={bgCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: showBg && cameraOn ? 'block' : 'none', opacity: 0.35 }} />
            {/* Three.js canvas */}
            <canvas ref={threeCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {/* Status overlay quando câmera desligada */}
            {!cameraOn && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'rgba(5,5,16,0.8)' }}>
                <div style={{ fontSize: 56 }}>🧬</div>
                <div style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', maxWidth: 300, lineHeight: 1.7 }}>{phaseMsg}</div>
                {phase === 'loading' && (
                  <div style={{ width: 180, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#a78bfa,#38bdf8)', width: '60%', animation: 'pulse 1s infinite', borderRadius: 99 }} />
                  </div>
                )}
              </div>
            )}
            {/* Video oculto para MediaPipe */}
            <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {!cameraOn ? (
              <button onClick={startCamera} disabled={!vrmLoaded || phase !== 'idle'} style={{
                flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 15, cursor: vrmLoaded && phase === 'idle' ? 'pointer' : 'not-allowed',
                background: vrmLoaded && phase === 'idle' ? 'linear-gradient(135deg,#a78bfa,#6d28d9)' : '#1e293b',
                color: vrmLoaded && phase === 'idle' ? '#fff' : '#475569',
              }}>
                {phase === 'loading' ? '⏳ Carregando...' : vrmLoaded ? '📷 Ligar câmera' : 'Carregue um VRM primeiro'}
              </button>
            ) : (
              <button onClick={stopCamera} style={{ flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none', background: '#1e293b', color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                ⏹ Desligar câmera
              </button>
            )}

            {!recording ? (
              <button onClick={startRec} disabled={!cameraOn} style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: cameraOn ? '#dc2626' : '#1e293b', color: '#fff', cursor: cameraOn ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 15 }}>
                ⏺ Gravar
              </button>
            ) : (
              <button onClick={stopRec} style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: '#1e293b', color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                ⏹ Parar
              </button>
            )}

            <button onClick={() => setShowBg(b => !b)} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
              {showBg ? '🎥 Fundo on' : '⬛ Fundo off'}
            </button>
          </div>

          {/* Status tracking */}
          {cameraOn && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Rosto', ok: trackStatus.face, icon: '😊' },
                { label: 'Corpo', ok: trackStatus.pose, icon: '🧍' },
                { label: 'Mãos', ok: trackStatus.hands, icon: '🤚' },
              ].map(({ label, ok, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${ok ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#22c55e' : '#475569' }} />
                  {icon} {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Sidebar ─── */}
        <div style={{ flex: '0 0 270px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar section */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>🧍 Modelo 3D</h3>

            {/* Botão principal: Criar com IA */}
            <button onClick={() => setShowRpm(true)} style={{
              display: 'block', width: '100%', padding: '13px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              background: 'linear-gradient(135deg,rgba(167,139,250,0.18),rgba(56,189,248,0.12))',
              border: '1px solid rgba(167,139,250,0.4)', color: '#c4b5fd', fontSize: 14, fontWeight: 700, marginBottom: 10,
            }}>
              ✨ Criar avatar com IA
              <div style={{ fontSize: 10, fontWeight: 400, color: '#7c6faf', marginTop: 2 }}>foto → avatar 3D (Ready Player Me)</div>
            </button>

            {/* Separador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: '#334155', fontSize: 11 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              ou carregue um arquivo
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <label style={{
              display: 'block', padding: '10px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              background: vrmLoaded ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px dashed ${vrmLoaded ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: vrmLoaded ? '#86efac' : '#64748b', fontSize: 12, fontWeight: 600,
            }}>
              {vrmLoaded ? `✅ ${avatarTypeRef.current === 'rpm' ? 'RPM' : 'VRM'} carregado — trocar` : '📂 .vrm ou .glb'}
              <input type="file" accept=".vrm,.glb" onChange={handleVRMFile} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: 11, color: '#475569', margin: '8px 0 0', lineHeight: 1.5 }}>
              Avatares anime: <a href="https://hub.vroid.com" target="_blank" rel="noopener noreferrer" style={{ color: '#7c6faf' }}>hub.vroid.com</a>
            </p>
          </div>

          {/* Como usar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>Como funciona</h3>
            {[
              { n: '1', t: 'Acesse hub.vroid.com e baixe um avatar gratuito (.vrm)' },
              { n: '2', t: 'Carregue o arquivo .vrm acima' },
              { n: '3', t: 'Ligue a câmera — rosto, corpo e mãos animam em tempo real' },
              { n: '4', t: 'Grave e use o vídeo onde quiser' },
            ].map(({ n, t }) => (
              <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{n}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* O que é rastreado */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>O que é rastreado</h3>
            {[
              { icon: '😊', label: '468 landmarks faciais — olhos, boca, sobrancelhas' },
              { icon: '🧍', label: '33 landmarks de pose — tronco, braços, pernas' },
              { icon: '🤚', label: '42 landmarks de mãos — todos os dedos' },
            ].map(({ icon, label }) => (
              <div key={icon} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Modal Ready Player Me ── */}
      {showRpm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#e2e8f0' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>✨ Criar avatar com IA</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Tire uma selfie ou escolha um estilo</span>
            <button onClick={() => setShowRpm(false)} style={{
              marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>✕ Fechar</button>
          </div>
          <iframe
            src="https://demo.readyplayer.me/avatar?frameApi&clearCache"
            allow="camera *; microphone *"
            style={{ width: '90vw', maxWidth: 900, height: '75vh', borderRadius: 16, border: 'none' }}
            title="Ready Player Me"
          />
          <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', maxWidth: 500 }}>
            Crie seu avatar e clique em <strong style={{ color: '#a78bfa' }}>Done</strong> — ele será carregado automaticamente.
            Para avatares personalizados use{' '}
            <a href="https://readyplayer.me" target="_blank" rel="noopener noreferrer" style={{ color: '#7c6faf' }}>readyplayer.me</a>.
          </p>
        </div>
      )}
    </div>
  )
}
