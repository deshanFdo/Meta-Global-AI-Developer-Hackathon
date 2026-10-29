# Multi-Turn Architectural & Spatial Computing Consultation with Meta Muse Spark 1.3

**Date:** 2026-10-29T13:49:32.554Z
**Model:** `muse-spark-1.3`

## 💬 Question 1

We are building BlueprintTo3D for the Meta Global AI Developer Hackathon.
Our user wants AR/VR to be a real, fully functional experience rather than a placeholder.
Specifically:
1. How should we implement WebXR in Three.js for both:
   a) Immersive VR (for Meta Quest 2/3/Pro and PC VR headsets with controllers and teleportation)
   b) Immersive AR (for WebXR AR devices, mobile WebXR, with real-world hit testing, ground placement, and 1:1 vs 1:20 tabletop scale toggle)
2. What is the best pattern to handle cross-device compatibility:
   - Native WebXR when navigator.xr is supported and session is granted
   - WebXR VR button and WebXR AR button in Three.js
   - Fallback to Apple AR Quick Look (.usdz) for iOS and Android Scene Viewer (<model-viewer> or intent URL)
Provide concrete implementation details and Three.js / WebXR code.

## 🏛️ Meta Muse Spark Response 1

For `BlueprintTo3D` you need 3 runtimes, 1 scene graph. Don't branch your app - branch your **session**.

Production architecture:

```
[Blueprint GLB - meters, y=0 floor, centered at 0,0]
       |
[XRRig (Group) -> Camera] + [buildingGroup (scaled)]
       |
 +-- inline (desktop 3D) -> OrbitControls
 +-- immersive-vr -> controllers + teleport + stick move
 +-- immersive-ar -> hit-test + reticle + anchors + 1:1 / 1:20 toggle
 +-- fallback -> <model-viewer> / QuickLook / SceneViewer
```

### 0. Shared Core - Do this once, correctly

All Blueprint models **must** be normalized: meters, Y-up, floor at `y=0`, centered.

```js
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
// Quest perf: fixed foveation
if(renderer.xr.setFoveation) renderer.xr.setFoveation(1.0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.05, 500);

// CRITICAL: Never move camera directly in XR. Move rig.
const xrRig = new THREE.Group();
xrRig.add(camera);
xrRig.position.set(0, 0, 4); // desktop start 4m back
scene.add(xrRig);

// Your generated building - all XR modes manipulate THIS
const buildingGroup = new THREE.Group();
scene.add(buildingGroup);

// Floor for VR teleport + AR shadow catcher
const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
const vrFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(100,100),
  new THREE.MeshStandardMaterial({ color:0x111418, roughness:1 }) // visible in VR
);
vrFloor.rotation.x = -Math.PI/2;
vrFloor.receiveShadow = true;
scene.add(vrFloor);

const arShadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(30,30),
  floorMat
);
arShadowPlane.rotation.x = -Math.PI/2;
arShadowPlane.visible = false; // only in AR
scene.add(arShadowPlane);

// Lights: 1 dir + hemi + estimated light for AR
scene.add(new THREE.HemisphereLight(0xffffff, 0x334, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(5,10,3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024); // Quest: never >2048
scene.add(sun);
```

Normalize any Blueprint output on load:

```js
function normalizeBuilding(object3D){
  const box = new THREE.Box3().setFromObject(object3D);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  // center XZ, floor to y=0
  object3D.position.x -= center.x;
  object3D.position.z -= center.z;
  object3D.position.y -= box.min.y;
  return { size, maxDim: Math.max(size.x, size.y, size.z) };
}
```

### 1a. Immersive VR - Quest 2/3/Pro + PCVR

Session: `local-floor` gives you real standing height. No extra calibration.

