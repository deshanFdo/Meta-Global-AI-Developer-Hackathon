# Meta Muse Spark 1.3 Locomotion & Spatial WebXR Technical Consultation Transcript
**Date:** 2026-10-29T14:11:05.355Z
**Participating Agents:** Antigravity Senior Staff Architect & Meta Muse Spark 1.3
**Scope:** First-Person Locomotion Overhaul, Multi-Pass Collision Manifolds, WebXR VR Teleportation Arc, AR Scale Switching, and Interactive Architectural BIM.

---

## Turn 1: First-Person Walking Locomotion Kinematics & Collision Manifolds
### User Prompt:
We are optimizing the first-person walkthrough navigation in our Three.js React Three Fiber house viewer.
The user noticed: "walking seems bit off so fix that".
Upon deep inspection, we identified three root causes:
1. OrbitControls was remaining enabled while in first-person mode, causing dragging to orbit around an old static target rather than rotating the player's head.
2. In tight hallways (1.0m to 1.2m wide) and door openings (0.85m to 0.9m wide), an overly large player collision margin (0.32m + wall thickness) caused players to get snagged or jitter when sliding along walls.
3. Walls with doors were represented as continuous line segments with an approximate doorway exemption window, which caused false normal pushback near jambs.

As Meta Muse Spark 1.3, what is your recommended production-grade architecture for:
a) Decoupling OrbitControls vs First-Person look cleanly in React Three Fiber.
b) Smooth mouse look with both Pointer Lock (canvas click) and Drag-to-Look, with exponential damping on high-DPI mice.
c) Robust line-segment wall collision with multi-pass sliding (2-3 iterations) and breaking walls into actual solid piers (leaving door openings as empty navigable air).
d) Natural bipedal kinematics: acceleration, friction damping, head-bobbing sine wave with vertical and lateral sway, and footstep sound cadence.

### Meta Muse Spark 1.3 Architecture Guidance:
As `Muse Spark 1.3` - here is the production fix. Don't patch the old controller. Replace it with this decoupled architecture.

Root causes you found are classic:

1. `OrbitControls` fighting FP yaw.
2. `r=0.32 + thickness` = `~0.45m` effective. In a `1.0m` hall, navigable width = `1.0 - 2*0.45 = 0.1m`. Zero tolerance. Any diagonal = snag.
3. Exemption-window != hole. The jamb end still generates a false normal.

### Architecture

```
App [mode: 'orbit' | 'first']
  <Canvas>
    {mode==='orbit' ? <OrbitControls/> : <FirstPersonRig walls={piers}/>}
```

Never `enabled={false}`. Unmount. `OrbitControls` leaves `pointerdown/move` listeners and a stale `target` + damping state that fights you for 3-4 frames.

```tsx
// App.tsx
const [mode, setMode] = useState<'orbit'|'first'>('orbit')
const spawnRef = useRef({pos:new THREE.Vector3(0,1.65,3), yaw:Math.PI})

<Canvas camera={{fov:70, near:0.05, far:100}} dpr={[1,2]}>
  {mode==='orbit' && (
    <OrbitControls makeDefault enableDamping dampingFactor={0.08}
      maxPolarAngle={Math.PI/2-0.02} target={[0,1,0]} />
  )}
  {mode==='first' && (
    <FirstPersonRig walls={collisionPiers} spawn={spawnRef.current}
      onExit={()=>setMode('orbit')} />
  )}
</Canvas>
```

On enter FP: set `camera.position=spawn.pos`, `yaw=spawn.yaw`. On exit: set `orbit.target = camera.position + forward*2.0` and remount controls. Clean handoff, no shared quaternion.

### a+b) PointerLock + Drag Look with Damping

Do not write directly to `camera.rotation` from event. Write to `targetYaw/Pitch`, smooth in `useFrame`. This fixes high-DPI jitter.

Math:

