import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { clothView } from '../layers'
import { MOCKUP_SIZES } from '../mockups'
import type { Draft } from '../weave'

export interface ClothTextures {
  color: THREE.CanvasTexture
  bump: THREE.CanvasTexture
}

/**
 * One repeat of the cloth's face as textures: each square drawn as a short length of thread, lighter along its
 * middle and darker at its edges, warp running up and weft across. A matching height map gives it depth.
 */
export function clothTextures(d: Draft): ClothTextures {
  const face = clothView(d, 'face')
  const cell = Math.max(4, Math.min(16, Math.floor(2048 / Math.max(d.ends, d.picks))))
  const [w, h] = [d.ends * cell, d.picks * cell]
  const make = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    return canvas
  }
  const colorCanvas = make()
  const bumpCanvas = make()
  const cctx = colorCanvas.getContext('2d')
  const bctx = bumpCanvas.getContext('2d')
  if (cctx && bctx) {
    const colors = cctx.createImageData(w, h)
    const bumps = bctx.createImageData(w, h)
    const rgb = new Map<string, number[]>()
    const parse = (hex: string) => {
      let v = rgb.get(hex)
      if (!v) {
        v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
        rgb.set(hex, v)
      }
      return v
    }
    for (let p = 0; p < d.picks; p++)
      for (let e = 0; e < d.ends; e++) {
        const sq = face[p][e]
        const [r, g, b] = parse(sq.color)
        for (let y = 0; y < cell; y++)
          for (let x = 0; x < cell; x++) {
            // Across the thread (0–1): round in the middle, dark in the gaps between threads.
            const across = (sq.warp ? x : y) / (cell - 1)
            const along = (sq.warp ? y : x) / (cell - 1)
            const round = Math.sin(Math.PI * across)
            const height = round * (0.85 + 0.15 * Math.sin(Math.PI * along))
            const shade = 0.55 + 0.45 * height
            const i = ((p * cell + y) * w + e * cell + x) * 4
            colors.data[i] = r * shade
            colors.data[i + 1] = g * shade
            colors.data[i + 2] = b * shade
            colors.data[i + 3] = 255
            const v = 255 * height
            bumps.data[i] = v
            bumps.data[i + 1] = v
            bumps.data[i + 2] = v
            bumps.data[i + 3] = 255
          }
      }
    cctx.putImageData(colors, 0, 0)
    bctx.putImageData(bumps, 0, 0)
  }
  const texture = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(canvas)
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  return { color: texture(colorCanvas, true), bump: texture(bumpCanvas, false) }
}

/** A fabric material showing the cloth at its real scale on a surface `width` × `height` cm. */
function fabric(tex: ClothTextures, tile: { width: number; height: number }, width: number, height: number) {
  const repeat = (t: THREE.Texture) => {
    const c = t.clone()
    c.repeat.set(width / tile.width, height / tile.height)
    c.userData.owned = true
    c.needsUpdate = true
    return c
  }
  return new THREE.MeshStandardMaterial({
    map: repeat(tex.color),
    bumpMap: repeat(tex.bump),
    bumpScale: 1.2,
    roughness: 0.92,
    metalness: 0,
  })
}

const wood = (color = 0x6d4c33) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 })

const shadowed = <T extends THREE.Object3D>(o: T) => {
  o.traverse((c) => {
    c.castShadow = true
    c.receiveShadow = true
  })
  return o
}

export interface Mockup {
  group: THREE.Group
  /** Where to put the camera and what to look at, in cm. */
  camera: THREE.Vector3
  target: THREE.Vector3
  /** Half the size of the area the key light's shadows must cover. */
  shadowReach: number
}

/** A box with rounded edges, upholstered in the cloth. */
function upholstered(tex: ClothTextures, tile: { width: number; height: number }, w: number, h: number, d: number) {
  // The front and top faces matter most; size the pattern to the larger of their sides.
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 4, Math.min(6, h / 3, d / 3)),
    fabric(tex, tile, w, Math.max(h, d)),
  )
  return mesh
}