```js
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

function initVR(){
  // Controllers 0=right, 1=left
  const controllers = [];
  const factory = new XRControllerModelFactory();
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);

  for(let i=0;i<2;i++){
    const c = renderer.xr.getController(i);
    c.add(new THREE.Line(rayGeo, new THREE.LineBasicMaterial({color:0x00ffcc})));
    xrRig.add(c);

    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    xrRig.add(grip);

    controllers.push(c);
  }

  const right = controllers[0], left = controllers[1];

  // --- Teleport marker ---
  const teleportMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.3, 32),
    new THREE.MeshBasicMaterial({ color:0x00ffcc, side:THREE.DoubleSide })
  );
  teleportMarker.rotation.x = -Math.PI/2;
  teleportMarker.visible = false;
  scene.add(teleportMarker);

  const raycaster = new THREE.Raycaster();
  const tempMat = new THREE.Matrix4();

  function rayTeleport(sourceController){
    tempMat.identity().extractRotation(sourceController.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(sourceController.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);
    const hits = raycaster.intersectObjects([vrFloor, buildingGroup], true);
    // only allow teleport to floor y~0
    const floorHit = hits.find(h => Math.abs(h.point.y) < 0.2 || h.object === vrFloor);
    return floorHit;
  }

  // Right trigger = teleport aim, release = jump
  let teleportTarget = null;
  right.addEventListener('selectstart', ()=>{
    const hit = rayTeleport(right);
    if(hit){ teleportTarget = hit.point; teleportMarker.position.copy(hit.point).y += 0.01; teleportMarker.visible = true; }
  });
  right.addEventListener('selectend', ()=>{
    if(teleportTarget){
      // move rig, preserve headset height from local-floor
      xrRig.position.x += teleportTarget.x - camera.getWorldPosition(new THREE.Vector3()).x;
      xrRig.position.z += teleportTarget.z - camera.getWorldPosition(new THREE.Vector3()).z;
    }
    teleportTarget = null;
    teleportMarker.visible = false;
  });

  // Left stick = smooth locomotion + snap turn in animation loop
  let thumbX=0, thumbY=0;
  left.addEventListener('connected', (e)=>{
    const gamepad = e.data.gamepad;
    // poll in loop via inputSource.gamepad
    left.userData.gamepad = gamepad;
  });

  renderer.setAnimationLoop((t, frame)=>{
    // stick move relative to headset yaw
    const gp = left.userData.gamepad;
    if(gp && frame){
      const ax = gp.axes[2] ?? gp.axes[0] ?? 0;
      const ay = gp.axes[3] ?? gp.axes[1] ?? 0;
      if(Math.abs(ax)>0.15 || Math.abs(ay)>0.15){
        const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
        const dir = new THREE.Vector3(-ax, 0, -ay).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
        xrRig.position.addScaledVector(dir, 0.03); // ~2m/s at 60fps
      }
    }
    renderer.render(scene, camera);
  });

  renderer.xr.addEventListener('sessionstart', ()=>{
    // VR scale: if building is 30m wide, shrink to inspect, allow 1:1 walk
    // Default: 1 unit = 1m. Keep buildingGroup.scale=1 for true walkthrough
    vrFloor.visible = true;
    arShadowPlane.visible = false;
    xrRig.position.set(0,0,0); // roomscale origin
  });
}
```

Create VR button manually to control session features:

```js
async function createVRButton(){
  if(!('xr' in navigator)) return null;
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false);
  if(!ok) return null;
  const btn = VRButton.createButton(renderer); // handles requestSession
  // Override to request local-floor + hand-tracking
  const old = btn.onclick;
  btn.onclick = ()=> navigator.xr.requestSession('immersive-vr',{
    optionalFeatures:['local-floor','bounded-floor','hand-tracking']
  }).then(s=>renderer.xr.setSession(s));
  btn.textContent = 'ENTER VR';
  return btn;
}
```

### 1b. Immersive AR - Hit-test + Placement + 1:1 / 1:20

Key differences from VR: `hit-test`, `dom-overlay`, transparent background, reticle, no OrbitControls.

HTML:

