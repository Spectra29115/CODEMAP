import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Gauge } from "lucide-react";
import { useTheme } from "next-themes";
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
}

interface HeatInfo {
  score: number;
  normalized: number;
}

const QUALITY: Record<Quality, QualityConfig> = {
  low: {
    segments: 10,
    edgeOpacityBase: 0.35,
    showHalo: false,
    showStars: false,
    showFog: false,
    dpr: [1, 1],
    rotateNodes: false,
  },
  medium: {
    segments: 16,
    edgeOpacityBase: 0.42,
    showHalo: true,
    showStars: false,
    showFog: true,
    dpr: [1, 1.5],
    rotateNodes: false,
  },
  high: {
    segments: 28,
    edgeOpacityBase: 0.5,
    showHalo: true,
    showStars: true,
    showFog: true,
    dpr: [1, 2],
    rotateNodes: true,
  },
};

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

  const k = 3.2;
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
      // Mild global gravity keeps clusters readable and prevents over-scattering.
      positions[n.id].multiplyScalar(0.975);
    });
  }

  // Normalize final spread so graph stays within a visually manageable radius.
  let maxRadius = 0;
  nodes.forEach((n) => {
    maxRadius = Math.max(maxRadius, positions[n.id].length());
  });
  const targetRadius = 14;
  if (maxRadius > 0) {
    const scale = Math.min(targetRadius / maxRadius, 1.35);
    nodes.forEach((n) => {
      positions[n.id].multiplyScalar(scale);
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

function heatColor(normalized: number) {
  const hue = (1 - normalized) * 0.33;
  return new THREE.Color().setHSL(hue, 0.78, 0.52).getStyle();
}

function normalizeScore(score: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(score / max, 1);
}

interface NodeMeshProps {
  node: RepoNode;
  position: Vec3;
  isSelected: boolean;
  isHovered: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
  heat: HeatInfo;
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
  heat,
  quality,
  onClick,
  onPointerOver,
  onPointerOut,
}: NodeMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const borderRef = useRef<THREE.LineSegments>(null);
  const scaleVector = useRef(new THREE.Vector3());
  const haloScaleVector = useRef(new THREE.Vector3());
  const borderScaleVector = useRef(new THREE.Vector3());
  const baseSize = 0.35 + Math.min(node.loc / 800, 1.2);
  const color = nodeColor(node);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = isHovered || isSelected ? baseSize * 1.35 : baseSize;
    scaleVector.current.set(target, target, target);
    meshRef.current.scale.lerp(scaleVector.current, 0.15);

    if (borderRef.current) {
      const borderTarget = target * 1.08;
      borderScaleVector.current.set(borderTarget, borderTarget, borderTarget);
      borderRef.current.scale.lerp(borderScaleVector.current, 0.18);
      const borderMat = borderRef.current.material as THREE.LineBasicMaterial;
      const baseOpacity = 0.2 + heat.normalized * 0.45;
      const activeBoost = isSelected || isHovered ? 0.15 : 0;
      borderMat.opacity = THREE.MathUtils.lerp(borderMat.opacity, baseOpacity + activeBoost, 0.15);
    }

    if (haloRef.current) {
      const showHalo = isSelected || isHighlighted || isFocused;
      const haloTarget = showHalo ? baseSize * 1.9 : baseSize * 1.05;
      haloScaleVector.current.set(haloTarget, haloTarget, haloTarget);
      haloRef.current.scale.lerp(haloScaleVector.current, 0.12);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, showHalo ? 0.25 : 0, 0.12);
    }

    if (quality.rotateNodes) meshRef.current.rotation.y += delta * 0.2;
  });

  const opacity = isDimmed ? 0.22 : 1;

  return (
    <group position={position}>
      {quality.showHalo && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <lineSegments ref={borderRef}>
        <edgesGeometry args={[new THREE.SphereGeometry(1, Math.max(quality.segments, 12), Math.max(quality.segments, 12))]} />
        <lineBasicMaterial
          color={heatColor(heat.normalized)}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </lineSegments>

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

interface EdgeLineProps {
  from: Vec3;
  to: Vec3;
  active: boolean;
  dimmed: boolean;
  baseOpacity: number;
}

const EdgeLine = ({ from, to, active, dimmed, baseOpacity }: EdgeLineProps) => {
  const start = useMemo(() => new THREE.Vector3(...from), [from]);
  const end = useMemo(() => new THREE.Vector3(...to), [to]);
  const points = useMemo<Vec3[]>(() => [from, to], [from, to]);
  const direction = useMemo(() => end.clone().sub(start), [end, start]);
  const dirNorm = useMemo(() => direction.clone().normalize(), [direction]);
  const arrowPos = useMemo(() => end.clone().addScaledVector(dirNorm, -0.5), [dirNorm, end]);
  const arrowQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm),
    [dirNorm],
  );

  const color = active ? "#06b6d4" : "#c2d2e4";
  const opacity = dimmed ? 0.14 : active ? 1 : Math.max(baseOpacity, 0.5);

  return (
    <>
      <Line points={points} color={color} lineWidth={active ? 2.9 : 2.3} transparent opacity={opacity} />
      <mesh position={arrowPos} quaternion={arrowQuat} renderOrder={2}>
        <coneGeometry args={[0.18, 0.54, 14]} />
        <meshBasicMaterial color={color} transparent opacity={Math.min(opacity + 0.16, 1)} depthWrite={false} />
      </mesh>
    </>
  );
};

