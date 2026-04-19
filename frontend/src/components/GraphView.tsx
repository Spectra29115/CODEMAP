import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useGraphStore } from "@/store/useGraphStore";
import type { RepoNode, RepoEdge } from "@/types/graph";
import { classifyNode, type ImportanceInfo } from "@/utils/fileImportance";
import { FileImportanceLegend } from "@/components/FileImportancePanels";

type Vec3 = [number, number, number];
type Quality = "low" | "medium" | "high";

interface QualityConfig {
  segments: number;
  edgeOpacityBase: number;
  showStars: boolean;
  showFog: boolean;
  dpr: [number, number];
  rotateNodes: boolean;
}

interface HeatInfo {
  score: number;
  normalized: number;
}

interface ParticleFieldProps {
  isLightMode: boolean;
  heavy: boolean;
  mapRadius: number;
  motionEnergyRef: { current: number };
}

const EDGE_RENDER_LIMIT: Record<Quality, number> = {
  low: 900,
  medium: 1800,
  high: 3200,
};

const QUALITY: Record<Quality, QualityConfig> = {
  low: {
    segments: 10,
    edgeOpacityBase: 0.35,
    showStars: false,
    showFog: false,
    dpr: [1, 1],
    rotateNodes: false,
  },
  medium: {
    segments: 16,
    edgeOpacityBase: 0.42,
    showStars: false,
    showFog: true,
    dpr: [1, 1.5],
    rotateNodes: false,
  },
  high: {
    segments: 28,
    edgeOpacityBase: 0.5,
    showStars: true,
    showFog: true,
    dpr: [1, 2],
    rotateNodes: true,
  },
};

const PARTICLE_DENSITY_MULTIPLIER = 4.0;

const InteractiveParticles = ({ isLightMode, heavy, mapRadius, motionEnergyRef }: ParticleFieldProps) => {
  const count = Math.max(120, Math.round((heavy ? 420 : 860) * PARTICLE_DENSITY_MULTIPLIER));
  const outerRadius = Math.max(mapRadius * (heavy ? 1.45 : 1.6), heavy ? 64 : 80);
  const innerRadius = Math.max(mapRadius * (heavy ? 0.2 : 0.18), heavy ? 10 : 12);
  const depth = Math.max(mapRadius * 0.42, heavy ? 20 : 26);

  const pointsRef = useRef<THREE.Points>(null);
  const posArray = useMemo(() => new Float32Array(count * 3), [count]);
  const baseArray = useMemo(() => new Float32Array(count * 3), [count]);

  useEffect(() => {
    const rng = mulberry32(1337);
    for (let i = 0; i < count; i++) {
      const stride = i * 3;
      const angle = rng() * Math.PI * 2;
      const radialT = Math.sqrt(rng());
      const distance = innerRadius + (outerRadius - innerRadius) * radialT;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const z = (rng() - 0.5) * depth;
      posArray[stride] = x;
      posArray[stride + 1] = y;
      posArray[stride + 2] = z;
      baseArray[stride] = x;
      baseArray[stride + 1] = y;
      baseArray[stride + 2] = z;
    }
  }, [count, outerRadius, innerRadius, depth, posArray, baseArray]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const t = state.clock.elapsedTime;
    const energy = motionEnergyRef.current;
    const amp = (heavy ? 0.17 : 0.25) * energy;
    const relax = heavy ? 0.05 : 0.07;

    for (let i = 0; i < count; i++) {
      const stride = i * 3;
      const baseX = baseArray[stride];
      const baseY = baseArray[stride + 1];
      const baseZ = baseArray[stride + 2];

      const targetX = baseX + Math.sin(t * 0.72 + i * 0.17) * amp;
      const targetY = baseY + Math.cos(t * 0.64 + i * 0.23) * amp;
      const targetZ = baseZ + Math.sin(t * 0.55 + i * 0.12) * amp * 0.8;

      posArray[stride] += (targetX - posArray[stride]) * relax;
      posArray[stride + 1] += (targetY - posArray[stride + 1]) * relax;
      posArray[stride + 2] += (targetZ - posArray[stride + 2]) * (relax * 0.9);
    }

    const geometry = pointsRef.current.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={posArray}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={heavy ? 0.09 : 0.11}
        sizeAttenuation
        transparent
        opacity={isLightMode ? 0.44 : 0.35}
        color={isLightMode ? "#70c5ff" : "#6fd7ff"}
        depthWrite={false}
      />
    </points>
  );
};

