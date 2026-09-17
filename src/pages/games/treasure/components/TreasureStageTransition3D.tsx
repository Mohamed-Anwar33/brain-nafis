import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Sparkles, ArrowLeft, Zap, Trophy, Award, FastForward, Play, Shield } from "lucide-react";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import confetti from "canvas-confetti";

export interface StageTransitionData {
  fromStage: number; // 1, 2, 3, or 4
  toStage: number; // 2, 3, 4, or 5 (5 = Final Victory Chamber)
  newScore: number;
}

interface TreasureStageTransition3DProps {
  transitionData: StageTransitionData;
  onComplete: () => void;
}

interface TransitionThemeConfig {
  badge: string;
  title: string;
  subtitle: string;
  fromName: string;
  toName: string;
  colorPalette: {
    fog: number;
    ambient: number;
    lightPrimary: number;
    lightSecondary: number;
    particlePrimary: number;
    particleSecondary: number;
    ringColor: number;
  };
  warpType: "wind" | "ocean" | "flame" | "celestial";
  accentGradient: string;
}

export const TRANSITION_CONFIGS: Record<number, TransitionThemeConfig> = {
  // 1 -> 2: Wind Portal to Ocean Depths
  2: {
    badge: "🌪️ انتقال المرحلة 1 ➔ المرحلة 2",
    title: "بوابة لؤلؤة الأعماق الأسطورية 🔮",
    subtitle: "عبور عاصفة الرياح الكونية والغوص نحو أعماق المحيط الأثري",
    fromName: "المرحلة الأولى: أختام الرياح",
    toName: "المرحلة الثانية: لؤلؤة الأعماق",
    colorPalette: {
      fog: 0x042f2e,
      ambient: 0x115e59,
      lightPrimary: 0x06b6d4,
      lightSecondary: 0x10b981,
      particlePrimary: 0x22d3ee,
      particleSecondary: 0x34d399,
      ringColor: 0x5eead4,
    },
    warpType: "wind",
    accentGradient: "from-teal-400 via-cyan-400 to-emerald-500",
  },
  // 2 -> 3: Ocean Depths to Sacred Flame Forge
  3: {
    badge: "🌊 انتقال المرحلة 2 ➔ المرحلة 3",
    title: "صرح شعلة المعرفة الفائقة ⚡",
    subtitle: "اختراق خندق البلورات المشعة والصعود إلى بركان الطاقة الحيوية",
    fromName: "المرحلة الثانية: لؤلؤة الأعماق",
    toName: "المرحلة الثالثة: شعلة المعرفة",
    colorPalette: {
      fog: 0x1e1b4b,
      ambient: 0x312e81,
      lightPrimary: 0x8b5cf6,
      lightSecondary: 0x3b82f6,
      particlePrimary: 0xa78bfa,
      particleSecondary: 0x60a5fa,
      ringColor: 0xc084fc,
    },
    warpType: "ocean",
    accentGradient: "from-indigo-400 via-purple-400 to-sky-500",
  },
  // 3 -> 4: Flame Forge to Celestial Golden Realm
  4: {
    badge: "🔥 انتقال المرحلة 3 ➔ المرحلة 4 (الأخيرة)",
    title: "عرش الكنز الأسطوري الأعظم 👑",
    subtitle: "انفجار الشعلة الشمسية والارتقاء إلى قمة الهيكل الذهبي الملكي",
    fromName: "المرحلة الثالثة: شعلة المعرفة",
    toName: "المرحلة الرابعة: الكنز الأعظم",
    colorPalette: {
      fog: 0x451a03,
      ambient: 0x78350f,
      lightPrimary: 0xf59e0b,
      lightSecondary: 0xef4444,
      particlePrimary: 0xfbbf24,
      particleSecondary: 0xf97316,
      ringColor: 0xfef08a,
    },
    warpType: "flame",
    accentGradient: "from-amber-400 via-yellow-400 to-orange-500",
  },
  // 4 -> 5: Victory Chamber
  5: {
    badge: "🏆 إنجاز بطولي • فتح الكنز الأسطوري",
    title: "محراب الكنز الأعظم واستلام الشهادة 📜",
    subtitle: "فك كافة الأختام بنجاح كامل 100/100 وفتح الصندوق الذهبي",
    fromName: "المرحلة الرابعة: الكنز الأعظم",
    toName: "العرش الذهبي للتميز",
    colorPalette: {
      fog: 0x1c1917,
      ambient: 0x44403c,
      lightPrimary: 0xfacc15,
      lightSecondary: 0xe11d48,
      particlePrimary: 0xfef08a,
      particleSecondary: 0xf43f5e,
      ringColor: 0xffedd5,
    },
    warpType: "celestial",
    accentGradient: "from-yellow-300 via-amber-400 to-rose-500",
  },
};

