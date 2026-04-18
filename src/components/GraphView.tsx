import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Gauge } from "lucide-react";
import { useGraphStore } from "@/store/useGraphStore";
import type { RepoNode, RepoEdge } from "@/types/graph";

type Vec3 = [number, number, number];
type Quality = "low" | "medium" | "high";

interface QualityConfig {
  segments: number;
  edgeOpacityBase: number;
  showHalo: boolean;
  showStars: boolean;
  showFog: boolean;
  dpr: [number, number];
  rotateNodes: boolean;
  pixelRatio: number;
}

const QUALITY: Record<Quality, QualityConfig> = {
  low: {
    segments: 10,
    edgeOpacityBase: 0.25,
    showHalo: false,
    showStars: false,
    showFog: false,
    dpr: [1, 1],
    rotateNodes: false,
    pixelRatio: 1,
  },
  medium: {
    segments: 16,
    edgeOpacityBase: 0.3,
    showHalo: true,
    showStars: false,
    showFog: true,
    dpr: [1, 1.5],
    rotateNodes: false,
    pixelRatio: 1.25,
  },
  high: {
    segments: 28,
    edgeOpacityBase: 0.35,
    showHalo: true,
    showStars: true,
    showFog: true,
    dpr: [1, 2],
    rotateNodes: true,
    pixelRatio: 2,
  },
};

// ---------- Force-directed 3D layout (deterministic, runs once per graph) ----------
function computeLayout(nodes: RepoNode[], edges: RepoEdge[]): Record<string, Vec3> {
  const positions: Record<string, THREE.Vector3> = {};
  const rng = mulberry32(42);
  nodes.forEach((n) => {
    positions[n.id] = new THREE.Vector3(
      (rng() - 0.5) * 20,
      (rng() - 0.5) * 20,
      (rng() - 0.5) * 20,
    );
  });

  const k = 4;
  // Lower iteration count for larger graphs to keep init snappy
  const iterations = nodes.length > 80 ? 140 : 200;
  for (let i = 0; i < iterations; i++) {
    const disp: Record<string, THREE.Vector3> = {};
    nodes.forEach((n) => (disp[n.id] = new THREE.Vector3()));

    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const pa = positions[nodes[a].id];
        const pb = positions[nodes[b].id];
        const delta = new THREE.Vector3().subVectors(pa, pb);
        const dist = Math.max(delta.length(), 0.01);
        const force = (k * k) / dist;
        const dir = delta.normalize().multiplyScalar(force);
        disp[nodes[a].id].add(dir);
        disp[nodes[b].id].sub(dir);
      }
    }

    edges.forEach((e) => {
      const ps = positions[e.source];
      const pt = positions[e.target];
      if (!ps || !pt) return;
      const delta = new THREE.Vector3().subVectors(ps, pt);
      const dist = Math.max(delta.length(), 0.01);
      const force = (dist * dist) / k;
      const dir = delta.normalize().multiplyScalar(force);
      disp[e.source].sub(dir);
      disp[e.target].add(dir);
    });

    const t = 1.5 * (1 - i / iterations);
    nodes.forEach((n) => {
      const d = disp[n.id];
      const len = Math.max(d.length(), 0.01);
      const move = d.multiplyScalar(Math.min(len, t) / len);
      positions[n.id].add(move);
      positions[n.id].multiplyScalar(0.995);
    });
  }

  const out: Record<string, Vec3> = {};
  Object.entries(positions).forEach(([id, v]) => {
    out[id] = [v.x, v.y, v.z];
  });
  return out;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_COLOR: Record<string, string> = {
  entry: "#34d399",
  core: "#60a5fa",
  utility: "#a78bfa",
  risk: "#f87171",
};

function nodeColor(n: RepoNode) {
  if (n.riskLevel === "high") return CATEGORY_COLOR.risk;
  return CATEGORY_COLOR[n.category] ?? CATEGORY_COLOR.core;
}