```
targetYaw -= dx * s
targetPitch -= dy * s , s=0.0021 rad/px
yaw += (targetYaw-yaw)*(1-exp(-λ*dt)), λ=18
pitch += (targetPitch-pitch)*(1-exp(-λ*dt)), λ=18
clamp pitch to ±1.45 rad
camera.quaternion from Euler YXZ (yaw,pitch,roll)
```

Implementation - supports both modes:

```tsx
function useFPLook(rig: React.RefObject<THREE.Group>) {
  const yaw = useRef(0), pitch = useRef(0);
  const tYaw = useRef(0), tPitch = useRef(0);
  const dragging = useRef(false);
  const last = useRef({x:0,y:0});
  const { gl } = useThree();

  useEffect(()=>{
    const el = gl.domElement;
    const SENS = 0.0021;

    const onClick = () => { if(!document.pointerLockElement) el.requestPointerLock?.(); };
    el.addEventListener('click', onClick);

    const onMove = (e: MouseEvent) => {
      if(document.pointerLockElement===el){
        tYaw.current -= e.movementX * SENS;
        tPitch.current -= e.movementY * SENS;
      } else if(dragging.current){
        // don't use movementX unlocked - use client delta
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = {x:e.clientX, y:e.clientY};
        tYaw.current -= dx * SENS * 1.2;
        tPitch.current -= dy * SENS * 1.2;
      }
      tPitch.current = THREE.MathUtils.clamp(tPitch.current, -1.45, 1.45);
    };
    const onDown = (e:PointerEvent)=>{ dragging.current=true; last.current={x:e.clientX,y:e.clientY}; };
    const onUp = ()=> dragging.current=false;

    document.addEventListener('mousemove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return ()=>{ el.removeEventListener('click',onClick);
      document.removeEventListener('mousemove',onMove);
      el.removeEventListener('pointerdown',onDown);
      window.removeEventListener('pointerup',onUp); };
  },[gl]);

  const update = (dt:number, roll:number)=>{
    const k = 1 - Math.exp(-18*dt); // exponential damping
    yaw.current += (tYaw.current - yaw.current)*k;
    pitch.current += (tPitch.current - pitch.current)*k;
    return new THREE.Euler(pitch.current, yaw.current, roll, 'YXZ');
  };
  return {yaw, pitch, tYaw, tPitch, update};
}
```

> High-DPI: `movementX` is already CSS-px, but gaming mice report 4000+ counts/sec. Direct `yaw+=dx*s` = vibration. The `1-exp(-λdt)` low-pass is mandatory. `λ=15-20` feels 1:1 but smooth.

### c) Wall Collision: Solid Piers + 3-Pass Slide

Stop doing this:

```ts
// WRONG: continuous wall + window
if(Math.abs(closestX-doorCenter) < doorWidth/2) skipCollision();
```

Near the jamb, `closestPoint` is the jamb corner, normal is diagonal, you get pushed back into the door frame.

Do this: pre-process CAD walls into `piers`. Door = air.

```ts
export type Seg2 = {ax:number,az:number,bx:number,bz:number};

export function splitWall(p0:THREE.Vector2, p1:THREE.Vector2,
  doors:{centerDist:number,width:number}[]): Seg2[] {
  const dir = p1.clone().sub(p0);
  const len = dir.length(); dir.normalize();
  // sort doors along wall
  const cuts = doors.sort((a,b)=>a.centerDist-b.centerDist);
  let cursor = 0; const out:Seg2[]=[];
  const JAMB = 0.02; // 2cm clearance so endpoint sphere doesn't close door
  for(const d of cuts){
    const s = Math.max(0, d.centerDist - d.width/2 - JAMB);
    const e = Math.min(len, d.centerDist + d.width/2 + J

---

## Turn 2: WebXR VR Locomotion (Parabolic Teleport Arc, Snap Turning & Spatial Rays)
### User Prompt:
Turn 2: Now regarding WebXR VR and AR on Meta Quest 2/3/Pro:
In VR walkthroughs:
1. Smooth joystick locomotion can cause vestibular disorientation (motion sickness) for some users unless paired with comfort snap-turning (e.g., 30° or 45° instantaneous yaw rotation on the right thumbstick).
2. Teleportation arcs: How should we implement a parabolic bezier / projectile teleportation ray from the right controller that casts onto the floor plane and highlights a circular landing reticle with orientation indicator?
3. In VR/AR, how should users interact with doors (swinging them open/closed) via the controller raycaster trigger or proximity?
Provide precise Three.js WebXR implementation details.

### Meta Muse Spark 1.3 Architecture Guidance:
As Muse Spark 1.3 - VR/AR locomotion + interaction rig for Quest 2/3/Pro. Production pattern.

Do not move `camera` in XR. Move a `Rig`.

```
XRRig (Group: position.xz = feet, rotation.y = yaw)
  └─ camera (head pose from headset, local position = head offset)
  ├─ leftGrip / leftRay
  └─ rightGrip / rightRay