function computeLayout(nodes: RepoNode[], edges: RepoEdge[]): Record<string, Vec3> {
  if (nodes.length === 0) return {};

  const radii = new Map(nodes.map((node) => [node.id, nodeRadius(node)]));

  const resolveCollisions = (positions: Record<string, THREE.Vector3>) => {
    for (let pass = 0; pass < 6; pass++) {
      let adjusted = false;

      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const idA = nodes[a].id;
          const idB = nodes[b].id;
          const pa = positions[idA];
          const pb = positions[idB];
          if (!pa || !pb) continue;

          const minDistance = (radii.get(idA) ?? 0) + (radii.get(idB) ?? 0) + NODE_CLEARANCE;
          const delta = new THREE.Vector3().subVectors(pa, pb);
          const distance = Math.max(delta.length(), 0.0001);

          if (distance >= minDistance) continue;

          const direction = delta.multiplyScalar(1 / distance);
          const push = (minDistance - distance) / 2;
          pa.addScaledVector(direction, push);
          pb.addScaledVector(direction, -push);
          adjusted = true;
        }
      }

      if (!adjusted) break;
    }
  };

  const normalizeAndBound = (positions: Record<string, THREE.Vector3>, targetRadius: number) => {
    let maxRadius = 0;
    nodes.forEach((n) => {
      maxRadius = Math.max(maxRadius, positions[n.id].length());
    });

    if (maxRadius > targetRadius) {
      const scale = targetRadius / maxRadius;
      nodes.forEach((n) => {
        positions[n.id].multiplyScalar(scale);
      });
    }
  };

  const positions: Record<string, THREE.Vector3> = {};

  // O(n) fallback for very large repositories to avoid expensive quadratic layout cost.
  if (nodes.length > 220) {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    nodes.forEach((n) => {
      incoming.set(n.id, 0);
      outgoing.set(n.id, 0);
    });
    edges.forEach((e) => {
      incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
      outgoing.set(e.source, (outgoing.get(e.source) ?? 0) + 1);
    });

    const sorted = [...nodes].sort(
      (a, b) =>
        (incoming.get(b.id) ?? 0) + (outgoing.get(b.id) ?? 0) -
        ((incoming.get(a.id) ?? 0) + (outgoing.get(a.id) ?? 0)),
    );

    const perRing = 16;
    const ringGap = 5.4;
    const startRadius = 6.2;

    sorted.forEach((node, index) => {
      const ring = Math.floor(index / perRing);
      const inRingIndex = index % perRing;
      const ringCount = Math.min(perRing, sorted.length - ring * perRing);
      const angle = (inRingIndex / ringCount) * Math.PI * 2;
      const radius = startRadius + ring * ringGap;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = ((index % 7) - 3) * 0.55;
      positions[node.id] = new THREE.Vector3(x, y, z);
    });
  } else {
    const rng = mulberry32(42);
    nodes.forEach((n) => {
      positions[n.id] = new THREE.Vector3(
        (rng() - 0.5) * 20,
        (rng() - 0.5) * 20,
        (rng() - 0.5) * 20,
      );
    });

    const k = nodes.length > 140 ? 3.4 : 3.8;
    const iterations = nodes.length > 140 ? 84 : nodes.length > 80 ? 120 : 180;
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
  }

  // Normalize final spread so graph stays within a visually manageable radius.
  const targetRadius = 19;

  normalizeAndBound(positions, targetRadius);
  resolveCollisions(positions);
  normalizeAndBound(positions, targetRadius);

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
  entry: "#2CFCCF",
  core: "#54B8FF",
  utility: "#A387FF",
  risk: "#FF7A8A",
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

const LOC_TO_DIAMETER = 0.0065;
const MIN_DIAMETER = 0.85;
const MAX_DIAMETER = 4.6;
const NODE_CLEARANCE = 0.7;

function nodeRadius(node: RepoNode) {
  const importance = classifyNode(node.path);
  const diameter = Math.min(Math.max(node.loc * LOC_TO_DIAMETER, MIN_DIAMETER), MAX_DIAMETER);
  return (diameter * importance.size) / 2;
}

interface NodeMeshProps {
  node: RepoNode;
  position: Vec3;
  importance: ImportanceInfo;
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
  importance,
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
  const diameter = Math.min(Math.max(node.loc * LOC_TO_DIAMETER, MIN_DIAMETER), MAX_DIAMETER);
  const baseSize = (diameter * importance.size) / 2;
  const color = importance.level > 0 ? importance.colors.bg : nodeColor(node);

  const opacity = (isDimmed ? 0.22 : 1) * importance.colors.opacity;
  const targetScale = isHovered || isSelected ? baseSize * 1.08 : baseSize;

