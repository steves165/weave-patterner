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

/**
 * A fabric material whose texture coordinates are in cm (rather than 0–1 across the surface), for shapes built
 * here: one repeat of the cloth every `tile` cm, whatever the shape's size.
 */
function fabricCm(tex: ClothTextures, tile: { width: number; height: number }) {
  const m = fabric(tex, tile, 1, 1)
  for (const t of [m.map, m.bumpMap]) t?.repeat.set(1 / tile.width, 1 / tile.height)
  m.side = THREE.DoubleSide
  return m
}

/** One ring of a garment's shape: its height and half-width and half-depth in cm, and how deep its folds are. */
export interface Ring {
  y: number
  rx: number
  rz: number
  /** Depth in cm of the folds around the ring (for a skirt's fullness), 0 for smooth. */
  fold?: number
}

/**
 * A tube through `rings` (top to bottom), smoothly joined: an elliptical cross-section at each height, rippled into
 * `folds` folds. It's made of `panels` panels, as a garment is cut, with the first seam at the centre back.
 * Texture coordinates are in cm, across each panel from its centre line and down it, so the warp runs straight down
 * the middle of every panel and the pattern meets itself at the seams as a sewn garment's does.
 */
export function garmentGeometry(rings: Ring[], folds = 0, panels = 1, around = 96, perSpan = 10): THREE.BufferGeometry {
  // Rings between the given ones, eased so the outline curves rather than bending at each ring.
  const rows: Ring[] = []
  for (let i = 0; i < rings.length - 1; i++)
    for (let k = 0; k < perSpan; k++) {
      const t = k / perSpan
      const e = (1 - Math.cos(Math.PI * t)) / 2
      const [a, b] = [rings[i], rings[i + 1]]
      rows.push({
        y: a.y + (b.y - a.y) * t,
        rx: a.rx + (b.rx - a.rx) * e,
        rz: a.rz + (b.rz - a.rz) * e,
        fold: (a.fold ?? 0) + ((b.fold ?? 0) - (a.fold ?? 0)) * t,
      })
    }
  rows.push(rings[rings.length - 1])
  // Each row's points all the way round, from the centre back, and how far down the garment each row is.
  const points = rows.map((r) =>
    Array.from({ length: around + 1 }, (_, j) => {
      const a = Math.PI + (j / around) * Math.PI * 2
      const ripple = (r.fold ?? 0) * Math.sin(a * folds)
      return [Math.sin(a) * (r.rx + ripple), r.y, Math.cos(a) * (r.rz + ripple)]
    }),
  )
  const downs = [0]
  for (let i = 1; i < rows.length; i++) {
    const [p, q] = [points[i - 1][around / 2], points[i][around / 2]]
    downs.push(downs[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]))
  }
  const positions: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  const per = around / panels
  for (let k = 0; k < panels; k++) {
    const [start, centre] = [k * per, k * per + per / 2]
    const base = positions.length / 3
    rows.forEach((_, i) => {
      // Distance round the row from the panel's centre line, either way.
      const arc = [0]
      for (let j = start + 1; j <= start + per; j++) {
        const [p, q] = [points[i][j - 1], points[i][j]]
        arc.push(arc[arc.length - 1] + Math.hypot(q[0] - p[0], q[2] - p[2]))
      }
      for (let j = start; j <= start + per; j++) {
        positions.push(...points[i][j])
        uvs.push(arc[j - start] - arc[centre - start], -downs[i])
      }
    })
    const w = per + 1
    for (let i = 0; i < rows.length - 1; i++)
      for (let j = 0; j < per; j++) {
        const [a, b, c, d] = [
          base + i * w + j,
          base + i * w + j + 1,
          base + (i + 1) * w + j,
          base + (i + 1) * w + j + 1,
        ]
        index.push(a, c, b, b, c, d)
      }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

const formMaterial = () => new THREE.MeshStandardMaterial({ color: 0xe9e1d6, roughness: 0.75, metalness: 0 })

/** A dress form: a padded torso from the neck to the hips, on a wooden stand and base. */
function dressForm(neckTop: number) {
  const g = new THREE.Group()
  const torso = new THREE.Mesh(
    garmentGeometry([
      { y: neckTop, rx: 5.2, rz: 5 },
      { y: neckTop - 6, rx: 6, rz: 5.6 },
      { y: neckTop - 12, rx: 17, rz: 10 },
      { y: neckTop - 30, rx: 16, rz: 11.5 },
      { y: neckTop - 50, rx: 13, rz: 9.5 },
      { y: neckTop - 72, rx: 17, rz: 12 },
      { y: neckTop - 80, rx: 15, rz: 11 },
    ]),
    formMaterial(),
  )
  g.add(torso)
  const cap = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24), wood())
  cap.rotation.x = -Math.PI / 2
  cap.position.y = neckTop
  g.add(cap)
  const bottom = neckTop - 80
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, bottom - 4, 12), wood())
  pole.position.y = (bottom - 4) / 2 + 4
  g.add(pole)
  for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 34), wood())
    leg.position.set(Math.sin(angle) * 15, 2, Math.cos(angle) * 15)
    leg.rotation.y = angle
    g.add(leg)
  }
  return g
}