```

Desktop `FirstPersonRig` must unmount when `renderer.xr.isPresenting==true`. XR owns the camera.

```tsx
<Canvas>
  {!xr && mode==='first' && <FirstPersonRig walls={piers}/>}
  <XRRig walls={piers} floorMeshes={floors} doors={doors} />
  <VRButton /> {/* immersive-vr, local-floor */}
</Canvas>
```

Session:
```js
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
navigator.xr.requestSession('immersive-vr',{
  optionalFeatures:['local-floor','bounded-floor','hand-tracking','haptics']
});
// AR Quest 3: 'immersive-ar' + ['hit-test','plane-detection','anchors','local-floor']
```

### 1. Smooth Locomotion + Snap Turn (Comfort)

Vestibular mismatch comes from continuous yaw + acceleration. Fix: head-relative translation only, no smooth yaw. Yaw is **only** snap.

Math - head-relative move:
```
yaw = atan2(camDir.x, camDir.z) // head yaw, projected to XZ
forward = (-sin(yawRig + yawHead), -cos(yawRig + yawHead))
right = (cos(...), -sin(...))
input = deadzone(thumbstick.xy, 0.15)
targetVel = (forward*-input.y + right*input.x) * maxSpeed // 2.2 m/s walk
vel = damp(vel, targetVel, 8, dt)
rig.position += vel*dt -> then collideXZ(rig.position) with same pier solver from desktop
```

Snap-turn around head, not rig origin. This is critical or you induce translation sickness:

```
headXZ = camera.position projected to rig space (x,z)
Δ = ±snapAngle // 30deg = PI/6, 45deg = PI/4
rig.position.sub(headXZ).applyAxisAngle(Y,Δ).add(headXZ)
rig.rotation.y += Δ
```

Trigger on edge, not level: `|x|>0.75` + 350ms cooldown. Left stick = move, Right stick X = snap, Right stick Y = optional teleport aim / no smooth pitch.

Production `useFrame` code - vanilla Three, works in R3F:

```ts
function updateVRLocomotion(dt, rig:THREE.Group, cam:THREE.Camera, xr:THREE.WebXRManager){
  const session = xr.getSession(); if(!session) return;
  for(const src of session.inputSources){
    if(!src.gamepad) continue;
    const gp = src.gamepad;
    const [sx, sy] = [gp.axes[2]??0, gp.axes[3]??0]; // thumbstick
    const handed = src.handedness;

    if(handed==='left'){ // smooth move
      let ix=sx, iy=sy;
      const m=Math.hypot(ix,iy);
      if(m<0.15){ vel.set(0,0); continue; }
      if(m>1){ ix/=m; iy/=m; }
      // head yaw in rig space
      const headQ = cam.quaternion;
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(headQ); fwd.y=0; fwd.normalize();
      const right = new THREE.Vector3(1,0,0).applyQuaternion(headQ); right.y=0; right.normalize();
      const SPEED=2.0;
      targetVel.copy(fwd).multiplyScalar(-iy*SPEED).addScaledVector(right, ix*SPEED);
      // exponential accel: no instant velocity
      vel.lerp(targetVel, 1-Math.exp(-8*dt));
      rig.position.addScaledVector(vel, dt);
      collideCircleXZ(rig.position, 0.25, piers, 3); // reuse desktop solver
    }
    if(handed==='right'){ // snap turn
      now+=dt;
      if(Math.abs(sx)>0.75 && now-lastSnap>0.35){
        const delta = (sx>0?1:-1) * Math.PI/6; // 30deg
        const head = new THREE.Vector3(); cam.getWorldPosition(head);
        head.y=0; const rigXZ = rig.position.clone(); rigXZ.y=0;
        const offset = head.clone().sub(rigXZ);
        offset.applyAxisAngle(UP, delta);
        rig.position.copy(head).sub(offset); rig.position.y=0;
        rig.rotation.y+=delta;
        lastSnap=now;
        src.gamepad.hapticActuators?.[0]?.pulse?.(0.4,20);
      }
    }
  }
}
```

Comfort defaults shipped to Quest Store: `teleport=default, snap=45deg, smoothSpeed=2.0, vignette on smooth`. Expose toggle. Smooth-only fails comfort review.

### 2. Parabolic Teleport Arc + Reticle + Orientation

Projectile, not straight ray. From right controller tip:

```
p(t) = p0 + v0*t + 0.5*g*t^2
v0 = -gripForward * 6.0 m/s + up*2.0? Actually: v0 = aimDir * 6.0
g = -9.8*1.6 (slightly heavy feels better)
Sample N=32, dt_step=0.08s -> ~2.5s flight
Raycast segments vs floorMeshes + clamp y>=0. First hit = landing.
```

Reticle: `RingGeometry(0.25,0.32)` + `CircleGeometry(0.05)` + arrow `Cone/Plane` for orientation. Orientation from right thumbstick while aiming: `landingYaw = atan2(tx,tz)`. If stick centered, keep current rig yaw.

Fade teleport: `fade to black 120ms -> move rig -> fade in`. No sickness.

```ts
const N=32, G=new THREE.Vector3(0,-9.8*1.2,0);
const pts=new Float32Array((N+1)*3);
arcLine.geometry.setAttribute('position', new THREE.BufferAttribute(pts,3));

