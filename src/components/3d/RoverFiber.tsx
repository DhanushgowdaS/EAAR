import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Radio } from 'lucide-react';

// ============================================================================
// 1. REUSABLE ROVER SUB-COMPONENTS (High-Fidelity Agricultural Mechanical Rover)
// ============================================================================

// Wheel Component with 14 Rugged Radial Tread Lugs, Green Inner Dish & Chrome Hub
const RuggedWheel: React.FC<{
  position: [number, number, number];
  isLeft: boolean;
}> = ({ position, isLeft }) => {
  const tireRadius = 0.48;
  const tireWidth = 0.44;

  const lugPositions = useMemo(() => {
    const numLugs = 14;
    const items: { angle: number; y: number; z: number }[] = [];
    for (let i = 0; i < numLugs; i++) {
      const angle = (i / numLugs) * Math.PI * 2;
      const lugDist = tireRadius + 0.035;
      items.push({
        angle,
        y: Math.sin(angle) * lugDist,
        z: Math.cos(angle) * lugDist,
      });
    }
    return items;
  }, [tireRadius]);

  const armLength = Math.abs(position[0]) - 0.72;

  return (
    <group position={position}>
      {/* Main Tire Cylinder (Matte Rubber) */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[tireRadius, tireRadius, tireWidth, 28]} />
        <meshStandardMaterial color="#181a18" roughness={0.94} metalness={0.05} />
      </mesh>

      {/* Rugged Off-Road Tread Lugs */}
      {lugPositions.map((lug, idx) => (
        <mesh
          key={idx}
          position={[0, lug.y, lug.z]}
          rotation={[-lug.angle, 0, 0]}
          castShadow
        >
          <boxGeometry args={[tireWidth * 0.9, 0.08, 0.14]} />
          <meshStandardMaterial color="#181a18" roughness={0.95} metalness={0.05} />
        </mesh>
      ))}

      {/* Green Inner Rim Dish */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, tireWidth + 0.01, 24]} />
        <meshStandardMaterial color="#16a34a" roughness={0.35} metalness={0.25} />
      </mesh>

      {/* Chrome Center Hub Cap */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, tireWidth + 0.03, 18]} />
        <meshStandardMaterial color="#ecf0ec" roughness={0.14} metalness={0.95} />
      </mesh>

      {/* Chrome Central Nut */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, tireWidth + 0.05, 6]} />
        <meshStandardMaterial color="#ecf0ec" roughness={0.15} metalness={0.95} />
      </mesh>

      {/* Suspension Wishbone Linkage */}
      <mesh position={[isLeft ? armLength / 2 : -armLength / 2, 0, 0]}>
        <boxGeometry args={[armLength, 0.06, 0.06]} />
        <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.35} />
      </mesh>

      {/* Suspension Coilover Damper (Brass Body) */}
      <mesh
        position={[isLeft ? armLength * 0.4 : -armLength * 0.4, 0.12, 0]}
        rotation={[0, 0, isLeft ? 0.35 : -0.35]}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.22, 12]} />
        <meshStandardMaterial color="#d4a034" roughness={0.28} metalness={0.82} />
      </mesh>
    </group>
  );
};

