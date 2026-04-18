import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GraphData, GraphNode } from "@/lib/mockData";

interface Graph3DViewProps {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  searchMatches: string[];
}

interface PositionedNode extends GraphNode {
  position: THREE.Vector3;
}

// Read an HSL CSS variable -> THREE.Color
const cssColor = (varName: string) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return new THREE.Color(`hsl(${raw.replace(/(\d+)%/g, "$1%")})`);
};

// Force-directed layout in 3D
const layoutNodes = (data: GraphData): Map<string, THREE.Vector3> => {
  const positions = new Map<string, THREE.Vector3>();
  const velocities = new Map<string, THREE.Vector3>();

  // Initial sphere distribution
  data.nodes.forEach((n, i) => {
    const phi = Math.acos(-1 + (2 * i) / data.nodes.length);
    const theta = Math.sqrt(data.nodes.length * Math.PI) * phi;
    const r = 6;
    positions.set(
      n.id,
      new THREE.Vector3(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ),
    );
    velocities.set(n.id, new THREE.Vector3());
  });

  const REPULSION = 6;
  const SPRING = 0.04;
  const DAMPING = 0.82;
  const ITERATIONS = 220;
  const IDEAL = 3.2;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < data.nodes.length; i++) {
      for (let j = i + 1; j < data.nodes.length; j++) {
        const a = positions.get(data.nodes[i].id)!;
        const b = positions.get(data.nodes[j].id)!;
        const delta = new THREE.Vector3().subVectors(a, b);
        const dist = Math.max(delta.length(), 0.5);
        const force = REPULSION / (dist * dist);
        delta.normalize().multiplyScalar(force);
        velocities.get(data.nodes[i].id)!.add(delta);
        velocities.get(data.nodes[j].id)!.sub(delta);
      }
    }
    // Spring along edges
    data.edges.forEach((e) => {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) return;
      const delta = new THREE.Vector3().subVectors(b, a);
      const dist = delta.length();
      const force = (dist - IDEAL) * SPRING;
      delta.normalize().multiplyScalar(force);
      velocities.get(e.source)!.add(delta);
      velocities.get(e.target)!.sub(delta);
    });
    // Centering
    positions.forEach((p, id) => {
      const v = velocities.get(id)!;
      v.addScaledVector(p, -0.002);
      v.multiplyScalar(DAMPING);
      p.add(v);
    });
  }

  return positions;
};

const NodeMesh = ({
  node,
  selected,
  dimmed,
  highlighted,
  onClick,
  colors,
}: {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  highlighted: boolean;
  onClick: () => void;
  colors: { default: THREE.Color; impact: THREE.Color; entry: THREE.Color; selected: THREE.Color };
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const baseColor =
    node.kind === "entry" ? colors.entry : node.kind === "impact" ? colors.impact : colors.default;
  const color = selected || highlighted ? colors.selected : baseColor;
  const radius = node.kind === "impact" ? 0.34 : node.kind === "entry" ? 0.32 : 0.26;
  const scale = selected || hovered || highlighted ? 1.25 : 1;

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.18);
  });

  const opacity = dimmed ? 0.18 : 1;

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected || highlighted ? 0.55 : 0.18}
          metalness={0.2}
          roughness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Selection halo */}
      {(selected || highlighted) && (
        <mesh>
          <sphereGeometry args={[radius * 1.7, 32, 32]} />
          <meshBasicMaterial color={colors.selected} transparent opacity={0.12} />
        </mesh>
      )}
      {/* HTML label — always readable */}
      <Html
        center
        distanceFactor={10}
        position={[0, radius + 0.45, 0]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none", opacity: dimmed ? 0.3 : 1 }}
      >
        <div
          className="rounded-md border border-border/70 bg-card/95 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm"
          style={{ whiteSpace: "nowrap" }}
        >
          {node.label}
        </div>
      </Html>
    </group>
  );
};