function updateTeleport(rightGrip:THREE.Group, rightRay:THREE.Object3D){
  const aiming = rightTriggerHeld || rightStickY<-0.6; // hold to aim
  arcLine.visible = reticle.visible = aiming;
  if(!aiming) return;

  p0.setFromMatrixPosition(rightGrip.matrixWorld);
  dir.set(0,0,-1).applyQuaternion(rightGrip.getWorldQuaternion(q));
  v0.copy(dir).multiplyScalar(6.0);

  let hit:THREE.Vector3|null=null;
  p.copy(p0); v.copy(v0);
  for(let i=0;i<=N;i++){
    pts[i*3]=p.x; pts[i*3+1]=p.y; pts[i*3+2]=p.z;
    // segment p -> pNext vs floor
    pNext.copy(p).addScaledVector(v, STEP).addScaledVector(G, 0.5*STEP*STEP);
    v.addScaledVector(G, STEP);
    ray.set(p, pNext.clone().sub(p).normalize());
    ray.far = p.distanceTo(pNext)+0.02;
    const h = ray.intersectObjects(floorMeshes,false)[0];
    if(h){ hit=h.point; // truncate arc
      for(let j=i+1;j<=N;j++){pts[j*3]=h.point.x;pts[j*3+1]=h.point.y;pts[j*3+2]=h.point.z;}
      break;
    }
    p.copy(pNext);
    if(p.y<0){ hit=new THREE.Vector3(p.x,0,p.z); break; }
  }
  arcLine.geometry.attributes.position.needsUpdate=true;

  if(hit){
    // validate: not inside wall pier (reuse circle test)
    valid = !circleHitsWall(hit, 0.3, piers);
    reticle.position.copy(hit).add(up*0.02);
    reticle.material.color.set(valid?0x00ff88:0xff3344);
    // orientation arrow from thumbstick
    if(Math.hypot(tx,tz)>0.3) landingYaw = Math.atan2(tx,tz)+rig.rotation.y;
    arrow.rotation.y = -landingYaw;
  }
  if(triggerReleased && hit && valid){
    // preserve head offset: feet = landing - headOffset
    headOffset.setFromMatrixPosition(cam.matrixWorld).sub(rig.position); headOffset.y=0;
    rig.position.set(hit.x-headOffset.x, 0, hit.z-headOffset.z);
    rig.rotation.y = landingYaw - headYaw; // face chosen dir
    doFadeBlink(); hapticPulse(0.7,40);
  }
}
```

Arc material: `LineBasicMaterial` with `vertexColors` fade, or `TubeGeometry` rebuilt - don't. Use single

---

## Turn 3: Unified Cross-Platform Architecture Synthesis
### User Prompt:
Turn 3: Architectural synthesis:
How should we tie together:
1. Desktop first-person walkthrough (WASD + mouse look + pointer lock + 'E' to toggle nearest door + door walk-through)
2. Desktop orbit / top-down / elevation view with room labels and measurement tool
3. WebXR VR immersive mode with teleport arc and snap turn
4. WebXR AR tabletop (1:20 scale) vs 1:1 real-scale passthrough mode
5. Live BIM finish studio and cost estimator
Provide a crisp architecture summary and best practices checklist.

### Meta Muse Spark 1.3 Architecture Guidance:
As Muse Spark 1.3 - synthesis build. One model, many rigs. Don't fork your house per mode.

### 0. Single Source of Truth

```
src/
 store/houseStore.ts      // walls, piers, doors, rooms, finishes, costs
 model/HouseGraph.ts      // CAD -> runtime colliders + quantities
 rigs/DesktopFPRig.tsx    // WASD + look + bob + E doors
 rigs/OrbitRig.tsx        // orbit / top / elevation + labels + measure
 rigs/XRRig.tsx           // VR locomotion + teleport + snap + door pinch
 rigs/ARRig.tsx           // tabletop 1:20 vs 1:1 passthrough
 bim/FinishStudio.tsx + CostEngine.ts
