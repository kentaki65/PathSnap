
S={t:{},g:{},c:0,o:0,i:0,d:{get false(){let t=S.t[S.c];do{let e=3*S.i;[t[e],S=>S][+(t[e+2]<S.g[t[e+1]])]()}while(++S.i<t.length/3);delete S.t[S.c],S.i=0}},run(t,e,l){let c=S.c-~e-1,g=S.t[c]=[S.t[c],[]][+!S.t[c]],i=g.length;g[i]=t,g[i+1]=[l,"0"][+!l],g[i+2]=S.o++},stop(t){S.g[t]=S.o++}};
tick=()=>{S.d[!S.t[S.c]];S.c++;}

const pathState = new Map(); //playerId => {mode: str, controlPoints: arr, selectedPoints1: arr, selectedPoints2: arr, selectedBlocks: Map};
const previewTasks = {};
const PARTICLE_STEP = 1 / 120;
let startCenterPos = null;
let endCenterPos = null;

function previewCurveLoop() {
  for (const pid of api.getPlayerIds()) {
    const state = pathState.get(pid);
    if (!state || !state.controlPoints || state.controlPoints.length < 3) continue;

    if (previewTasks[pid] == null) previewTasks[pid] = 0;
    if (previewTasks[pid] > 1) previewTasks[pid] = 0;

    if (!state.curve) {
      if (state.controlPoints.length >= 2) {
        state.curve = new BezierCurve(state.controlPoints);
      } else {
        continue;
      }
    }
    const t = previewTasks[pid];
    const [x, y, z] = state.curve.getPoint(t);

    api.playParticleEffect({
      dir1: [-1, -1, -1],
      dir2: [1, 1, 1],
      pos1: [x, y, z],
      pos2: [x, y, z],
      texture: "square_particle",
      minLifeTime: 5,
      maxLifeTime: 5,
      minEmitPower: 0,
      maxEmitPower: 0,
      minSize: 0.6,
      maxSize: 0.6,
      manualEmitCount: 1,
      gravity: [0, 0, 0],
      colorGradients: [{
        timeFraction: 0,
        minColor: [60, 60, 150, 1],
        maxColor: [200, 200, 255, 1],
      }],
      velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
      blendMode: 1,
    });

    previewTasks[pid] = t + PARTICLE_STEP;
  }
  S.run(previewCurveLoop, 1, "previewCurve");
}

function controlPointGlowLoop() {
  for (const pid of api.getPlayerIds()) {
    const state = pathState.get(pid);
    if (!state || !state.controlPoints) continue;

    for (const pos of state.controlPoints) {
      api.playParticleEffect({
        dir1: [-1, -1, -1],
        dir2: [1, 1, 1],
        pos1: pos,
        pos2: pos,
        texture: "glint",
        minLifeTime: 10,
        maxLifeTime: 10,
        minEmitPower: 0,
        maxEmitPower: 0,
        minSize: 5,
        maxSize: 5,
        manualEmitCount: 1,
        gravity: [0, 0, 0],
        colorGradients: [{
          timeFraction: 0,
          minColor: [60, 60, 150, 1],
          maxColor: [200, 200, 255, 1],
        }],
        velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
        blendMode: 1,
      });
    }
  }

  S.run(controlPointGlowLoop, 200, "controlGlow");
}

onPlayerJoin=(playerId)=>{
  S.run(controlPointGlowLoop, 1, "controlGlow");
  S.run(previewCurveLoop, 1, "previewCurve");
};

function updateUI(playerId, isEnable){
  const st = pathState.get(playerId);
  const space = "\u3000".repeat(10);
  const crosshairText = {
    str:
      space + "-- Line Placement --\n" +
      space + "Right Click: Add control point\t\t/mode: Change mode\n" +
      space + "Left Click: Remove last control point    /do: Generate\n" +
      space + `Control Points: ${String(st.controlPoints.length).padStart(2, "0")}\t\t\t\tMode: ${st.mode}`,
    style: {
      fontSize: "15px",
    },
  }
  if(isEnable)api.setClientOption(playerId, "crosshairText", [crosshairText]);
  else api.setClientOption(playerId, "crosshairText", "");
}