// Articulated 3-DOF Robotic Arm with Camera Cleanly at the End (NO Hanging Rods)
const RoboticArm: React.FC = () => {
  return (
    <group position={[0.24, 0.7, 0.38]}>
      {/* Turret Base Flange */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.06, 24]} />
        <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.4} />
      </mesh>

      {/* Swivel Turret Body */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 18]} />
        <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Shoulder Joint Pivot Discs */}
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.18, 18]} />
        <meshStandardMaterial color="#0c0e0c" roughness={0.6} metalness={0.45} />
      </mesh>

      {/* Lower Arm Link (Segment 1 - Angled Forward) */}
      <group position={[0, 0.2, 0]} rotation={[0.32, 0, 0]}>
        <mesh position={[0, 0.23, 0]} castShadow>
          <boxGeometry args={[0.11, 0.46, 0.11]} />
          <meshStandardMaterial color="#141615" roughness={0.48} metalness={0.52} />
        </mesh>

        {/* Elbow Joint Pivot Discs */}
        <mesh position={[0, 0.46, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.17, 18]} />
          <meshStandardMaterial color="#0c0e0c" roughness={0.6} metalness={0.45} />
        </mesh>

        {/* Upper Arm Link (Segment 2 - Articulated Upright) */}
        <group position={[0, 0.46, 0]} rotation={[-0.42, 0, 0]}>
          <mesh position={[0, 0.19, 0]} castShadow>
            <boxGeometry args={[0.095, 0.38, 0.095]} />
            <meshStandardMaterial color="#141615" roughness={0.48} metalness={0.52} />
          </mesh>

          {/* Wrist Pivot Joint */}
          <mesh position={[0, 0.38, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.14, 16]} />
            <meshStandardMaterial color="#0c0e0c" roughness={0.6} metalness={0.45} />
          </mesh>

          {/* CAMERA UNIT: Mounted DIRECTLY at the top/end of the arm */}
          {/* Note: Completely clean, no dangling or hanging rod/pole underneath */}
          <group position={[0, 0.42, 0.04]} rotation={[0.1, 0, 0]}>
            {/* Camera Body Cube */}
            <mesh castShadow>
              <boxGeometry args={[0.2, 0.18, 0.18]} />
              <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
            </mesh>

            {/* Lens Barrel Cylinder */}
            <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.082, 0.12, 24]} />
              <meshStandardMaterial color="#0c0e0c" roughness={0.6} metalness={0.4} />
            </mesh>

            {/* High-Res Optical Glass Lens Element with Subtle Reflection */}
            <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.02, 24]} />
              <meshPhysicalMaterial
                color="#050e18"
                roughness={0.05}
                metalness={0.9}
                clearcoat={1.0}
                clearcoatRoughness={0.05}
              />
            </mesh>

            {/* Cyan Anti-Reflective Lens Bezel Ring */}
            <mesh position={[0, 0, 0.19]}>
              <ringGeometry args={[0.064, 0.074, 24]} />
              <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
            </mesh>

            {/* Secondary Top Sensor/Bracket Block */}
            <mesh position={[0, 0.11, -0.02]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.08]} />
              <meshStandardMaterial color="#0c0e0c" roughness={0.6} metalness={0.4} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