```

```ts
// HouseGraph.ts - built once from CAD, shared by all modes
export type Pier = {ax:number,az:number,bx:number,bz:number};
export type DoorDef = {id:string, hinge:[number,number], width:number,
  swingDir:1|-1, openAngle:number, targetAngle:number, leafThick:number};
export type Room = {id:string, name:string, poly:[number,number][], center:[number,number]};

export function buildHouse(rawWalls:WallWithDoors[]): {piers:Pier[], doors:DoorDef[]} {
  // CRITICAL from fix #3: never continuous wall + window exemption.
  // Split into solid piers, door gap = navigable air + 0.02 jamb clearance
  // piers[] = static colliders, door leaf = dynamic collider
}
```

All rigs call the same solver:

```ts
export function collideCircleXZ(pos:THREE.Vector3, r:number, segs:Pier[], iters=3){
  for(let k=0;k<iters;k++){
    for(const s of segs){
      const cx = closestPointOnSeg2D(pos, s); // 2D XZ
      let dx = pos.x-cx.x, dz = pos.z-cx.z;
      let d2 = dx*dx+dz*dz;
      if(d2 < r*r){
        let d = Math.sqrt(d2) || 1e-5;
        let nx=dx/d, nz=dz/d;
        if(d<1e-6){ // center on segment -> use segment normal
          const ex=s.bx-s.ax, ez=s.bz-s.az;
          const l=Math.hypot(ex,ez)||1; nx=-ez/l; nz=ex/l; d=0;
        }
        const push = r-d;
        pos.x += nx*push; pos.z += nz*push; // slide: next iter resolves corner
      }
    }
  }
}
// effective r = 0.25m. NOT 0.32+thickness. Navigable in 1.0m hall = 1.0-0.5=0.5m.
```

### 1. Desktop First-Person: WASD + Look + E + Door Walk-Through

Unmount `OrbitControls` in FP. Never `enabled=false`.

```tsx
{mode==='orbit' && <OrbitControls makeDefault enableDamping/>}
{mode==='first' && <DesktopFPRig piers={piers} doors={doors} />}
```

Locomotion - exponential, no ice-skate:

```
// wishDir from keys in yaw space
// targetVel = wishDir * maxSpeed (2.2 walk, 3.8 shift)
// vel += (targetVel-vel)*(1-exp(-10*dt)) // accel
// vel *= exp(-0.5*dt) when no input // friction
// pos += vel*dt -> collideCircleXZ(pos,0.25, [...piers, ...doorLeaves],3)
```

Head-bob + footsteps:

```
// bobPhase += horizSpeed * dt * 3.4
// camY = 1.65 + sin(bobPhase*2)*0.028*speedFactor
// swayX = cos(bobPhase)*0.018*speedFactor, roll = sin(bobPhase)*0.003
// footstep when sin(bobPhase*2) crosses 0 from + to - and speed>0.8 -> play + interval = 2.1/speed sec
```

Doors - dynamic leaf collider:

```tsx
// Door hinge Group at hinge point, leaf mesh offset width/2 along +X
// leaf world segment: hinge -> hinge + (cos(a), sin(a))*width, a = baseYaw + openAngle*swingDir
// openAngle damped: openAngle += (target-openAngle)*(1-exp(-8*dt))
// collider rebuilt per-frame from hinge+angle, thickness ~0.05
function doorLeafSeg(d:DoorDef):Pier { /* compute from current openAngle */ }