function fillSegment(p0, p1, place) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const dz = p1[2] - p0[2];

  const steps = Math.ceil(Math.max(
    Math.abs(dx),
    Math.abs(dy),
    Math.abs(dz)
  ));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    place(
      p0[0] + dx * t,
      p0[1] + dy * t,
      p0[2] + dz * t
    );
  }
}

function rebuildSection(playerId, st) {
  if (!st.selectionPoints1 || !st.selectionPoints2) return;

  const fixed =
    Math.abs(st.selectionPoints1[0] - st.selectionPoints2[0]) <= 0.5 ? 0 :
    Math.abs(st.selectionPoints1[2] - st.selectionPoints2[2]) <= 0.5 ? 2 :
    null;
  if (fixed === null) return;

  const move = fixed ^ 2;

  const minH = Math.min(st.selectionPoints1[move], st.selectionPoints2[move]);
  const maxH = Math.max(st.selectionPoints1[move], st.selectionPoints2[move]);
  const minY = Math.min(st.selectionPoints1[1], st.selectionPoints2[1]);
  const maxY = Math.max(st.selectionPoints1[1], st.selectionPoints2[1]);

  const map = new Map();

  for (let h = minH; h <= maxH; h++) {
    for (let y = minY; y <= maxY; y++) {
      const world = [st.selectionPoints1[0], y, st.selectionPoints1[2]];
      world[move] = h;

      const blockId = api.getBlockId(world[0], world[1], world[2]);
      if (blockId === 0 || blockId === 1) continue;

      const dx = h - st.selectionPoints1[move];
      const dy = y - st.selectionPoints1[1];
      map.set(`${dx},${dy}`, blockId);
    }
  }

  st.selectedPoints = map;
  api.sendMessage(playerId, `Selection complete. Added ${map.size} blocks.`);
}

function getSnapFromBlock(x, y, z) {
  const bd = api.getBlockData(x, y, z);
  return bd?.persisted?.shared?.snap ?? null;
}

function applySnap(playerId, bx, by, bz, snap) {
  const st = pathState.get(playerId);
  if (!st) return;

  const cx = bx + 0.5;
  const cy = by + 0.5;
  const cz = bz + 0.5;

  const cps = st.controlPoints;
  cps.length = 0;

  const p0 = [cx, cy, cz];

  let handle;

  if (snap.endHandle) {
    handle = [
      -snap.endHandle[0],
      -snap.endHandle[1],
      -snap.endHandle[2],
    ];
  } else {
    const dir = snap.dir;
    const len = snap.handleLen ?? curve.getEndHandleLength();
    handle = [dir[0] * len, dir[1] * len, dir[2] * len];
  }

  const p1 = [
    p0[0] + handle[0],
    p0[1] + handle[1],
    p0[2] + handle[2],
  ];

  cps.push(p0, p1);

  st.curve = new BezierCurve(cps);
  st.awaitingNextPoint = true;

  api.sendMessage(playerId, "Snapped seamlessly to the previous curve.");
}


class BezierCurve {
  constructor(points) {
    if(!points || points.length < 2){
      throw new Error("Not enough points.");
    };
    this.points = points.map(p=>[...p]);
  }

  getPoint(t) { //tは0~1の範囲
    const pts = this.points.map(p=>[...p]);
    
    for(let k = pts.length - 1;k > 0;k--){
      for(let i = 0; i < k; i++){
        pts[i][0] = pts[i][0] * (1 - t) + pts[i + 1][0] * t;
        pts[i][1] = pts[i][1] * (1 - t) + pts[i + 1][1] * t;
        pts[i][2] = pts[i][2] * (1 - t) + pts[i + 1][2] * t;
      }
    }
    return pts[0];
  }

