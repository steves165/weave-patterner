import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import FlipIcon from '@mui/icons-material/Flip'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import StopIcon from '@mui/icons-material/Stop'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Dialog,
  FormControlLabel,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { track } from '../analytics'
import { download, fileBase } from '../exportDraft'
import { isMockup, tileSize, VIEWS_3D, type View3D } from '../mockups'
import { type ClothShape, fabricModel, shedFor } from '../sim3d'
import { clothTextures, rug, sofa, tapestry } from '../three/mockups'
import { clearGroup, yarnGeometry, yarnMaterial } from '../three/yarnMesh'
import { computeDrawdown, type Draft } from '../weave'
import { clothLook, loadDensity } from '../yarnGeometry'
import type { Yarn } from '../yarns'

interface Props {
  open: boolean
  /** Pattern name, or null if it hasn't been saved. */
  name: string | null
  draft: Draft
  /** The yarn library: a thread's colour picks its yarn, whose grist sets its thickness. */
  yarns: Yarn[]
  onClose: () => void
}

/** Most threads shown each way: more makes the preview slow on phones. */
export const MAX_SHOWN = 80
const DEFAULT_SHOWN = 32
/** How long each pick takes in the weaving animation: the shed opens, the shuttle crosses, the pick settles. */
const PICK_MS = 450

interface Scene {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  /** The threads, and what the cloth is shown on. */
  cloth: THREE.Group
  mockup: THREE.Group
  /** The shed and shuttle during the weaving animation. */
  loom: THREE.Group
  /** Catches the cloth's shadow behind the flat thread view. */
  catcher: THREE.Mesh
  key: THREE.DirectionalLight
  render: () => void
}

/** Points the key light's shadows at an area `reach` across, centred on `target`. */
function aimShadows(s: Scene, target: THREE.Vector3, reach: number) {
  const cam = s.key.shadow.camera
  cam.left = -reach
  cam.right = reach
  cam.top = reach
  cam.bottom = -reach
  cam.near = 0.1
  cam.far = reach * 6
  cam.updateProjectionMatrix()
  s.key.target.position.copy(target)
  s.key.target.updateMatrixWorld()
}

/** Puts the camera above the face (or behind the back), tilted a little, far enough back to see `size` threads. */
function placeCamera(s: Scene, size: number, back: boolean) {
  const distance = size * 1.25 + 4
  s.camera.position.set(0, -distance * 0.45, (back ? -1 : 1) * distance)
  s.camera.up.set(0, 1, 0)
  s.controls.target.set(0, 0, 0)
  s.controls.update()
  s.render()
}

/**
 * A 3D preview of the cloth: each thread is a tube following its path over and under the others (and, for double
 * cloth, between the layers). Drag to turn it, scroll or pinch to zoom, right-drag or two fingers to pan.
 */