// E to toggle:
useEffect(()=>{ const h=(e)=>{ if(e.code==='KeyE') toggleNearestDoor(); }; ... })
function toggleNearestDoor(){
  // nearest where dist(player,doorCenter)<2.2m && dot(camFwd, toDoor)>0.4
  // d.targetAngle = d.targetAngle>1.0 ? 0 : Math.PI/2*0.95; // 85deg open
  // haptic/audio click
}
// Walk-through: if openAngle>70deg, leaf is against pier, gap is free. Player circle slides through 0.85m opening because r=0.25.
```

### 2. Desktop Orbit / Top / Elevation + Labels + Measure

Same model, different camera preset. Preserve FP spawn on exit.

```tsx
function gotoView(v:'orbit'|'top'|'elev'){
  if(v==='top'){ camera.position.set(0,14,0.01); controls.target.set(0,0,0); }
  if(v==='elev'){ camera.position.set(8,1.6,0); controls.target.set(0,1.4,0); }
}
// Room labels: drei <Html> or sprites, only in orbit/top. Hide in FP/VR.
{rooms.map(r=> <Html key={r.id} position={[r.center[0],2.4,r.center[1]]} center distanceFactor={10}>
  <div className="room-label">{r.name} · {area(r.poly).toFixed(1)}m²</div></Html>)}

// area = shoelace: A=0.5*|Σ(x_i*z_{i+1}-x_{i+1}*z_i)|