/** Stretches a shape's 0–1 texture coordinates to cm: `across` cm round it and `along` cm down it. */
function uvInCm<T extends THREE.BufferGeometry>(g: T, across: number, along: number): T {
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * across, uv.getY(i) * along)
  return g
}

/** A tapered tube from `from` to `to` (a sleeve), radius `r1` at the top and `r2` at the cuff. */
function sleeve(material: THREE.Material, from: THREE.Vector3, to: THREE.Vector3, r1: number, r2: number) {
  const length = from.distanceTo(to)
  const geometry = new THREE.CylinderGeometry(r2, r1, length, 32, 12, true)
  // Texture coordinates in cm: round the sleeve, and down it.
  const uv = geometry.attributes.uv
  const pos = geometry.attributes.position
  for (let i = 0; i < uv.count; i++) {
    const r = r2 + (r1 - r2) * (pos.getY(i) / length + 0.5)
    uv.setXY(i, uv.getX(i) * 2 * Math.PI * r, pos.getY(i))
  }
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(from).add(to).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize())
  return mesh
}

/** A knee-length coat in the cloth, with sleeves, a collar and buttons, on a dress form. */
export function coat(tex: ClothTextures, tile: { width: number; height: number }): Mockup {
  const g = new THREE.Group()
  const neck = 152
  g.add(dressForm(neck))
  const cloth = fabricCm(tex, tile)
  // The coat stands a little proud of the form, easing out over the hips to a flared hem.
  const body = new THREE.Mesh(
    garmentGeometry(
      [
        { y: neck - 5, rx: 7.5, rz: 7 },
        { y: neck - 11, rx: 19, rz: 11.5 },
        { y: neck - 30, rx: 18.5, rz: 13 },
        { y: neck - 50, rx: 16, rz: 12 },
        { y: neck - 72, rx: 19.5, rz: 14 },
        { y: neck - 95, rx: 22, rz: 16, fold: 0.4 },
        { y: neck - 112, rx: 24, rz: 17.5, fold: 0.8 },
      ],
      6,
    ),
    cloth,
  )
  g.add(body)
  for (const side of [-1, 1]) {
    const top = new THREE.Vector3(side * 17.5, neck - 14, 0)
    const cuff = new THREE.Vector3(side * 24.5, neck - 72, 5)
    g.add(sleeve(cloth, top, cuff, 7.4, 6))
    // Round the top of the sleeve into the shoulder, and turn back a cuff.
    const shoulder = new THREE.Mesh(
      uvInCm(new THREE.SphereGeometry(7.4, 32, 16), 2 * Math.PI * 7.4, Math.PI * 7.4),
      cloth,
    )
    shoulder.position.copy(top)
    g.add(shoulder)
    const turnBack = new THREE.Mesh(
      uvInCm(new THREE.TorusGeometry(6.2, 1.1, 10, 32), 2 * Math.PI * 6.2, 2 * Math.PI * 1.1),
      cloth,
    )
    turnBack.position.copy(cuff)
    turnBack.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), top.clone().sub(cuff).normalize())
    g.add(turnBack)
  }
  const collar = new THREE.Mesh(
    uvInCm(new THREE.TorusGeometry(8.2, 2.4, 12, 40), 2 * Math.PI * 8.2, 2 * Math.PI * 2.4),
    cloth,
  )
  collar.rotation.x = Math.PI / 2 - 0.25
  collar.position.set(0, neck - 4, -0.5)
  collar.scale.set(1, 0.85, 1)
  g.add(collar)
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x2b211c, roughness: 0.35 })
  for (let i = 0; i < 5; i++) {
    const y = neck - 26 - i * 14
    // On the surface of the coat's front at that height.
    const button = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.8, 20), buttonMaterial)
    button.rotation.x = Math.PI / 2
    const front = i < 2 ? 13.3 : i < 3 ? 12.4 : 13.8 + (i - 3) * 0.9
    button.position.set(0, y, front + 0.4)
    g.add(button)
  }
  g.add(floor(0xd8cfc4, 600))
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(85, 125, 230),
    target: new THREE.Vector3(0, 95, 0),
    shadowReach: 120,
  }
}