export function TreasureStageTransition3D({
  transitionData,
  onComplete,
}: TreasureStageTransition3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const config = TRANSITION_CONFIGS[transitionData.toStage] || TRANSITION_CONFIGS[2];
  const hasFinishedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    try {
      treasureHalalAudio.playStoneGateRumble();
      treasureHalalAudio.playCrystalPulse();
    } catch (e) {}

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ["#fbbf24", "#f59e0b", "#10b981", "#38bdf8", "#ffffff"],
    });

    onComplete();
  }, [onComplete]);

  // Three.js 3D Procedural Warp Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      // 1. Scene & Camera
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(config.colorPalette.fog, 0.018);

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
      camera.position.set(0, 0, 80);

      // 2. High-Performance Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(config.colorPalette.fog);
      container.appendChild(renderer.domElement);

      // 3. Dynamic Lighting
      const ambientLight = new THREE.AmbientLight(config.colorPalette.ambient, 1.8);
      scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(config.colorPalette.lightPrimary, 3.5, 120);
      pointLight1.position.set(0, 5, 40);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(config.colorPalette.lightSecondary, 3.0, 100);
      pointLight2.position.set(0, -5, 0);
      scene.add(pointLight2);

      // 4. Procedural 3D Warp Environment based on warpType
      const warpObjectsGroup = new THREE.Group();
      scene.add(warpObjectsGroup);

      // Rings tunnel
      const rings: THREE.Mesh[] = [];
      const numRings = 9;
      for (let i = 0; i < numRings; i++) {
        const ringGeo = new THREE.TorusGeometry(8 + (i % 3) * 1.5, 0.35, 16, 48);
        const ringMat = new THREE.MeshStandardMaterial({
          color: config.colorPalette.ringColor,
          emissive: config.colorPalette.lightPrimary,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.8,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.z = 60 - i * 20;
        ring.rotation.z = (i * Math.PI) / 4;
        warpObjectsGroup.add(ring);
        rings.push(ring);
      }

      // Floating floating artifacts & crystals depending on theme
      const floatingMeshes: THREE.Mesh[] = [];
      const numArtifacts = 24;

      for (let i = 0; i < numArtifacts; i++) {
        let geom: THREE.BufferGeometry;
        if (config.warpType === "wind") {
          // Sleek wind crystal shards
          geom = new THREE.ConeGeometry(1.2, 3.8, 5);
        } else if (config.warpType === "ocean") {
          // Bioluminescent ocean polyhedra
          geom = new THREE.OctahedronGeometry(1.6);
        } else if (config.warpType === "flame") {
          // Angular volcanic obsidian asteroids
          geom = new THREE.DodecahedronGeometry(1.8);
        } else {
          // Royal celestial star crystals & gems
          geom = new THREE.IcosahedronGeometry(1.7);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? config.colorPalette.particlePrimary : config.colorPalette.particleSecondary,
          emissive: config.colorPalette.lightPrimary,
          emissiveIntensity: 0.65,
          roughness: 0.1,
          metalness: 0.9,
          wireframe: i % 3 === 0,
        });

        const mesh = new THREE.Mesh(geom, mat);
        const angle = (i / numArtifacts) * Math.PI * 2;
        const radius = 12 + (i % 4) * 3;
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = 60 - (i / numArtifacts) * 160;
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

        warpObjectsGroup.add(mesh);
        floatingMeshes.push(mesh);
      }

      // High-speed Warp Tunnel Particles (Starfield / Vortex streaks)
      const particleCount = 1400;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      const velArray = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const r = 2 + Math.random() * 26;
        const theta = Math.random() * Math.PI * 2;
        posArray[i3] = Math.cos(theta) * r;
        posArray[i3 + 1] = Math.sin(theta) * r;
        posArray[i3 + 2] = -120 + Math.random() * 240;
        velArray[i] = 1.2 + Math.random() * 2.8;
      }

      particleGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));

      // Particle texture/material
      const particleMat = new THREE.PointsMaterial({
        size: 0.95,
        color: config.colorPalette.particlePrimary,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });

      const particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);

      // Play thematic audio on enter
      try {
        treasureHalalAudio.playKeyFound();
        treasureHalalAudio.playParchmentOpen();
      } catch (e) {}

      // 5. Animation Loop with Camera Spline Travel
      const startTime = performance.now();
      const totalDuration = 4200; // 4.2 seconds of adrenaline 3D travel

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(1, elapsed / totalDuration);

        // Update React Progress states smoothly
        setProgress(Math.round(t * 100));
        setSecondsRemaining(Math.max(0, Math.ceil((totalDuration - elapsed) / 1000)));

        // Camera flight: zooms from z=80 forward down to z=-90 with dynamic spiral banking
        camera.position.z = 80 - t * 160;
        camera.position.x = Math.sin(t * Math.PI * 3) * 3.5;
        camera.position.y = Math.cos(t * Math.PI * 2.5) * 2.2;
        camera.rotation.z = Math.sin(t * Math.PI * 2) * 0.45;

        // FOV warp stretch
        camera.fov = 65 + Math.sin(t * Math.PI) * 26;
        camera.updateProjectionMatrix();

        // Rotate rings & pulse
        rings.forEach((ring, idx) => {
          ring.rotation.z += 0.02 + idx * 0.005;
          ring.rotation.x += 0.01;
        });

        // Rotate floating crystals
        floatingMeshes.forEach((mesh, idx) => {
          mesh.rotation.x += 0.03;
          mesh.rotation.y += 0.02;
          // Float toward camera
          mesh.position.z += 0.25;
          if (mesh.position.z > camera.position.z + 10) {
            mesh.position.z -= 160;
          }
        });

        // Update particle streaming
        const positions = particleGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3 + 2] += velArray[i] * 1.6;
          // Spiral vortex motion
          const curX = positions[i3];
          const curY = positions[i3 + 1];
          const ang = 0.015;
          positions[i3] = curX * Math.cos(ang) - curY * Math.sin(ang);
          positions[i3 + 1] = curX * Math.sin(ang) + curY * Math.cos(ang);

          if (positions[i3 + 2] > camera.position.z + 10) {
            positions[i3 + 2] = camera.position.z - 120;
          }
        }
        particleGeo.attributes.position.needsUpdate = true;

        if (renderer) {
          renderer.render(scene, camera);
        }

        if (t < 1) {
          animFrameId = requestAnimationFrame(animate);
        } else {
          handleFinish();
        }
      };

      animFrameId = requestAnimationFrame(animate);

      // Handle Resize
      const handleResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animFrameId);
        if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
          renderer.dispose();
        }
      };
    } catch (err) {
      console.warn("WebGL 3D stage transition fallback active:", err);
      // Fallback timer if WebGL fails on low-end device
      const timer = setTimeout(handleFinish, 3500);
      return () => clearTimeout(timer);
    }
  }, [config, handleFinish]);

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-slate-950 text-foreground flex flex-col justify-between select-none animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* 1. Full-Screen 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 overflow-hidden" />

      {/* 2. Soft Ambient Cinematic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/75 pointer-events-none z-10" />

      {/* 3. Top Status HUD Bar */}
      <div className="relative z-20 p-4 sm:p-6 w-full max-w-5xl mx-auto flex items-center justify-between">
        {/* Left: Interactive Badge */}
        <div className="flex items-center gap-2">
          <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border-2 border-white/20 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{config.badge}</span>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>رصيد الكنز: {transitionData.newScore} / 100</span>
          </div>
        </div>

        {/* Right: Quick Skip Button */}
        <button
          type="button"
          onClick={handleFinish}
          className="py-1.5 px-4 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-lg hover:border-amber-400"
        >
          <span>تخطي العرض</span>
          <FastForward className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* 4. Center Cinematic Stage Presentation Card */}
      <div className="relative z-20 flex flex-col items-center justify-center p-4 text-center max-w-2xl mx-auto space-y-3 pointer-events-none">
        {/* Stage Leap Indicator */}
        <div className="inline-flex items-center gap-2 px-5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 via-yellow-400/30 to-amber-500/20 border-2 border-amber-400/60 backdrop-blur-md text-amber-200 font-black text-xs sm:text-sm shadow-2xl animate-pulse">
          <span>{config.fromName}</span>
          <span className="text-amber-400 font-extrabold text-base">➔</span>
          <span className="text-white font-black">{config.toName}</span>
        </div>

        {/* Big Epic Title */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans leading-tight">
          {config.title}
        </h2>

        {/* Subtitle Description */}
        <p className="text-xs sm:text-sm md:text-base text-amber-100/90 max-w-lg mx-auto font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {config.subtitle}
        </p>

        {/* 3D Warp Speed Meter */}
        <div className="pt-2 flex items-center gap-2 text-[11px] sm:text-xs font-mono font-black text-amber-300/80">
          <Zap className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />
          <span>انتقال ثلاثي الأبعاد نشط • WARP VORTEX 3D</span>
        </div>
      </div>

      {/* 5. Bottom Interactive Launchpad & Progress Gauge */}
      <div className="relative z-20 p-4 sm:p-8 w-full max-w-xl mx-auto flex flex-col items-center space-y-3">
        {/* Progress Bar with Glow */}
        <div className="w-full bg-black/50 backdrop-blur-md rounded-full h-3 border-2 border-white/20 p-0.5 overflow-hidden shadow-2xl">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.accentGradient} transition-all duration-150 shadow-[0_0_16px_rgba(245,158,11,0.8)]`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Bottom CTA Button */}
        <button
          type="button"
          onClick={handleFinish}
          className={`pointer-events-auto py-3.5 sm:py-4 px-8 sm:px-12 rounded-full border-2 border-white/40 bg-gradient-to-r ${config.accentGradient} text-stone-950 font-black text-sm sm:text-base shadow-[0_8px_25px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group`}
        >
          <span>دخول {config.toName} الآن</span>
          <ArrowLeft className="w-5 h-5 text-stone-950 group-hover:-translate-x-1 transition-transform" />
        </button>

        <span className="text-[11px] text-white/60 font-bold">
          الانتقال التلقائي خلال {secondsRemaining} ثوانٍ...
        </span>
      </div>
    </div>
  );
}
