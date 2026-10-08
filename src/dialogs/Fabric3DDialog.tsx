import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import FlipIcon from '@mui/icons-material/Flip'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Dialog,
  FormControlLabel,
  IconButton,
  Slider,
  Stack,
  Switch,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { download, fileBase } from '../exportDraft'
import { fabricModel } from '../sim3d'
import { TEXTURES, type Texture, thickness as yarnThickness } from '../textures'
import type { Draft } from '../weave'
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

/** Points along each thread's tube per crossing, and sides round it. */
const SEGMENTS_PER_CROSSING = 4
const RADIAL_SEGMENTS = 6

interface Scene {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  cloth: THREE.Group
  render: () => void
}

/** Twist stripes as a texture: lighter and darker diagonals, as the plies of a yarn catch the light. Cached. */
const twistMaps = new Map<number, THREE.CanvasTexture>()
function twistMap(strength: number) {
  const cached = twistMaps.get(strength)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (ctx) {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        // Diagonal bands: u runs along the yarn and v round it.
        const band = 0.5 + 0.5 * Math.sin(((x + y) / 32) * Math.PI * 4)
        const light = Math.round(255 * (1 - strength * 0.45 * band))
        ctx.fillStyle = `rgb(${light},${light},${light})`
        ctx.fillRect(x, y, 1, 1)
      }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  twistMaps.set(strength, texture)
  return texture
}

/**
 * Gives a tube its yarn's character: bumps and thick-and-thin stretches pushed out along the normals, and texture
 * coordinates scaled so the twist stripes repeat about three times per thread spacing whatever its length. The tube's
 * own smooth normals are kept: the bumps are small, and recomputed normals would show a seam along each thread.
 */
function shapeYarn(geometry: THREE.TubeGeometry, texture: Texture, seed: number, radius: number, length: number) {
  const pos = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = geometry.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const along = uv.getX(i) * length
    const grow = radius * (yarnThickness(texture, seed, along, uv.getY(i)) - 1)
    if (grow !== 0)
      pos.setXYZ(
        i,
        pos.getX(i) + normal.getX(i) * grow,
        pos.getY(i) + normal.getY(i) * grow,
        pos.getZ(i) + normal.getZ(i) * grow,
      )
    uv.setX(i, along * 3)
  }
  pos.needsUpdate = true
  uv.needsUpdate = true
}

/** Removes the threads and frees their GPU memory (materials are shared between threads of one colour). */
function clearCloth(cloth: THREE.Group) {
  const materials = new Set<THREE.Material>()
  for (const child of [...cloth.children]) {
    const mesh = child as THREE.Mesh
    mesh.geometry.dispose()
    materials.add(mesh.material as THREE.Material)
    cloth.remove(mesh)
  }
  for (const m of materials) m.dispose()
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

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4))
    // Lights from above the face and behind the back, so both sides read when turned over.
    const key = new THREE.DirectionalLight(0xffffff, 1.8)
    key.position.set(-0.6, 0.8, 1)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.9)
    fill.position.set(0.5, -0.4, -1)
    scene.add(fill)
    const cloth = new THREE.Group()
    scene.add(cloth)

    const render = () => renderer.render(scene, camera)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.addEventListener('change', render)
    const s: Scene = { renderer, scene, camera, controls, cloth, render }
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
      clearCloth(cloth)
      renderer.dispose()
      renderer.domElement.remove()
      setScene3d(null)
    }
  }, [open, box])

  // Rebuild the threads whenever the draft, area or thickness changes.
  useEffect(() => {
    const s = scene3d
    if (!s) return
    clearCloth(s.cloth)
    const materials = new Map<string, THREE.MeshPhysicalMaterial>()
    for (const path of model.paths) {
      const curve = new THREE.CatmullRomCurve3(
        path.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        'centripetal',
      )
      const radius = path.radius * (thickness / 100)
      const geometry = new THREE.TubeGeometry(
        curve,
        path.points.length * SEGMENTS_PER_CROSSING,
        radius,
        RADIAL_SEGMENTS,
        false,
      )
      shapeYarn(
        geometry,
        path.texture,
        path.kind === 'warp' ? path.index : 10_000 + path.index,
        radius,
        curve.getLength(),
      )
      const key = `${path.color}|${path.texture}`
      let material = materials.get(key)
      if (!material) {
        const spec = TEXTURES[path.texture]
        material = new THREE.MeshPhysicalMaterial({
          color: path.color,
          roughness: spec.roughness,
          metalness: 0,
          sheen: spec.sheen,
          sheenRoughness: 0.4,
          sheenColor: new THREE.Color(0xffffff),
          map: twistMap(spec.twist),
        })
        materials.set(key, material)
      }
      s.cloth.add(new THREE.Mesh(geometry, material))
    }
    s.scene.background = new THREE.Color(background)
    s.render()
  }, [scene3d, model, thickness, background])

  // Frame the cloth when it opens, when the area changes, and when it's turned over.
  useEffect(() => {
    if (scene3d) placeCamera(scene3d, frame, back)
  }, [scene3d, frame, back])

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
          <Button startIcon={<FlipIcon />} onClick={() => setBack(!back)} aria-pressed={back}>
            {back ? 'Show face' : 'Show back'}
          </Button>
          <Button startIcon={<RestartAltIcon />} onClick={() => scene3d && placeCamera(scene3d, frame, back)}>
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
          {model.layered ? 'Double cloth: the lower layer is drawn behind the upper. ' : ''}Drag to turn, scroll or
          pinch to zoom.
        </Typography>
      </Stack>
    </Dialog>
  )
}