/** A full, knee-length skirt in the cloth, gathered into a waistband, on a dress form. */
export function skirt(tex: ClothTextures, tile: { width: number; height: number }): Mockup {
  const g = new THREE.Group()
  const neck = 152
  g.add(dressForm(neck))
  const cloth = fabricCm(tex, tile)
  const waist = neck - 50
  // Fitted at the waist, easing over the hips, then flaring into soft folds that deepen towards the hem.
  const body = new THREE.Mesh(
    garmentGeometry(
      [
        { y: waist, rx: 13.8, rz: 10.3, fold: 0 },
        { y: waist - 14, rx: 18, rz: 13, fold: 0.5 },
        { y: waist - 24, rx: 21, rz: 16, fold: 1.4 },
        { y: waist - 45, rx: 27, rz: 22, fold: 2.6 },
        { y: waist - 62, rx: 31, rz: 26, fold: 3.4 },
      ],
      11,
    ),
    cloth,
  )
  g.add(body)
  const band = new THREE.Mesh(
    garmentGeometry([
      { y: waist + 4, rx: 14, rz: 10.5 },
      { y: waist, rx: 14.2, rz: 10.7 },
    ]),
    cloth,
  )
  g.add(band)
  g.add(floor(0xd8cfc4, 600))
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(80, 110, 210),
    target: new THREE.Vector3(0, 80, 0),
    shadowReach: 110,
  }
}

