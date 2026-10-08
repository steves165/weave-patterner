import * as THREE from 'three'
import { type ClothShape, shapePoint, type ThreadPath } from '../sim3d'
import { TEXTURES, type Texture, thickness as yarnThickness } from '../textures'

/** Points along each thread's tube per crossing, and sides round it. */
const SEGMENTS_PER_CROSSING = 5
const RADIAL_SEGMENTS = 8
/**
 * Yarns squash where they cross: the cross-section is an ellipse, flatter through the cloth and wider in its plane,
 * with about the same area as the round yarn.
 */
const FLATTEN = 0.8
const WIDEN = 1.15
/** How dark a thread gets where it tucks under another (1 = not at all). */
const TUCKED_SHADE = 0.55

/** Twist stripes as a texture: lighter and darker diagonals, as the plies of a yarn catch the light. Cached. */
const twistMaps = new Map<number, THREE.CanvasTexture>()
function twistMap(strength: number) {
  const cached = twistMaps.get(strength)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (ctx)
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        // Diagonal bands: u runs along the yarn and v round it.
        const band = 0.5 + 0.5 * Math.sin(((x + y) / 32) * Math.PI * 4)
        const light = Math.round(255 * (1 - strength * 0.45 * band))
        ctx.fillStyle = `rgb(${light},${light},${light})`
        ctx.fillRect(x, y, 1, 1)
      }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  twistMaps.set(strength, texture)
  return texture
}

let fibreMap: THREE.CanvasTexture | null = null
/**
 * A normal map of fine fibres lying along the yarn: bumps that change slowly along it and quickly round it, so
 * light catches streaks as on real spun yarn. Shared by every thread.
 */
function fibreNormalMap() {
  if (fibreMap) return fibreMap
  const size = 64
  const height: number[][] = []
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  // Fibres: each row (round the yarn) gets its own slowly varying height along the yarn.
  for (let y = 0; y < size; y++) {
    const phase = rand() * Math.PI * 2
    const freq = 1 + Math.floor(rand() * 3)
    const depth = 0.4 + rand() * 0.6
    height.push(
      Array.from({ length: size }, (_, x) => depth * (0.5 + 0.5 * Math.sin((x / size) * Math.PI * 2 * freq + phase))),
    )
  }
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(size, size)
    const at = (x: number, y: number) => height[(y + size) % size][(x + size) % size]
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * 1.5
        const dy = (at(x, y + 1) - at(x, y - 1)) * 1.5
        const len = Math.hypot(dx, dy, 1)
        const i = (y * size + x) * 4
        img.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255)
        img.data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255)
        img.data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255)
        img.data[i + 3] = 255
      }
    ctx.putImageData(img, 0, 0)
  }
  fibreMap = new THREE.CanvasTexture(canvas)
  fibreMap.wrapS = THREE.RepeatWrapping
  fibreMap.wrapT = THREE.RepeatWrapping
  return fibreMap
}

/** One material per colour and texture, shared by the threads that use it. */
export function yarnMaterial(cache: Map<string, THREE.Material>, color: string, texture: Texture) {
  const key = `${color}|${texture}`
  const cached = cache.get(key)
  if (cached) return cached
  const spec = TEXTURES[texture]
  const common = {
    color,
    roughness: spec.roughness,
    metalness: 0,
    map: twistMap(spec.twist),
    normalMap: fibreNormalMap(),
    normalScale: new THREE.Vector2(0.6, 0.6),
    vertexColors: true,
  }
  // Sheen (the soft glow off silk and wool fibres) needs the costlier physical material; other yarns don't.
  const material =
    spec.sheen > 0
      ? new THREE.MeshPhysicalMaterial({
          ...common,
          sheen: spec.sheen,
          sheenRoughness: 0.5,
          sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
        })
      : new THREE.MeshStandardMaterial(common)
  cache.set(key, material)
  return material
}