const Scene = ({ quality, isLightMode }: { quality: QualityConfig; isLightMode: boolean }) => {
  const graph = useGraphStore((s) => s.graph);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const highlightedNodeIds = useGraphStore((s) => s.highlightedNodeIds);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);

  const controlsRef = useRef<any>(null);
  const zoomPulse = useRef(0);
  const centerPulse = useRef(0);
  const lastSelectedNodeId = useRef<string | null>(null);
  const centerTarget = useRef(new THREE.Vector3());
  const cameraDirectionScratch = useRef(new THREE.Vector3());

  const layout = useMemo(() => {
    if (!graph) return {} as Record<string, Vec3>;
    return computeLayout(graph.nodes, graph.edges);
  }, [graph]);

  useEffect(() => {
    if (!selectedNodeId || selectedNodeId === lastSelectedNodeId.current) return;
    lastSelectedNodeId.current = selectedNodeId;
    zoomPulse.current = 1;
    const selectedPosition = layout[selectedNodeId];
    if (selectedPosition) {
      centerTarget.current.set(selectedPosition[0], selectedPosition[1], selectedPosition[2]);
      centerPulse.current = 1;
    }
  }, [selectedNodeId]);

  const focusId = selectedNodeId;

  const connectedIds = useMemo(() => {
    if (!focusId || !graph) return null;
    const set = new Set<string>([focusId]);
    graph.edges.forEach((e) => {
      if (e.source === focusId) set.add(e.target);
      if (e.target === focusId) set.add(e.source);
    });
    return set;
  }, [focusId, graph]);

  const heatmap = useMemo(() => {
    if (!graph) return {} as Record<string, HeatInfo>;

    const outgoing = new Map<string, number>();
    const dependents = new Map<string, number>();

    graph.nodes.forEach((node) => {
      outgoing.set(node.id, 0);
      dependents.set(node.id, 0);
    });

    graph.edges.forEach((edge) => {
      outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
      dependents.set(edge.target, (dependents.get(edge.target) ?? 0) + 1);
    });

    let maxScore = 0;
    const rawScores = new Map<string, number>();

    graph.nodes.forEach((node) => {
      const score = (outgoing.get(node.id) ?? 0) + (dependents.get(node.id) ?? 0);
      rawScores.set(node.id, score);
      maxScore = Math.max(maxScore, score);
    });

    const map: Record<string, HeatInfo> = {};
    graph.nodes.forEach((node) => {
      const score = rawScores.get(node.id) ?? 0;
      map[node.id] = {
        score,
        normalized: normalizeScore(score, maxScore),
      };
    });

    return map;
  }, [graph]);

  if (!graph) return null;

  useFrame(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const target = controls.target as THREE.Vector3;

    if (centerPulse.current > 0) {
      target.lerp(centerTarget.current, 0.14);
      controls.update();
      centerPulse.current = Math.max(0, centerPulse.current - 0.1);
    }

    if (zoomPulse.current <= 0) return;

    const direction = cameraDirectionScratch.current.copy(controls.object.position).sub(target);
    const desiredPosition = target.clone().add(direction.multiplyScalar(0.9));

    controls.object.position.lerp(desiredPosition, 0.12);
    controls.update();

    zoomPulse.current = Math.max(0, zoomPulse.current - 0.08);
  });

  const bg = isLightMode ? "#d9efff" : "#070a13";

  return (
    <>
      <color attach="background" args={[bg]} />
      {quality.showFog && <fog attach="fog" args={[bg, 25, 70]} />}

      <ambientLight intensity={isLightMode ? 0.72 : 0.45} />
      <pointLight position={[15, 15, 15]} intensity={isLightMode ? 0.85 : 1.1} color="#7dd3fc" />
      <pointLight position={[-15, -10, -10]} intensity={isLightMode ? 0.6 : 0.8} color="#a78bfa" />

      {quality.showStars && (
        <Stars
          radius={isLightMode ? 95 : 80}
          depth={isLightMode ? 55 : 40}
          count={isLightMode ? 1800 : 1200}
          factor={isLightMode ? 3.5 : 3}
          saturation={isLightMode ? 0 : 0}
          fade
          speed={isLightMode ? 0.35 : 0.6}
        />
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
            heat={heatmap[n.id] ?? { score: 0, normalized: 0 }}
            quality={quality}
            onClick={() => selectNode(n.id)}
            onPointerOver={() => hoverNode(n.id)}
            onPointerOut={() => hoverNode(null)}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        zoomSpeed={2.2}
        minDistance={5}
        maxDistance={90}
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
    Drag to rotate and pan · Scroll to zoom
  </div>
);

const HeatmapLegend = () => (
  <div className="absolute bottom-4 left-4 z-10 glass rounded-lg px-3 py-2 text-[11px]">
    <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Risk Heatmap</div>
    <div className="h-2.5 w-44 rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#eab308_55%,#ef4444_100%)]" />
    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
      <span>Low</span>
      <span>High</span>
    </div>
    <div className="mt-1 text-[10px] text-muted-foreground">
      Score = dependents + outgoing edges
    </div>
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
  const { resolvedTheme } = useTheme();

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
            <Scene quality={cfg} isLightMode={resolvedTheme === "light"} />
          </Suspense>
        </Canvas>
      )}
      <QualityToggle quality={quality} setQuality={setQuality} />
      <HeatmapLegend />
      <Hint />
    </div>
  );
};

export default GraphView;