// Top Electronics Enclosure & Vertical Antenna/Puck Elements
const TopEnclosureAndAntennas: React.FC = () => {
  return (
    <>
      {/* Top Electronics Enclosure Box */}
      <group position={[0, 0.81, -0.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.22, 0.82]} />
          <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Ribbed Heatsink Cooling Fins */}
        {[-0.32, -0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24, 0.32].map((f, i) => (
          <mesh key={i} position={[0, 0.12, f]}>
            <boxGeometry args={[0.8, 0.02, 0.04]} />
            <meshStandardMaterial color="#0c0e0c" roughness={0.7} metalness={0.3} />
          </mesh>
        ))}

        {/* Front Connector Terminal Plate */}
        <mesh position={[0, 0.02, 0.42]}>
          <boxGeometry args={[0.4, 0.08, 0.04]} />
          <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.35} />
        </mesh>
      </group>

      {/* 1. Left Vertical Antenna Rod */}
      <group position={[-0.52, 0.7, -0.85]}>
        {/* Antenna Base Collar */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.048, 0.1, 14]} />
          <meshStandardMaterial color="#0c0e0c" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Antenna Rod */}
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.016, 0.02, 0.72, 12]} />
          <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>

      {/* 2. White GPS RTK Puck Antenna on Pedestal Stalk */}
      <group position={[-0.16, 0.7, -0.72]}>
        {/* Pedestal Stalk */}
        <mesh position={[0, 0.17, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.036, 0.34, 14]} />
          <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.35} />
        </mesh>
        {/* White Mushroom Puck Base */}
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.07, 24]} />
          <meshStandardMaterial color="#f4f7f4" roughness={0.28} metalness={0.08} />
        </mesh>
        {/* White Mushroom Puck Beveled Top */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <sphereGeometry args={[0.14, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
          <meshStandardMaterial color="#f4f7f4" roughness={0.28} metalness={0.08} />
        </mesh>
      </group>
    </>
  );
};

// Front Obstacle & Ultrasonic Sensor Assembly with Headlights
const FrontSensorAssembly: React.FC = () => {
  return (
    <group position={[0, 0.42, 1.28]}>
      {/* Faceplate */}
      <mesh castShadow>
        <boxGeometry args={[1.36, 0.38, 0.12]} />
        <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.35} />
      </mesh>

      {/* Dual Ultrasonic Transducers (Chrome Bezel + Mesh Core) */}
      {[-0.15, 0.15].map((xOffset, i) => (
        <group key={i} position={[xOffset, 0, 0.06]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
            <meshStandardMaterial color="#ecf0ec" roughness={0.14} metalness={0.95} />
          </mesh>
          <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.085, 20]} />
            <meshStandardMaterial color="#262a28" roughness={0.75} metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Flanking LED Headlights (Left & Right Clusters) */}
      {[-0.48, 0.48].map((xOffset, i) => (
        <group key={i} position={[xOffset, 0, 0.04]}>
          {/* Housing */}
          <mesh>
            <boxGeometry args={[0.2, 0.3, 0.08]} />
            <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Top LED */}
          <mesh position={[0, 0.07, 0.05]}>
            <boxGeometry args={[0.065, 0.065, 0.04]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#e0fff4"
              emissiveIntensity={2.2}
              roughness={0.1}
            />
          </mesh>
          {/* Bottom LED */}
          <mesh position={[0, -0.07, 0.05]}>
            <boxGeometry args={[0.065, 0.065, 0.04]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#e0fff4"
              emissiveIntensity={2.2}
              roughness={0.1}
            />
          </mesh>
        </group>
      ))}

      {/* Lower Front Tubular Bumper Crossbar */}
      <mesh position={[0, -0.22, 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 1.25, 16]} />
        <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.35} />
      </mesh>

      {/* Bumper Mounting Brackets */}
      {[-0.42, 0.42].map((xOffset, i) => (
        <mesh key={i} position={[xOffset, -0.15, 0.05]}>
          <boxGeometry args={[0.05, 0.15, 0.14]} />
          <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}

      {/* Soft Forward Point Light */}
      <pointLight position={[0, 0, 0.35]} color="#dcfce7" intensity={1.2} distance={3.5} />
    </group>
  );
};

// Ground Futuristic Platform & Drifting Leaves
const FuturisticPlatformAndLeaves: React.FC = () => {
  const neonRingRef = useRef<THREE.Mesh>(null);
  const leavesRef = useRef<THREE.Group>(null);

  const leafItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const r = 3.6 + Math.random() * 2.2;
      items.push({
        x: Math.cos(angle) * r,
        y: 0.6 + Math.random() * 2.8,
        z: Math.sin(angle) * r,
        speed: 0.4 + Math.random() * 0.6,
        rotSpeed: 0.5 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return items;
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    // Pulse the glowing cyan neon ring
    if (neonRingRef.current) {
      const mat = neonRingRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 1.0 + Math.sin(elapsed * 2.2) * 0.12;
      mat.color.setRGB(0.0, 0.96 * pulse, 0.7 * pulse);
    }

    // Animate ambient drifting leaves
    if (leavesRef.current) {
      leavesRef.current.children.forEach((child, i) => {
        const item = leafItems[i];
        if (item) {
          child.position.y = item.y + Math.sin(elapsed * item.speed + item.phase) * 0.25;
          child.rotation.y += 0.005 * item.rotSpeed;
          child.rotation.z += 0.004 * item.rotSpeed;
        }
      });
    }
  });

  // Circular platform radial spokes
  const spokesGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let s = 0; s < 8; s++) {
      const angle = (s / 8) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(angle) * 1.6, -0.03, Math.sin(angle) * 1.6),
        new THREE.Vector3(Math.cos(angle) * 3.1, -0.03, Math.sin(angle) * 3.1)
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group>
      {/* Dark Reflective Ground Base */}
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#030805" roughness={0.65} metalness={0.35} />
      </mesh>

      {/* Glowing Cyan/Emerald Futuristic Neon Ring (#00f5b4) */}
      <mesh
        ref={neonRingRef}
        position={[0, -0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2.37, 2.43, 64]} />
        <meshBasicMaterial color="#00f5b4" side={THREE.DoubleSide} />
      </mesh>

      {/* Concentric Outer Ring */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.1, 3.12, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Concentric Inner Ring */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.615, 64]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Radial Alignment Lines */}
      <lineSegments geometry={spokesGeometry}>
        <lineBasicMaterial color="#10b981" transparent opacity={0.18} />
      </lineSegments>

      {/* Drifting Leaves Group */}
      <group ref={leavesRef}>
        {leafItems.map((item, i) => (
          <mesh
            key={i}
            position={[item.x, item.y, item.z]}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
          >
            <planeGeometry args={[0.16, 0.24]} />
            <meshStandardMaterial
              color="#15803d"
              roughness={0.6}
              side={THREE.DoubleSide}
              transparent
              opacity={0.45}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Complete Rover Assembly
const CompleteRoverModel: React.FC = () => {
  return (
    <group>
      {/* A. Main Chassis Lower Frame */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.44, 2.5]} />
        <meshStandardMaterial color="#141615" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Undercarriage Mechanical Belly */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.25, 0.22, 2.3]} />
        <meshStandardMaterial color="#0c0e0c" roughness={0.65} metalness={0.35} />
      </mesh>

      {/* Upper Green Deck Plate (Approved EAAR Lime-Green #22c55e) */}
      <mesh position={[0, 0.67, 0]} castShadow>
        <boxGeometry args={[1.54, 0.06, 2.54]} />
        <meshStandardMaterial color="#22c55e" roughness={0.28} metalness={0.15} />
      </mesh>

      {/* Corner Hex Bolts on Top Green Plate */}
      {[
        [-0.72, 0.71, 1.2],
        [0.72, 0.71, 1.2],
        [-0.72, 0.71, -1.2],
        [0.72, 0.71, -1.2],
        [-0.72, 0.71, 0],
        [0.72, 0.71, 0],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 10]} />
          <meshStandardMaterial color="#c8d0c8" roughness={0.25} metalness={0.85} />
        </mesh>
      ))}

      {/* Side Green Armor Plates (Left & Right) */}
      <mesh position={[-0.78, 0.44, -0.05]} castShadow>
        <boxGeometry args={[0.04, 0.34, 1.35]} />
        <meshStandardMaterial color="#22c55e" roughness={0.28} metalness={0.15} />
      </mesh>
      <mesh position={[0.78, 0.44, -0.05]} castShadow>
        <boxGeometry args={[0.04, 0.34, 1.35]} />
        <meshStandardMaterial color="#22c55e" roughness={0.28} metalness={0.15} />
      </mesh>

      {/* Side Armor Plate Rivets */}
      {[
        [-0.81, 0.56, 0.55],
        [-0.81, 0.32, 0.55],
        [-0.81, 0.56, -0.65],
        [-0.81, 0.32, -0.65],
        [0.81, 0.56, 0.55],
        [0.81, 0.32, 0.55],
        [0.81, 0.56, -0.65],
        [0.81, 0.32, -0.65],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.03, 8]} />
          <meshStandardMaterial color="#c8d0c8" roughness={0.25} metalness={0.85} />
        </mesh>
      ))}

      {/* B. Front Sensor & Obstacle Assembly */}
      <FrontSensorAssembly />

      {/* C. Four Rugged Wheels */}
      <RuggedWheel position={[-1.08, 0.44, 0.88]} isLeft={true} />
      <RuggedWheel position={[1.08, 0.44, 0.88]} isLeft={false} />
      <RuggedWheel position={[-1.08, 0.44, -0.88]} isLeft={true} />
      <RuggedWheel position={[1.08, 0.44, -0.88]} isLeft={false} />

      {/* D. Top Electronics Enclosure & Antennas */}
      <TopEnclosureAndAntennas />

      {/* E. Articulated Robotic Arm with Clean Top Camera */}
      <RoboticArm />
    </group>
  );
};