```html
<div id="ar-overlay" style="position:fixed;inset:0;pointer-events:none;display:none">
  <div style="position:absolute;bottom:20px;width:100%;display:flex;gap:12px;

---

## 💬 Question 2

Excellent. Now for Turn 2:
In professional architectural BIM software (like Twinmotion, Enscape, or Revit), clients want to customize interior finishes and see instant visual updates and cost estimates.
What architecture should we use to allow the user to:
1. Select any room (e.g. Master Bedroom, Living Room, Bathrooms) and customize:
   - Wall paint color (e.g. Warm Alabaster, Sage Green, Deep Charcoal, Nordic Birch)
   - Flooring material (Scandinavian Oak Parquet, Dark Walnut Herringbone, Carrara Marble Tile, Polished Concrete, Terracotta)
   - Trim & Door finish (Matte Black, Brushed Brass, Natural White Oak, Sleek Aluminum)
2. Calculate an instant Bill of Materials & Cost Estimate ($/m² based on regional construction indices for finishes, drywall, MEP, glazing)
Provide the mathematical cost estimation model and the Three.js material swapping strategy.

## 🏛️ Meta Muse Spark Response 2

For `BlueprintTo3D` don't do `mesh.material = new Material()` on click. That's Enscape-demo level. Do BIM-lite:

**Room -> Surfaces -> Shared PBR Material Instance -> Quantity Takeoff -> Cost Model**

One source of truth drives both pixels and dollars in <16ms.

### 1. Data Architecture: Room-First Scene Graph

Every mesh generated from the blueprint must be tagged at creation time. This is non-negotiable.

```js
// Room metadata created at generation time - NOT derived later
const ROOMS = [
  { id:'living', name:'Living Room', w:5.8, d:4.6, h:2.7, doors:2, windows:28.5 /*m2 glazing*/, wet:false },
  { id:'master', name:'Master Bedroom', w:4.2, d:3.8, h:2.7, doors:1, windows:4.2, wet:false },
  { id:'bath1', name:'Bathroom 1', w:2.4, d:2.1, h:2.7, doors:1, windows:0.8, wet:true },
];

// Tagging convention:
mesh.userData = { roomId:'master', surface:'wall'|'floor'|'trim'|'door'|'ceiling' }
```

Manager holds **one material instance per room per surface**, shared by all meshes in that room:

```js
class FinishManager {
  constructor(buildingGroup){
    this.building = buildingGroup;
    this.roomMats = new Map(); // roomId -> {wall:Mat, floor:Mat, trim:Mat, door:Mat}
    this.selection = {}; // roomId -> {wall:'sage-green', floor:'oak-parquet', trim:'brass'}
  }
  registerRoom(roomId){
    this.roomMats.set(roomId, {
      wall:  FinishLibrary.createWall('warm-alabaster'),
      floor: FinishLibrary.createFloor('oak-parquet'),
      trim:  FinishLibrary.createTrim('white-oak'),
      door:  FinishLibrary.createTrim('white-oak'),
    });
    this.applyToMeshes(roomId);
  }
  applyToMeshes(roomId){
    const mats = this.roomMats.get(roomId);
    this.building.traverse(o=>{
      if(o.isMesh && o.userData.roomId===roomId){
        o.material = mats[o.userData.surface] || mats.wall;
      }
    });
  }
  // Instant swap - zero traversal of geometry, zero new programs if cached
  setFinish(roomId, category, finishKey){
    const mats = this.roomMats.get(roomId);
    const old = mats[category];
    const fresh = FinishLibrary.create(category, finishKey); // cached textures
    // copy into existing instance to preserve references in XR render loop
    old.copy(fresh); old.needsUpdate = true;
    fresh.dispose?.();
    this.selection[roomId][category] = finishKey;
    CostEngine.update(); // <5ms
  }
}
```

Raycast picking for desktop + VR controller uses same tag:

```js
raycaster.intersectObject(buildingGroup,true)[0]?.object.userData.roomId
```

### 2. PBR Finish Library - Quest-Safe

Use `MeshStandardMaterial` everywhere. Reserve `MeshPhysicalMaterial` for marble/brass only on desktop (`renderer.xr.isPresenting ? Standard : Physical`).

```js
import * as THREE from 'three';