// ---------- Node sphere ----------
interface NodeMeshProps {
  node: RepoNode;
  position: Vec3;
  isSelected: boolean;
  isHovered: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
  quality: QualityConfig;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

const NodeMesh = ({
  node,
  position,
  isSelected,
  isHovered,
  isFocused,
  isDimmed,
  isHighlighted,
  quality,
  onClick,
  onPointerOver,
  onPointerOut,
}: NodeMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const baseSize = 0.35 + Math.min(node.loc / 800, 1.2);
  const color = nodeColor(node);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = isHovered || isSelected ? baseSize * 1.35 : baseSize;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
    if (haloRef.current) {
      const showHalo = isSelected || isHighlighted || isFocused;
      const haloTarget = showHalo ? baseSize * 1.9 : baseSize * 1.05;
      haloRef.current.scale.lerp(new THREE.Vector3(haloTarget, haloTarget, haloTarget), 0.12);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, showHalo ? 0.25 : 0, 0.12);
    }
    if (quality.rotateNodes) meshRef.current.rotation.y += delta * 0.2;
  });

  const opacity = isDimmed ? 0.18 : 1;

  return (
    <group position={position}>
      {quality.showHalo && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onPointerOut();
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[1, quality.segments, quality.segments]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || isHovered ? 0.9 : 0.35}
          metalness={0.3}
          roughness={0.35}
          transparent
          opacity={opacity}
        />
      </mesh>
      {(isHovered || isSelected) && (
        <Html
          distanceFactor={10}
          position={[0, baseSize * 1.6, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="px-2 py-1 rounded-md text-xs font-medium bg-card/95 border border-border text-foreground whitespace-nowrap shadow-lg backdrop-blur">
            {node.label}
          </div>
        </Html>
      )}
    </group>
  );
};

// ---------- Edge ----------
interface EdgeLineProps {
  from: Vec3;
  to: Vec3;
  active: boolean;
  dimmed: boolean;
  baseOpacity: number;
}

const EdgeLine = ({ from, to, active, dimmed, baseOpacity }: EdgeLineProps) => {
  const points = useMemo<Vec3[]>(() => [from, to], [from, to]);
  const color = active ? "#67e8f9" : "#64748b";
  const opacity = dimmed ? 0.05 : active ? 0.9 : baseOpacity;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={active ? 2 : 1}
      transparent
      opacity={opacity}
    />
  );
};

// ---------- Camera focus + keyboard shortcuts ----------
const CameraController = ({ target }: { target: Vec3 | null }) => {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const zoomCommand = useRef<0 | 1 | -1 | "fit">(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "+" || e.key === "=") zoomCommand.current = -1;
      else if (e.key === "-" || e.key === "_") zoomCommand.current = 1;
      else if (e.key === "0") zoomCommand.current = "fit";
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame(() => {
    if (zoomCommand.current === "fit") {
      camera.position.lerp(new THREE.Vector3(18, 14, 18), 0.2);
      camera.lookAt(0, 0, 0);
      zoomCommand.current = 0;
    } else if (zoomCommand.current !== 0) {
      const dir = camera.position.clone().normalize();
      camera.position.addScaledVector(dir, zoomCommand.current * 1.5);
      zoomCommand.current = 0;
    }
    if (target) {
      desired.current.set(target[0] + 6, target[1] + 4, target[2] + 6);
      camera.position.lerp(desired.current, 0.05);
      camera.lookAt(new THREE.Vector3(...target));
    }
  });
  return null;
};