  getTangent(t) {
    const pts = this.points.map(p => [...p]);

    for (let k = pts.length - 1; k > 1; k--) {
      for (let i = 0; i < k; i++) {
        pts[i][0] = pts[i][0] * (1 - t) + pts[i + 1][0] * t;
        pts[i][1] = pts[i][1] * (1 - t) + pts[i + 1][1] * t;
        pts[i][2] = pts[i][2] * (1 - t) + pts[i + 1][2] * t;
      }
    }

    return [
      pts[1][0] - pts[0][0],
      pts[1][1] - pts[0][1],
      pts[1][2] - pts[0][2],
    ];
  }

  getEndHandleLength() {
    const n = this.points.length;
    if (n < 2) return 0;
    const pEnd = this.points[n - 1];
    const pPrev = this.points[n - 2];
    return Math.hypot(
      pEnd[0] - pPrev[0],
      pEnd[1] - pPrev[1],
      pEnd[2] - pPrev[2]
    );
  }
}

onPlayerClick = (playerId, wasAltClick, x, y, z, blockName) => {
  let st = pathState.get(playerId);
  if (!st) {
    st = { mode: "selection", controlPoints: [] };
    pathState.set(playerId, st);
  }

  const heldItem = api.getHeldItem(playerId);
  if (!heldItem || !heldItem.name.includes("Axe")) {
    updateUI(playerId, false);
    return;
  }

  if(st.mode === "curve"){
    updateUI(playerId, true);

    const pos = [x, y, z];
    if (!st.controlPoints) st.controlPoints = [];
    if(wasAltClick && pos.some(v => v !== undefined)){
      const snap = getSnapFromBlock(x,y,z);
      if(snap !== null){
        applySnap(playerId, x, y, z, snap);
      }else if (st.awaitingNextPoint) {
        api.sendMessage(playerId, "Control points have been automatically adjusted.");
        st.controlPoints.push([x, y, z]);
        st.awaitingNextPoint = false;
      }else {
        st.controlPoints.push([x, y, z]);
      }
      api.sendMessage(playerId, "Control point added.");
    }else{
      st.controlPoints.pop();
      api.sendMessage(playerId, "Last control point removed.");
    }

    if (st.controlPoints.length >= 2) {
      st.curve = new BezierCurve(st.controlPoints);
    } else {
      st.curve = null;
    }

    api.log(st.controlPoints);
  }else if (st.mode === "selection") {
    if (!wasAltClick) {
      if (x != null && y != null && z != null) {
        st.selectionPoints1 = [x, y, z];
        api.sendMessage(playerId, `Pos1: ${[x, y, z]}`)
        updateUI(playerId, true);
      }
    } else {
      if (x != null && y != null && z != null) {
        st.selectionPoints2 = [x, y, z];
        api.sendMessage(playerId, `Pos2: ${[x, y, z]}`)

        rebuildSection(playerId, st);
        updateUI(playerId, true);
      }
    }
  }
};