export default function Fabric3DDialog({ open, name, draft, yarns, onClose }: Props) {
  const theme = useTheme()
  // A callback ref: the dialog attaches its contents after this component first renders.
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [scene3d, setScene3d] = useState<Scene | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const largest = Math.min(MAX_SHOWN, Math.max(draft.ends, draft.picks))
  const [shown, setShown] = useState(Math.min(DEFAULT_SHOWN, largest))
  const [thickness, setThickness] = useState(80)
  const [back, setBack] = useState(false)
  const [view, setView] = useState<View3D>('flat')
  // Where the camera starts for the made-up view, for Reset view.
  // Made-up views show the cloth at its real size; this enlarges the pattern to see it better.
  const [patternScale, setPatternScale] = useState(1)
  const mockupFrame = useRef<{ camera: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const mockupView = isMockup(view)
  // The thread view's shape (flat for made-up things, which use their own geometry).
  const shape: ClothShape = mockupView ? 'flat' : (view as ClothShape)
  // Weaving animation: how many picks are woven so far (null when not animating: all of them).
  const [woven, setWoven] = useState<number | null>(null)
  // Real yarn sizes and spacing, from the yarn library and the warp calculator's sett.
  const [realSizes, setRealSizes] = useState(true)
  const density = useMemo(() => (open ? loadDensity() : null), [open])
  const look = useMemo(
    () => (realSizes && density ? clothLook(draft, yarns, density) : undefined),
    [realSizes, density, draft, yarns],
  )
  const model = useMemo(() => fabricModel(draft, shown, shown, undefined, look), [draft, shown, look])
  // Frame the whole cloth, which is taller than it is wide when picks are further apart than ends.
  const frame = shown * Math.max(1, look?.pickSpacing ?? 1)
  // The flat cloth's half width and height, for shaping it.
  const halfW = model.ends / 2 + 0.5
  const halfH = ((model.picks + 1) * (look?.pickSpacing ?? 1)) / 2
  const background = theme.palette.background.default

  // Set up WebGL once the dialog has mounted its box; tear it all down on close.
  useEffect(() => {
    if (!open || !box) return
    let renderer: THREE.WebGLRenderer
    try {
      // preserveDrawingBuffer lets "Save image" read the picture back.
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    } catch {
      setFailed('The 3D preview needs WebGL, which this browser or device has turned off.')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    box.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', '3D preview of the cloth')
    renderer.domElement.setAttribute('role', 'img')

    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.shadowMap.enabled = true
    // The weaving animation cuts the cloth off at the fell.
    renderer.localClippingEnabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    // Soft light from all round, as in a room, so threads read as round and colours stay true.
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.45
    pmrem.dispose()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.4))
    // A key light from the upper left casting soft shadows, and a fill from behind for the back.
    const key = new THREE.DirectionalLight(0xffffff, 1.7)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.02
    scene.add(key, key.target)
    const fill = new THREE.DirectionalLight(0xffffff, 0.7)
    fill.position.set(0.5, -0.4, -1)
    scene.add(fill)
    const cloth = new THREE.Group()
    const mockup = new THREE.Group()
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.22 }))
    catcher.receiveShadow = true
    const loom = new THREE.Group()
    scene.add(cloth, mockup, catcher, loom)

    const render = () => renderer.render(scene, camera)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.addEventListener('change', render)
    const s: Scene = { renderer, scene, camera, controls, cloth, mockup, loom, catcher, key, render }
    setScene3d(s)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = box
      if (w === 0 || h === 0) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()
    return () => {
      observer.disconnect()
      controls.dispose()
      clearGroup(cloth)
      clearGroup(mockup)
      clearGroup(loom)
      catcher.geometry.dispose()
      ;(catcher.material as THREE.Material).dispose()
      scene.environment?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      setScene3d(null)
    }
  }, [open, box])

  // Rebuild the threads whenever the draft, area, thickness or shape changes.
  useEffect(() => {
    const s = scene3d
    if (!s) return
    clearGroup(s.cloth)
    s.cloth.visible = !mockupView
    s.catcher.visible = !mockupView && shape === 'flat'
    s.scene.background = new THREE.Color(background)
    if (mockupView) return
    const materials = new Map<string, THREE.Material>()
    const options = { thickness: thickness / 100, shape, halfW, halfH }
    for (const path of model.paths) {
      const mesh = new THREE.Mesh(yarnGeometry(path, options), yarnMaterial(materials, path.color, path.texture))
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { kind: path.kind, index: path.index }
      s.cloth.add(mesh)
    }
    // The shadow catcher lies just behind the cloth; from the back it faces away and isn't drawn.
    s.catcher.scale.set(halfW * 4, halfH * 4, 1)
    s.catcher.position.set(0, 0, -2.5)
    s.key.position.set(-halfW * 0.8, halfH * 1.2, Math.max(halfW, halfH) * 2)
    aimShadows(s, new THREE.Vector3(0, 0, 0), Math.max(halfW, halfH) * 1.3)
    s.render()
  }, [scene3d, model, thickness, background, shape, halfW, halfH, mockupView])

  // Make up the cloth into a sofa, rug or tapestry, at its real scale.
  useEffect(() => {
    const s = scene3d
    if (!s) return
    clearGroup(s.mockup)
    if (!mockupView || !density) return
    const textures = clothTextures(draft)
    const real = tileSize(draft, density)
    const tile = { width: real.width * patternScale, height: real.height * patternScale }
    const made =
      view === 'sofa'
        ? sofa(textures, tile)
        : view === 'rug'
          ? rug(textures, tile, draft.warpColors)
          : tapestry(textures, tile)
    textures.color.dispose()
    textures.bump.dispose()
    s.mockup.add(made.group)
    s.key.position.copy(made.target).add(new THREE.Vector3(-made.shadowReach, made.shadowReach * 1.6, made.shadowReach))
    aimShadows(s, made.target, made.shadowReach)
    mockupFrame.current = { camera: made.camera, target: made.target }
    s.camera.position.copy(made.camera)
    s.controls.target.copy(made.target)
    s.controls.update()
    s.render()
  }, [scene3d, mockupView, view, draft, density, patternScale])

  // While weaving, show only the picks woven so far.
  const weftOrder = useMemo(() => model.paths.filter((p) => p.kind === 'weft').map((p) => p.index), [model])
  useEffect(() => {
    if (!scene3d) return
    for (const child of scene3d.cloth.children) {
      const { kind, index } = child.userData as { kind: string; index: number }
      child.visible = kind !== 'weft' || woven === null || weftOrder.indexOf(index) < woven
    }
    scene3d.render()
  }, [scene3d, woven, weftOrder])
  // Each pick: the shed opens, the shuttle crosses it, then the pick joins the cloth. Flat cloth only; for a shaped
  // one the picks just appear in turn.
  const drawdown = useMemo(() => computeDrawdown(draft), [draft])
  useEffect(() => {
    const s = scene3d
    if (woven === null || !s) return
    if (woven >= weftOrder.length) {
      const done = setTimeout(() => setWoven(null), 600)
      return () => clearTimeout(done)
    }
    if (shape !== 'flat') {
      const next = setTimeout(() => setWoven(woven + 1), PICK_MS / 3)
      return () => clearTimeout(next)
    }
    const shed = shedFor(model, drawdown, weftOrder[woven], woven, 0)
    // Hide the cloth below the fell: only what's woven shows, with the open warp beyond it.
    const fell = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(shed.fellY - 0.6))
    // Shadows ignore the cut-off, so the shadow behind would show the whole cloth: hide it while weaving.
    s.catcher.visible = false
    s.cloth.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined
      if (m) m.clippingPlanes = [fell]
    })
    // The warp behind the fell as thin threads in their own colours, and a wooden shuttle.
    const materials = new Map<string, THREE.Material>()
    const ends = shed.lines.map((l) => {
      let m = materials.get(l.color)
      if (!m) {
        m = new THREE.MeshStandardMaterial({ color: l.color, roughness: 0.8 })
        materials.set(l.color, m)
      }
      // A unit-long thread along +y from its base, stretched and pointed each frame.
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 6).translate(0, 0.5, 0), m)
      s.loom.add(thread)
      return thread
    })
    const shuttle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 4, 4, 10).rotateZ(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x8d6e4b, roughness: 0.5 }),
    )
    shuttle.castShadow = true
    s.loom.add(shuttle)
    const start = performance.now()
    let frame = 0
    const up = new THREE.Vector3(0, 1, 0)
    const dir = new THREE.Vector3()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / PICK_MS)
      // Open over the first fifth, cross in the middle, close over the last fifth.
      const opening = Math.max(0, Math.min(1, t / 0.2, (1 - t) / 0.2))
      const current = shedFor(model, drawdown, weftOrder[woven], woven, opening)
      current.lines.forEach((l, i) => {
        dir.set(l.to[0] - l.from[0], l.to[1] - l.from[1], l.to[2] - l.from[2])
        const length = dir.length()
        ends[i].position.set(...l.from)
        ends[i].quaternion.setFromUnitVectors(up, dir.normalize())
        ends[i].scale.set(1, length, 1)
      })
      const across = Math.min(1, Math.max(0, (t - 0.15) / 0.7))
      const { fromX, toX, y, z } = current.shuttle
      shuttle.position.set(fromX + (toX - fromX) * across, y, z)
      s.render()
      if (t < 1) frame = requestAnimationFrame(step)
      else setWoven(woven + 1)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      clearGroup(s.loom)
      s.cloth.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined
        if (m) m.clippingPlanes = null
      })
      s.catcher.visible = true
      s.render()
    }
  }, [scene3d, woven, weftOrder, shape, model, drawdown])

  // Frame the cloth when it opens, when the area changes, and when it's turned over.
  useEffect(() => {
    if (scene3d && !mockupView) placeCamera(scene3d, frame, back)
  }, [scene3d, frame, back, mockupView])

  const saveImage = () =>
    scene3d?.renderer.domElement.toBlob(
      (blob) => blob && download(`${fileBase(name)}-3d.png`, blob, 'image/png'),
      'image/png',
    )

  return (
    <Dialog fullScreen open={open} onClose={onClose} aria-labelledby="fabric-3d-title">
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <IconButton edge="start" aria-label="Close 3D preview" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography id="fabric-3d-title" variant="h6" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
            3D preview: {name ?? 'Unsaved pattern'}
          </Typography>
          <Button
            startIcon={woven === null ? <PlayArrowIcon /> : <StopIcon />}
            onClick={() => setWoven(woven === null ? 0 : null)}
            disabled={failed !== null || mockupView}
          >
            {woven === null ? 'Weave it' : 'Stop'}
          </Button>
          <TextField
            select
            size="small"
            label="Show as"
            value={view}
            onChange={(e) => {
              setWoven(null)
              setView(e.target.value as View3D)
              track('view_3d', { view: e.target.value })
            }}
            sx={{ width: 160 }}
          >
            {VIEWS_3D.map((v) => (
              <MenuItem key={v.value} value={v.value}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>
          <Button startIcon={<FlipIcon />} onClick={() => setBack(!back)} aria-pressed={back} disabled={mockupView}>
            {back ? 'Show face' : 'Show back'}
          </Button>
          <Button
            startIcon={<RestartAltIcon />}
            onClick={() => {
              const made = mockupFrame.current
              if (!scene3d) return
              if (mockupView && made) {
                scene3d.camera.position.copy(made.camera)
                scene3d.controls.target.copy(made.target)
                scene3d.controls.update()
                scene3d.render()
              } else placeCamera(scene3d, frame, back)
            }}
          >
            Reset view
          </Button>
          <Button startIcon={<DownloadIcon />} onClick={saveImage} disabled={failed !== null}>
            Save image
          </Button>
        </Toolbar>
      </AppBar>
      {failed ? (
        <Alert severity="warning" sx={{ m: 2 }}>
          {failed}
        </Alert>
      ) : (
        <Box
          ref={setBox}
          data-testid="fabric-3d"
          data-woven={woven ?? model.picks}
          data-shape={view}
          data-ends={model.ends}
          data-picks={model.picks}
          data-threads={model.paths.length}
          data-side={back ? 'back' : 'face'}
          sx={{ flexGrow: 1, minHeight: 0, position: 'relative', touchAction: 'none', bgcolor: background }}
        />
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: { xs: 0, sm: 4 }, px: 3, py: 1, borderTop: 1, borderColor: 'divider', alignItems: { sm: 'center' } }}
      >
        {mockupView ? (
          <Box sx={{ flex: 1, maxWidth: 360 }}>
            <Typography variant="caption" color="text.secondary" id="scale-label">
              Pattern size: {patternScale === 1 ? 'real size' : `${patternScale}× real size`}
            </Typography>
            <Slider
              size="small"
              min={1}
              max={10}
              value={patternScale}
              onChange={(_, v) => setPatternScale(v as number)}
              aria-labelledby="scale-label"
            />
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, maxWidth: 360 }}>
              <Typography variant="caption" color="text.secondary" id="shown-label">
                Threads shown: {model.ends} ends × {model.picks} picks
              </Typography>
              <Slider
                size="small"
                min={Math.min(4, largest)}
                max={largest}
                value={shown}
                onChange={(_, v) => setShown(v as number)}
                aria-labelledby="shown-label"
              />
            </Box>
            <Box sx={{ flex: 1, maxWidth: 360 }}>
              <Typography variant="caption" color="text.secondary" id="thickness-label">
                Thread thickness: {thickness}%
              </Typography>
              <Slider
                size="small"
                min={40}
                max={100}
                value={thickness}
                onChange={(_, v) => setThickness(v as number)}
                aria-labelledby="thickness-label"
              />
            </Box>
          </>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FormControlLabel
            control={<Switch checked={realSizes} onChange={(e) => setRealSizes(e.target.checked)} />}
            label="Yarns and sett"
          />
          {look && density && (
            <Typography variant="caption" color="text.secondary" component="p" data-testid="look-info">
              {density.sett} ends and {density.ppi} picks per {density.units === 'metric' ? 'cm' : 'inch'} (from the
              warp calculator).{' '}
              {look.fromYarns
                ? 'Thread sizes and textures from your yarn library.'
                : 'Add a grist to yarns in the yarn library to size threads, and a texture to shape them.'}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {model.layered && !mockupView ? 'Double cloth: the lower layer is drawn behind the upper. ' : ''}Drag to turn,
          scroll or pinch to zoom.
        </Typography>
      </Stack>
    </Dialog>
  )
}