export interface YarnOptions {
  /** Thickness setting, 0–1, applied to the thread's own radius. */
  thickness: number
  shape: ClothShape
  /** The flat cloth's half width and height, for shaping. */
  halfW: number
  halfH: number
}

/**
 * The tube for one thread: following its path, squashed into an ellipse, with its yarn's bumps and thick-and-thin
 * stretches, shaded darker where it dips under other threads, and bent into the chosen shape.
 */
export function yarnGeometry(path: ThreadPath, o: YarnOptions): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(
    path.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
  )
  const radius = path.radius * o.thickness
  const tubular = path.points.length * SEGMENTS_PER_CROSSING
  const geometry = new THREE.TubeGeometry(curve, tubular, radius, RADIAL_SEGMENTS, false)
  const pos = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = geometry.attributes.uv
  const length = curve.getLength()
  const seed = path.kind === 'warp' ? path.index : 10_000 + path.index
  const zs = path.points.map((p) => p[2])
  const [zMin, zMax] = [Math.min(...zs), Math.max(...zs)]
  const colors = new Float32Array(pos.count * 3)
  const out = new THREE.Vector3(0, 0, 1)
  const centre = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const up = new THREE.Vector3()
  const side = new THREE.Vector3()
  const d = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let ring = 0; ring <= tubular; ring++) {
    const u = ring / tubular
    curve.getPointAt(u, centre)
    curve.getTangentAt(u, tangent)
    // "up" is out of the cloth, square to the thread; "side" is across it, in the cloth.
    up.copy(out).addScaledVector(tangent, -out.dot(tangent)).normalize()
    side.crossVectors(tangent, up).normalize()
    const shade = zMax > zMin ? TUCKED_SHADE + (1 - TUCKED_SHADE) * ((centre.z - zMin) / (zMax - zMin)) : 1
    for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
      const i = ring * (RADIAL_SEGMENTS + 1) + j
      d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(centre)
      n.set(normal.getX(i), normal.getY(i), normal.getZ(i))
      // The yarn's own bumps, then the squash into an ellipse.
      const grow = yarnThickness(path.texture, seed, u * length, uv.getY(i))
      d.multiplyScalar(grow)
      const [a, b] = [d.dot(up) * FLATTEN, d.dot(side) * WIDEN]
      const [na, nb] = [n.dot(up) / FLATTEN, n.dot(side) / WIDEN]
      d.copy(up).multiplyScalar(a).addScaledVector(side, b).add(centre)
      n.copy(up).multiplyScalar(na).addScaledVector(side, nb).normalize()
      pos.setXYZ(i, d.x, d.y, d.z)
      normal.setXYZ(i, n.x, n.y, n.z)
      uv.setX(i, u * length * 3)
      colors.set([shade, shade, shade], i * 3)
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  if (o.shape !== 'flat') {
    for (let i = 0; i < pos.count; i++) {
      const [x, y, z] = shapePoint(o.shape, [pos.getX(i), pos.getY(i), pos.getZ(i)], o.halfW, o.halfH)
      pos.setXYZ(i, x, y, z)
    }
    geometry.computeVertexNormals()
  }
  pos.needsUpdate = true
  normal.needsUpdate = true
  uv.needsUpdate = true
  return geometry
}

/** Removes everything in a group and frees its GPU memory (shared materials and textures are freed once). */
export function clearGroup(group: THREE.Group) {
  const materials = new Set<THREE.Material>()
  group.traverse((child) => {
    // Meshes and lines both own a geometry and material.
    const mesh = child as THREE.Mesh
    if (mesh.isMesh || (child as THREE.Line).isLine) {
      mesh.geometry.dispose()
      for (const m of [mesh.material].flat()) materials.add(m)
    }
  })
  group.clear()
  for (const m of materials) {
    // Per-mockup texture clones are owned by their material; the shared yarn maps are cached and kept.
    const { map, bumpMap } = m as THREE.MeshStandardMaterial
    for (const t of [map, bumpMap]) if (t?.userData.owned) t.dispose()
    m.dispose()
  }
}