  return (
    <group position={position}>
      <mesh
        scale={targetScale}
        rotation={[0, quality.rotateNodes ? 0.12 : 0, 0]}
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
        <meshPhysicalMaterial
          color={color}
          emissive={importance.colors.border}
          emissiveIntensity={isSelected || isHovered ? 0.22 : 0.08}
          metalness={0.62}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={0.92}
          transparent
          opacity={opacity}
        />
      </mesh>

      {isHovered && (
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
  highlighted: boolean;
  dimmed: boolean;
  baseOpacity: number;
}

const EdgeLine = ({ from, to, active, highlighted, dimmed, baseOpacity }: EdgeLineProps) => {
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

  const color = highlighted ? "#ffffff" : active ? "#06b6d4" : "#d1d5db";
  const opacity = dimmed ? 0.1 : highlighted ? 0.3 : active ? 0.32 : 0.15;

  return (
    <>
      <Line points={points} color={color} lineWidth={active || highlighted ? 2.9 : 2.3} transparent opacity={opacity} />
      <mesh position={arrowPos} quaternion={arrowQuat} renderOrder={2}>
        <coneGeometry args={[0.14, 0.42, 14]} />
        <meshBasicMaterial color={color} transparent opacity={highlighted ? 0.3 : 0.15} depthWrite={false} />
      </mesh>
    </>
  );
};

const Scene = ({ quality, isLightMode, isHeavyGraph }: { quality: QualityConfig; isLightMode: boolean; isHeavyGraph: boolean }) => {
  const graph = useGraphStore((s) => s.graph);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const highlightedNodeIds = useGraphStore((s) => s.highlightedNodeIds);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const zoomPulse = useRef(0);
  const centerPulse = useRef(0);
  const lastSelectedNodeId = useRef<string | null>(null);
  const centerTarget = useRef(new THREE.Vector3());
  const cameraDirectionScratch = useRef(new THREE.Vector3());
  const motionEnergyRef = useRef(0);
  const previousCameraPosRef = useRef(new THREE.Vector3());
  const previousTargetRef = useRef(new THREE.Vector3());
  const movementInitRef = useRef(false);

  const layout = useMemo(() => {
    if (!graph) return {} as Record<string, Vec3>;
    return computeLayout(graph.nodes, graph.edges);
  }, [graph]);

  const importanceMap = useMemo(() => {
    if (!graph) return new Map<string, ImportanceInfo>();
    return new Map(graph.nodes.map((node) => [node.id, classifyNode(node.path)]));
  }, [graph]);

  const highlightedSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);

  useEffect(() => {
    if (!selectedNodeId || selectedNodeId === lastSelectedNodeId.current) return;
    lastSelectedNodeId.current = selectedNodeId;
    zoomPulse.current = 1;
    const selectedPosition = layout[selectedNodeId];
    if (selectedPosition) {
      centerTarget.current.set(selectedPosition[0], selectedPosition[1], selectedPosition[2]);
      centerPulse.current = 1;
    }
  }, [selectedNodeId, layout]);

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

  const renderedEdges = useMemo(() => {
    if (!graph) return [] as RepoEdge[];
    const limit = EDGE_RENDER_LIMIT[quality.segments <= 10 ? "low" : quality.segments <= 16 ? "medium" : "high"];
    if (graph.edges.length <= limit) return graph.edges;

    const important: RepoEdge[] = [];
    const rest: RepoEdge[] = [];

    for (const edge of graph.edges) {
      const onFocus = !!focusId && (edge.source === focusId || edge.target === focusId);
      const onHighlight = highlightedSet.has(edge.source) || highlightedSet.has(edge.target);
      if (onFocus || onHighlight) important.push(edge);
      else rest.push(edge);
    }

    const budget = Math.max(limit - important.length, 0);
    if (budget === 0) return important.slice(0, limit);

    const stride = Math.max(1, Math.ceil(rest.length / budget));
    const sampled = rest.filter((_, i) => i % stride === 0).slice(0, budget);
    return [...important, ...sampled];
  }, [graph, quality.segments, focusId, highlightedSet]);

  const heatmap = useMemo(() => {
    if (!graph) return {} as Record<string, HeatInfo>;

    const outgoing = new Map<string, number>();

    graph.nodes.forEach((node) => {
      outgoing.set(node.id, 0);
    });

    graph.edges.forEach((edge) => {
      outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
    });

    let maxScore = 0;
    const rawScores = new Map<string, number>();

    graph.nodes.forEach((node) => {
      const score = outgoing.get(node.id) ?? 0;
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

  const mapRadius = useMemo(() => {
    if (!graph) return 42;

    let maxRadius = 0;
    graph.nodes.forEach((node) => {
      const pos = layout[node.id];
      if (!pos) return;
      const r = Math.hypot(pos[0], pos[1]);
      maxRadius = Math.max(maxRadius, r);
    });

    return Math.max(42, maxRadius + 14);
  }, [graph, layout]);

  useFrame(() => {
    if (!graph || !controlsRef.current) return;

    const controls = controlsRef.current;
    const cameraPos = controls.object.position as THREE.Vector3;
    const target = controls.target as THREE.Vector3;

    if (!movementInitRef.current) {
      previousCameraPosRef.current.copy(cameraPos);
      previousTargetRef.current.copy(target);
      movementInitRef.current = true;
    }

    const moveAmount =
      previousCameraPosRef.current.distanceTo(cameraPos) +
      previousTargetRef.current.distanceTo(target);

    if (moveAmount > 0.00035) {
      motionEnergyRef.current = Math.min(1, motionEnergyRef.current + moveAmount * 26);
    } else {
      motionEnergyRef.current *= 0.9;
    }

    previousCameraPosRef.current.copy(cameraPos);
    previousTargetRef.current.copy(target);

    if (centerPulse.current > 0) {
      target.lerp(centerTarget.current, 0.14);
      controls.update();
      centerPulse.current = Math.max(0, centerPulse.current - 0.1);
    }

    if (zoomPulse.current > 0) {
      const direction = cameraDirectionScratch.current.copy(cameraPos).sub(target);
      const desiredPosition = target.clone().add(direction.multiplyScalar(0.9));

      cameraPos.lerp(desiredPosition, 0.12);
      controls.update();

      zoomPulse.current = Math.max(0, zoomPulse.current - 0.08);
    }
  });

  if (!graph) return null;

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

      <InteractiveParticles
        isLightMode={isLightMode}
        heavy={isHeavyGraph}
        mapRadius={mapRadius}
        motionEnergyRef={motionEnergyRef}
      />

      {renderedEdges.map((e) => {
        const from = layout[e.source];
        const to = layout[e.target];
        if (!from || !to) return null;

        const onFocus = !!focusId && (e.source === focusId || e.target === focusId);
        const onHighlight = highlightedSet.has(e.source) || highlightedSet.has(e.target);

        const active = onFocus || onHighlight;
        const dimmed = !!connectedIds && !onFocus && !onHighlight;

        return (
          <EdgeLine
            key={e.id}
            from={from}
            to={to}
            active={active}
            highlighted={onHighlight}
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
        const isHighlighted = highlightedSet.has(n.id);
        const isDimmed = connectedIds ? !connectedIds.has(n.id) : false;
        const isFocused = !!focusId && connectedIds?.has(n.id) === true;

        return (
          <NodeMesh
            key={n.id}
            node={n}
            position={pos}
            importance={importanceMap.get(n.id) ?? classifyNode(n.path)}
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

const Hint = () => (
  <div className="pointer-events-none absolute bottom-4 right-4 z-10 glass rounded-lg border border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
    Drag to rotate and pan · Scroll to zoom
  </div>
);

const GraphView = () => {
  const graph = useGraphStore((s) => s.graph);
  const selectNode = useGraphStore((s) => s.selectNode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(!!graph);
  }, [graph]);

  const isHeavyGraph = !!graph && (graph.nodes.length > 220 || graph.edges.length > 1200);
  const quality: Quality = isHeavyGraph ? "low" : "medium";
  const cfg = useMemo<QualityConfig>(() => {
    const base = QUALITY[quality];
    if (!isHeavyGraph) return base;
    return {
      ...base,
      showStars: false,
      showFog: false,
      rotateNodes: false,
      dpr: [1, 1],
      edgeOpacityBase: 0.55,
      segments: Math.min(base.segments, 10),
    };
  }, [quality, isHeavyGraph]);

  return (
    <div className="relative w-full h-full">
      {ready && (
        <Canvas
          camera={{ position: [18, 14, 18], fov: 55, near: 0.1, far: 200 }}
          dpr={cfg.dpr}
          gl={{ antialias: !isHeavyGraph && quality !== "low", powerPreference: isHeavyGraph ? "low-power" : "high-performance" }}
          onPointerMissed={() => selectNode(null)}
        >
          <Suspense fallback={null}>
            <Scene quality={cfg} isLightMode={false} isHeavyGraph={isHeavyGraph} />
          </Suspense>
        </Canvas>
      )}
      <FileImportanceLegend />
      <Hint />
    </div>
  );
};

export default GraphView;
