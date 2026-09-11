import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sparkles, Key, DoorClosed, RotateCcw, Eye, Compass, Crosshair } from "lucide-react";
import { GameplayPhase } from "@/types/treasure";
import { treasureHalalAudio } from "@/lib/treasureAudio";

interface TreasureWorld3DProps {
  currentPhase: GameplayPhase;
  keyFound: boolean;
  onInspectKey: () => void;
  onApproachPortal: () => void;
  onWebGLError?: () => void;
  isChestOpen?: boolean;
  currentChallengeStep?: number;
}

// Procedural Curved Smooth Palm Frond Geometry (Blender-quality Ribbon Mesh)
function createCurvedPalmFrondGeometry(length = 4.8, maxWidth = 0.72, numSegments = 16): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const z = t * length;
    // Natural parabolic droop curve
    const y = -Math.pow(t, 1.85) * (length * 0.45);
    // Leaf width envelope: starts small, widens in middle, tapers to fine tip
    let w = Math.sin(t * Math.PI) * maxWidth;
    if (t < 0.18) w *= t / 0.18; // Smooth taper near stem base

    // Left vertex (slightly angled down for realistic leaf blade angle)
    positions.push(-w * 0.5, y - w * 0.12, z);
    uvs.push(0, t);

    // Center spine vertex
    positions.push(0, y, z);
    uvs.push(0.5, t);

    // Right vertex
    positions.push(w * 0.5, y - w * 0.12, z);
    uvs.push(1, t);

    if (i < numSegments) {
      const r1 = i * 3;
      const r2 = (i + 1) * 3;
      // Left triangular faces
      indices.push(r1, r2, r1 + 1);
      indices.push(r1 + 1, r2, r2 + 1);
      // Right triangular faces
      indices.push(r1 + 1, r2 + 1, r1 + 2);
      indices.push(r1 + 2, r2 + 1, r2 + 2);
    }
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Procedural Starfish Geometry
function createStarfishGeometry(radius = 0.5, numPoints = 5): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < numPoints * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.38;
    const angle = (i / (numPoints * 2)) * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// Procedural Realistic Curved Galleon Ship Hull Geometry (Smooth Naval Architecture)
function createCurvedShipHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const numStations = 17; // 17 cross sections from stern (z = -6.6) to bow (z = 6.6)
  const zMin = -6.6;
  const zMax = 6.6;

  for (let i = 0; i < numStations; i++) {
    const t = i / (numStations - 1);
    const z = zMin + t * (zMax - zMin);

    // Keel profile: deeper at center, rises at stern and bows up at cutwater
    let yKeel = -1.25;
    if (t < 0.25) {
      yKeel = THREE.MathUtils.lerp(-0.45, -1.25, t / 0.25);
    } else if (t > 0.7) {
      yKeel = THREE.MathUtils.lerp(-1.25, 0.55, Math.pow((t - 0.7) / 0.3, 1.4));
    }

    // Hull width envelope (beam): flat transom at stern, widest at midship, tapers to fine cutwater
    let w = 2.45 * Math.sin(Math.PI * (t * 0.78 + 0.12));
    if (t < 0.2) {
      w = THREE.MathUtils.lerp(1.72, 2.35, t / 0.2);
    } else if (t > 0.8) {
      w = THREE.MathUtils.lerp(1.95, 0.05, Math.pow((t - 0.8) / 0.2, 1.2));
    }

    // Deck / Gunwale Sheer profile: elevated multi-deck stern poop deck, low waist, rising forecastle
    let yDeck = 1.42;
    if (t <= 0.25) {
      yDeck = THREE.MathUtils.lerp(3.35, 1.5, t / 0.25);
    } else if (t >= 0.75) {
      yDeck = THREE.MathUtils.lerp(1.5, 2.65, Math.pow((t - 0.75) / 0.25, 1.3));
    }

    const depth = yDeck - yKeel;

    // 7 vertices across this station:
    // 0: Port Rail, 1: Port Mid (Tumblehome), 2: Port Bilge, 3: Keel Center, 4: Starboard Bilge, 5: Starboard Mid, 6: Starboard Rail
    const crossPoints = [
      [-w * 0.94, yDeck, z],
      [-w, yKeel + depth * 0.65, z],
      [-w * 0.62, yKeel + depth * 0.22, z],
      [0, yKeel, z],
      [w * 0.62, yKeel + depth * 0.22, z],
      [w, yKeel + depth * 0.65, z],
      [w * 0.94, yDeck, z],
    ];

    crossPoints.forEach(([x, y, pZ], ptIdx) => {
      positions.push(x, y, pZ);
      uvs.push(ptIdx / 6, t);
    });

    if (i < numStations - 1) {
      for (let s = 0; s < 6; s++) {
        const v0 = i * 7 + s;
        const v1 = (i + 1) * 7 + s;
        const v2 = (i + 1) * 7 + s + 1;
        const v3 = i * 7 + s + 1;
        indices.push(v0, v1, v2);
        indices.push(v0, v2, v3);
      }
    }
  }

  // Stern Transom Cap (back wall of sterncastle)
  const sternCenterIndex = positions.length / 3;
  positions.push(0, 3.35, zMin); // Top center point of transom
  uvs.push(0.5, 1);

  for (let s = 0; s < 6; s++) {
    indices.push(s, s + 1, sternCenterIndex);
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Procedural Curved Fern Leaf Geometry
function createFernFrondGeometry(length = 2.4, maxWidth = 0.45): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const segs = 10;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = t * length;
    const y = -Math.pow(t, 2) * (length * 0.35);
    const w = Math.sin(t * Math.PI) * maxWidth;

    positions.push(-w * 0.5, y - w * 0.1, z);
    uvs.push(0, t);
    positions.push(0, y, z);
    uvs.push(0.5, t);
    positions.push(w * 0.5, y - w * 0.1, z);
    uvs.push(1, t);

    if (i < segs) {
      const r1 = i * 3;
      const r2 = (i + 1) * 3;
      indices.push(r1, r2, r1 + 1);
      indices.push(r1 + 1, r2, r2 + 1);
      indices.push(r1 + 1, r2 + 1, r1 + 2);
      indices.push(r1 + 2, r2 + 1, r2 + 2);
    }
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function TreasureWorld3D({
  currentPhase,
  keyFound,
  onInspectKey,
  onApproachPortal,
  onWebGLError,
  isChestOpen = false,
  currentChallengeStep = 1,
}: TreasureWorld3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [radarCompassDeg, setRadarCompassDeg] = useState(0);
  const [isLockedOnKey, setIsLockedOnKey] = useState(false);
  const [keyScreenPos, setKeyScreenPos] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const lastSonarTimeRef = useRef(0);

  // Fresh callbacks
  const onInspectKeyRef = useRef(onInspectKey);
  onInspectKeyRef.current = onInspectKey;
  const onApproachPortalRef = useRef(onApproachPortal);
  onApproachPortalRef.current = onApproachPortal;
  const onWebGLErrorRef = useRef(onWebGLError);
  onWebGLErrorRef.current = onWebGLError;
  const keyFoundRef = useRef(keyFound);
  keyFoundRef.current = keyFound;
  const currentPhaseRef = useRef(currentPhase);
  currentPhaseRef.current = currentPhase;
  const isChestOpenRef = useRef(isChestOpen);
  isChestOpenRef.current = isChestOpen;
  const currentChallengeStepRef = useRef(currentChallengeStep);
  currentChallengeStepRef.current = currentChallengeStep;

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Animated object references
  const keyGroupRef = useRef<THREE.Group | null>(null);
  const bubbleMeshRef = useRef<THREE.Mesh | null>(null);
  const keyGlowLightRef = useRef<THREE.PointLight | null>(null);
  const chestGroupRef = useRef<THREE.Group | null>(null);
  const chestLidRef = useRef<THREE.Group | null>(null);
  const portalRingsRef = useRef<THREE.Mesh[]>([]);
  const portalCoreRef = useRef<THREE.Mesh | null>(null);
  const cloudsRef = useRef<THREE.Group[]>([]);
  const seagullsRef = useRef<
    {
      group: THREE.Group;
      speed: number;
      radius: number;
      angle: number;
      altitude: number;
      leftWing: THREE.Mesh;
      rightWing: THREE.Mesh;
    }[]
  >([]);
  const sunBeamsRef = useRef<THREE.Mesh | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const waterInitialVerticesRef = useRef<Float32Array | null>(null);
  const foamRingsRef = useRef<{ mesh: THREE.Mesh; baseRadius: number; speed: number; offset: number }[]>([]);
  const torchLightsRef = useRef<THREE.PointLight[]>([]);
  const templeFlamesRef = useRef<THREE.Mesh[]>([]);
  const sparklesRef = useRef<THREE.Points | null>(null);
  const gateLocksRef = useRef<THREE.Group[]>([]);
  const patrollingExplorerRef = useRef<{
    group: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    torchLight: THREE.PointLight;
  } | null>(null);
  const lookoutPirateRef = useRef<{
    group: THREE.Group;
    head: THREE.Mesh;
    spyglass: THREE.Group;
  } | null>(null);
  const dockedSailboatRef = useRef<THREE.Group | null>(null);
  const campfireSmokeRef = useRef<
    { mesh: THREE.Mesh; initialY: number; speed: number; seed: number }[]
  >([]);
  const butterfliesRef = useRef<
    {
      group: THREE.Group;
      wingL: THREE.Mesh;
      wingR: THREE.Mesh;
      center: THREE.Vector3;
      radius: number;
      speed: number;
      phase: number;
    }[]
  >([]);
  const parrotRef = useRef<{
    group: THREE.Group;
    wingL: THREE.Group;
    wingR: THREE.Group;
    speed: number;
    angle: number;
    altitude: number;
    radiusX: number;
    radiusZ: number;
  } | null>(null);
  const watchtowerFireRef = useRef<THREE.Mesh[]>([]);
  const schoolOfFishRef = useRef<
    { group: THREE.Group; speed: number; radius: number; phase: number; baseY: number }[]
  >([]);
  const bottleRef = useRef<THREE.Group | null>(null);


  // Camera targets & smooth transition
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 10.5, 23.5));
  const targetCamLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3.5, -1.0));
  const camStartPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 10.5, 23.5));
  const camStartLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3.5, -1.0));
  const transitionProgressRef = useRef<number>(1.0);
  const isUserInteractingRef = useRef<boolean>(false);

  // Responsive camera destination logic
  const setCameraDestination = (pos: THREE.Vector3, look: THREE.Vector3) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const finalPos = pos.clone();

    // Auto-scale distance dynamically for portrait / mobile screens so the entire island, sky & gate fit beautifully
    if (aspect < 1.0) {
      const pullFactor = Math.min(18.0, (1.0 - aspect) * 20.0);
      const dir = pos.clone().sub(look).normalize();
      finalPos.add(dir.multiplyScalar(pullFactor));
      finalPos.y += pullFactor * 0.32;
    }

    targetCamPosRef.current.copy(finalPos);
    targetCamLookRef.current.copy(look);

    if (!cameraRef.current || !controlsRef.current) return;

    camStartPosRef.current.copy(cameraRef.current.position);
    camStartLookRef.current.copy(controlsRef.current.target);
    transitionProgressRef.current = 0;
    isUserInteractingRef.current = false;
  };

  useEffect(() => {
    if (currentPhase === "briefing") {
      setCameraDestination(new THREE.Vector3(0, 10.5, 23.0), new THREE.Vector3(0, 3.2, 0));
      if (chestGroupRef.current) chestGroupRef.current.visible = false;
    } else if (currentPhase === "exploration") {
      if (!keyFound) {
        // High panoramic perspective: sky, clouds, soaring seagulls, palms, key, and temple gate all in view!
        setCameraDestination(new THREE.Vector3(0, 9.5, 23.5), new THREE.Vector3(0, 3.8, -2.0));
      }
      if (chestGroupRef.current) chestGroupRef.current.visible = false;
    } else if (currentPhase === "key_found") {
      // Smoothly approach the temple gate
      setCameraDestination(new THREE.Vector3(0, 8.5, 16.5), new THREE.Vector3(0, 3.8, -4.5));
      if (chestGroupRef.current) chestGroupRef.current.visible = false;
    } else if (currentPhase === "portal" || currentPhase === "challenges") {
      setCameraDestination(new THREE.Vector3(0, 5.5, 4.0), new THREE.Vector3(0, 4.8, -6.5));
      if (chestGroupRef.current) chestGroupRef.current.visible = false;
    } else if (currentPhase === "treasure" || currentPhase === "completed") {
      setCameraDestination(new THREE.Vector3(0, 3.6, 5.5), new THREE.Vector3(0, 1.4, 1.5));
      if (chestGroupRef.current) {
        chestGroupRef.current.visible = true;
      }
    }
  }, [currentPhase, keyFound]);

  const handleResetCamera = () => {
    setCameraDestination(targetCamPosRef.current, targetCamLookRef.current);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    if (!gl) {
      if (onWebGLErrorRef.current) onWebGLErrorRef.current();
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // 1. Scene & Rich Atmospheric Sky
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0x38bdf8, 0.009);

    // 2. Responsive Perspective Camera (Adapts to Mobile Portrait)
    const initialFov = aspect < 1.0 ? Math.min(72, 45 + (1.0 - aspect) * 32) : 45;
    const camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.1, 200);
    camera.position.copy(targetCamPosRef.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer with Soft PCF Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. OrbitControls with Touch Support
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3.8;
    controls.maxDistance = 38.0;
    controls.maxPolarAngle = Math.PI / 2.06;
    controls.minPolarAngle = 0.12;
    controls.rotateSpeed = aspect < 1.0 ? 0.85 : 0.65;
    controls.zoomSpeed = 1.0;
    controls.target.copy(targetCamLookRef.current);
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    controls.addEventListener("start", () => {
      isUserInteractingRef.current = true;
      transitionProgressRef.current = 1.0;
    });

    // 5. Cinematic Lighting (Golden Sun + Soft Shadows)
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.6);
    sunLight.position.set(22, 34, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.camera.left = -26;
    sunLight.shadow.camera.right = 26;
    sunLight.shadow.camera.top = 26;
    sunLight.shadow.camera.bottom = -26;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfde047, 0.95);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xfef08a, 0.4);
    scene.add(ambientLight);

    // 6. Pixar Sun & Godrays
    const sunGroup = new THREE.Group();
    sunGroup.position.set(28, 34, -32);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffea00 })
    );
    sunGroup.add(sunMesh);

    const sunGlowRing = new THREE.Mesh(
      new THREE.RingGeometry(4.4, 8.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    sunGroup.add(sunGlowRing);

    const sunBeams = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 12.0, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    sunGroup.add(sunBeams);
    sunBeamsRef.current = sunBeams;
    scene.add(sunGroup);

    // 7. Dynamic Stylized Ocean (Wave Displacements)
    const oceanRadius = 55;
    const oceanGeo = new THREE.CylinderGeometry(oceanRadius, oceanRadius, 2.2, 64, 10);
    const posAttr = oceanGeo.attributes.position;
    const initialPos = new Float32Array(posAttr.array.length);
    initialPos.set(posAttr.array);
    waterInitialVerticesRef.current = initialPos;

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Tropical azure cyan
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
    });
    const waterMesh = new THREE.Mesh(oceanGeo, oceanMat);
    waterMesh.position.y = -1.6;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Expanding Foam Rings on Shoreline
    const foamRings: { mesh: THREE.Mesh; baseRadius: number; speed: number; offset: number }[] = [];
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xf0fdfa, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    for (let f = 0; f < 4; f++) {
      const baseR = 15.2 + f * 1.4;
      const foam = new THREE.Mesh(new THREE.RingGeometry(baseR, baseR + 0.5, 48), foamMat);
      foam.rotation.x = Math.PI / 2;
      foam.position.y = -0.75;
      scene.add(foam);
      foamRings.push({ mesh: foam, baseRadius: baseR, speed: 1.1 + f * 0.25, offset: f * 1.6 });
    }
    foamRingsRef.current = foamRings;

    // 8. EXPANDED ISLAND TERRAIN (Radius 16.5m - 40% Larger!)
    const islandGroup = new THREE.Group();

    // Sandy Beach with natural gentle contour
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Golden amber sand
      roughness: 0.85,
    });
    const sandGeo = new THREE.CylinderGeometry(16.5, 13.5, 2.8, 48);
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.position.y = -1.0;
    sandMesh.receiveShadow = true;
    islandGroup.add(sandMesh);

    // Natural Sand Dunes along perimeter
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    for (let d = 0; d < 6; d++) {
      const angle = (d / 6) * Math.PI * 2 + 0.2;
      const dune = new THREE.Mesh(new THREE.ConeGeometry(4.2, 0.9, 8), duneMat);
      dune.scale.set(1.5, 0.45, 2.0);
      dune.rotation.y = angle;
      dune.position.set(Math.cos(angle) * 11.5, 0.1, Math.sin(angle) * 11.5);
      dune.receiveShadow = true;
      islandGroup.add(dune);
    }

    // Lush Sculpted Green Grass Plateau
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a, // Emerald lush green
      roughness: 0.6,
    });
    const grassGeo = new THREE.CylinderGeometry(14.0, 15.0, 0.8, 48);
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = 0.4;
    grassMesh.receiveShadow = true;
    islandGroup.add(grassMesh);

    // Rolling Grassy Hills (Placed outwards, leaving center open!)
    const hillGeo = new THREE.SphereGeometry(4.2, 16, 12);
    const hill1 = new THREE.Mesh(hillGeo, grassMat);
    hill1.scale.set(1.5, 0.35, 1.3);
    hill1.position.set(-6.5, 0.2, -4.5);
    hill1.receiveShadow = true;
    islandGroup.add(hill1);

    const hill2 = new THREE.Mesh(hillGeo, grassMat);
    hill2.scale.set(1.4, 0.32, 1.2);
    hill2.position.set(7.2, 0.2, 4.0);
    hill2.receiveShadow = true;
    islandGroup.add(hill2);

    // Natural Stepping Stone Path towards Ancient Gate
    const stonePathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    for (let z = 6.2; z >= -4.8; z -= 1.3) {
      const xOffset = Math.sin(z * 1.1) * 0.4;
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9 + Math.sin(z) * 0.1, 1.0, 0.16, 7),
        stonePathMat
      );
      stone.position.set(xOffset, 0.48, z);
      stone.rotation.y = z * 1.6;
      stone.receiveShadow = true;
      islandGroup.add(stone);
    }

    // Coastal Rocks & Boulders
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const rockPositions = [
      { x: -13.5, z: 4.5, s: 1.5 },
      { x: -12.2, z: 7.0, s: 1.1 },
      { x: 13.8, z: -3.0, s: 1.6 },
      { x: 12.0, z: -6.2, s: 1.2 },
      { x: -7.5, z: -12.5, s: 1.7 },
      { x: 7.2, z: 12.0, s: 1.4 },
      { x: -3.5, z: 14.5, s: 1.3 },
    ];
    rockPositions.forEach(({ x, z, s }) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), rockMat);
      rock.position.set(x, -0.2 + s * 0.4, z);
      rock.rotation.set(x * 0.4, z * 0.3, 0.2);
      rock.castShadow = true;
      rock.receiveShadow = true;
      islandGroup.add(rock);
    });

    // 9. NEW ISLAND PROPS: Pirate Wooden Crates & Water Barrels!
    const woodCrateMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.75 });
    const ironStrapMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });

    const createWoodenCrate = (x: number, y: number, z: number, rotY = 0, scale = 1.0) => {
      const crate = new THREE.Group();
      crate.position.set(x, y, z);
      crate.rotation.y = rotY;
      crate.scale.set(scale, scale, scale);

      const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), woodCrateMat);
      box.position.y = 0.6;
      box.castShadow = true;
      box.receiveShadow = true;
      crate.add(box);

      // Iron corner brackets
      for (let sx of [-0.61, 0.61]) {
        for (let sz of [-0.61, 0.61]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.22, 0.12), ironStrapMat);
          strap.position.set(sx * 0.96, 0.6, sz * 0.96);
          crate.add(strap);
        }
      }
      islandGroup.add(crate);
    };

    // Stacks of crates near outer sides
    createWoodenCrate(7.5, 0.4, 5.5, 0.25, 0.95);
    createWoodenCrate(8.4, 0.4, 6.2, -0.4, 0.85);
    createWoodenCrate(7.8, 1.5, 5.8, 0.1, 0.8);
    createWoodenCrate(-7.8, 0.4, 5.8, 0.5, 0.9);

    // Weathered Rum/Water Barrels
    const createBarrel = (x: number, y: number, z: number, rotZ = 0) => {
      const barrel = new THREE.Group();
      barrel.position.set(x, y, z);
      barrel.rotation.z = rotZ;
      const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 12), woodCrateMat);
      bBody.position.y = 0.65;
      bBody.castShadow = true;
      bBody.receiveShadow = true;
      barrel.add(bBody);

      [-0.25, 0.25].forEach((h) => {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.09, 12), ironStrapMat);
        hoop.position.y = 0.65 + h * 0.9;
        barrel.add(hoop);
      });
      islandGroup.add(barrel);
    };

    createBarrel(9.2, 0.4, 5.4);
    createBarrel(-8.6, 0.4, 6.0);

    // 10. NEW BEACH PROPS: Colorful Starfish & Seashells on Sand
    const starfishGeo = createStarfishGeometry(0.48);
    const starOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const starRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });

    const createStarfish = (x: number, z: number, isRed = false, rotY = 0) => {
      const star = new THREE.Mesh(starfishGeo, isRed ? starRedMat : starOrangeMat);
      star.rotation.x = -Math.PI / 2;
      star.rotation.z = rotY;
      star.position.set(x, -0.2, z);
      star.receiveShadow = true;
      islandGroup.add(star);
    };

    createStarfish(9.2, 8.5, false, 0.4);
    createStarfish(-9.5, 9.2, true, 1.2);
    createStarfish(2.8, 12.2, false, 2.1);
    createStarfish(-12.5, -4.0, true, 0.8);

    // Seashells
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
    const shellGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
    for (let s = 0; s < 6; s++) {
      const sAngle = s * 1.1 + 0.5;
      const sRadius = 14.2 + (s % 2) * 0.8;
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.rotation.z = Math.PI / 2;
      shell.rotation.y = sAngle;
      shell.position.set(Math.cos(sAngle) * sRadius, -0.3, Math.sin(sAngle) * sRadius);
      islandGroup.add(shell);
    }

    // Wooden Pier / Dock extending into ocean
    const dockGroup = new THREE.Group();
    dockGroup.position.set(0, 0, 11.5);

    for (let p = 0; p < 6; p++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.65), woodCrateMat);
      plank.position.set(0, 0.25, p * 0.68);
      plank.receiveShadow = true;
      dockGroup.add(plank);
    }
    for (let side of [-1.25, 1.25]) {
      for (let postZ of [0.6, 2.0, 3.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 8), woodCrateMat);
        post.position.set(side, -0.35, postZ);
        post.castShadow = true;
        dockGroup.add(post);
      }
    }
    islandGroup.add(dockGroup);

    // Ancient Weathered Column Ruin at island edge (بدلاً من المخروط الرمادي)
    const ruinGroup = new THREE.Group();
    ruinGroup.position.set(-8.5, 0.4, 3.2);
    ruinGroup.rotation.y = 0.4;

    const ruinStoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const ruinGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });

    const rBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), ruinStoneMat);
    rBase.position.y = 0.25;
    rBase.receiveShadow = true;
    rBase.castShadow = true;
    ruinGroup.add(rBase);

    const rShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 2.4, 10), ruinStoneMat);
    rShaft.position.y = 1.6;
    rShaft.castShadow = true;
    ruinGroup.add(rShaft);

    const rBand = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.2, 10), ruinGoldMat);
    rBand.position.y = 2.4;
    ruinGroup.add(rBand);

    // Broken Capital fragment lying on ground
    const rCap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), ruinStoneMat);
    rCap.position.set(0.9, 0.2, 0.5);
    rCap.rotation.set(0.2, 0.5, -0.3);
    rCap.castShadow = true;
    ruinGroup.add(rCap);

    islandGroup.add(ruinGroup);

    scene.add(islandGroup);

    // 11. BLENDER-QUALITY ORGANIC PALM TREES (Framing the island flanks, 100% clear central corridor!)
    const palmFrondGeo = createCurvedPalmFrondGeometry(3.3, 0.55, 16);
    const palmLeafMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Lush tropical emerald green
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const palmTrunkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6e3814, // Rich organic wood bark
      roughness: 0.8,
    });
    const cocoNutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });

    const createBlenderGradePalmTree = (x: number, z: number, scale: number, leanAngle: number, leanDir: number) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0.4, z);
      tree.scale.set(scale, scale, scale);

      // Smooth Segmented Curved Trunk
      let currentX = 0;
      let currentZ = 0;
      let currentY = 0;
      const numSegments = 8;

      for (let s = 0; s < numSegments; s++) {
        const segHeight = 0.88;
        const rBottom = 0.4 - s * 0.02;
        const rTop = 0.36 - s * 0.02;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, segHeight, 10), palmTrunkWoodMat);
        const segLean = (s / numSegments) * leanAngle;
        currentX += Math.cos(leanDir) * segLean * 0.2;
        currentZ += Math.sin(leanDir) * segLean * 0.2;
        currentY += segHeight * 0.92;

        seg.position.set(currentX, currentY - segHeight * 0.5, currentZ);
        seg.rotation.z = -Math.cos(leanDir) * segLean * 0.6;
        seg.rotation.x = Math.sin(leanDir) * segLean * 0.6;
        seg.castShadow = true;
        tree.add(seg);
      }

      // Realistic Coconuts
      for (let c = 0; c < 4; c++) {
        const coco = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), cocoNutMat);
        const ca = (c / 4) * Math.PI * 2;
        coco.position.set(currentX + Math.cos(ca) * 0.36, currentY - 0.12, currentZ + Math.sin(ca) * 0.36);
        coco.castShadow = true;
        tree.add(coco);
      }

      // Multi-tier Smooth Curved Fronds (No cubes, smooth organic leaves)
      const frondTiers = [
        { count: 6, pitch: 0.32, droopScale: 0.92 },
        { count: 8, pitch: -0.04, droopScale: 1.1 },
        { count: 6, pitch: -0.36, droopScale: 0.95 },
      ];

      frondTiers.forEach((tier, tIdx) => {
        for (let l = 0; l < tier.count; l++) {
          const lAngle = (l / tier.count) * Math.PI * 2 + tIdx * 0.3;
          const frond = new THREE.Mesh(palmFrondGeo, palmLeafMat);
          frond.position.set(currentX, currentY, currentZ);
          frond.rotation.y = lAngle;
          frond.rotation.x = tier.pitch;
          frond.scale.set(tier.droopScale, tier.droopScale, tier.droopScale);
          // Leaves don't cast heavy ground shadows, preventing cluttered ground shadows
          frond.castShadow = false;
          tree.add(frond);
        }
      });

      scene.add(tree);
    };

    // PALM TREES PLACED ON OUTER FLANKS & FAR EDGES (Completely clear central key & pedestal!)
    createBlenderGradePalmTree(-13.0, -2.0, 1.3, 0.38, -0.6); // Outer left flank
    createBlenderGradePalmTree(13.2, -2.0, 1.3, 0.38, 0.6);   // Outer right flank
    createBlenderGradePalmTree(-11.5, -9.0, 1.4, 0.3, 0.8);   // Deep back left
    createBlenderGradePalmTree(11.8, -9.5, 1.3, 0.3, -0.8);   // Deep back right
    createBlenderGradePalmTree(-14.2, 3.5, 1.15, 0.35, -0.9); // Far beach left
    createBlenderGradePalmTree(14.2, 3.5, 1.15, 0.35, 0.9);   // Far beach right

    // 12. CENTRAL STONE PEDESTAL & HERO 3D KEY (Unobstructed & Clean!)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, 0.4, 1.5);

    const sandstoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.75 });
    const goldInlayMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });

    // 3-Tier Chiseled Sandstone Base
    const pedBase1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.38, 2.8), sandstoneMat);
    pedBase1.position.y = 0.19;
    pedBase1.receiveShadow = true;
    pedBase1.castShadow = true;
    pedestalGroup.add(pedBase1);

    const pedBase2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 2.2), sandstoneMat);
    pedBase2.position.y = 0.52;
    pedBase2.receiveShadow = true;
    pedBase2.castShadow = true;
    pedestalGroup.add(pedBase2);

    // Octagonal Column
    const pedColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.92, 1.45, 8), sandstoneMat);
    pedColumn.position.y = 1.38;
    pedColumn.castShadow = true;
    pedColumn.receiveShadow = true;
    pedestalGroup.add(pedColumn);

    // Golden Rune Band wrapping Column
    const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.77, 0.26, 8), goldInlayMat);
    goldBand.position.y = 1.42;
    pedestalGroup.add(goldBand);

    // Top Capital Altar
    const pedCapital = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 2.0), sandstoneMat);
    pedCapital.position.y = 2.22;
    pedCapital.castShadow = true;
    pedCapital.receiveShadow = true;
    pedestalGroup.add(pedCapital);

    // Luminous Altar Seal
    const pedSeal = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.76, 24),
      new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide })
    );
    pedSeal.rotation.x = Math.PI / 2;
    pedSeal.position.y = 2.38;
    pedestalGroup.add(pedSeal);

    scene.add(pedestalGroup);

    // 13. HERO 3D GOLDEN SECRET KEY & IRIDESCENT BUBBLE
    const keyGroup = new THREE.Group();
    keyGroup.position.set(0, 3.9, 1.5);
    keyGroupRef.current = keyGroup;

    const goldKeyMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.12,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
    });
    const keyRubyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });

    // Key Bow (Heart / Ornate Ring)
    const keyBow = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.15, 20, 40), goldKeyMat);
    keyBow.position.y = 0.98;
    keyBow.castShadow = true;
    keyGroup.add(keyBow);

    // Center Ruby Heart
    const keyRuby = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), keyRubyMat);
    keyRuby.position.y = 0.98;
    keyGroup.add(keyRuby);

    // Key Shaft
    const keyStem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 20), goldKeyMat);
    keyStem.position.y = 0.18;
    keyStem.castShadow = true;
    keyGroup.add(keyStem);

    // Key Notched Bits
    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.16), goldKeyMat);
    bit1.position.set(0.27, -0.3, 0);
    keyGroup.add(bit1);

    const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.16), goldKeyMat);
    bit2.position.set(0.22, -0.6, 0);
    keyGroup.add(bit2);

    // Iridescent Shimmering Soap Bubble
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.5,
    });
    const bubbleMesh = new THREE.Mesh(new THREE.SphereGeometry(1.48, 32, 32), bubbleMat);
    bubbleMesh.position.y = 0.32;
    keyGroup.add(bubbleMesh);
    bubbleMeshRef.current = bubbleMesh;

    // Glowing Key Light
    const keyGlowLight = new THREE.PointLight(0xf59e0b, 2.6, 6);
    keyGlowLight.position.y = 0.32;
    keyGroup.add(keyGlowLight);
    keyGlowLightRef.current = keyGlowLight;

    // Golden Ground Halo
    const keyHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.45, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    keyHalo.rotation.x = Math.PI / 2;
    keyHalo.position.y = -1.25;
    keyGroup.add(keyHalo);

    // Invisible expanded interaction hitbox (2.6 radius sphere) for flawless clicks & taps on mobile & PC
    const keyHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    keyHitbox.name = "keyInteractiveHitbox";
    keyGroup.add(keyHitbox);

    scene.add(keyGroup);

    // 14. 3D GOLDEN TREASURE CHEST (Victory Phase)
    const chestGroup = new THREE.Group();
    chestGroup.position.set(0, 0.4, 1.5);
    chestGroup.visible = isChestOpen || currentPhase === "completed" || currentPhase === "treasure";
    chestGroupRef.current = chestGroup;

    const chestBoxMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
    const chestBox = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.35, 1.75), chestBoxMat);
    chestBox.position.y = 0.68;
    chestBox.castShadow = true;
    chestBox.receiveShadow = true;
    chestGroup.add(chestBox);

    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.38, 1.78), goldKeyMat);
    strapL.position.set(-0.9, 0.68, 0);
    chestGroup.add(strapL);

    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.38, 1.78), goldKeyMat);
    strapR.position.set(0.9, 0.68, 0);
    chestGroup.add(strapR);

    // Lid
    const chestLid = new THREE.Group();
    chestLid.position.set(0, 1.35, -0.88);
    const lidWood = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 2.7, 18, 1, false, 0, Math.PI), chestBoxMat);
    lidWood.rotation.z = Math.PI / 2;
    chestLid.add(lidWood);

    for (let xPos of [-0.9, 0.9]) {
      const lidStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.91, 0.91, 0.26, 18, 1, false, 0, Math.PI), goldKeyMat);
      lidStrap.rotation.z = Math.PI / 2;
      lidStrap.position.x = xPos;
      chestLid.add(lidStrap);
    }
    chestGroup.add(chestLid);
    chestLidRef.current = chestLid;

    // Coins & Gems
    const coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10);
    for (let c = 0; c < 28; c++) {
      const coin = new THREE.Mesh(coinGeo, goldKeyMat);
      coin.position.set((Math.random() - 0.5) * 1.9, 0.98 + Math.random() * 0.28, (Math.random() - 0.5) * 1.15);
      coin.rotation.set(Math.random(), Math.random(), Math.random());
      chestGroup.add(coin);
    }

    const gemRuby = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), keyRubyMat);
    gemRuby.position.set(-0.55, 1.3, 0.2);
    chestGroup.add(gemRuby);

    const sapphireMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.8 });
    const gemSapphire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28), sapphireMat);
    gemSapphire.position.set(0.55, 1.25, -0.1);
    chestGroup.add(gemSapphire);

    scene.add(chestGroup);

    // 15. MONUMENTAL ANCIENT SUN TEMPLE GATE & 3D MASTER LOCKS
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0.4, -7.8);
    portalGroup.scale.set(0.76, 0.76, 0.76);

    // High-end Architectural Materials
    const templeSlateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
    const templeSandstoneMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.25 });
    const runeCyanMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 2.5 });
    const runeGoldMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xd97706, emissiveIntensity: 2.0 });
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 2.0, roughness: 0.2 });
    const woodDoorMat = new THREE.MeshStandardMaterial({ color: 0x3e1f0e, roughness: 0.8 });

    // A. 3-Tier Stepped Monumental Foundation Podium (قاعدة المعبد الهرمية المدرجة)
    const podium1 = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.45, 5.2), templeSlateMat);
    podium1.position.set(0, 0.22, 0.6);
    podium1.receiveShadow = true;
    podium1.castShadow = true;
    portalGroup.add(podium1);

    const podium2 = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.45, 4.2), templeSandstoneMat);
    podium2.position.set(0, 0.65, 0.3);
    podium2.receiveShadow = true;
    podium2.castShadow = true;
    portalGroup.add(podium2);

    const podium3 = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.45, 3.2), templeSlateMat);
    podium3.position.set(0, 1.08, 0);
    podium3.receiveShadow = true;
    podium3.castShadow = true;
    portalGroup.add(podium3);

    // Glowing Sacred Pathway Glyphs on Center Steps
    for (let s = 0; s < 3; s++) {
      const stepGlyph = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.45, 8), runeGoldMat);
      stepGlyph.rotation.x = -Math.PI / 2;
      stepGlyph.position.set(0, 0.25 + s * 0.43, 2.8 - s * 0.95);
      portalGroup.add(stepGlyph);
    }

    // B. Monumental Columns with Plinths & Ornate Capitals (الأعمدة الملكية المنحوتة)
    for (let side of [-3.2, 3.2]) {
      // Stepped Column Plinth (Base)
      const plinthLower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), templeSandstoneMat);
      plinthLower.position.set(side, 1.58, 0);
      plinthLower.castShadow = true;
      portalGroup.add(plinthLower);

      const plinthUpper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 2.0), goldTrimMat);
      plinthUpper.position.set(side, 2.1, 0);
      plinthUpper.castShadow = true;
      portalGroup.add(plinthUpper);

      // Fluted 12-sided Column Shaft
      const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.98, 7.6, 12), templeSlateMat);
      colShaft.position.set(side, 6.1, 0);
      colShaft.castShadow = true;
      portalGroup.add(colShaft);

      // Golden Decorative Accent Rings on Column
      for (let ringY of [3.8, 6.1, 8.4]) {
        const colRing = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.24, 12), goldTrimMat);
        colRing.position.set(side, ringY, 0);
        portalGroup.add(colRing);
      }

      // Column Capital Crown
      const colCapital = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 0.85, 0.9, 12), templeSandstoneMat);
      colCapital.position.set(side, 10.35, 0);
      colCapital.castShadow = true;
      portalGroup.add(colCapital);

      const capitalAbacus = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 2.4), goldTrimMat);
      capitalAbacus.position.set(side, 10.95, 0);
      portalGroup.add(capitalAbacus);

      // Glowing Vertical Runic Tablets embedded on Column Face
      for (let ry = 3.2; ry <= 9.0; ry += 1.4) {
        const runeSlab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.16), runeCyanMat);
        runeSlab.position.set(side, ry, 0.95);
        portalGroup.add(runeSlab);
      }
    }

    // C. Heavy Architrave, Stepped Cornice & Winged Sun Pediment (العتبة العلوية والتاج الملكي)
    const architrave = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.4, 2.4), templeSlateMat);
    architrave.position.set(0, 11.55, 0);
    architrave.castShadow = true;
    portalGroup.add(architrave);

    const architraveGoldBand = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.25, 2.48), goldTrimMat);
    architraveGoldBand.position.set(0, 12.35, 0);
    portalGroup.add(architraveGoldBand);

    const cornice = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.55, 2.7), templeSandstoneMat);
    cornice.position.set(0, 12.75, 0);
    cornice.castShadow = true;
    portalGroup.add(cornice);

    // Temple Apex Pediment (Carved Stepped Triangle)
    const pedimentBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 1.8), templeSlateMat);
    pedimentBase.position.set(0, 13.4, 0);
    portalGroup.add(pedimentBase);

    const pedimentPeak = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.6, 4), templeSandstoneMat);
    pedimentPeak.rotation.y = Math.PI / 4;
    pedimentPeak.position.set(0, 14.5, 0);
    portalGroup.add(pedimentPeak);

    // Royal Winged Sun Crest (شعار الشمس المجنحة الملكي في أعلى البوابة)
    const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 24), goldTrimMat);
    sunDisc.rotation.x = Math.PI / 2;
    sunDisc.position.set(0, 13.5, 0.95);
    portalGroup.add(sunDisc);

    const sunRubyCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), rubyMat);
    sunRubyCore.position.set(0, 13.5, 1.15);
    portalGroup.add(sunRubyCore);

    // Sun Crest Wings
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.18), goldTrimMat);
    wingL.position.set(-2.0, 13.5, 0.92);
    wingL.rotation.z = -0.15;
    portalGroup.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.18), goldTrimMat);
    wingR.position.set(2.0, 13.5, 0.92);
    wingR.rotation.z = 0.15;
    portalGroup.add(wingR);

    // D. Colossal Fortified Temple Doors (مصراعا الباب الخشبي الأثري المصفح بالذهب)
    // Left Door (Ajar - tilted slightly open)
    const doorL = new THREE.Group();
    doorL.position.set(-2.2, 5.8, -0.1);
    doorL.rotation.y = 0.22; // Ajar 12 degrees

    const doorPlankL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.8, 0.4), woodDoorMat);
    doorPlankL.position.set(1.1, 0, 0);
    doorPlankL.castShadow = true;
    doorL.add(doorPlankL);

    // Bronze reinforcing straps & gold studs
    for (let dy of [-3.0, 0, 3.0]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.45, 0.46), goldTrimMat);
      strap.position.set(1.1, dy, 0);
      doorL.add(strap);

      for (let dx of [0.4, 1.1, 1.8]) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), goldTrimMat);
        stud.position.set(dx, dy, 0.26);
        doorL.add(stud);
      }
    }

    // Door Knocker Ring
    const knockerL = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 10, 16), goldTrimMat);
    knockerL.position.set(1.6, 0.3, 0.3);
    doorL.add(knockerL);

    portalGroup.add(doorL);

    // Right Door (Ajar - tilted slightly open)
    const doorR = new THREE.Group();
    doorR.position.set(2.2, 5.8, -0.1);
    doorR.rotation.y = -0.22; // Ajar 12 degrees

    const doorPlankR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.8, 0.4), woodDoorMat);
    doorPlankR.position.set(-1.1, 0, 0);
    doorPlankR.castShadow = true;
    doorR.add(doorPlankR);

    // Bronze reinforcing straps & gold studs
    for (let dy of [-3.0, 0, 3.0]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.45, 0.46), goldTrimMat);
      strap.position.set(-1.1, dy, 0);
      doorR.add(strap);

      for (let dx of [-0.4, -1.1, -1.8]) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), goldTrimMat);
        stud.position.set(dx, dy, 0.26);
        doorR.add(stud);
      }
    }

    const knockerR = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 10, 16), goldTrimMat);
    knockerR.position.set(-1.6, 0.3, 0.3);
    doorR.add(knockerR);

    portalGroup.add(doorR);

    // E. Glowing Astrological Star Lock Mechanism between the doors
    const astroRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.4, 24), goldTrimMat);
    astroRing.position.set(0, 6.1, 0.15);
    portalGroup.add(astroRing);

    // F. 3 Golden Master Padlocks on Portal Arch
    const gateLocks: THREE.Group[] = [];
    const lockGemMats = [
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 2.0 }), // Sapphire
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x047857, emissiveIntensity: 2.0 }), // Emerald
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 2.0 }), // Ruby
    ];

    [-1.6, 0, 1.6].forEach((xOffset, idx) => {
      const lockGroup = new THREE.Group();
      lockGroup.position.set(xOffset, 10.1, 1.25);

      // Gold Chain Link connecting to Architrave
      const chainUpper = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 12), goldTrimMat);
      chainUpper.position.set(0, 0.55, 0);
      lockGroup.add(chainUpper);

      // Ornate Padlock Body
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.82, 0.34), goldTrimMat);
      bodyMesh.castShadow = true;
      lockGroup.add(bodyMesh);

      // Embedded Gemstone on Lock Face
      const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), lockGemMats[idx % 3]);
      gemMesh.position.set(0, 0, 0.2);
      lockGroup.add(gemMesh);

      // Heavy Shackle
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 14, 20, Math.PI), goldTrimMat);
      shackle.rotation.z = Math.PI;
      shackle.position.y = 0.52;
      lockGroup.add(shackle);

      portalGroup.add(lockGroup);
      gateLocks.push(lockGroup);
    });
    gateLocksRef.current = gateLocks;

    // G. Swirling Portal Vortex (Mystical Light emanating through ajar doors)
    const portalRings: THREE.Mesh[] = [];
    for (let r = 0; r < 5; r++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2 + r * 0.55, 1.5 + r * 0.55, 36),
        new THREE.MeshBasicMaterial({
          color: r === 0 ? 0x38bdf8 : r === 1 ? 0x818cf8 : r === 2 ? 0x34d399 : r === 3 ? 0xfde047 : 0xf472b6,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        })
      );
      ring.position.set(0, 6.0, -0.2 - 0.08 * r);
      portalGroup.add(ring);
      portalRings.push(ring);
    }
    portalRingsRef.current = portalRings;

    const portalCore = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 32),
      new THREE.MeshBasicMaterial({ color: 0x0369a1, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    portalCore.position.set(0, 6.0, -0.6);
    portalGroup.add(portalCore);
    portalCoreRef.current = portalCore;

    // H. Monumental Temple Fire Altars / Braziers (مذابح النار الحجرية الأسطورية الشاهقة)
    const torchLights: THREE.PointLight[] = [];
    const templeFlames: THREE.Mesh[] = [];

    const createTempleBrazier = (x: number) => {
      const brazier = new THREE.Group();
      brazier.position.set(x, 0, 1.6);

      // Stepped Pedestal
      const bPed1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.6), templeSandstoneMat);
      bPed1.position.y = 0.35;
      bPed1.castShadow = true;
      brazier.add(bPed1);

      const bPed2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 1.3), goldTrimMat);
      bPed2.position.y = 0.85;
      brazier.add(bPed2);

      // Fluted Stone Pillar
      const bCol = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.6, 2.8, 8), templeSlateMat);
      bCol.position.y = 2.4;
      bCol.castShadow = true;
      brazier.add(bCol);

      // Grand Golden Fire Cauldron (وعاء النار الذهبي)
      const cauldron = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.55, 0.85, 16), goldTrimMat);
      cauldron.position.y = 4.15;
      cauldron.castShadow = true;
      brazier.add(cauldron);

      // Glowing Charcoal Bed
      const coals = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
      coals.position.y = 4.3;
      brazier.add(coals);

      // Multi-tier Sculpted Flames
      const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      flameCore.position.y = 4.9;
      brazier.add(flameCore);
      templeFlames.push(flameCore);

      const flameMid = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.9, 8), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 }));
      flameMid.position.y = 5.05;
      brazier.add(flameMid);
      templeFlames.push(flameMid);

      // Warm Dancing Atmospheric Light
      const pLight = new THREE.PointLight(0xf59e0b, 3.8, 14);
      pLight.position.y = 5.2;
      brazier.add(pLight);
      torchLights.push(pLight);

      portalGroup.add(brazier);
    };

    createTempleBrazier(-5.4);
    createTempleBrazier(5.4);
    torchLightsRef.current = torchLights;
    templeFlamesRef.current = templeFlames;

    // I. Flanking Guardian Obelisks (مسلات الحراسة الأثرية بنقوش متوهجة)
    for (let obeliskX of [-7.6, 7.6]) {
      const gObelisk = new THREE.Group();
      gObelisk.position.set(obeliskX, 0, 0);

      const oBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), templeSandstoneMat);
      oBase.position.y = 0.4;
      gObelisk.add(oBase);

      const oShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 5.8, 4), templeSlateMat);
      oShaft.rotation.y = Math.PI / 4;
      oShaft.position.y = 3.6;
      oShaft.castShadow = true;
      gObelisk.add(oShaft);

      const oCap = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.1, 4), goldTrimMat);
      oCap.rotation.y = Math.PI / 4;
      oCap.position.y = 6.95;
      gObelisk.add(oCap);

      // Inlaid Glowing Glyphs on Obelisk
      for (let oy = 2.0; oy <= 5.4; oy += 1.2) {
        const oGlyph = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.4, 0.08), runeCyanMat);
        oGlyph.position.set(0, oy, 0.48);
        gObelisk.add(oGlyph);
      }

      portalGroup.add(gObelisk);
    }

    scene.add(portalGroup);

    // 16. Floating 3D Clouds
    const clouds: THREE.Group[] = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

    const createCloud = (x: number, y: number, z: number, scale: number) => {
      const c = new THREE.Group();
      c.position.set(x, y, z);
      c.scale.set(scale, scale, scale);

      const parts = [
        { r: 2.2, pos: [0, 0, 0] },
        { r: 1.8, pos: [1.8, -0.2, 0] },
        { r: 1.8, pos: [-1.8, -0.2, 0] },
        { r: 1.4, pos: [1.0, 1.1, 0.2] },
        { r: 1.3, pos: [-0.9, 1.0, -0.1] },
      ];
      parts.forEach(({ r, pos }) => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), cloudMat);
        sphere.position.set(pos[0], pos[1], pos[2]);
        c.add(sphere);
      });
      scene.add(c);
      clouds.push(c);
    };

    createCloud(-22, 18, -18, 1.4);
    createCloud(16, 20, -22, 1.6);
    createCloud(6, 21, -32, 1.9);
    createCloud(-16, 19, -36, 1.5);
    createCloud(26, 17, -14, 1.3);
    cloudsRef.current = clouds;

    // 17. EXPANDED FLOCK OF SOARING BIRDS (14 Graceful Stylized Seagulls)
    const seagulls: any[] = [];
    const seagullMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

    for (let s = 0; s < 14; s++) {
      const bird = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 5), seagullMat);
      body.rotation.x = Math.PI / 2;
      bird.add(body);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), beakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.z = 0.52;
      bird.add(beak);

      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.24), seagullMat);
      leftWing.position.set(-0.4, 0.05, 0);
      bird.add(leftWing);

      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.24), seagullMat);
      rightWing.position.set(0.4, 0.05, 0);
      bird.add(rightWing);

      const altitude = 12 + (s % 4) * 2.5 + Math.random() * 2.0;
      bird.position.set((s - 7) * 4, altitude, -10 + (s % 3) * 6);
      scene.add(bird);

      seagulls.push({
        group: bird,
        speed: 0.6 + (s % 3) * 0.18,
        radius: 12 + (s % 5) * 4,
        angle: s * 0.55,
        altitude,
        leftWing,
        rightWing,
      });
    }
    seagullsRef.current = seagulls;

    // 18. Sparkles Particle Cloud
    const sparkleCount = 80;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparklePos[i] = (Math.random() - 0.5) * 20;
      sparklePos[i + 1] = 1.0 + Math.random() * 10.0;
      sparklePos[i + 2] = (Math.random() - 0.5) * 20;
    }
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
    });
    const sparkleParticles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkleParticles);
    sparklesRef.current = sparkleParticles;

    // 19. MAJESTIC REALISTIC PIRATE GALLEON (السفينة الملكية الأسطورية مع هيكل مقوس واقعي ومدافع وأشرعة ثلاثية الأبعاد)
    const galleonGroup = new THREE.Group();
    galleonGroup.position.set(22.0, -0.6, -5.5);
    galleonGroup.rotation.y = -Math.PI * 0.15;
    galleonGroup.scale.set(0.92, 0.92, 0.92);

    // Realistic Naval Architecture Materials
    const hullWoodDarkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2010, // Rich dark oak wood
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const deckWoodMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e, // Warm planked pine/oak
      roughness: 0.6,
    });
    const goldTrimMatShip = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const cannonBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const gunportRedMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.5,
    });
    const sailClothMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const sailEmblemMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const flagBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const ropeMatShip = new THREE.MeshBasicMaterial({ color: 0x78716c });
    const lanternGlassMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // A. Realistic Curved Hull (Naval Architecture Geometry)
    const shipHullGeo = createCurvedShipHullGeometry();
    const shipHullMesh = new THREE.Mesh(shipHullGeo, hullWoodDarkMat);
    shipHullMesh.castShadow = true;
    shipHullMesh.receiveShadow = true;
    galleonGroup.add(shipHullMesh);

    // B. External Keel Fin & Cutwater Stempost
    const keelFin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 12.8), hullWoodDarkMat);
    keelFin.position.set(0, -1.35, 0.1);
    keelFin.castShadow = true;
    galleonGroup.add(keelFin);

    const cutwaterStem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.4, 8), hullWoodDarkMat);
    cutwaterStem.rotation.x = -Math.PI * 0.24;
    cutwaterStem.position.set(0, 1.25, 6.8);
    cutwaterStem.castShadow = true;
    galleonGroup.add(cutwaterStem);

    // Gold Sheer Moulding Strakes along Hull
    for (let side of [-1, 1]) {
      const strake1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 12.5), goldTrimMatShip);
      strake1.position.set(side * 2.3, 1.45, 0.2);
      galleonGroup.add(strake1);

      const strake2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 11.2), goldTrimMatShip);
      strake2.position.set(side * 2.1, 0.85, 0);
      galleonGroup.add(strake2);
    }

    // C. Realistic Tiered Decks
    // 1. Elevated Poop Deck (Sterncastle)
    const poopDeck = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.22, 3.2), deckWoodMat);
    poopDeck.position.set(0, 3.1, -4.8);
    poopDeck.receiveShadow = true;
    galleonGroup.add(poopDeck);

    // 2. Quarterdeck Step
    const quarterDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 2.8), deckWoodMat);
    quarterDeck.position.set(0, 2.1, -2.0);
    quarterDeck.receiveShadow = true;
    galleonGroup.add(quarterDeck);

    // 3. Main Waist Gun Deck
    const waistDeck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 5.8), deckWoodMat);
    waistDeck.position.set(0, 1.35, 1.8);
    waistDeck.receiveShadow = true;
    galleonGroup.add(waistDeck);

    // 4. Raised Forecastle Deck
    const foreDeck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 2.4), deckWoodMat);
    foreDeck.position.set(0, 2.45, 5.4);
    foreDeck.receiveShadow = true;
    galleonGroup.add(foreDeck);

    // Open Cargo Grating on Waist Deck
    const cargoGrating = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 2.2), hullWoodDarkMat);
    cargoGrating.position.set(0, 1.48, 1.8);
    galleonGroup.add(cargoGrating);

    // Wooden Capstan
    const capstan = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.7, 8), hullWoodDarkMat);
    capstan.position.set(0, 1.75, 3.4);
    galleonGroup.add(capstan);

    // Ship's Bronze Bell in Miniature Gallows
    const bellGallows = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), hullWoodDarkMat);
    bellGallows.position.set(0, 2.9, 4.4);
    galleonGroup.add(bellGallows);
    const shipBell = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 8), goldTrimMatShip);
    shipBell.position.set(0, 2.75, 4.4);
    galleonGroup.add(shipBell);

    // D. Turned Balustrade Railings
    for (let side of [-1, 1]) {
      const pRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.3), goldTrimMatShip);
      pRail.position.set(side * 1.62, 3.7, -4.8);
      galleonGroup.add(pRail);
      for (let bz = -6.2; bz <= -3.4; bz += 0.7) {
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), hullWoodDarkMat);
        baluster.position.set(side * 1.62, 3.4, bz);
        galleonGroup.add(baluster);
      }
    }
    const sternTopRail = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 0.14), goldTrimMatShip);
    sternTopRail.position.set(0, 3.75, -6.4);
    galleonGroup.add(sternTopRail);

    // E. Ornate Stern Transom Gallery (6 Leaded Windows + 3 Baroque Lanterns + Rudder)
    for (let w = -1.15; w <= 1.15; w += 0.46) {
      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.58, 0.12), goldTrimMatShip);
      windowFrame.position.set(w, 2.5, -6.55);
      galleonGroup.add(windowFrame);

      const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.48), lanternGlassMat);
      windowGlass.position.set(w, 2.5, -6.62);
      galleonGroup.add(windowGlass);
    }

    const sternCrest = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.42, 8), goldTrimMatShip);
    sternCrest.position.set(0, 3.3, -6.55);
    galleonGroup.add(sternCrest);

    for (let lx of [-1.1, 0, 1.1]) {
      const lBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), goldTrimMatShip);
      lBracket.rotation.x = Math.PI / 3;
      lBracket.position.set(lx, 3.4, -6.65);
      galleonGroup.add(lBracket);

      const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.42, 6), goldTrimMatShip);
      lanternBody.position.set(lx, 3.25, -6.82);
      galleonGroup.add(lanternBody);

      const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), lanternGlassMat);
      lanternGlow.position.set(lx, 3.25, -6.82);
      galleonGroup.add(lanternGlow);

      if (lx === 0) {
        const sternLight = new THREE.PointLight(0xf59e0b, 2.5, 10);
        sternLight.position.set(0, 3.25, -7.0);
        galleonGroup.add(sternLight);
      }
    }

    const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.95), hullWoodDarkMat);
    rudder.position.set(0, 0.2, -6.8);
    rudder.castShadow = true;
    galleonGroup.add(rudder);

    // F. Brass Helm Wheel & Binnacle on Quarterdeck
    const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 16), hullWoodDarkMat);
    helmWheel.position.set(0, 3.8, -3.2);
    galleonGroup.add(helmWheel);
    for (let sp = 0; sp < 4; sp++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), goldTrimMatShip);
      spoke.rotation.z = (sp / 4) * Math.PI;
      spoke.position.set(0, 3.8, -3.2);
      galleonGroup.add(spoke);
    }
    const binnacle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.7, 8), goldTrimMatShip);
    binnacle.position.set(0, 3.4, -2.8);
    galleonGroup.add(binnacle);

    // G. Broadside Naval Cannons & Open Red Gunports (8 Cannons)
    for (let side of [-1, 1]) {
      const posX = side * 2.38;
      [-1.4, 0.4, 2.2, 3.8].forEach((cZ) => {
        const portFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.52), gunportRedMat);
        portFrame.position.set(posX, 1.5, cZ);
        galleonGroup.add(portFrame);

        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.48), hullWoodDarkMat);
        lid.position.set(posX + side * 0.14, 1.8, cZ);
        lid.rotation.z = side * 0.55;
        galleonGroup.add(lid);

        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.85, 8), cannonBronzeMat);
        cannon.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        cannon.position.set(posX + side * 0.35, 1.48, cZ);
        cannon.castShadow = true;
        galleonGroup.add(cannon);

        const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.45), gunportRedMat);
        carriage.position.set(posX - side * 0.2, 1.35, cZ);
        galleonGroup.add(carriage);
      });
    }

    // H. Bowsprit, Jibboom & Carved Golden Mermaid Figurehead
    const bowspritSpar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 6.2, 8), hullWoodDarkMat);
    bowspritSpar.rotation.x = -Math.PI * 0.32;
    bowspritSpar.position.set(0, 3.3, 8.6);
    bowspritSpar.castShadow = true;
    galleonGroup.add(bowspritSpar);

    const dolphinStriker = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), hullWoodDarkMat);
    dolphinStriker.position.set(0, 2.2, 8.8);
    galleonGroup.add(dolphinStriker);

    const figureheadBody = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 8), goldTrimMatShip);
    figureheadBody.rotation.x = Math.PI * 0.35;
    figureheadBody.position.set(0, 2.1, 7.8);
    figureheadBody.castShadow = true;
    galleonGroup.add(figureheadBody);

    const figureheadHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), goldTrimMatShip);
    figureheadHead.position.set(0, 2.85, 8.4);
    galleonGroup.add(figureheadHead);

    const figureheadStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), goldTrimMatShip);
    figureheadStar.position.set(0, 3.1, 8.7);
    galleonGroup.add(figureheadStar);

    const createJib = (startY: number, startZ: number, endY: number, endZ: number, bowY: number, bowZ: number) => {
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        0, startY, startZ,
        0, endY, endZ,
        0, bowY, bowZ,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, sailClothMat);
      m.castShadow = true;
      galleonGroup.add(m);
    };
    createJib(2.2, 7.2, 5.2, 4.4, 2.8, 9.8);
    createJib(3.0, 9.2, 6.6, 4.4, 3.6, 11.2);

    // Dual Heavy Iron Admiralty Anchors
    for (let side of [-1, 1]) {
      const aRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 6, 12), cannonBronzeMat);
      aRing.position.set(side * 1.95, 1.8, 6.2);
      galleonGroup.add(aRing);

      const aStock = new THREE.Mesh(new THREE.BoxGeometry(side * 0.9, 0.14, 0.14), hullWoodDarkMat);
      aStock.position.set(side * 1.95, 1.6, 6.2);
      galleonGroup.add(aStock);

      const aShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), cannonBronzeMat);
      aShaft.position.set(side * 1.95, 1.0, 6.2);
      galleonGroup.add(aShaft);

      const aFlukes = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 6, 12, Math.PI), cannonBronzeMat);
      aFlukes.rotation.x = Math.PI;
      aFlukes.position.set(side * 1.95, 0.35, 6.2);
      galleonGroup.add(aFlukes);

      for (let c = 0; c < 5; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 4, 8), cannonBronzeMat);
        link.position.set(side * 1.95, 1.9 + c * 0.14, 6.0 - c * 0.12);
        galleonGroup.add(link);
      }
    }

    // I. Three Towering Masts & Multi-tiered Billowing Canvas Sails
    // 1. FOREMAST (z = 4.2)
    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 9.2, 10), hullWoodDarkMat);
    foreMast.position.set(0, 5.8, 4.2);
    foreMast.castShadow = true;
    galleonGroup.add(foreMast);

    const foreNest = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.52, 0.55, 10), hullWoodDarkMat);
    foreNest.position.set(0, 7.8, 4.2);
    galleonGroup.add(foreNest);

    const fYard1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.8, 8), hullWoodDarkMat);
    fYard1.rotation.z = Math.PI / 2;
    fYard1.position.set(0, 4.6, 4.35);
    galleonGroup.add(fYard1);

    const fSail1 = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 2.4, 14, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      sailClothMat
    );
    fSail1.rotation.y = Math.PI / 2;
    fSail1.position.set(0, 3.4, 4.6);
    fSail1.castShadow = true;
    galleonGroup.add(fSail1);

    const fYard2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), hullWoodDarkMat);
    fYard2.rotation.z = Math.PI / 2;
    fYard2.position.set(0, 7.2, 4.35);
    galleonGroup.add(fYard2);

    const fSail2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 2.0, 12, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      sailClothMat
    );
    fSail2.rotation.y = Math.PI / 2;
    fSail2.position.set(0, 6.1, 4.6);
    fSail2.castShadow = true;
    galleonGroup.add(fSail2);

    // 2. MAINMAST (z = 0.5 - The Grand Tallest Center Mast)
    const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 11.5, 10), hullWoodDarkMat);
    mainMast.position.set(0, 6.8, 0.5);
    mainMast.castShadow = true;
    galleonGroup.add(mainMast);

    const mainNest = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.6, 0.62, 10), hullWoodDarkMat);
    mainNest.position.set(0, 9.2, 0.5);
    galleonGroup.add(mainNest);

    const mYard1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.8, 8), hullWoodDarkMat);
    mYard1.rotation.z = Math.PI / 2;
    mYard1.position.set(0, 5.2, 0.65);
    galleonGroup.add(mYard1);

    const mSail1 = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 3.2, 16, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      sailClothMat
    );
    mSail1.rotation.y = Math.PI / 2;
    mSail1.position.set(0, 3.6, 0.95);
    mSail1.castShadow = true;
    galleonGroup.add(mSail1);

    const sailCrest = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.75, 16), sailEmblemMat);
    sailCrest.position.set(0, 3.7, 1.95);
    galleonGroup.add(sailCrest);

    const mYard2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 8), hullWoodDarkMat);
    mYard2.rotation.z = Math.PI / 2;
    mYard2.position.set(0, 8.6, 0.65);
    galleonGroup.add(mYard2);

    const mSail2 = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 2.4, 14, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      sailClothMat
    );
    mSail2.rotation.y = Math.PI / 2;
    mSail2.position.set(0, 7.3, 0.95);
    mSail2.castShadow = true;
    galleonGroup.add(mSail2);

    const mYard3 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8), hullWoodDarkMat);
    mYard3.rotation.z = Math.PI / 2;
    mYard3.position.set(0, 11.0, 0.65);
    galleonGroup.add(mYard3);

    const mSail3 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 1.6, 10, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      sailClothMat
    );
    mSail3.rotation.y = Math.PI / 2;
    mSail3.position.set(0, 10.1, 0.85);
    mSail3.castShadow = true;
    galleonGroup.add(mSail3);

    const flagGeo = new THREE.BufferGeometry();
    const flagVerts = new Float32Array([
      0, 12.5, 0.5,
      0, 11.6, 0.5,
      2.2, 12.0, 0.9,
    ]);
    flagGeo.setAttribute("position", new THREE.BufferAttribute(flagVerts, 3));
    flagGeo.computeVertexNormals();
    const pirateFlag = new THREE.Mesh(flagGeo, flagBlackMat);
    galleonGroup.add(pirateFlag);

    // 3. MIZZENMAST (z = -3.8 - Authentic Lateen Rigged Mast on Poop Deck)
    const mizzenMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.6, 8), hullWoodDarkMat);
    mizzenMast.position.set(0, 6.2, -3.8);
    mizzenMast.castShadow = true;
    galleonGroup.add(mizzenMast);

    const lateenYard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.2, 8), hullWoodDarkMat);
    lateenYard.rotation.x = -Math.PI * 0.25;
    lateenYard.position.set(0, 5.8, -3.8);
    galleonGroup.add(lateenYard);

    const lateenGeo = new THREE.BufferGeometry();
    const lateenVerts = new Float32Array([
      0, 7.8, -5.8,
      0, 3.8, -1.8,
      0, 3.6, -4.8,
    ]);
    lateenGeo.setAttribute("position", new THREE.BufferAttribute(lateenVerts, 3));
    lateenGeo.computeVertexNormals();
    const lateenSail = new THREE.Mesh(lateenGeo, sailClothMat);
    lateenSail.castShadow = true;
    galleonGroup.add(lateenSail);

    // J. Standing Rigging: Shrouds with Ratline Rope Ladders
    for (let side of [-1.95, 1.95]) {
      for (let r = -0.5; r <= 0.5; r += 0.5) {
        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6.8), ropeMatShip);
        shroud.position.set(side, 5.2, 0.5 + r);
        shroud.rotation.z = side > 0 ? 0.22 : -0.22;
        galleonGroup.add(shroud);
      }
      const fShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 5.6), ropeMatShip);
      fShroud.position.set(side * 0.85, 4.8, 4.2);
      fShroud.rotation.z = side > 0 ? 0.24 : -0.24;
      galleonGroup.add(fShroud);
    }

    // K. Sculpted Waterline Sea Foam Wake Ring
    const foamWakeGeo = new THREE.RingGeometry(2.4, 3.4, 24);
    const foamWakeMat = new THREE.MeshBasicMaterial({ color: 0xf0fdfa, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const foamWake = new THREE.Mesh(foamWakeGeo, foamWakeMat);
    foamWake.rotation.x = Math.PI / 2;
    foamWake.scale.set(1.1, 2.6, 1.0);
    foamWake.position.set(0, -0.4, 0.2);
    galleonGroup.add(foamWake);

    scene.add(galleonGroup);
    dockedSailboatRef.current = galleonGroup;

    // 20. ANCIENT STONE CLIFF WATCHTOWER / BEACON (برج المراقبة والمنارة الأثرية على الجرف)
    const watchtowerGroup = new THREE.Group();
    watchtowerGroup.position.set(-12.5, 0.4, -6.5);

    const stoneTowerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const stoneTrimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const watchCauldronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });

    const wtBase1 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.8, 12), stoneTowerMat);
    wtBase1.position.y = 0.4;
    wtBase1.receiveShadow = true;
    watchtowerGroup.add(wtBase1);

    const wtBase2 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.6, 12), stoneTrimMat);
    wtBase2.position.y = 1.1;
    wtBase2.receiveShadow = true;
    watchtowerGroup.add(wtBase2);

    const wtBody = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.1, 5.4, 12), stoneTowerMat);
    wtBody.position.y = 4.1;
    wtBody.castShadow = true;
    watchtowerGroup.add(wtBody);

    for (let w = 0; w < 3; w++) {
      const ang = (w / 3) * Math.PI * 2 + 0.3;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 0.3), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      win.position.set(Math.cos(ang) * 1.82, 4.5, Math.sin(ang) * 1.82);
      win.rotation.y = -ang;
      watchtowerGroup.add(win);
    }

    const wtParapet = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.1, 0.7, 12), stoneTrimMat);
    wtParapet.position.y = 7.1;
    wtParapet.castShadow = true;
    watchtowerGroup.add(wtParapet);

    for (let b = 0; b < 6; b++) {
      const bAng = (b / 6) * Math.PI * 2;
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.35), stoneTowerMat);
      merlon.position.set(Math.cos(bAng) * 2.25, 7.75, Math.sin(bAng) * 2.25);
      merlon.rotation.y = -bAng;
      merlon.castShadow = true;
      watchtowerGroup.add(merlon);
    }

    const wtBrazier = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.45, 0.65, 10), watchCauldronMat);
    wtBrazier.position.y = 7.75;
    watchtowerGroup.add(wtBrazier);

    const wtCharcoal = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
    wtCharcoal.position.y = 7.95;
    watchtowerGroup.add(wtCharcoal);

    const wtFlame1 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 7), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    wtFlame1.position.y = 8.65;
    watchtowerGroup.add(wtFlame1);

    const wtFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.8, 7), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 }));
    wtFlame2.position.y = 8.8;
    watchtowerGroup.add(wtFlame2);

    const wtLight = new THREE.PointLight(0xf59e0b, 3.5, 18);
    wtLight.position.y = 9.0;
    watchtowerGroup.add(wtLight);

    scene.add(watchtowerGroup);
    watchtowerFireRef.current = [wtFlame1, wtFlame2];

    // 21. EXPLORER'S EXPEDITION BASE CAMP (معسكر وخيمة المستكشف الملكي)
    const campGroup = new THREE.Group();
    campGroup.position.set(-6.8, 0.4, 5.2);

    const tentCanvasMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7, side: THREE.DoubleSide });
    const tentStripeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65, side: THREE.DoubleSide });
    const tentPoleMat = new THREE.MeshStandardMaterial({ color: 0x573418, roughness: 0.75 });

    const tentRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), tentPoleMat);
    tentRidge.rotation.z = Math.PI / 2;
    tentRidge.position.set(0, 1.9, 0);
    campGroup.add(tentRidge);

    for (let xEnd of [-1.55, 1.55]) {
      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), tentPoleMat);
      poleL.position.set(xEnd, 0.95, -0.65);
      poleL.rotation.x = -0.32;
      campGroup.add(poleL);

      const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), tentPoleMat);
      poleR.position.set(xEnd, 0.95, 0.65);
      poleR.rotation.x = 0.32;
      campGroup.add(poleR);
    }

    const roofL = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.1), tentCanvasMat);
    roofL.position.set(0, 1.05, -0.65);
    roofL.rotation.x = Math.PI * 0.35;
    roofL.castShadow = true;
    campGroup.add(roofL);

    const roofR = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.1), tentStripeMat);
    roofR.position.set(0, 1.05, 0.65);
    roofR.rotation.x = -Math.PI * 0.35;
    roofR.castShadow = true;
    campGroup.add(roofR);

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.1), tentPoleMat);
    tableTop.position.set(0, 0.85, 0);
    tableTop.castShadow = true;
    campGroup.add(tableTop);

    for (let tx of [-0.68, 0.68]) {
      for (let tz of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6), tentPoleMat);
        leg.position.set(tx, 0.42, tz);
        campGroup.add(leg);
      }
    }

    const mapSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.65), new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 }));
    mapSheet.rotation.x = -Math.PI / 2;
    mapSheet.position.set(0, 0.91, 0);
    campGroup.add(mapSheet);

    const tableCompass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), goldTrimMatShip);
    tableCompass.position.set(-0.25, 0.94, -0.15);
    campGroup.add(tableCompass);

    const tableSpyglass = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.45, 8), goldTrimMatShip);
    tableSpyglass.rotation.z = Math.PI / 3;
    tableSpyglass.position.set(0.2, 0.94, 0.1);
    campGroup.add(tableSpyglass);

    scene.add(campGroup);

    // 22. BEACHED WOODEN ROWBOAT (DINGHY) WITH OARS (قارب تجديف خشبي على الشاطئ)
    const rowboatGroup = new THREE.Group();
    rowboatGroup.position.set(7.5, -0.15, 8.8);
    rowboatGroup.rotation.y = Math.PI * 0.42;
    rowboatGroup.rotation.z = 0.08;

    const rowHull = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.6, 8, 1, false, 0, Math.PI), hullWoodDarkMat);
    rowHull.rotation.x = Math.PI / 2;
    rowHull.rotation.z = Math.PI;
    rowHull.scale.set(1.0, 1.4, 0.65);
    rowHull.position.y = 0.35;
    rowHull.castShadow = true;
    rowboatGroup.add(rowHull);

    for (let seatZ of [-0.6, 0.3]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.32), deckWoodMat);
      seat.position.set(0, 0.36, seatZ);
      rowboatGroup.add(seat);
    }

    for (let side of [-1, 1]) {
      const oar = new THREE.Group();
      oar.position.set(side * 0.55, 0.48, 0.1);
      oar.rotation.z = side * 0.35;
      oar.rotation.y = side * 0.2;

      const oarShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), deckWoodMat);
      oarShaft.position.y = 0.5;
      oar.add(oarShaft);

      const oarBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.03), deckWoodMat);
      oarBlade.position.y = 1.6;
      oar.add(oarBlade);

      rowboatGroup.add(oar);
    }

    const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 12), ropeMatShip);
    ropeCoil.rotation.x = Math.PI / 2;
    ropeCoil.position.set(0, 0.45, 1.25);
    rowboatGroup.add(ropeCoil);

    scene.add(rowboatGroup);

    // 23. OPEN OVERFLOWING PIRATE TREASURE CHEST ON SAND (صندوق كنز مفتوح بذهب وجواهر متلألئة)
    const beachChestGroup = new THREE.Group();
    beachChestGroup.position.set(9.0, 0.1, 7.2);
    beachChestGroup.rotation.y = -Math.PI * 0.28;

    const chestOakMat = new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.55 });
    const bChestBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1.0), chestOakMat);
    bChestBase.position.y = 0.38;
    bChestBase.castShadow = true;
    beachChestGroup.add(bChestBase);

    const bChestLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 1.5, 12, 1, false, 0, Math.PI),
      chestOakMat
    );
    bChestLid.rotation.z = Math.PI / 2;
    bChestLid.rotation.x = -Math.PI * 0.65;
    bChestLid.position.set(0, 0.75, -0.48);
    beachChestGroup.add(bChestLid);

    for (let bx of [-0.5, 0.5]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 1.04), goldTrimMatShip);
      strap.position.set(bx, 0.38, 0);
      beachChestGroup.add(strap);
    }

    const goldPile = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), goldTrimMatShip);
    goldPile.scale.set(1.2, 0.6, 0.8);
    goldPile.position.set(0, 0.65, 0);
    beachChestGroup.add(goldPile);

    const gemRubyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 1.2 });
    const gemEmeraldMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.2 });
    const gemSapphireMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 1.2 });

    const gemPositions = [
      { x: -0.3, y: 0.75, z: 0.2, mat: gemRubyMat },
      { x: 0.2, y: 0.78, z: -0.1, mat: gemEmeraldMat },
      { x: 0.4, y: 0.72, z: 0.25, mat: gemSapphireMat },
      { x: 0.65, y: 0.12, z: 0.45, mat: gemRubyMat },
      { x: 0.85, y: 0.1, z: 0.35, mat: gemEmeraldMat },
    ];
    gemPositions.forEach(({ x, y, z, mat }) => {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), mat);
      gem.position.set(x, y, z);
      beachChestGroup.add(gem);
    });

    scene.add(beachChestGroup);

    // 24. MYSTERIOUS MESSAGE IN A BOTTLE (زجاجة الرسالة البحرية العائمة عند الشاطئ)
    const bottleGroup = new THREE.Group();
    bottleGroup.position.set(2.5, -0.65, 13.8);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.1,
    });
    const corkMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const parchmentMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 });

    const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 10), glassMat);
    bottleBody.rotation.z = Math.PI / 3;
    bottleGroup.add(bottleBody);

    const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 0.3, 8), glassMat);
    bottleNeck.position.set(-0.35, 0.22, 0);
    bottleNeck.rotation.z = Math.PI / 3;
    bottleGroup.add(bottleNeck);

    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), corkMat);
    cork.position.set(-0.48, 0.3, 0);
    cork.rotation.z = Math.PI / 3;
    bottleGroup.add(cork);

    const rolledParchment = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 6), parchmentMat);
    rolledParchment.rotation.z = Math.PI / 3;
    bottleGroup.add(rolledParchment);

    scene.add(bottleGroup);
    bottleRef.current = bottleGroup;

    // 25. ANCIENT TRIBAL TIKI / CARVED STONE IDOL HEAD (رأس الحجر الأثري المنحوت)
    const totemGroup = new THREE.Group();
    totemGroup.position.set(11.2, 0.2, -1.8);
    totemGroup.rotation.y = -Math.PI * 0.45;

    const totemStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const totemEyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const tHead = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 1.4), totemStoneMat);
    tHead.position.y = 1.4;
    tHead.castShadow = true;
    totemGroup.add(tHead);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 0.4), totemStoneMat);
    brow.position.set(0, 2.0, 0.72);
    totemGroup.add(brow);

    for (let ex of [-0.4, 0.4]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.12), totemEyeGlowMat);
      eye.position.set(ex, 1.8, 0.73);
      totemGroup.add(eye);
    }

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.65, 0.35), totemStoneMat);
    nose.position.set(0, 1.45, 0.75);
    totemGroup.add(nose);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.12), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    mouth.position.set(0, 0.85, 0.73);
    totemGroup.add(mouth);

    scene.add(totemGroup);

    // 26. DIRECTIONAL WOODEN SIGNPOST (لافتة خشبية مرشدة للمستكشف)
    const signpostGroup = new THREE.Group();
    signpostGroup.position.set(-2.8, 0.4, 9.8);
    signpostGroup.rotation.y = 0.25;

    const postMat = new THREE.MeshStandardMaterial({ color: 0x6e3814, roughness: 0.8 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8), postMat);
    post.position.y = 1.1;
    post.castShadow = true;
    signpostGroup.add(post);

    const sign1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.08), boardMat);
    sign1.position.set(0.35, 1.8, 0);
    sign1.rotation.y = 0.15;
    signpostGroup.add(sign1);

    const sign2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.08), boardMat);
    sign2.position.set(-0.3, 1.4, 0);
    sign2.rotation.y = -0.25;
    signpostGroup.add(sign2);

    scene.add(signpostGroup);

    // 27. LUSH TROPICAL FERNS & EXOTIC FLORA (نباتات سرخس استوائية وأزهار استوائية غنية)
    const fernGeo = createFernFrondGeometry(2.2, 0.42);
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5, side: THREE.DoubleSide });

    const createFernCluster = (x: number, y: number, z: number, scale = 1.0) => {
      const cluster = new THREE.Group();
      cluster.position.set(x, y, z);
      cluster.scale.set(scale, scale, scale);

      for (let f = 0; f < 8; f++) {
        const ang = (f / 8) * Math.PI * 2;
        const frond = new THREE.Mesh(fernGeo, fernMat);
        frond.rotation.y = ang;
        frond.rotation.x = -0.25;
        cluster.add(frond);
      }
      scene.add(cluster);
    };

    createFernCluster(-5.2, 0.4, -3.8, 0.95);
    createFernCluster(5.5, 0.4, -3.5, 0.95);
    createFernCluster(-8.5, 0.4, 1.8, 1.1);
    createFernCluster(8.8, 0.4, 2.8, 1.05);
    createFernCluster(-3.2, 0.4, 8.2, 0.85);
    createFernCluster(4.2, 0.4, 7.8, 0.9);

    // 28. VIBRANT SCARLET MACAW / PARROT (طائر الببغاء الاستوائي الرائع المحلق بأجنحة خفاقة)
    const parrotGroup = new THREE.Group();
    const parrotRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const parrotBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
    const parrotYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const parrotBeakMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.4 });

    const pBody = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 6), parrotRedMat);
    pBody.rotation.x = Math.PI / 2;
    parrotGroup.add(pBody);

    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), parrotRedMat);
    pHead.position.z = 0.45;
    parrotGroup.add(pHead);

    const pBeak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), parrotBeakMat);
    pBeak.rotation.x = Math.PI * 0.65;
    pBeak.position.set(0, -0.08, 0.58);
    parrotGroup.add(pBeak);

    const pWingLGroup = new THREE.Group();
    pWingLGroup.position.set(-0.16, 0.05, 0.1);
    const pWingL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.3), parrotBlueMat);
    pWingL.position.x = -0.32;
    pWingLGroup.add(pWingL);
    parrotGroup.add(pWingLGroup);

    const pWingRGroup = new THREE.Group();
    pWingRGroup.position.set(0.16, 0.05, 0.1);
    const pWingR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.3), parrotBlueMat);
    pWingR.position.x = 0.32;
    pWingRGroup.add(pWingR);
    parrotGroup.add(pWingRGroup);

    const pTail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.95), parrotYellowMat);
    pTail.position.set(0, -0.04, -0.75);
    parrotGroup.add(pTail);

    parrotGroup.position.set(0, 10.5, 0);
    parrotGroup.scale.set(1.2, 1.2, 1.2);
    scene.add(parrotGroup);

    parrotRef.current = {
      group: parrotGroup,
      wingL: pWingLGroup,
      wingR: pWingRGroup,
      speed: 0.85,
      angle: 0,
      altitude: 10.5,
      radiusX: 13.5,
      radiusZ: 11.0,
    };

    // 29. SWIMMING SCHOOLS OF TROPICAL REEF FISH (أسماك استوائية ملونة تسبح في الماء الصافي)
    const fishSchool: any[] = [];
    const fishYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const fishBlueMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });

    for (let f = 0; f < 6; f++) {
      const fishGroup = new THREE.Group();
      const isYellow = f % 2 === 0;

      const fBody = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), isYellow ? fishYellowMat : fishBlueMat);
      fBody.rotation.x = Math.PI / 2;
      fishGroup.add(fBody);

      const fTail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.22), isYellow ? fishBlueMat : fishYellowMat);
      fTail.position.z = -0.28;
      fishGroup.add(fTail);

      fishGroup.position.set(0, -1.1, 0);
      scene.add(fishGroup);

      fishSchool.push({
        group: fishGroup,
        speed: 0.8 + (f % 3) * 0.25,
        radius: 6.5 + (f % 3) * 1.8,
        phase: f * 1.05,
        baseY: -1.1 - (f % 2) * 0.25,
      });
    }
    schoolOfFishRef.current = fishSchool;


    // 20. ANIMATED CHARACTERS
    // A. Patrolling Scout / Explorer on Island Stone Path
    const explorerGroup = new THREE.Group();
    explorerGroup.position.set(-1.8, 0.48, 3.2);
    explorerGroup.scale.set(0.68, 0.68, 0.68);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
    const bootsMat = new THREE.MeshStandardMaterial({ color: 0x3e1f0e, roughness: 0.8 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const charGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.85, 8), coatMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    explorerGroup.add(torso);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), charGoldMat);
      btn.position.set(0, 1.1 + b * 0.18, 0.29);
      explorerGroup.add(btn);
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), skinMat);
    head.position.y = 1.85;
    head.castShadow = true;
    explorerGroup.add(head);

    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), hatMat);
    hatBrim.position.y = 2.02;
    explorerGroup.add(hatBrim);
    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.3, 8), hatMat);
    hatCrown.position.y = 2.18;
    explorerGroup.add(hatCrown);
    const hatFeather = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 5), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    hatFeather.rotation.z = 0.4;
    hatFeather.position.set(-0.22, 2.25, 0);
    explorerGroup.add(hatFeather);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.68, 6);
    const bootGeo = new THREE.BoxGeometry(0.18, 0.16, 0.28);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.16, 0.82, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.34;
    leftLegMesh.castShadow = true;
    leftLegGroup.add(leftLegMesh);
    const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
    leftBoot.position.set(0, -0.66, 0.05);
    leftBoot.castShadow = true;
    leftLegGroup.add(leftBoot);
    explorerGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.16, 0.82, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.34;
    rightLegMesh.castShadow = true;
    rightLegGroup.add(rightLegMesh);
    const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
    rightBoot.position.set(0, -0.66, 0.05);
    rightBoot.castShadow = true;
    rightLegGroup.add(rightBoot);
    explorerGroup.add(rightLegGroup);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.62, 6);
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.38, 1.55, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, coatMat);
    leftArmMesh.position.y = -0.3;
    leftArmMesh.castShadow = true;
    leftArmGroup.add(leftArmMesh);
    explorerGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.38, 1.55, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, coatMat);
    rightArmMesh.position.y = -0.3;
    rightArmMesh.castShadow = true;
    rightArmGroup.add(rightArmMesh);

    // Lantern
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(0, -0.58, 0.22);
    const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.26, 6), charGoldMat);
    lanternGroup.add(lanternBody);
    const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    lanternGroup.add(lanternGlow);
    const lanternLight = new THREE.PointLight(0xf59e0b, 1.8, 6);
    lanternGroup.add(lanternLight);
    rightArmGroup.add(lanternGroup);
    explorerGroup.add(rightArmGroup);

    scene.add(explorerGroup);
    patrollingExplorerRef.current = {
      group: explorerGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      torchLight: lanternLight,
    };

    // B. Lookout Pirate on Coastal Rocks with Brass Spyglass
    const lookoutGroup = new THREE.Group();
    lookoutGroup.position.set(7.8, 0.48, 4.2);
    lookoutGroup.scale.set(0.65, 0.65, 0.65);
    lookoutGroup.rotation.y = -Math.PI * 0.4;

    const vestMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const lTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.82, 8), vestMat);
    lTorso.position.y = 1.25;
    lTorso.castShadow = true;
    lookoutGroup.add(lTorso);

    const lHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), skinMat);
    lHead.position.y = 1.82;
    lHead.castShadow = true;
    lookoutGroup.add(lHead);

    const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const bandana = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), bandanaMat);
    bandana.position.y = 1.85;
    lookoutGroup.add(bandana);

    const lLegL = new THREE.Mesh(legGeo, pantsMat);
    lLegL.position.set(-0.16, 0.48, 0);
    lookoutGroup.add(lLegL);
    const lLegR = new THREE.Mesh(legGeo, pantsMat);
    lLegR.position.set(0.16, 0.48, 0);
    lookoutGroup.add(lLegR);

    // Spyglass
    const spyglassGroup = new THREE.Group();
    spyglassGroup.position.set(0.12, 1.76, 0.25);
    spyglassGroup.rotation.x = -Math.PI * 0.15;
    const spyglassTube1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 8), charGoldMat);
    spyglassTube1.rotation.x = Math.PI / 2;
    spyglassGroup.add(spyglassTube1);
    const spyglassTube2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 8), charGoldMat);
    spyglassTube2.rotation.x = Math.PI / 2;
    spyglassTube2.position.z = 0.25;
    spyglassGroup.add(spyglassTube2);
    lookoutGroup.add(spyglassGroup);

    scene.add(lookoutGroup);
    lookoutPirateRef.current = {
      group: lookoutGroup,
      head: lHead,
      spyglass: spyglassGroup,
    };

    // 21. BEACH CAMPFIRE WITH DELICATE EMBER PARTICLES (نيران المخيم وجمر متطاير واقعي)
    const campfireGroup = new THREE.Group();
    campfireGroup.position.set(-5.4, 0.38, 7.6);

    const campRockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2;
      const cRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), campRockMat);
      cRock.position.set(Math.cos(ang) * 0.75, 0.12, Math.sin(ang) * 0.75);
      cRock.castShadow = true;
      campfireGroup.add(cRock);
    }

    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const logGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.1, 7);
    for (let l = 0; l < 4; l++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.rotation.z = Math.PI / 4;
      log.rotation.y = (l / 4) * Math.PI * 2;
      log.position.y = 0.22;
      log.castShadow = true;
      campfireGroup.add(log);
    }

    const campFireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const campCoreMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const campFlame1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), campFireMat);
    campFlame1.position.y = 0.55;
    campfireGroup.add(campFlame1);
    const campFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.58, 5), campCoreMat);
    campFlame2.position.y = 0.5;
    campfireGroup.add(campFlame2);

    const campLight = new THREE.PointLight(0xf97316, 2.8, 8);
    campLight.position.y = 0.65;
    campfireGroup.add(campLight);

    // Realistic Tiny Glowing Ember Sparks (جمر متطاير دقيق بدلاً من الكرات الكبيرة)
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const smokePuffs: { mesh: THREE.Mesh; initialY: number; speed: number; seed: number }[] = [];
    for (let sp = 0; sp < 12; sp++) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), emberMat);
      ember.position.set((Math.random() - 0.5) * 0.35, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.35);
      campfireGroup.add(ember);
      smokePuffs.push({ mesh: ember, initialY: 0.5, speed: 0.55 + (sp % 4) * 0.2, seed: sp });
    }

    scene.add(campfireGroup);
    campfireSmokeRef.current = smokePuffs;

    // 22. TROPICAL FLOWER BUSHES & FLUTTERING BUTTERFLIES (شجيرات أزهار وفراشات ترفرف)
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const hibiscusMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const flowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    const createFlowerBush = (x: number, y: number, z: number, scale = 1.0) => {
      const bush = new THREE.Group();
      bush.position.set(x, y, z);
      bush.scale.set(scale, scale, scale);

      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), bushMat);
      b1.castShadow = true;
      bush.add(b1);
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), bushMat);
      b2.position.set(0.4, -0.1, 0.2);
      b2.castShadow = true;
      bush.add(b2);
      const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bushMat);
      b3.position.set(-0.35, -0.12, -0.2);
      b3.castShadow = true;
      bush.add(b3);

      for (let fl = 0; fl < 5; fl++) {
        const fAngle = (fl / 5) * Math.PI * 2;
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 5), fl % 2 === 0 ? hibiscusMat : flowerYellowMat);
        flower.rotation.x = Math.PI / 2;
        flower.rotation.y = fAngle;
        flower.position.set(Math.cos(fAngle) * 0.62, 0.2 + (fl % 3) * 0.12, Math.sin(fAngle) * 0.62);
        bush.add(flower);
      }
      scene.add(bush);
    };

    createFlowerBush(-4.5, 0.4, 2.5, 0.95);
    createFlowerBush(4.8, 0.4, 2.2, 0.9);
    createFlowerBush(-7.2, 0.4, -2.5, 1.1);
    createFlowerBush(7.5, 0.4, -2.0, 1.05);

    // 3 Fluttering Butterflies
    const butterflies: any[] = [];
    const butterflyColors = [0x38bdf8, 0xfacc15, 0xc084fc];
    for (let b = 0; b < 3; b++) {
      const bGroup = new THREE.Group();
      const bMat = new THREE.MeshBasicMaterial({ color: butterflyColors[b], side: THREE.DoubleSide });

      const wL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), bMat);
      wL.position.x = -0.09;
      bGroup.add(wL);

      const wR = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), bMat);
      wR.position.x = 0.09;
      bGroup.add(wR);

      const centerPos = b === 0 ? new THREE.Vector3(-4.5, 1.6, 2.5) : b === 1 ? new THREE.Vector3(4.8, 1.5, 2.2) : new THREE.Vector3(-7.2, 1.8, -2.5);
      bGroup.position.copy(centerPos);
      scene.add(bGroup);

      butterflies.push({
        group: bGroup,
        wingL: wL,
        wingR: wR,
        center: centerPos,
        radius: 1.2 + b * 0.4,
        speed: 1.2 + b * 0.3,
        phase: b * 2.0,
      });
    }
    butterfliesRef.current = butterflies;

    // 23. ANCIENT AMPHORAE & CRYSTAL RELICS (جرار أثرية وبلورات طاقة مشعة)
    const amphoraMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.7,
      roughness: 0.3,
    });
    const createAmphora = (x: number, y: number, z: number, scale = 1.0, tilt = 0) => {
      const amp = new THREE.Group();
      amp.position.set(x, y, z);
      amp.scale.set(scale, scale, scale);
      amp.rotation.z = tilt;

      const aBody = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), amphoraMat);
      aBody.scale.set(1.0, 1.3, 1.0);
      aBody.position.y = 0.45;
      aBody.castShadow = true;
      amp.add(aBody);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.35, 10), amphoraMat);
      neck.position.y = 0.85;
      amp.add(neck);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), amphoraMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.02;
      amp.add(rim);

      scene.add(amp);
    };

    createAmphora(-3.8, 0.4, -5.2, 0.9, 0.2);
    createAmphora(-4.3, 0.4, -4.8, 0.8, -0.3);
    createAmphora(3.8, 0.4, -5.2, 0.85, -0.15);

    // Glowing Crystal Clusters beside rocks
    const crystalMatBlue = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.2, roughness: 0.1 });
    const crystalMatPurple = new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 1.2, roughness: 0.1 });
    for (let c = 0; c < 5; c++) {
      const cry = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55 + (c % 3) * 0.2, 5), c % 2 === 0 ? crystalMatBlue : crystalMatPurple);
      cry.position.set(5.8 + c * 0.24, 0.5, -4.5 + (c % 2) * 0.3);
      cry.rotation.set(c * 0.2 - 0.2, c * 0.5, c * 0.15 - 0.1);
      scene.add(cry);
    }

    // 24. Raycasting Click, Touch & Hover Handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const checkIntersects = (clientX: number, clientY: number, isClick: boolean) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (
        keyGroupRef.current &&
        keyGroupRef.current.visible &&
        (!keyFoundRef.current || currentPhaseRef.current === "exploration")
      ) {
        const hits = raycaster.intersectObjects(keyGroupRef.current.children, true);
        if (hits.length > 0) {
          if (isClick) {
            onInspectKeyRef.current();
          } else {
            renderer.domElement.style.cursor = "pointer";
            setHoveredObject("key");
          }
          return true;
        }
      }

      if (portalGroup && keyFoundRef.current) {
        const hits = raycaster.intersectObjects(portalGroup.children, true);
        if (hits.length > 0) {
          if (isClick) {
            onApproachPortalRef.current();
          } else {
            renderer.domElement.style.cursor = "pointer";
            setHoveredObject("portal");
          }
          return true;
        }
      }

      if (!isClick) {
        renderer.domElement.style.cursor = "grab";
        setHoveredObject(null);
      }
      return false;
    };

    let pDownPos = { x: 0, y: 0 };
    let pDownTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pDownPos = { x: e.clientX, y: e.clientY };
      pDownTime = Date.now();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pDownPos.x, e.clientY - pDownPos.y);
      const elapsed = Date.now() - pDownTime;
      // Register tap/click if user didn't drag for OrbitControls
      if (dist < 18 && elapsed < 450) {
        checkIntersects(e.clientX, e.clientY, true);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      checkIntersects(e.clientX, e.clientY, false);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    // 20. Responsive Resize with Dynamic FOV
    const handleResize = () => {
      if (!container || !renderer || !camera || !controls) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const curAspect = w / h;

      camera.aspect = curAspect;
      if (curAspect < 1.0) {
        camera.fov = Math.min(72, 45 + (1.0 - curAspect) * 32);
        controls.rotateSpeed = 0.85;
      } else {
        camera.fov = 45;
        controls.rotateSpeed = 0.65;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 21. Master Animation Loop
    const startTime = performance.now();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Camera Smooth Lerp on Phase change or Cinematic Briefing Drift
      if (controls && !isUserInteractingRef.current) {
        if (transitionProgressRef.current < 1.0) {
          transitionProgressRef.current += 0.03;
          const t = Math.min(1.0, transitionProgressRef.current);
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          camera.position.lerpVectors(camStartPosRef.current, targetCamPosRef.current, ease);
          controls.target.lerpVectors(camStartLookRef.current, targetCamLookRef.current, ease);
        } else if (currentPhaseRef.current === "briefing") {
          // Cinematic gentle panoramic drift behind the briefing scroll
          const orbitAngle = elapsedTime * 0.07;
          camera.position.x = Math.sin(orbitAngle) * 5.0;
          camera.position.z = 23.0 + Math.cos(orbitAngle) * 1.5;
          camera.position.y = 10.5 + Math.sin(elapsedTime * 0.18) * 0.4;
          controls.target.set(0, 2.5, 0);
        }
      }

      controls.update();

      // Procedural Ocean Wave Ripples
      if (waterMeshRef.current && waterInitialVerticesRef.current) {
        const pos = waterMeshRef.current.geometry.attributes.position;
        const init = waterInitialVerticesRef.current;
        for (let i = 0; i < pos.count; i++) {
          const u = init[i * 3];
          const v = init[i * 3 + 2];
          const waveY =
            Math.sin(u * 0.22 + elapsedTime * 1.5) * 0.14 +
            Math.cos(v * 0.22 + elapsedTime * 1.2) * 0.11;
          pos.setY(i, init[i * 3 + 1] + waveY);
        }
        pos.needsUpdate = true;
      }

      // Shoreline Foam Waves Expanding & Fading
      foamRingsRef.current.forEach((foam) => {
        const cycle = ((elapsedTime * foam.speed * 0.25 + foam.offset) % 1.0);
        const curScale = 1.0 + cycle * 0.08;
        foam.mesh.scale.set(curScale, curScale, 1);
        (foam.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 * (1.0 - cycle));
      });

      // Rotating Sunbeams
      if (sunBeamsRef.current) {
        sunBeamsRef.current.rotation.z = elapsedTime * 0.06;
      }

      // Drifting Clouds
      cloudsRef.current.forEach((cloud, i) => {
        cloud.position.x += 0.018 * (i % 2 === 0 ? 1 : 1.3);
        if (cloud.position.x > 36) cloud.position.x = -36;
      });

      // Flock of 14 Seagulls Soaring & Flapping
      seagullsRef.current.forEach((gull) => {
        gull.angle += 0.007 * gull.speed;
        gull.group.position.x = Math.cos(gull.angle) * gull.radius;
        gull.group.position.z = Math.sin(gull.angle) * (gull.radius * 0.85) - 6;
        gull.group.position.y = gull.altitude + Math.sin(gull.angle * 2) * 0.6;
        gull.group.rotation.y = -gull.angle + Math.PI / 2;
        const flap = Math.sin(elapsedTime * 12 * gull.speed) * 0.52;
        gull.leftWing.rotation.z = flap;
        gull.rightWing.rotation.z = -flap;
      });

      // Floating Hero Key Rotation & Bobbing
      if (keyGroupRef.current) {
        keyGroupRef.current.rotation.y = elapsedTime * 1.6;
        keyGroupRef.current.position.y = 3.9 + Math.sin(elapsedTime * 2.5) * 0.22;

        if (keyFoundRef.current && currentPhaseRef.current !== "briefing" && currentPhaseRef.current !== "exploration") {
          keyGroupRef.current.visible = false;
        } else {
          keyGroupRef.current.visible = true;
        }

        // Calculate Radar Compass & 3D Screen Beacon for Key
        if (currentPhaseRef.current === "exploration" && !keyFoundRef.current && camera) {
          const camDir = new THREE.Vector3();
          camera.getWorldDirection(camDir);
          const camAngle = Math.atan2(camDir.x, camDir.z);

          const toKeyX = keyGroupRef.current.position.x - camera.position.x;
          const toKeyZ = keyGroupRef.current.position.z - camera.position.z;
          const targetAngle = Math.atan2(toKeyX, toKeyZ);

          let diff = targetAngle - camAngle;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;

          const deg = (diff * 180) / Math.PI;
          const locked = Math.abs(diff) < 0.32;

          setRadarCompassDeg(deg);
          setIsLockedOnKey(locked);

          const keyPos3D = new THREE.Vector3();
          keyGroupRef.current.getWorldPosition(keyPos3D);
          keyPos3D.y += 0.4;
          keyPos3D.project(camera);
          const isFront = keyPos3D.z < 1.0;
          const sX = (keyPos3D.x * 0.5 + 0.5) * window.innerWidth;
          const sY = (-(keyPos3D.y * 0.5) + 0.5) * window.innerHeight;

          setKeyScreenPos({ x: sX, y: sY, visible: isFront });

          if (locked && Date.now() - lastSonarTimeRef.current > 1800) {
            lastSonarTimeRef.current = Date.now();
            treasureHalalAudio.playCompassSonarPing(0.8);
          }
        }
      }

      // Bubble Pulse
      if (bubbleMeshRef.current) {
        const bScale = 1.0 + Math.sin(elapsedTime * 3.0) * 0.05;
        bubbleMeshRef.current.scale.set(bScale, bScale, bScale);
      }

      // Key Glow Light Pulse
      if (keyGlowLightRef.current) {
        keyGlowLightRef.current.intensity = 2.4 + Math.sin(elapsedTime * 4.0) * 0.8;
      }

      // Swirling Portal Rings
      portalRingsRef.current.forEach((ring, idx) => {
        ring.rotation.z = elapsedTime * (idx % 2 === 0 ? 1.4 : -1.6) * (0.8 + idx * 0.35);
      });

      // Portal Core Pulse
      if (portalCoreRef.current) {
        const pScale = 1.0 + Math.sin(elapsedTime * 2.5) * 0.12;
        portalCoreRef.current.scale.set(pScale, pScale, 1);
      }

      // 3D Padlocks Status (Rise & unlock)
      gateLocksRef.current.forEach((lock, idx) => {
        const stepNum = idx + 1;
        const isUnlocked = currentChallengeStepRef.current > stepNum;
        if (isUnlocked) {
          lock.position.y = 10.1 + 1.2 + Math.sin(elapsedTime * 3 + idx) * 0.25;
          lock.rotation.z = Math.PI / 5;
          lock.scale.set(0.85, 0.85, 0.85);
        }
      });

      // Temple Braziers Flames Flutter
      templeFlamesRef.current.forEach((flame, idx) => {
        const fScale = 1.0 + Math.sin(elapsedTime * 12 + idx * 3) * 0.12;
        flame.scale.set(fScale, 1.0 + Math.cos(elapsedTime * 15 + idx * 2) * 0.18, fScale);
      });

      // Torchlights Flicker
      torchLightsRef.current.forEach((light, idx) => {
        light.intensity = 3.8 + Math.sin(elapsedTime * 14 + idx * 3) * 0.85;
      });

      // Chest Lid Animation
      if (chestLidRef.current) {
        const shouldOpen =
          isChestOpenRef.current ||
          currentPhaseRef.current === "completed" ||
          currentPhaseRef.current === "treasure";
        const targetAngle = shouldOpen ? -Math.PI * 0.65 : 0;
        chestLidRef.current.rotation.x = THREE.MathUtils.lerp(
          chestLidRef.current.rotation.x,
          targetAngle,
          0.05
        );
      }

      // Sparkles floating
      if (sparklesRef.current) {
        const positions = sparklesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.022;
          if (positions[i] > 11.0) positions[i] = 0.6;
        }
        sparklesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Patrolling Explorer Character Walk Cycle (On left grassy beach meadow)
      if (patrollingExplorerRef.current) {
        const exp = patrollingExplorerRef.current;
        const patrolT = (elapsedTime * 0.35) % (Math.PI * 2);
        const pX = -3.8 + Math.sin(patrolT) * 1.5;
        const pZ = 5.8 + Math.cos(patrolT) * 1.3;
        const vX = Math.cos(patrolT) * 1.5;
        const vZ = -Math.sin(patrolT) * 1.3;
        exp.group.position.x = pX;
        exp.group.position.z = pZ;
        exp.group.rotation.y = Math.atan2(vX, vZ);

        const walkCycle = elapsedTime * 6.8;
        exp.leftLeg.rotation.x = Math.sin(walkCycle) * 0.6;
        exp.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.6;
        exp.leftArm.rotation.x = -Math.sin(walkCycle) * 0.5;
        exp.rightArm.rotation.x = Math.sin(walkCycle) * 0.4;
        exp.group.position.y = 0.48 + Math.abs(Math.sin(walkCycle * 2)) * 0.04;
        exp.torchLight.intensity = 1.8 + Math.sin(elapsedTime * 14) * 0.5;
      }

      // Lookout Pirate scanning ocean with spyglass
      if (lookoutPirateRef.current) {
        const look = lookoutPirateRef.current;
        const scanAngle = Math.sin(elapsedTime * 0.6) * 0.3;
        look.head.rotation.y = scanAngle;
        look.spyglass.rotation.y = scanAngle;
      }

      // Majestic Pirate Galleon Oceanic Swell Rocking (In open bay)
      if (dockedSailboatRef.current) {
        dockedSailboatRef.current.rotation.z = Math.sin(elapsedTime * 0.9) * 0.04;
        dockedSailboatRef.current.rotation.x = Math.cos(elapsedTime * 0.7) * 0.025;
        dockedSailboatRef.current.position.y = -0.6 + Math.sin(elapsedTime * 0.9) * 0.08;
      }

      // Watchtower Flickering Beacon Fire
      watchtowerFireRef.current.forEach((flame, idx) => {
        flame.scale.y = 1.0 + Math.sin(elapsedTime * 9 + idx) * 0.25;
        flame.scale.x = 1.0 + Math.cos(elapsedTime * 11 + idx) * 0.18;
      });

      // Flying Scarlet Macaw / Parrot Orbiting Island
      if (parrotRef.current) {
        const p = parrotRef.current;
        p.angle += p.speed * 0.012;
        p.group.position.x = Math.cos(p.angle) * p.radiusX;
        p.group.position.z = Math.sin(p.angle) * p.radiusZ;
        p.group.position.y = p.altitude + Math.sin(elapsedTime * 2.5) * 0.35;
        p.group.rotation.y = -p.angle + Math.PI / 2;
        p.group.rotation.z = Math.sin(p.angle) * 0.15;
        const pFlap = Math.sin(elapsedTime * 14) * 0.55;
        p.wingL.rotation.z = pFlap;
        p.wingR.rotation.z = -pFlap;
      }

      // Swimming Schools of Tropical Fish
      schoolOfFishRef.current.forEach((fish) => {
        const fAngle = elapsedTime * fish.speed + fish.phase;
        fish.group.position.x = Math.cos(fAngle) * fish.radius + 3.0;
        fish.group.position.z = Math.sin(fAngle) * (fish.radius * 0.8) + 11.5;
        fish.group.position.y = fish.baseY + Math.sin(elapsedTime * 3 + fish.phase) * 0.06;
        fish.group.rotation.y = -fAngle + Math.PI / 2;
        fish.group.rotation.y += Math.sin(elapsedTime * 12 + fish.phase) * 0.12;
      });

      // Message in a Bottle Bobbing on Waves
      if (bottleRef.current) {
        bottleRef.current.position.y = -0.65 + Math.sin(elapsedTime * 1.8) * 0.06;
        bottleRef.current.rotation.z = Math.sin(elapsedTime * 1.4) * 0.15;
        bottleRef.current.rotation.x = Math.cos(elapsedTime * 1.2) * 0.1;
      }

      // Campfire Tiny Glowing Embers Rising & Drifting
      campfireSmokeRef.current.forEach((ember) => {
        const cycle = (elapsedTime * ember.speed + ember.seed * 0.3) % 1.0;
        ember.mesh.position.y = 0.5 + cycle * 1.8;
        ember.mesh.position.x = Math.sin(elapsedTime * 1.8 + ember.seed) * 0.18;
        ember.mesh.position.z = Math.cos(elapsedTime * 1.5 + ember.seed) * 0.18;
        const sScale = Math.sin(cycle * Math.PI);
        ember.mesh.scale.set(sScale, sScale, sScale);
      });

      // Fluttering Butterflies Flapping & Orbiting
      butterfliesRef.current.forEach((bf) => {
        const bAngle = elapsedTime * bf.speed + bf.phase;
        bf.group.position.x = bf.center.x + Math.cos(bAngle) * bf.radius;
        bf.group.position.z = bf.center.z + Math.sin(bAngle) * bf.radius;
        bf.group.position.y = bf.center.y + Math.sin(elapsedTime * 4 + bf.phase) * 0.25;
        bf.group.rotation.y = -bAngle + Math.PI / 2;
        const flap = Math.sin(elapsedTime * 22) * 0.75;
        bf.wingL.rotation.y = flap;
        bf.wingR.rotation.y = -flap;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      controls.dispose();
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {/* Three.js Canvas Container with Touch Optimization */}
      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      />

      {/* 3D Floating Beacon directly pinned to the Key in screen coordinates */}
      {currentPhase === "exploration" && !keyFound && keyScreenPos && keyScreenPos.visible && (
        <div
          onClick={() => onInspectKeyRef.current()}
          style={{
            left: `${Math.max(40, Math.min(window.innerWidth - 40, keyScreenPos.x))}px`,
            top: `${Math.max(40, Math.min(window.innerHeight - 80, keyScreenPos.y - 45))}px`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer pointer-events-auto flex flex-col items-center group animate-bounce duration-700"
        >
          <div className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-stone-950 font-black px-3.5 py-1.5 rounded-full text-xs shadow-[0_0_25px_rgba(245,158,11,0.9),0_4px_12px_rgba(0,0,0,0.5)] border-2 border-white flex items-center gap-1.5 group-hover:scale-110 active:scale-95 transition-all">
            <Key className="w-3.5 h-3.5 text-stone-950 animate-pulse" />
            <span>المفتاح الذهبي هنا! انقر للالتقاط</span>
            <Sparkles className="w-3 h-3 text-amber-900" />
          </div>
          <div className="w-2.5 h-2.5 bg-yellow-400 rotate-45 -mt-1 border-r-2 border-b-2 border-white" />
        </div>
      )}

      {/* Ancient Treasure Radar Compass (During Exploration Phase) */}
      {currentPhase === "exploration" && !keyFound && (
        <div className="absolute bottom-24 sm:bottom-28 left-3 sm:left-6 z-20 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-b from-[#2c1407]/95 via-[#1a0c04]/95 to-[#2c1407]/95 backdrop-blur-md border-2 border-amber-500/80 p-2.5 sm:p-3 rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-3">
            {/* The Rotating Compass Dial */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-amber-100 to-amber-300 border-2 border-amber-800 shadow-inner flex items-center justify-center shrink-0">
              {/* Compass Rose Markings */}
              <span className="absolute top-0.5 text-[8px] font-black text-amber-900">ش</span>
              <span className="absolute bottom-0.5 text-[8px] font-black text-amber-900">ج</span>
              <span className="absolute right-1 text-[8px] font-black text-amber-900">ق</span>
              <span className="absolute left-1 text-[8px] font-black text-amber-900">غ</span>

              {/* Pulsing Lock Ring */}
              {isLockedOnKey && (
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-75" />
              )}

              {/* Dynamic Needle */}
              <div
                className="w-1.5 h-10 sm:h-11 relative transition-transform duration-100 ease-out flex flex-col justify-between items-center"
                style={{ transform: `rotate(${radarCompassDeg}deg)` }}
              >
                {/* North Needle (Red Arrow pointing to Key) */}
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[18px] border-b-rose-600" />
                {/* Center Brass Pivot */}
                <div className="w-2.5 h-2.5 rounded-full bg-amber-900 border border-amber-200" />
                {/* South Needle */}
                <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[14px] border-t-amber-950" />
              </div>
            </div>

            {/* Status Lore */}
            <div className="flex flex-col text-right">
              <span className="text-[10px] sm:text-xs font-black text-amber-200 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:12s]" />
                <span>بوصلة صائد الكنوز</span>
              </span>
              <span
                className={`text-[11px] sm:text-xs font-black transition-colors ${
                  isLockedOnKey
                    ? "text-emerald-400 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "text-amber-300/80"
                }`}
              >
                {isLockedOnKey ? "🎯 الهدف أمامك! التقط المفتاح" : "دور بالجزيرة لتحديد المفتاح"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3D Navigation Controls (Mobile-Friendly) */}
      <div className="absolute top-16 sm:top-20 right-3 sm:right-4 z-20 pointer-events-none flex flex-col items-end gap-2 animate-in fade-in duration-500">
        <div className="bg-[#451a03]/85 backdrop-blur-md text-amber-200 border border-amber-400/40 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-lg flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
          <span>اسحب للتجول 360° • قرّب للتفاصيل 🔍</span>
        </div>

        <button
          type="button"
          onClick={handleResetCamera}
          className="pointer-events-auto bg-[#78350f]/90 hover:bg-[#92400e] text-white border-2 border-amber-300/60 px-3 py-1.5 rounded-full text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          title="إعادة ضبط زاوية الكاميرا للوضع المثالي"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
          <span>إعادة ضبط الرؤية 🔄</span>
        </button>
      </div>
    </div>
  );
}