const texCache = new Map();
function canvasTex(draw, repeat=1){
  const key = draw.name+repeat;
  if(texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width=c.height=512;
  draw(c.getContext('2d'),512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; // Quest: max 4
  texCache.set(key,t); return t;
}
// Procedural - no network fetch, works offline in headset
function drawOak(ctx,S){ ctx.fillStyle='#D9BE9A';ctx.fillRect(0,0,S,S);
  for(let i=0;i<8;i++){ ctx.fillStyle=`hsl(32,35%,${62+Math.random()*8}%)`;
    ctx.fillRect(0,i*S/8,S,S/8-2);} // parquet strips
  ctx.strokeStyle='rgba(90,60,30,0.4)'; for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(0,i*S/8);ctx.lineTo(S,i*S/8);ctx.stroke();}
}
function drawHerringbone(ctx,S){ ctx.fillStyle='#3D2A1E';ctx.fillRect(0,0,S,S);
  ctx.save();ctx.translate(S/2,S/2);ctx.rotate(Math.PI/4);
  for(let x=-S;x<S;x+=32)for(let y=-S;y<S;y+=128){
    ctx.fillStyle=`hsl(22,35%,${16+Math.random()*6}%)`;ctx.fillRect(x,y,28,124);}
  ctx.restore();
}
function drawMarble(ctx,S){ ctx.fillStyle='#F2F2F0';ctx.fillRect(0,0,S,S);
  ctx.strokeStyle='rgba(150,150,155,0.6)';for(let i=0;i<14;i++){ctx.beginPath();
    let x=Math.random()*S,y=Math.random()*S;ctx.moveTo(x,y);
    ctx.bezierCurveTo(x+50,y-30,x-50,y+50,x+80,y+80);ctx.lineWidth=0.5+Math.random()*1.5;ctx.stroke();}
}
function drawConcrete(ctx,S){ ctx.fillStyle='#B9B9B7';ctx.fillRect(0,0,S,S);
  const d=ctx.getImageData(0,0,S,S);for(let i=0;i<d.data.length;i+=4){const n=(Math.random()-0.5)*18;
    d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n;}ctx.putImageData(d,0,0);
}
function drawTerracotta(ctx,S){ ctx.fillStyle='#C67B5C';ctx.fillRect(0,0,S,S);
  ctx.strokeStyle='#A05F42';ctx.lineWidth=6;for(let i=0;i<=4;i++){ctx.beginPath();ctx.moveTo(i*S/4,0);ctx.lineTo(i*S/4,S);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*S/4);ctx.lineTo(S,i*S/4);ctx.stroke();}
}