// ============================================================================
// 2. MAIN EXPORTED COMPONENT USING @react-three/fiber & @react-three/drei
// ============================================================================
export const RoverFiber: React.FC = () => {
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const controlsRef = useRef<any>(null);

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.multiplyScalar(0.88);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.multiplyScalar(1.12);
      controlsRef.current.update();
    }
  };

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      const camera = controlsRef.current.object;
      camera.position.set(4.4, 2.9, 5.4);
      controlsRef.current.target.set(0, 0.45, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center select-none">
      {/* 3D Viewport Container */}
      <div className="relative w-full h-[420px] sm:h-[500px] lg:h-[560px] flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden rounded-2xl bg-gradient-to-b from-[#061209]/90 via-[#040c06]/95 to-[#020503] border border-emerald-900/40 shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(52,211,153,0.15)] backdrop-blur-md">
        {/* React Three Fiber Canvas */}
        <Canvas
          shadows
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          className="absolute inset-0 w-full h-full block touch-none"
        >
          {/* Camera Configuration */}
          <PerspectiveCamera
            makeDefault
            fov={36}
            position={[4.4, 2.9, 5.4]}
            near={0.1}
            far={60}
          />

          {/* Lighting Setup (High-Tech Product Studio Render) */}
          <ambientLight color="#0a1c10" intensity={1.6} />
          {/* Key Light */}
          <directionalLight
            position={[6, 8, 7]}
            color="#ffffff"
            intensity={2.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0005}
          />
          {/* Cyan High-Tech Rim Light */}
          <directionalLight position={[-6, 5, -6]} color="#06b6d4" intensity={1.8} />
          {/* Green Agricultural Bounce Light */}
          <directionalLight position={[0, -2, 4]} color="#10b981" intensity={0.9} />
          {/* Front Soft Fill */}
          <directionalLight position={[-4, 4, 6]} color="#dcfce7" intensity={0.8} />

          {/* 3D Rover Model */}
          <CompleteRoverModel />

          {/* Ground Platform & Ambient Floating Leaves */}
          <FuturisticPlatformAndLeaves />

          {/* Orbit Controls from @react-three/drei */}
          <OrbitControls
            ref={controlsRef}
            target={[0, 0.45, 0]}
            autoRotate={autoRotate}
            autoRotateSpeed={1.0}
            enableDamping={true}
            dampingFactor={0.06}
            minDistance={4.2}
            maxDistance={11.0}
            maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera going below floor
            minPolarAngle={0.25}
          />
        </Canvas>

        {/* Viewport Control Bar (No floating labels on rover; clean bottom bar only) */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-slate-300 pointer-events-auto">
          {/* Drag instruction indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#08130b]/80 border border-emerald-900/60 backdrop-blur-sm text-emerald-300/80">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Interactive 3D EAAR Rover · Drag to Orbit</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                autoRotate
                  ? 'bg-emerald-900/50 border-emerald-500/60 text-emerald-300'
                  : 'bg-[#08130b]/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle automatic rotation"
              aria-label="Toggle automatic rotation"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`}
                style={{ animationDuration: '6s' }}
              />
              <span className="hidden sm:inline">Auto Orbit</span>
            </button>

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-[#08130b]/80 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-600 transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-[#08130b]/80 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-600 transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-[#08130b]/80 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-600 transition-colors"
              title="Reset View"
              aria-label="Reset View"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