playerCommand = (playerId, cmd) => {
  let st = pathState.get(playerId);
  if(!st){
    st = { mode: "selection", controlPoints: [] };
    pathState.set(playerId, st);
  }

  const parts = cmd.split(" ");
  const command = parts[0];

  if(command==="mode"){
    if(st.mode === "selection"){
      st.mode = "curve";
      api.sendMessage(playerId, "Mode set to \"curve\".");
      updateUI(playerId, true);
      return true;
    }else{
      st.mode = "selection";
      api.sendMessage(playerId, "Mode set to \"selection\".");
      updateUI(playerId, true);
      return true;
    }
  } else if (command === "do") {
    if (!st || !st.curve || !st.selectedPoints) {
      api.sendMessage(playerId, "No blocks selected.");
      return true;
    }

    const curve = st.curve;
    const stepT = 1 / 300;
    let t = 0;
    let prevPoint = curve.getPoint(0);

    const STEPS_PER_TICK = 3;
    const placed = new Set();
    const p0 = curve.getPoint(0);

    startCenterPos = [
      Math.round(p0[0]),
      Math.round(p0[1]),
      Math.round(p0[2]),
    ];

    const p1 = curve.getPoint(1);
    endCenterPos = [
      Math.round(p1[0]),
      Math.round(p1[1]),
      Math.round(p1[2]),
    ];

    const lastCurve = st.lastCurve;

    let Pn_1, Pn1_1, Pn_2, Pn1_2;
    if (lastCurve) {
      Pn_1  = lastCurve.points.at(-1);
      Pn1_1 = lastCurve.points.at(-2);

      Pn_2  = lastCurve.points.at(0);
      Pn1_2 = lastCurve.points.at(1);
    }
    const placeBlock = (x, y, z, blockId) => {
      const k =
        (x & 1023) |
        ((y & 1023) << 10) |
        ((z & 1023) << 20);

      if (placed.has(k)) return;
      placed.add(k);
      try{api.setBlock(x, y, z, api.blockIdToBlockName(blockId));}catch(e){};
    };

    let min = Infinity, max = -Infinity;
    for (const key of st.selectedPoints.keys()) {
      const [dx] = key.split(",").map(Number);
      min = Math.min(min, dx);
      max = Math.max(max, dx);
    }
    const dxCenter = (min + max) / 2;
    const placeLoop = () => {
      for (let n = 0; n < STEPS_PER_TICK; n++) {
        if (t > 1) {
          api.sendMessage(playerId, "Curve generated and placed successfully.");
          st.lastCurve = curve;
          st.controlPoints = [];

          if (lastCurve) {
            const makeEndpoint = (t) => {
              const p = curve.getPoint(t);
              const [tx, ty, tz] = curve.getTangent(t);
              const l = Math.hypot(tx, ty, tz) || 1;

              return {
                pos: [
                  Math.round(p[0]),
                  Math.round(p[1]),
                  Math.round(p[2])
                ],
                dir: [tx / l, ty / l, tz / l],
              };
            };

            api.setBlockData(...startCenterPos, {
              persisted: {
                shared: {
                  snap: makeEndpoint(0),
                  handleLen: curve.getEndHandleLength(),
                  endHandle: [
                    Pn_2[0] - Pn1_2[0],
                    Pn_2[1] - Pn1_2[1],
                    Pn_2[2] - Pn1_2[2],
                  ]
                }
              }
            });
            api.setBlockData(...endCenterPos, {
              persisted: {
                shared: {
                  snap: makeEndpoint(1),
                  handleLen: curve.getEndHandleLength(),
                  endHandle: [
                    Pn_1[0] - Pn1_1[0],
                    Pn_1[1] - Pn1_1[1],
                    Pn_1[2] - Pn1_1[2],
                  ]
                }
              }
            });
          }

          return;
        }

        const currPoint = curve.getPoint(t);
        const [tx, ty, tz] = curve.getTangent(t);
        const l = Math.hypot(tx, ty, tz) || 1;
        const nx = tx / l;
        const nz = tz / l;
        const sx = -nz;
        const sz =  nx;

        fillSegment(prevPoint, currPoint, (x, y, z) => {
          if(x === undefined || y === undefined || z === undefined)return;
          for (const [key, blockId] of st.selectedPoints) {
            const [dx, dy] = key.split(",").map(Number);
            const cx = dx - dxCenter;

            const wx = Math.round(x + sx * cx);
            const wy = Math.round(y + dy);
            const wz = Math.round(z + sz * cx);

            placeBlock(wx, wy, wz, blockId);
          }
        });

        prevPoint = currPoint;
        t += stepT;
      }

      S.run(placeLoop, 1, `do-${playerId}`);
    };
    S.run(placeLoop, 1, `do-${playerId}`);
    return true;
  }
};