export const FinishLibrary = {
  WALLS: {
    'warm-alabaster': { name:'Warm Alabaster', color:0xEDE6D6, roughness:0.94, metalness:0 },
    'sage-green':     { name:'Sage Green', color:0x9CAF88, roughness:0.92, metalness:0 },
    'deep-charcoal':  { name:'Deep Charcoal', color:0x2B2E33, roughness:0.88, metalness:0.05 },
    'nordic-birch':   { name:'Nordic Birch', color:0xD9CFC0, roughness:0.9, metalness:0 },
  },
  FLOORS: {
    'oak-parquet':   { name:'Scandinavian Oak Parquet', map:()=>canvasTex(drawOak), roughness:0.55, color:0xffffff },
    'walnut-herringbone': { name:'Dark Walnut Herringbone', map:()=>canvasTex(drawHerringbone), roughness:0.45, color:0xffffff },
    'carrara-marble':{ name:'Carrara Marble Tile', map:()=>canvasTex(drawMarble), roughness:0.18, metalness:0.05, clearcoat:1 },
    'polished-concrete':{ name:'Polished Concrete', map:()=>canvasTex(drawConcrete), roughness:0.32, metalness:0.08 },
    'terracotta':    { name:'Terracotta', map:()=>canvasTex(drawTerracotta), roughness:0.8, metalness:0 },
  },
  TRIMS: {
    'matte-black': { name:'Matte Black', color:0x111214, roughness:0.6, metalness:0.4 },
    'brushed-brass':{ name:'Brushed Brass', color:0xC9A86A, roughness:0.35, metalness:1.0 },
    'white-oak':   { name:'Natural White Oak', color:0xD8CAB8, roughness:0.5, metalness:0 },
    'aluminum':    { name:'Sleek Aluminum', color:0xC0C5CE,

---

## 💬 Question 3

Turn 3:
To make the house feel truly interactive and alive, rather than a static dollhouse:
1. How should we implement interactive doors and windows that swing or slide open/close when clicked in 3D?
2. What architectural lighting setups (e.g. Cinematic Twilight, Crisp Architectural Daylight, Warm Cozy Night with recessed spot cans and under-cabinet LED strips) maximize the visual realism of the PBR procedural materials?
Summarize the complete feature suite and give us the definitive architectural specification for the hackathon.

## 🏛️ Meta Muse Spark Response 3

For `BlueprintTo3D` to win: **1 scene, 3 interactions, 3 lights.** Everything below is Quest 3-safe at 72fps.

### 1. Interactive Doors + Windows: Pivot-First Architecture

Never rotate the mesh. Rotate a `Pivot Group` placed at the hinge.

```
Wall Opening (hole in wall mesh)
 +-- Frame (static)
 +-- PivotGroup at hinge edge (0,0,0 = hinge line)
      +-- Leaf Mesh offset by +w/2 (swing) OR centered (slide)
      +-- Handle + Glass
```

This is the only pattern that works identically for mouse + Quest controller ray.

#### 1.1 Factory + Interaction System - drop in

```js
import * as THREE from 'three';

export const interactives = []; // doors + windows
const ray = new THREE.Raycaster();

// Easing
const easeInOut = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

export function makeSwingDoor({w=0.9,h=2.1,thickness=0.04,hinge='left',material,trimMat}){
  const pivot = new THREE.Group();
  pivot.userData = { type:'door', open: false, t:0, maxAngle: hinge==='left' ? -Math.PI*0.61 : Math.PI*0.61 };
  // ~110 deg open

  const dir = hinge==='left' ? 1 : -1;
  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, thickness),
    material // share FinishManager door mat: roomMats.get(roomId).door
  );
  leaf.position.set(dir*w/2, h/2, 0); // offset from hinge
  leaf.castShadow = true;
  leaf.userData.isOpenable = true;
  leaf.userData.pivot = pivot;
  pivot.add(leaf);

  // handle
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.03,16,16),
    trimMat // brushed-brass / matte-black - updates live
  );
  handle.position.set(dir*(w-0.12), 1.02, 0.05);
  pivot.add(handle);

  // frame (static, not in pivot)
  const frame = new THREE.Group();
  const jambGeo = new THREE.BoxGeometry(0.06,h+0.06,0.12);
  const l = new THREE.Mesh(jambGeo, trimMat); l.position.set(0,h/2,0);
  const r = l.clone(); r.position.x = dir*w;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w+0.06,0.06,0.12), trimMat);
  top.position.set(dir*w/2, h+0.03, 0);
  frame.add(l,r,top);

  const group = new THREE.Group();
  group.add(frame, pivot);
  group.userData.pivot = pivot;
  pivot.traverse(o=>{ if(o.isMesh){o.userData.pivotRoot = group;}});
  leaf.userData.pivotRoot = group;
  interactives.push(group);
  return group;
}

export function makeWindow({w=1.2,h=1.2,type='casement',frameMat,glassMat}){
  // type: 'casement' (swing) | 'slider'
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w+0.1,h+0.1,0.08), frameMat);
  frame.position.y = h/2;
  group.add(frame);

  const pivot = new THREE.Group();
  // hinge at left edge of opening
  pivot.position.set(-w/2, 0, 0);
  pivot.userData = { type:'window', open:false, t:0, slideType:type, maxAngle: -Math.PI*0.5, slideDist: w*0.45 };

  const sash = new THREE.Mesh(new THREE.BoxGeometry(w,h,0.04), frameMat);
  sash.position.set(w/2, h/2, 0);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w-0.1,h-0.1),
    glassMat
  );
  glass.position.set(w/2, h/2, 0.021);
  pivot.add(sash, glass);
  sash.userData.isOpenable = true;
  sash.userData.pivotRoot = group;
  glass.userData.isOpenable = true;
  glass.userData.pivotRoot = group;
  group.add(pivot);
  group.userData.pivot = pivot;
  interactives.push(group);
  return group;
}

// --- Unified Picking: mouse + touch + XR controllers ---
export function toggleOpenable(root){
  const p = root.userData.pivot;
  p.userData.open = !p.userData.open;
  // tiny click via WebAudio - huge feel win, 0 assets
  blip(p.userData.open ? 620 : 420);
}

function blip(freq){
  try{
    const ctx = blip.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value=freq; o.type='sine';
    g.gain.setValueAtTime(0.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.12);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.13);
  }catch(e){}
}

// Desktop
let downPos=null;
renderer.domElement.addEventListener('pointerdown', e=> downPos=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup', e=>{
  if(!downPos) return;
  const dx=e.clientX-downPos[0], dy=e.clientY-downPos[1];
  if(dx*dx+dy*dy>25) return; // was orbit drag
  const ndc = new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(interactives,true)[0];
  if(hit){
    let o=hit.object;
    while(o && !o.userData.pivotRoot) o=o.parent;
    if(o) toggleOpenable(o.userData.pivotRoot);
  }
});

// XR: both controllers
for(let i=0;i<2;i++){
  const c = renderer.xr.getController(i);
  c.addEventListener('selectstart', ()=>{
    // ray from controller
    const m = new THREE.Matrix4().extractRotation(c.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
    ray.ray.direction.set(0,0,-1).applyMatrix4(m);
    const hit = ray.intersectObjects(interactives,true)[0];
    if(hit){
      let o=hit.object;
      while(o && !o.userData.pivotRoot) o=o.parent;
      if(o) toggleOpenable(o.userData.pivotRoot);
    }
  });
}

// --- Animation: call every frame in setAnimationLoop ---
const clock = new THREE.Clock();
function updateOpenables(){
  const dt = Math.min(clock.getDelta(), 0.05);
  for(const root of interactives){
    const p = root.userData.pivot;
    const target = p.userData.open ? 1 : 0;
    // critically damped: ~4/sec, framerate independent
    p.userData.t += (target - p.userData.t) * Math.min(1, dt*6);
    if(Math.abs(p.userData.t-target)<0.001) p.userData.t=target;
    const k = easeInOut(THREE.MathUtils.clamp(p.userData.t,0,1));
    if(p.userData.slideType==='slider'){
      p.position.x = -p.userData.slideDist*0 + k*p.userData.slideDist; // slide +X
      // store baseX on first run
      if(p.userData.baseX===undefined) p.userData.baseX=p.position.x;
      p.position.x = p.userData.baseX + k*p.userData.slideDist;
    } else {
      p.rotation.y = k * p.userData.maxAngle;
    }
  }
}
```

Placement rule: door `group.position` = hinge world pos on wall, `group.rotation.y` = wall normal. No math in loop.

Glass material (Quest-safe):

```js
const isXR = renderer.xr.isPresenting;
export const glassMat = isXR ?
  new THREE.MeshStandardMaterial({color:0xBFD9E5, transparent:true, opacity:0.28, roughness:0.1, metalness:0.1, side:THREE.DoubleSide}) :
  new THREE.MeshPhysicalMaterial({color:0xffffff, transmission:0.92, thickness:0.02, roughness:0.05, ior:1.5, transparent:true});
```

### 2. Architectural Lighting: 3 Presets That Sell PBR

PBR only looks real with: **ACES + IBL + 1 shadow sun + warm interior pool.**

Base setup once:

```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55; // r163+ ; for older: traverse mats envMapIntensity

// Sky dome - gradient shader, cheap on Quest
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite:false, fog:false,
  uniforms:{ top:{value:new THREE.Color(0x87b5e0)}, bottom:{value:new THREE.Color(0xf6e8d8)} },
  vertexShader:`varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vP; uniform vec3 top,bottom;
    void main(){ float h=normalize(vP).y*0.5+0.5; gl_FragColor=vec4(mix(bottom,top,smoothstep(0.,0

---