// ---------- Scene ----------
const Scene = ({ quality }: { quality: QualityConfig }) => {
  const graph = useGraphStore((s) => s.graph);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const highlightedNodeIds = useGraphStore((s) => s.highlightedNodeIds);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);

  const layout = useMemo(() => {
    if (!graph) return {} as Record<string, Vec3>;
    return computeLayout(graph.nodes, graph.edges);
  }, [graph]);

  const focusId = hoveredNodeId ?? selectedNodeId;
  const connectedIds = useMemo(() => {
    if (!focusId || !graph) return null;
    const set = new Set<string>([focusId]);
    graph.edges.forEach((e) => {
      if (e.source === focusId) set.add(e.target);
      if (e.target === focusId) set.add(e.source);
    });
    return set;
  }, [focusId, graph]);

  const focusPos = focusId ? layout[focusId] ?? null : null;

  if (!graph) return null;

  return (
    <>
      <color attach="background" args={["#070a13"]} />
      {quality.showFog && <fog attach="fog" args={["#070a13", 25, 70]} />}
      <ambientLight intensity={0.45} />
      <pointLight position={[15, 15, 15]} intensity={1.1} color="#7dd3fc" />
      <pointLight position={[-15, -10, -10]} intensity={0.8} color="#a78bfa" />
      {quality.showStars && (
        <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.6} />
      )}

      {graph.edges.map((e) => {
        const from = layout[e.source];
        const to = layout[e.target];
        if (!from || !to) return null;
        const onFocus = !!focusId && (e.source === focusId || e.target === focusId);
        const onHighlight =
          highlightedNodeIds.includes(e.source) && highlightedNodeIds.includes(e.target);
        const active = onFocus || onHighlight;
        const dimmed = !!connectedIds && !onFocus && !onHighlight;
        return (
          <EdgeLine
            key={e.id}
            from={from}
            to={to}
            active={active}
            dimmed={dimmed}
            baseOpacity={quality.edgeOpacityBase}
          />
        );
      })}

      {graph.nodes.map((n) => {
        const pos = layout[n.id];
        if (!pos) return null;
        const isSelected = n.id === selectedNodeId;
        const isHovered = n.id === hoveredNodeId;
        const isHighlighted = highlightedNodeIds.includes(n.id);
        const isDimmed = connectedIds ? !connectedIds.has(n.id) : false;
        const isFocused = !!focusId && connectedIds?.has(n.id) === true;
        return (
          <NodeMesh
            key={n.id}
            node={n}
            position={pos}
            isSelected={isSelected}
            isHovered={isHovered}
            isFocused={isFocused}
            isDimmed={isDimmed}
            isHighlighted={isHighlighted}
            quality={quality}
            onClick={() => selectNode(n.id)}
            onPointerOver={() => hoverNode(n.id)}
            onPointerOut={() => hoverNode(null)}
          />
        );
      })}

      <CameraController target={focusPos} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        zoomSpeed={0.9}
        minDistance={5}
        maxDistance={60}
      />
    </>
  );
};

const QualityToggle = ({
  quality,
  setQuality,
}: {
  quality: Quality;
  setQuality: (q: Quality) => void;
}) => (
  <div className="absolute top-4 right-4 z-10 glass flex items-center gap-1 rounded-lg p-1 text-[11px]">
    <Gauge className="ml-1 h-3 w-3 text-muted-foreground" />
    {(["low", "medium", "high"] as Quality[]).map((q) => (
      <button
        key={q}
        onClick={() => setQuality(q)}
        className={`rounded-md px-2 py-1 font-medium capitalize transition-colors ${
          quality === q
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {q}
      </button>
    ))}
  </div>
);

const Hint = () => (
  <div className="absolute bottom-4 right-4 z-10 glass rounded-lg px-3 py-2 text-[11px] text-muted-foreground pointer-events-none">
    Drag to rotate · Scroll to zoom · <kbd className="font-mono">+</kbd>/<kbd className="font-mono">-</kbd> zoom · <kbd className="font-mono">0</kbd> reset
  </div>
);

const GraphView = () => {
  const graph = useGraphStore((s) => s.graph);
  const selectNode = useGraphStore((s) => s.selectNode);
  const [ready, setReady] = useState(false);
  const [quality, setQualityState] = useState<Quality>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("reponav.quality") : null;
    return (saved as Quality) ?? "medium";
  });

  const setQuality = (q: Quality) => {
    setQualityState(q);
    try {
      localStorage.setItem("reponav.quality", q);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setReady(!!graph);
  }, [graph]);

  const cfg = QUALITY[quality];

  return (
    <div className="relative w-full h-full">
      {ready && (
        <Canvas
          camera={{ position: [18, 14, 18], fov: 55, near: 0.1, far: 200 }}
          dpr={cfg.dpr}
          gl={{ antialias: quality !== "low", powerPreference: "high-performance" }}
          onPointerMissed={() => selectNode(null)}
        >
          <Suspense fallback={null}>
            <Scene quality={cfg} />
          </Suspense>
        </Canvas>
      )}
      <QualityToggle quality={quality} setQuality={setQuality} />
      <Hint />
    </div>
  );
};

export default GraphView;
