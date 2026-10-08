import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { download } from '../exportDraft'
import { usePhone } from '../layout'
import { type ClothTextures, coat, hat, type Mockup, skirt, sweater } from '../three/mockups'
import { clearGroup } from '../three/yarnMesh'
import { type KnitChart, rowsOf, widthOf } from './chart'
import { drawFabric } from './render'

export type Garment = 'sweater' | 'hat' | 'coat' | 'skirt'
const GARMENTS: [Garment, string][] = [
  ['sweater', 'A sweater'],
  ['hat', 'A hat'],
  ['coat', 'A coat'],
  ['skirt', 'A skirt'],
]

/**
 * One repeat of the knitted fabric as textures: the knitted preview's picture of the stitches for colour, and its
 * lightness for depth (the Vs and bumps stand out, the gaps between sink).
 */
function knitTextures(k: KnitChart): ClothTextures {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const stitchW = Math.max(8, Math.min(32, Math.floor(1024 / widthOf(k))))
  if (ctx) drawFabric(ctx, k, stitchW, 1, 1)
  const bump = document.createElement('canvas')
  bump.width = canvas.width
  bump.height = canvas.height
  const bctx = bump.getContext('2d')
  if (ctx && bctx) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 0.3 * img.data[i] + 0.59 * img.data[i + 1] + 0.11 * img.data[i + 2]
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    }
    bctx.putImageData(img, 0, 0)
  }
  const texture = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c)
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  return { color: texture(canvas, true), bump: texture(bump, false) }
}

interface Props {
  open: boolean
  name: string
  chart: KnitChart
  onClose: () => void
}

/**
 * The knitted fabric made up in 3D, on a sweater, hat, coat or skirt, at its real size from the gauge (with a
 * slider to enlarge the pattern). Drag to turn it, scroll or pinch to zoom.
 */
export default function Knit3DDialog({ open, name, chart, onClose }: Props) {
  const theme = useTheme()
  const phone = usePhone()
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [garment, setGarment] = useState<Garment>('sweater')
  const [scale, setScale] = useState(1)
  const scene = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    group: THREE.Group
    key: THREE.DirectionalLight
    render: () => void
  } | null>(null)
  const [ready, setReady] = useState(0)
  const frame = useRef<Mockup | null>(null)

  useEffect(() => {
    if (!open || !box) return
    let renderer: THREE.WebGLRenderer
    try {
      // A see-through canvas: the dialog's background shows behind the garment.
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true })
      renderer.setClearColor(0x000000, 0)
    } catch {
      setFailed('The 3D preview needs WebGL, which this browser or device has turned off.')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', '3D preview of the knitting')
    box.appendChild(renderer.domElement)
    const s3 = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    s3.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    s3.environmentIntensity = 0.45
    pmrem.dispose()
    s3.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.4))
    const key = new THREE.DirectionalLight(0xffffff, 1.7)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.02
    s3.add(key, key.target)
    const group = new THREE.Group()
    s3.add(group)
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000)
    const render = () => renderer.render(s3, camera)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.addEventListener('change', render)
    scene.current = { renderer, scene: s3, camera, controls, group, key, render }
    setReady((n) => n + 1)
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = box
      if (!w || !h) return
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
      clearGroup(group)
      renderer.dispose()
      renderer.domElement.remove()
      scene.current = null
    }
  }, [open, box])

  // Make up the knitting into the garment, at the chart's real size from the gauge.
  useEffect(() => {
    const s = scene.current
    if (!s || !ready) return
    clearGroup(s.group)
    const textures = knitTextures(chart)
    const tile = {
      width: ((widthOf(chart) * 10) / chart.gauge.stitches) * scale,
      height: ((rowsOf(chart) * 10) / chart.gauge.rows) * scale,
    }
    const made =
      garment === 'coat'
        ? coat(textures, tile)
        : garment === 'skirt'
          ? skirt(textures, tile)
          : garment === 'hat'
            ? hat(textures, tile, chart.colors[chart.colors.length > 1 ? 1 : 0])
            : sweater(textures, tile)
    textures.color.dispose()
    textures.bump.dispose()
    s.group.add(made.group)
    s.key.position.copy(made.target).add(new THREE.Vector3(-made.shadowReach, made.shadowReach * 1.6, made.shadowReach))
    const cam = s.key.shadow.camera
    Object.assign(cam, {
      left: -made.shadowReach,
      right: made.shadowReach,
      top: made.shadowReach,
      bottom: -made.shadowReach,
      near: 0.1,
      far: made.shadowReach * 6,
    })
    cam.updateProjectionMatrix()
    s.key.target.position.copy(made.target)
    s.key.target.updateMatrixWorld()
    frame.current = made
    s.camera.position.copy(made.camera)
    s.controls.target.copy(made.target)
    s.controls.update()
    s.render()
  }, [ready, garment, chart, scale])

  const background = theme.vars?.palette.background.default ?? theme.palette.background.default

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} maxWidth="lg" fullWidth aria-labelledby="knit-3d-title">
      <AppBar position="static">
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap', py: 1 }}>
          <IconButton edge="start" aria-label="Close 3D preview" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography id="knit-3d-title" variant="h2" sx={{ fontSize: 19, flex: 1, minWidth: 0 }} noWrap>
            3D preview: {name}
          </Typography>
          <TextField
            select
            size="small"
            label="Made up as"
            value={garment}
            onChange={(e) => setGarment(e.target.value as Garment)}
            sx={{ width: 150 }}
          >
            {GARMENTS.map(([v, label]) => (
              <MenuItem key={v} value={v}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            color="inherit"
            startIcon={<RestartAltIcon />}
            onClick={() => {
              const s = scene.current
              const made = frame.current
              if (!s || !made) return
              s.camera.position.copy(made.camera)
              s.controls.target.copy(made.target)
              s.controls.update()
              s.render()
            }}
          >
            Reset view
          </Button>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            disabled={failed !== null}
            onClick={() =>
              scene.current?.renderer.domElement.toBlob(
                (b) => b && download(`${name || 'Knitting'} ${garment}.png`, b, 'image/png'),
              )
            }
          >
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
          data-testid="knit-3d"
          data-garment={garment}
          sx={{
            height: phone ? 'calc(100dvh - 190px)' : '68vh',
            position: 'relative',
            touchAction: 'none',
            bgcolor: background,
          }}
        />
      )}
      <Stack direction="row" sx={{ gap: 3, px: 3, py: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, maxWidth: 360, minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" id="knit-scale-label">
            Pattern size: {scale === 1 ? 'real size (from the gauge)' : `${scale}× real size`}
          </Typography>
          <Slider
            size="small"
            min={1}
            max={6}
            value={scale}
            onChange={(_, v) => setScale(v as number)}
            aria-labelledby="knit-scale-label"
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Drag to turn, scroll or pinch to zoom.
        </Typography>
      </Stack>
    </Dialog>
  )
}