/** A crew-neck sweater in the cloth, with long sleeves and ribbed hems, on a dress form. */
export function sweater(tex: ClothTextures, tile: { width: number; height: number }): Mockup {
  const g = new THREE.Group()
  const neck = 152
  g.add(dressForm(neck))
  const cloth = fabricCm(tex, tile)
  // Easy fitting, to the hips, gathered a little into the hem band.
  g.add(
    new THREE.Mesh(
      garmentGeometry(
        [
          { y: neck - 4, rx: 7.2, rz: 6.8 },
          { y: neck - 9, rx: 14, rz: 10 },
          { y: neck - 15, rx: 19.5, rz: 12.5 },
          { y: neck - 32, rx: 19, rz: 13.5, fold: 0.2 },
          { y: neck - 55, rx: 18.4, rz: 13.4, fold: 0.5 },
          { y: neck - 68, rx: 18.6, rz: 13.6, fold: 0.4 },
        ],
        8,
        4,
      ),
      cloth,
    ),
  )
  const hem = new THREE.Mesh(
    garmentGeometry([
      { y: neck - 68, rx: 18.4, rz: 13.4 },
      { y: neck - 76, rx: 17.8, rz: 13 },
    ]),
    cloth,
  )
  g.add(hem)
  for (const side of [-1, 1]) {
    const top = new THREE.Vector3(side * 17.5, neck - 14, 0)
    const cuff = new THREE.Vector3(side * 23.5, neck - 78, 4)
    g.add(sleeve(cloth, top, cuff, 7.6, 5.4))
    const shoulder = new THREE.Mesh(
      uvInCm(new THREE.SphereGeometry(7.6, 32, 16), 2 * Math.PI * 7.6, Math.PI * 7.6),
      cloth,
    )
    shoulder.position.copy(top)
    g.add(shoulder)
    const band = new THREE.Mesh(
      uvInCm(new THREE.CylinderGeometry(5.1, 5.3, 6, 32, 1, true), 2 * Math.PI * 5.2, 6),
      cloth,
    )
    band.position.copy(cuff).add(new THREE.Vector3(side * 0.2, 2.5, 0.2))
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(cuff).normalize())
    g.add(band)
  }
  // A crew neck: a rolled band round the neck.
  const collar = new THREE.Mesh(
    uvInCm(new THREE.TorusGeometry(7.4, 1.5, 12, 40), 2 * Math.PI * 7.4, 2 * Math.PI * 1.5),
    cloth,
  )
  collar.rotation.x = Math.PI / 2
  collar.position.set(0, neck - 3.5, 0)
  collar.scale.set(1, 0.92, 1)
  g.add(collar)
  g.add(floor(0xd8cfc4, 600))
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(80, 120, 220),
    target: new THREE.Vector3(0, 110, 0),
    shadowReach: 110,
  }
}

/** A beanie in the cloth, with a folded brim and a pompom, on a head form. */
export function hat(tex: ClothTextures, tile: { width: number; height: number }, pompom: string): Mockup {
  const g = new THREE.Group()
  const top = 60
  // The head form: a head and neck on a stand.
  const head = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), formMaterial())
  head.scale.set(1, 1.18, 1.08)
  head.position.y = top - 11
  g.add(head)
  const neckForm = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.4, 12, 32), formMaterial())
  neckForm.position.y = top - 25
  g.add(neckForm)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, top - 31, 12), wood())
  pole.position.y = (top - 31) / 2
  g.add(pole)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 2.4, 32), wood())
  base.position.y = 1.2
  g.add(base)
  const cloth = fabricCm(tex, tile)
  // The crown, gathered to the top, easing over the head to the brim.
  g.add(
    new THREE.Mesh(
      garmentGeometry(
        [
          { y: top + 1.6, rx: 0.6, rz: 0.6 },
          { y: top + 0.8, rx: 4.6, rz: 4.9, fold: 0.3 },
          { y: top - 3, rx: 8.6, rz: 9.3, fold: 0.2 },
          { y: top - 9, rx: 9.5, rz: 10.3 },
          { y: top - 13, rx: 9.4, rz: 10.2 },
        ],
        6,
        6,
      ),
      cloth,
    ),
  )
  const brim = new THREE.Mesh(
    garmentGeometry([
      { y: top - 9.5, rx: 9.9, rz: 10.7 },
      { y: top - 15, rx: 9.8, rz: 10.6 },
    ]),
    cloth,
  )
  g.add(brim)
  const pom = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.6, 3),
    new THREE.MeshStandardMaterial({ color: pompom, roughness: 1, flatShading: true }),
  )
  pom.position.y = top + 4.4
  g.add(pom)
  g.add(floor(0xd8cfc4, 300))
  return {
    group: shadowed(g),
    camera: new THREE.Vector3(30, 66, 62),
    target: new THREE.Vector3(0, 52, 0),
    shadowReach: 40,
  }
}