/** A three-seat sofa upholstered in the cloth, on a floor. */
export function sofa(tex: ClothTextures, tile: { width: number; height: number }): Mockup {
  const g = new THREE.Group()
  const { width: cw, depth: cd } = MOCKUP_SIZES.sofaCushion
  const seatH = 42
  const base = upholstered(tex, tile, 3 * cw + 8, 24, cd + 10)
  base.position.set(0, 12 + 10, 0)
  g.add(base)
  for (let i = -1; i <= 1; i++) {
    const seat = upholstered(tex, tile, cw - 2, 18, cd)
    seat.position.set(i * cw, seatH - 4 + 9, 4)
    g.add(seat)
    const backCushion = upholstered(tex, tile, cw - 2, 48, 18)
    backCushion.position.set(i * cw, seatH + 5 + 24, -cd / 2 + 6)
    backCushion.rotation.x = -0.12
    g.add(backCushion)
  }
  const back = upholstered(tex, tile, 3 * cw + 8, 62, 16)
  back.position.set(0, 10 + 31, -cd / 2 - 6)
  g.add(back)
  for (const side of [-1, 1]) {
    const arm = upholstered(tex, tile, 20, 58, cd + 26)
    arm.position.set(side * ((3 * cw) / 2 + 14), 10 + 29, 0)
    g.add(arm)
  }
  for (const [x, z] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.6, 10, 12), wood())
    leg.position.set(x * ((3 * cw) / 2 + 14), 5, z * (cd / 2 + 6))
    g.add(leg)
  }
  g.add(floor(0xd8cfc4, 600))
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(140, 150, 260),
    target: new THREE.Vector3(0, 45, 0),
    shadowReach: 220,
  }
}

/** A plain floor, catching shadows. */
function floor(color: number, size: number) {
  const f = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }),
  )
  f.rotation.x = -Math.PI / 2
  f.receiveShadow = true
  return f
}

/** A rug in the cloth, with fringe in the warp colours at both ends, on a wooden floor. */
export function rug(tex: ClothTextures, tile: { width: number; height: number }, warpColors: string[]): Mockup {
  const g = new THREE.Group()
  const { width, length } = MOCKUP_SIZES.rug
  // Ends lie across the width, so the warp runs the length of the rug and finishes in fringe at each end.
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 1, length), [
    wood(0x8a7360),
    wood(0x8a7360),
    fabric(tex, tile, width, length),
    wood(0x8a7360),
    wood(0x8a7360),
    wood(0x8a7360),
  ])
  top.position.y = 0.5
  g.add(top)
  const fringeMaterials = new Map<string, THREE.Material>()
  const strands = Math.floor(width / 2)
  for (const end of [-1, 1])
    for (let i = 0; i < strands; i++) {
      const color = warpColors[i % warpColors.length]
      let m = fringeMaterials.get(color)
      if (!m) {
        m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
        fringeMaterials.set(color, m)
      }
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 5), m)
      strand.rotation.x = Math.PI / 2
      strand.rotation.z = (i % 3) * 0.06 - 0.06
      strand.position.set(-width / 2 + 1 + i * 2, 0.4, end * (length / 2 + 4.5))
      g.add(strand)
    }
  const boards = floor(0x9c7b5c, 700)
  g.add(boards)
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(70, 190, 210),
    target: new THREE.Vector3(0, 0, 0),
    shadowReach: 200,
  }
}

/** A tapestry hanging from a wooden rod against a wall, in gentle folds. */
export function tapestry(tex: ClothTextures, tile: { width: number; height: number }): Mockup {
  const g = new THREE.Group()
  const { width, height } = MOCKUP_SIZES.tapestry
  const top = 170
  const cloth = new THREE.PlaneGeometry(width, height, 48, 64)
  const pos = cloth.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const [x, y] = [pos.getX(i), pos.getY(i)]
    // Soft vertical folds, deeper towards the bottom, where it hangs free of the rod.
    const free = (height / 2 - y) / height
    pos.setZ(i, 4 + 1.6 * Math.sin((x / width) * Math.PI * 5) * (0.3 + free))
  }
  cloth.computeVertexNormals()
  const hanging = new THREE.Mesh(cloth, fabric(tex, tile, width, height))
  ;(hanging.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
  hanging.position.set(0, top - height / 2, 0)
  g.add(hanging)
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, width + 24, 16), wood())
  rod.rotation.z = Math.PI / 2
  rod.position.set(0, top + 1, 6)
  g.add(rod)
  for (const side of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), wood())
    knob.position.set(side * (width / 2 + 13), top + 1, 6)
    g.add(knob)
  }
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 320),
    new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.95 }),
  )
  wall.position.set(0, 120, -1)
  wall.receiveShadow = true
  g.add(wall)
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(60, 110, 250),
    target: new THREE.Vector3(0, 100, 0),
    shadowReach: 160,
  }
}