const Edges = ({
  positions,
  edges,
  highlightedIds,
  dimmedIds,
  edgeColor,
  edgeActiveColor,
}: {
  positions: Map<string, THREE.Vector3>;
  edges: GraphData["edges"];
  highlightedIds: Set<string>;
  dimmedIds: Set<string>;
  edgeColor: THREE.Color;
  edgeActiveColor: THREE.Color;
}) => {
  // Build separate geometries for normal / highlighted to keep colors crisp
  const { normalGeom, highlightGeom } = useMemo(() => {
    const normal: number[] = [];
    const highlight: number[] = [];
    edges.forEach((e) => {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) return;
      const isHighlight =
        highlightedIds.has(e.source) && highlightedIds.has(e.target);
      const isDimmed =
        dimmedIds.has(e.source) || dimmedIds.has(e.target);
      const target = isHighlight ? highlight : normal;
      // Skip dimmed-only edges from being too visible (still draw faintly via opacity setting)
      if (isDimmed && !isHighlight) return;
      target.push(a.x, a.y, a.z, b.x, b.y, b.z);
    });

    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.Float32BufferAttribute(normal, 3));
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute(highlight, 3));
    return { normalGeom: ng, highlightGeom: hg };
  }, [positions, edges, highlightedIds, dimmedIds]);

  return (
    <>
      <lineSegments geometry={normalGeom}>
        <lineBasicMaterial color={edgeColor} transparent opacity={0.55} />
      </lineSegments>
      <lineSegments geometry={highlightGeom}>
        <lineBasicMaterial color={edgeActiveColor} transparent opacity={1} />
      </lineSegments>
    </>
  );
};

const Scene = ({
  data,
  selectedId,
  onSelectNode,
  searchMatches,
  themeKey,
}: Graph3DViewProps & { themeKey: string }) => {
  const { camera } = useThree();

  const positions = useMemo(() => layoutNodes(data), [data]);

  const colors = useMemo(
    () => ({
      default: cssColor("--node-default"),
      impact: cssColor("--node-impact"),
      entry: cssColor("--node-entry"),
      selected: cssColor("--node-selected"),
      edge: cssColor("--edge"),
      edgeActive: cssColor("--edge-active"),
    }),
    // re-read on theme change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeKey],
  );

  // Adjacency for highlighting
  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    data.nodes.forEach((n) => m.set(n.id, new Set([n.id])));
    data.edges.forEach((e) => {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    });
    return m;
  }, [data]);

  const highlightedIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedId) {
      adjacency.get(selectedId)?.forEach((id) => set.add(id));
    }
    searchMatches.forEach((id) => {
      set.add(id);
      adjacency.get(id)?.forEach((nb) => set.add(nb));
    });
    return set;
  }, [selectedId, searchMatches, adjacency]);

  const dimmedIds = useMemo(() => {
    if (!selectedId && searchMatches.length === 0) return new Set<string>();
    const set = new Set<string>();
    data.nodes.forEach((n) => {
      if (!highlightedIds.has(n.id)) set.add(n.id);
    });
    return set;
  }, [data, highlightedIds, selectedId, searchMatches]);

  // Fit camera once
  useEffect(() => {
    camera.position.set(10, 8, 14);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <directionalLight position={[-8, -6, -10]} intensity={0.4} />

      <Edges
        positions={positions}
        edges={data.edges}
        highlightedIds={highlightedIds}
        dimmedIds={dimmedIds}
        edgeColor={colors.edge}
        edgeActiveColor={colors.edgeActive}
      />

      {data.nodes.map((n) => {
        const pos = positions.get(n.id)!;
        const isSelected = selectedId === n.id;
        const isMatch = searchMatches.includes(n.id);
        const isDimmed = dimmedIds.has(n.id);
        return (
          <NodeMesh
            key={n.id}
            node={{ ...n, position: pos }}
            selected={isSelected}
            highlighted={isMatch}
            dimmed={isDimmed}
            onClick={() => onSelectNode(n.id)}
            colors={colors}
          />
        );
      })}
    </>
  );
};

export const Graph3DView = (props: Graph3DViewProps) => {
  // Re-render scene when theme changes so colors refresh
  const [themeKey, setThemeKey] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <Canvas
        camera={{ position: [10, 8, 14], fov: 50 }}
        onPointerMissed={() => props.onSelectNode(null)}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene {...props} themeKey={String(themeKey)} />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.7}
            zoomSpeed={0.8}
            minDistance={5}
            maxDistance={40}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