// Measure tool: raycast to floor, snap 0.1m, shift=snap to wall endpoint
const [pts,setPts]=useState<THREE.Vector3[]>([]);
onClickFloor=(p)=> setPts([...pts,p].slice(-2));
dist = pts[0].distanceTo(pts[1]); // draw Line + Html `${dist.toFixed(2)} m`
```

### 3. VR Immersive: Teleport + Snap

`renderer.xr.enabled=true; setReferenceSpaceType('local-floor')`. Desktop rig unmounts when `isPresenting`.

Hierarchy: `XRGroup[yaw + feetXZ] -> camera[head pose]`. Never move camera directly.

* Left stick: smooth head-relative move, `deadzone 0.15`, `max 2.0m/s`, `vel.lerp(target,1-exp(-8dt))` + same `collideCircleXZ(r=0.25)`.
* Right stick X: snap `±30°` (comfort default `45°` for store review), edge-trigger `|x|>0.75 + 350ms cooldown`, rotate around head:
```
offset = headXZ - rigXZ; offset.applyAxisAngle(Y,Δ); rigXZ = headXZ-offset; rig.y+=Δ
```
* Right trigger hold: parabolic aim `p(t)=p0+v0*t+0.5*g*t², v0=aim*6.0, g=-11.8`, `N=32` samples vs `floorMeshes`, reticle `Ring(0.25,0.32)+arrow`. Red if `circleHitsWall(hit,0.3)`. Release to teleport with `120ms fade blink`. Orientation from right stick while aiming.
* Doors in VR: ray from right controller vs `doorMeshes` + `select` event toggles `targetAngle`, or proximity `dist(hand,knob)<0.25m + pinch` grabs knob and maps hand drag to angle. Pulse haptics `0.5/30ms` on toggle.

Default to `teleport + snap + vignette`. Smooth-only fails comfort.

### 4. AR: Tabletop 1:20 vs 1:1 Passthrough

```ts
// session: immersive-ar, features: ['hit-test','plane-detection','anchors','local-floor']
// Quest 3 passthrough: transparent bg, no opaque skybox, enable depth occlusion if available
const TABLE_S = 1/20; // 0.05
arGroup.scale.setScalar(mode==='table' ? TABLE_S : 1.0);
```

* Tabletop: hit-test reticle on real table -> `anchor` -> place `arGroup` (whole house ~40cm). Two-hand pinch to rotate/scale `0.5x-2x`. Doors tappable via poke ray. Perfect for finish studio.
* 1:1: `arGroup.position=originAnchor`, `scale=1`, walls align to room via manual 2-point calibration (place front-door + corner). Player walks physically; joystick disabled. Use `plane-detection` floors as teleport surface, hide virtual floor, keep piers for collision if using redirected walking, else no collision.
* Never render VR floor grid in AR. Use `material.transparent` shadows only.

### 5. Live BIM Finish Studio + Cost Estimator

```ts
// store
finishes = {floor:{oak:45/m², tile:60/m²}, wallPaint:{...}, door:{...}}
quantities = {
  floorArea: Σ shoelace(room.poly),
  wallPaintArea: Σ(len(piers)*2.6) - Σ(door.width*2.1) - Σ(windowArea),
  baseboard: Σ(len(piers)),
  doorCount: doors.length
}
cost = Σ(qty * unitMat + qty * unitLabor) * waste(1.1) + fee
```

`<FinishStudio>` swaps `meshStandardMaterial` map/color per room in real-time (share material instance per finish, not per mesh). `<CostEngine>` subscribes to `finishes+quantities`, recomputes in `useMemo`, shows breakdown + total. Click room label in orbit -> selects room -> studio edits that room only.

### Best Practices Checklist

1. Unmount `OrbitControls` in FP/VR/AR, reseed `target = camPos+fwd*2` on return.
2. Look: `targetYaw/Pitch + 1-exp(-18dt)` damping, `sens 0.0021`, clamp pitch `±83°`. Support PointerLock + drag fallback.
3. Collision: `r=0.22-0.25m`, `3-pass slide`, piers with `0.02m jamb gap`. Test in `1.0m hall + 0.85m door diagonal strafe`.
4. Doors: hinge pivot + damped angle + per-frame leaf segment collider. `E / trigger / proximity` all write to same `targetAngle`.
5. Locomotion comfort: no smooth yaw, snap `30/45°` around head, fade teleport, vignette on smooth, `2.0-2.2m/s` max.
6. Perf: `dpr[1,2]`, instanced piers/baseboards, merged floor geometry, `BVH` raycast for teleport/measure, `local-floor` always.
7. AR: separate lighting (no HDRI bake), shadow-catcher only, tabletop `1:20` anchored, 1:1 no virtual locomotion.
8. BIM: quantities derived from `piers+polys`, not meshes. Costs live, waste + labor separated for estimator credibility.
