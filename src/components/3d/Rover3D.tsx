import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Radio } from 'lucide-react';
export { RoverFiber } from './RoverFiber';

export const Rover3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // References for animation and control state
  const stateRef = useRef({
    theta: 0.65, // Azimuth angle (~37 deg)
    phi: 1.15,   // Polar elevation angle (~66 deg from vertical)
    radius: 7.2, // Camera distance
    targetRadius: 7.2,
    targetTheta: 0.65,
    targetPhi: 1.15,
    isPointerDown: false,
    pointerStartX: 0,
    pointerStartY: 0,
    thetaStart: 0.65,
    phiStart: 1.15,
    lastInteractionTime: Date.now(),
    autoRotate: true,
  });

  // Keep stateRef autoRotate in sync with React state
  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. SCENE & RENDERER SETUP
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / container.clientHeight,
      0.1,
      60
    );
    const targetPoint = new THREE.Vector3(0, 0.45, 0);

    const updateCameraPosition = () => {
      const { theta, phi, radius } = stateRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + targetPoint.y;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(targetPoint);
    };
    updateCameraPosition();

    // 3. LIGHTING (Studio High-Tech Product Render Style)
    // Dark emerald ambient fill
    const ambientLight = new THREE.AmbientLight(0x0a1c10, 1.6);
    scene.add(ambientLight);

    // Primary Key Light (bright crisp directional light from top front-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 8, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cyan High-Tech Rim Light (from rear-left to highlight contours)
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    // Subtle Green Agricultural Bounce Light (from bottom-front)
    const bounceLight = new THREE.DirectionalLight(0x10b981, 0.9);
    bounceLight.position.set(0, -2, 4);
    scene.add(bounceLight);

    // Soft Front Fill Light
    const fillLight = new THREE.DirectionalLight(0xdcfce7, 0.8);
    fillLight.position.set(-4, 4, 6);
    scene.add(fillLight);

    // 4. SHARED HIGH-GRADE MATERIALS
    // Dark matte mechanical charcoal/black body
    const darkBodyMat = new THREE.MeshStandardMaterial({
      color: 0x141615,
      roughness: 0.5,
      metalness: 0.5,
    });

    const deepBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e0c,
      roughness: 0.65,
      metalness: 0.35,
    });

    // Approved EAAR Agricultural Vivid Lime-Green Panels
    const greenPanelMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.28,
      metalness: 0.15,
    });

    // Wheel Green Inner Rim
    const greenRimMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.35,
      metalness: 0.25,
    });

    // Polished Silver / Chrome for hub caps and sensor bezels
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xecf0ec,
      roughness: 0.14,
      metalness: 0.95,
    });

    // Silver Screws & Rivets
    const silverScrewMat = new THREE.MeshStandardMaterial({
      color: 0xc8d0c8,
      roughness: 0.25,
      metalness: 0.85,
    });

    // Off-road Rugged Rubber Tires
    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x181a18,
      roughness: 0.94,
      metalness: 0.05,
    });

    // Brass/Gold Suspension Dampers
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a034,
      roughness: 0.28,
      metalness: 0.82,
    });

    // Ultrasonic Sensor Mesh Core
    const sensorMeshMat = new THREE.MeshStandardMaterial({
      color: 0x262a28,
      roughness: 0.75,
      metalness: 0.3,
    });

    // Headlight Emitters (Bright LED clusters)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0fff4,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    // High-Res Optical Camera Lens
    const cameraLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x050e18,
      roughness: 0.05,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    // White GPS RTK Puck
    const whitePuckMat = new THREE.MeshStandardMaterial({
      color: 0xf4f7f4,
      roughness: 0.28,
      metalness: 0.08,
    });

    // 5. CONSTRUCT ROVER 3D GEOMETRY GROUP
    const roverGroup = new THREE.Group();
    scene.add(roverGroup);

    // ==============================================================
    // A. MAIN CHASSIS BODY
    // ==============================================================
    // Lower structural chassis box
    const chassisGeo = new THREE.BoxGeometry(1.5, 0.44, 2.5);
    const chassisMesh = new THREE.Mesh(chassisGeo, darkBodyMat);
    chassisMesh.position.set(0, 0.42, 0);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    roverGroup.add(chassisMesh);

    // Undercarriage mechanical belly
    const bellyGeo = new THREE.BoxGeometry(1.25, 0.22, 2.3);
    const bellyMesh = new THREE.Mesh(bellyGeo, deepBlackMat);
    bellyMesh.position.set(0, 0.2, 0);
    bellyMesh.castShadow = true;
    roverGroup.add(bellyMesh);

    // Upper Green Deck Plate (Signature EAAR green top cover)
    const topPlateGeo = new THREE.BoxGeometry(1.54, 0.06, 2.54);
    const topPlateMesh = new THREE.Mesh(topPlateGeo, greenPanelMat);
    topPlateMesh.position.set(0, 0.67, 0);
    topPlateMesh.castShadow = true;
    roverGroup.add(topPlateMesh);

    // Corner fixing bolts on the green top plate
    const screwGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10);
    const boltPositions = [
      [-0.72, 0.71, 1.2],
      [0.72, 0.71, 1.2],
      [-0.72, 0.71, -1.2],
      [0.72, 0.71, -1.2],
      [-0.72, 0.71, 0],
      [0.72, 0.71, 0],
    ];
    boltPositions.forEach(([x, y, z]) => {
      const bolt = new THREE.Mesh(screwGeo, silverScrewMat);
      bolt.position.set(x, y, z);
      roverGroup.add(bolt);
    });

    // Side Green Armor Plates (Left & Right)
    const sidePlateGeo = new THREE.BoxGeometry(0.04, 0.34, 1.35);
    const leftSidePlate = new THREE.Mesh(sidePlateGeo, greenPanelMat);
    leftSidePlate.position.set(-0.78, 0.44, -0.05);
    leftSidePlate.castShadow = true;
    roverGroup.add(leftSidePlate);

    const rightSidePlate = new THREE.Mesh(sidePlateGeo, greenPanelMat);
    rightSidePlate.position.set(0.78, 0.44, -0.05);
    rightSidePlate.castShadow = true;
    roverGroup.add(rightSidePlate);

    // Side plate mounting screws
    const sideScrewPositions = [
      // Left side plate screws
      [-0.81, 0.56, 0.55],
      [-0.81, 0.32, 0.55],
      [-0.81, 0.56, -0.65],
      [-0.81, 0.32, -0.65],
      // Right side plate screws
      [0.81, 0.56, 0.55],
      [0.81, 0.32, 0.55],
      [0.81, 0.56, -0.65],
      [0.81, 0.32, -0.65],
    ];
    const sideScrewGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.03, 8);
    sideScrewGeo.rotateZ(Math.PI / 2);
    sideScrewPositions.forEach(([x, y, z]) => {
      const screw = new THREE.Mesh(sideScrewGeo, silverScrewMat);
      screw.position.set(x, y, z);
      roverGroup.add(screw);
    });

    // ==============================================================
    // B. FRONT-FACING OBSTACLE & ULTRASONIC SENSOR ASSEMBLY
    // ==============================================================
    const frontFaceGroup = new THREE.Group();
    frontFaceGroup.position.set(0, 0.42, 1.28);
    roverGroup.add(frontFaceGroup);

    // Front Faceplate Box
    const frontPlateGeo = new THREE.BoxGeometry(1.36, 0.38, 0.12);
    const frontPlate = new THREE.Mesh(frontPlateGeo, deepBlackMat);
    frontPlate.castShadow = true;
    frontFaceGroup.add(frontPlate);

    // Dual Ultrasonic Transducers in the center (Silver bezel + dark mesh core)
    const sensorBezelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24);
    sensorBezelGeo.rotateX(Math.PI / 2);
    const sensorCoreGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.085, 20);
    sensorCoreGeo.rotateX(Math.PI / 2);

    [-0.15, 0.15].forEach((xOffset) => {
      const bezel = new THREE.Mesh(sensorBezelGeo, chromeMat);
      bezel.position.set(xOffset, 0, 0.06);
      frontFaceGroup.add(bezel);

      const core = new THREE.Mesh(sensorCoreGeo, sensorMeshMat);
      core.position.set(xOffset, 0, 0.065);
      frontFaceGroup.add(core);
    });

    // Flanking Headlight Assemblies (Left & Right clusters of bright LEDs)
    const headlightHousingGeo = new THREE.BoxGeometry(0.2, 0.3, 0.08);
    const ledEmitterGeo = new THREE.BoxGeometry(0.065, 0.065, 0.04);

    [-0.48, 0.48].forEach((xOffset) => {
      const housing = new THREE.Mesh(headlightHousingGeo, darkBodyMat);
      housing.position.set(xOffset, 0, 0.04);
      frontFaceGroup.add(housing);

      // Top LED
      const ledTop = new THREE.Mesh(ledEmitterGeo, headlightMat);
      ledTop.position.set(xOffset, 0.07, 0.09);
      frontFaceGroup.add(ledTop);

      // Bottom LED
      const ledBottom = new THREE.Mesh(ledEmitterGeo, headlightMat);
      ledBottom.position.set(xOffset, -0.07, 0.09);
      frontFaceGroup.add(ledBottom);
    });

    // Lower Front Tubular Bumper
    const lowerBumperGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.25, 16);
    lowerBumperGeo.rotateZ(Math.PI / 2);
    const lowerBumper = new THREE.Mesh(lowerBumperGeo, deepBlackMat);
    lowerBumper.position.set(0, -0.22, 0.12);
    frontFaceGroup.add(lowerBumper);

    // Bumper brackets
    const bracketGeo = new THREE.BoxGeometry(0.05, 0.15, 0.14);
    [-0.42, 0.42].forEach((xOffset) => {
      const bracket = new THREE.Mesh(bracketGeo, darkBodyMat);
      bracket.position.set(xOffset, -0.15, 0.05);
      frontFaceGroup.add(bracket);
    });

    // Small headlight glow point lights
    const frontPointLight = new THREE.PointLight(0xdcfce7, 1.2, 3.5);
    frontPointLight.position.set(0, 0.42, 1.6);
    roverGroup.add(frontPointLight);

    // ==============================================================
    // C. FOUR LARGE RUGGED ALL-TERRAIN WHEELS
    // ==============================================================
    const wheelConfigs = [
      { x: -1.08, y: 0.44, z: 0.88, isLeft: true },   // Front-Left
      { x: 1.08, y: 0.44, z: 0.88, isLeft: false },   // Front-Right
      { x: -1.08, y: 0.44, z: -0.88, isLeft: true },  // Rear-Left
      { x: 1.08, y: 0.44, z: -0.88, isLeft: false },  // Rear-Right
    ];

    wheelConfigs.forEach(({ x, y, z, isLeft }) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(x, y, z);
      roverGroup.add(wheelAssembly);

      // Main tire cylinder (tread base)
      const tireWidth = 0.44;
      const tireRadius = 0.48;
      const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 28);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeo, tireRubberMat);
      tireMesh.castShadow = true;
      wheelAssembly.add(tireMesh);

      // Rugged Blocky Tread Lugs (Aggressive off-road lugs around perimeter)
      const numLugs = 14;
      const lugGeo = new THREE.BoxGeometry(tireWidth * 0.9, 0.08, 0.14);
      for (let i = 0; i < numLugs; i++) {
        const angle = (i / numLugs) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, tireRubberMat);
        const lugDist = tireRadius + 0.035;
        lug.position.set(0, Math.sin(angle) * lugDist, Math.cos(angle) * lugDist);
        lug.rotation.x = -angle;
        lug.castShadow = true;
        wheelAssembly.add(lug);
      }

      // Green Inner Rim Dish
      const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, tireWidth + 0.01, 24);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, greenRimMat);
      wheelAssembly.add(rimMesh);

      // Chrome Center Hub Cap
      const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, tireWidth + 0.03, 18);
      hubGeo.rotateZ(Math.PI / 2);
      const hubMesh = new THREE.Mesh(hubGeo, chromeMat);
      wheelAssembly.add(hubMesh);

      // Center Chrome Bolt Nut
      const nutGeo = new THREE.CylinderGeometry(0.05, 0.05, tireWidth + 0.05, 6);
      nutGeo.rotateZ(Math.PI / 2);
      const nutMesh = new THREE.Mesh(nutGeo, chromeMat);
      wheelAssembly.add(nutMesh);

      // Suspension Arm / Linkage connecting wheel hub to chassis
      const armLength = Math.abs(x) - 0.72;
      const armGeo = new THREE.BoxGeometry(armLength, 0.06, 0.06);
      const armMesh = new THREE.Mesh(armGeo, deepBlackMat);
      armMesh.position.set(isLeft ? armLength / 2 : -armLength / 2, 0, 0);
      wheelAssembly.add(armMesh);

      // Suspension Coilover Damper (Brass cylinder + black spring details)
      const damperGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12);
      const damperMesh = new THREE.Mesh(damperGeo, brassMat);
      damperMesh.position.set(isLeft ? armLength * 0.4 : -armLength * 0.4, 0.12, 0);
      damperMesh.rotation.z = isLeft ? 0.35 : -0.35;
      wheelAssembly.add(damperMesh);
    });

    // ==============================================================
    // D. TOP ELECTRONICS ENCLOSURE
    // ==============================================================
    const enclosureGroup = new THREE.Group();
    enclosureGroup.position.set(0, 0.81, -0.45);
    roverGroup.add(enclosureGroup);

    // Electronics Enclosure Body (Dark charcoal box)
    const boxGeo = new THREE.BoxGeometry(0.85, 0.22, 0.82);
    const boxMesh = new THREE.Mesh(boxGeo, darkBodyMat);
    boxMesh.castShadow = true;
    enclosureGroup.add(boxMesh);

    // Enclosure Heatsink Top Cover (Ribbed fins)
    const finGeo = new THREE.BoxGeometry(0.8, 0.02, 0.04);
    for (let f = -0.32; f <= 0.32; f += 0.08) {
      const fin = new THREE.Mesh(finGeo, deepBlackMat);
      fin.position.set(0, 0.12, f);
      enclosureGroup.add(fin);
    }

    // Front connector panel & wiring conduits into the green chassis deck
    const connectorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.04),
      deepBlackMat
    );
    connectorPanel.position.set(0, 0.02, 0.42);
    enclosureGroup.add(connectorPanel);

    // Black curved wire harness cables
    [-0.1, 0, 0.1].forEach((xOffset) => {
      const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOffset, 0.02, 0.43),
        new THREE.Vector3(xOffset * 1.3, -0.06, 0.52),
        new THREE.Vector3(xOffset * 1.5, -0.11, 0.62),
      ]);
      const cableGeo = new THREE.TubeGeometry(cableCurve, 10, 0.014, 8, false);
      const cableMesh = new THREE.Mesh(cableGeo, deepBlackMat);
      enclosureGroup.add(cableMesh);
    });

    // ==============================================================
    // E. TWO VERTICAL ANTENNA / SENSOR ELEMENTS
    // ==============================================================
    // 1. Left Vertical Antenna Rod
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(-0.52, 0.7, -0.85);
    roverGroup.add(antennaGroup);

    // Antenna Base Collar
    const antennaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.048, 0.1, 14),
      deepBlackMat
    );
    antennaBase.position.set(0, 0.05, 0);
    antennaGroup.add(antennaBase);

    // Vertical Dipole Rod
    const antennaRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.72, 12),
      darkBodyMat
    );
    antennaRod.position.set(0, 0.46, 0);
    antennaGroup.add(antennaRod);

    // 2. White GPS RTK Puck Antenna (Mounted on vertical stalk)
    const puckGroup = new THREE.Group();
    puckGroup.position.set(-0.16, 0.7, -0.72);
    roverGroup.add(puckGroup);

    // Stalk Pedestal
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.036, 0.34, 14),
      deepBlackMat
    );
    stalk.position.set(0, 0.17, 0);
    stalk.castShadow = true;
    puckGroup.add(stalk);

    // White Mushroom Puck Head (Distinctive white puck from reference image)
    const puckBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.07, 24),
      whitePuckMat
    );
    puckBase.position.set(0, 0.37, 0);
    puckBase.castShadow = true;
    puckGroup.add(puckBase);

    const puckTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4),
      whitePuckMat
    );
    puckTop.position.set(0, 0.4, 0);
    puckTop.castShadow = true;
    puckGroup.add(puckTop);

    // ==============================================================
    // F. ARTICULATED ROBOTIC ARM & HIGH-RES CAMERA
    // ==============================================================
    // Mounted on front-right of the green upper deck
    const armBaseGroup = new THREE.Group();
    armBaseGroup.position.set(0.24, 0.7, 0.38);
    roverGroup.add(armBaseGroup);

    // Rotating Turret Base Flange
    const turretFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.06, 24),
      deepBlackMat
    );
    turretFlange.position.set(0, 0.03, 0);
    turretFlange.castShadow = true;
    armBaseGroup.add(turretFlange);

    // Turret Swivel Body
    const swivelBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.12, 18),
      darkBodyMat
    );
    swivelBody.position.set(0, 0.11, 0);
    swivelBody.castShadow = true;
    armBaseGroup.add(swivelBody);

    // Shoulder Pivot Hinge Discs
    const shoulderHingeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 18);
    shoulderHingeGeo.rotateZ(Math.PI / 2);
    const shoulderHinge = new THREE.Mesh(shoulderHingeGeo, deepBlackMat);
    shoulderHinge.position.set(0, 0.2, 0);
    shoulderHinge.castShadow = true;
    armBaseGroup.add(shoulderHinge);

    // Lower Arm Link (Segment 1 - extending upward and forward)
    const lowerArmGroup = new THREE.Group();
    lowerArmGroup.position.set(0, 0.2, 0);
    lowerArmGroup.rotation.x = 0.32; // Angled forward
    armBaseGroup.add(lowerArmGroup);

    const lowerArmGeo = new THREE.BoxGeometry(0.11, 0.46, 0.11);
    const lowerArmMesh = new THREE.Mesh(lowerArmGeo, darkBodyMat);
    lowerArmMesh.position.set(0, 0.23, 0);
    lowerArmMesh.castShadow = true;
    lowerArmGroup.add(lowerArmMesh);

    // Elbow Dual-Disc Mechanical Joint
    const elbowHingeGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.17, 18);
    elbowHingeGeo.rotateZ(Math.PI / 2);
    const elbowHinge = new THREE.Mesh(elbowHingeGeo, deepBlackMat);
    elbowHinge.position.set(0, 0.46, 0);
    elbowHinge.castShadow = true;
    lowerArmGroup.add(elbowHinge);

    // Upper Arm Link (Segment 2)
    const upperArmGroup = new THREE.Group();
    upperArmGroup.position.set(0, 0.46, 0);
    upperArmGroup.rotation.x = -0.42; // Articulated upright
    lowerArmGroup.add(upperArmGroup);

    const upperArmGeo = new THREE.BoxGeometry(0.095, 0.38, 0.095);
    const upperArmMesh = new THREE.Mesh(upperArmGeo, darkBodyMat);
    upperArmMesh.position.set(0, 0.19, 0);
    upperArmMesh.castShadow = true;
    upperArmGroup.add(upperArmMesh);

    // Wrist Joint Pivot
    const wristHingeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16);
    wristHingeGeo.rotateZ(Math.PI / 2);
    const wristHinge = new THREE.Mesh(wristHingeGeo, deepBlackMat);
    wristHinge.position.set(0, 0.38, 0);
    wristHinge.castShadow = true;
    upperArmGroup.add(wristHinge);

    // CAMERA UNIT: Mounted DIRECTLY at the top/end of the robotic arm
    // NOTE: Clean mechanical finish without any extra hanging rod or pole underneath!
    const cameraGroup = new THREE.Group();
    cameraGroup.position.set(0, 0.42, 0.04);
    cameraGroup.rotation.x = 0.1; // Pointed slightly downward toward inspection zone
    upperArmGroup.add(cameraGroup);

    // Camera Body Cube
    const cameraBodyGeo = new THREE.BoxGeometry(0.2, 0.18, 0.18);
    const cameraBody = new THREE.Mesh(cameraBodyGeo, darkBodyMat);
    cameraBody.castShadow = true;
    cameraGroup.add(cameraBody);

    // Camera Front Lens Housing Cylinder
    const lensBarrelGeo = new THREE.CylinderGeometry(0.075, 0.082, 0.12, 24);
    lensBarrelGeo.rotateX(Math.PI / 2);
    const lensBarrel = new THREE.Mesh(lensBarrelGeo, deepBlackMat);
    lensBarrel.position.set(0, 0, 0.12);
    lensBarrel.castShadow = true;
    cameraGroup.add(lensBarrel);

    // Optical Lens Front Glass Element (With subtle reflection)
    const lensGlassGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 24);
    lensGlassGeo.rotateX(Math.PI / 2);
    const lensGlass = new THREE.Mesh(lensGlassGeo, cameraLensMat);
    lensGlass.position.set(0, 0, 0.18);
    cameraGroup.add(lensGlass);

    // Lens Cyan Anti-reflective Coating Bezel Ring
    const lensRingGeo = new THREE.RingGeometry(0.064, 0.074, 24);
    const lensRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
    });
    const lensRing = new THREE.Mesh(lensRingGeo, lensRingMat);
    lensRing.position.set(0, 0, 0.19);
    cameraGroup.add(lensRing);

    // Secondary Small Sensor Block on top of camera
    const topSensorGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
    const topSensor = new THREE.Mesh(topSensorGeo, deepBlackMat);
    topSensor.position.set(0, 0.11, -0.02);
    cameraGroup.add(topSensor);

    // ==============================================================
    // G. CIRCULAR FUTURISTIC PLATFORM & GROUND REFLECTION
    // ==============================================================
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    // Dark Reflective Floor Base
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x030805,
      roughness: 0.65,
      metalness: 0.35,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    floorMesh.position.y = -0.04;
    floorGroup.add(floorMesh);

    // Soft Ambient Ground Shadow underneath wheels
    const shadowGeo = new THREE.PlaneGeometry(3.6, 4.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const canvasShadow = document.createElement('canvas');
    canvasShadow.width = 128;
    canvasShadow.height = 128;
    const ctx = canvasShadow.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0,0,0,0.85)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(canvasShadow);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = -0.035;
    floorGroup.add(shadowMesh);

    // Glowing Cyan / Emerald Futuristic Neon Ring (Matching the reference render)
    const neonRingRadius = 2.4;
    const neonRingWidth = 0.055;
    const ringGeo = new THREE.RingGeometry(
      neonRingRadius - neonRingWidth / 2,
      neonRingRadius + neonRingWidth / 2,
      64
    );
    ringGeo.rotateX(-Math.PI / 2);
    const neonRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f5b4,
      side: THREE.DoubleSide,
    });
    const neonRing = new THREE.Mesh(ringGeo, neonRingMat);
    neonRing.position.y = -0.03;
    floorGroup.add(neonRing);

    // Outer faint concentric glow ring
    const outerRingGeo = new THREE.RingGeometry(3.1, 3.12, 64);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = -0.03;
    floorGroup.add(outerRing);

    // Inner fine concentric ring
    const innerRingGeo = new THREE.RingGeometry(1.6, 1.615, 64);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = -0.03;
    floorGroup.add(innerRing);

    // Circular Platform Radial Spokes (Subtle engineering alignment lines)
    const spokeMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.18,
    });
    for (let s = 0; s < 8; s++) {
      const angle = (s / 8) * Math.PI * 2;
      const points = [
        new THREE.Vector3(Math.cos(angle) * 1.6, -0.03, Math.sin(angle) * 1.6),
        new THREE.Vector3(Math.cos(angle) * 3.1, -0.03, Math.sin(angle) * 3.1),
      ];
      const spokeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const spokeLine = new THREE.Line(spokeGeo, spokeMat);
      floorGroup.add(spokeLine);
    }

    // ==============================================================
    // H. AMBIENT DRIFTING LEAVES IN THE BACKGROUND
    // ==============================================================
    const leafGroup = new THREE.Group();
    scene.add(leafGroup);

    const leafCount = 14;
    const leafGeo = new THREE.PlaneGeometry(0.16, 0.24);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });

    const leafData: {
      mesh: THREE.Mesh;
      initialX: number;
      initialY: number;
      initialZ: number;
      speed: number;
      rotSpeed: number;
      phase: number;
    }[] = [];

    for (let i = 0; i < leafCount; i++) {
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      const thetaLeaf = (i / leafCount) * Math.PI * 2 + Math.random() * 0.4;
      const rLeaf = 3.6 + Math.random() * 2.2;
      const xL = Math.cos(thetaLeaf) * rLeaf;
      const yL = 0.6 + Math.random() * 2.8;
      const zL = Math.sin(thetaLeaf) * rLeaf;

      leafMesh.position.set(xL, yL, zL);
      leafMesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      leafGroup.add(leafMesh);

      leafData.push({
        mesh: leafMesh,
        initialX: xL,
        initialY: yL,
        initialZ: zL,
        speed: 0.4 + Math.random() * 0.6,
        rotSpeed: 0.5 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ==============================================================
    // I. INTERACTIVE ORBIT CONTROLS & ANIMATION LOOP
    // ==============================================================
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const st = stateRef.current;

      // Auto rotation when idle
      const timeSinceInteraction = Date.now() - st.lastInteractionTime;
      if (st.autoRotate && !st.isPointerDown && timeSinceInteraction > 1500) {
        st.targetTheta += delta * 0.28;
      }

      // Smooth interpolation for smooth camera orbiting
      st.theta += (st.targetTheta - st.theta) * 0.1;
      st.phi += (st.targetPhi - st.phi) * 0.1;
      st.radius += (st.targetRadius - st.radius) * 0.12;

      // Update camera spherical position
      camera.position.x = st.radius * Math.sin(st.phi) * Math.sin(st.theta);
      camera.position.y = st.radius * Math.cos(st.phi) + targetPoint.y;
      camera.position.z = st.radius * Math.sin(st.phi) * Math.cos(st.theta);
      camera.lookAt(targetPoint);

      // Animate ambient drifting leaves
      leafData.forEach((leaf) => {
        leaf.mesh.position.y =
          leaf.initialY + Math.sin(elapsed * leaf.speed + leaf.phase) * 0.25;
        leaf.mesh.rotation.y += delta * leaf.rotSpeed * 0.4;
        leaf.mesh.rotation.z += delta * leaf.rotSpeed * 0.3;
      });

      // Subtle pulse on the circular futuristic ground neon ring
      const pulse = 1.0 + Math.sin(elapsed * 2.2) * 0.12;
      neonRingMat.color.setRGB(0.0, 0.96 * pulse, 0.7 * pulse);

      renderer.render(scene, camera);
    };

    renderLoop();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Clean up on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Pointer Drag Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsInteracting(true);
    const st = stateRef.current;
    st.isPointerDown = true;
    st.pointerStartX = e.clientX;
    st.pointerStartY = e.clientY;
    st.thetaStart = st.targetTheta;
    st.phiStart = st.targetPhi;
    st.lastInteractionTime = Date.now();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const st = stateRef.current;
    if (!st.isPointerDown) return;

    const dx = e.clientX - st.pointerStartX;
    const dy = e.clientY - st.pointerStartY;

    st.targetTheta = st.thetaStart + dx * 0.007;
    // Clamp polar angle so rover cannot flip upside down
    st.targetPhi = Math.max(0.45, Math.min(1.48, st.phiStart - dy * 0.006));
    st.lastInteractionTime = Date.now();
  };

  const handlePointerUp = () => {
    setIsInteracting(false);
    stateRef.current.isPointerDown = false;
    stateRef.current.lastInteractionTime = Date.now();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const st = stateRef.current;
    st.targetRadius = Math.max(4.5, Math.min(10.5, st.targetRadius + e.deltaY * 0.005));
    st.lastInteractionTime = Date.now();
  };

  const handleZoomIn = () => {
    const st = stateRef.current;
    st.targetRadius = Math.max(4.5, st.targetRadius - 1.0);
    st.lastInteractionTime = Date.now();
  };

  const handleZoomOut = () => {
    const st = stateRef.current;
    st.targetRadius = Math.min(10.5, st.targetRadius + 1.0);
    st.lastInteractionTime = Date.now();
  };

  const handleReset = () => {
    const st = stateRef.current;
    st.targetTheta = 0.65;
    st.targetPhi = 1.15;
    st.targetRadius = 7.2;
    st.lastInteractionTime = Date.now();
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center select-none">
      {/* 3D Viewport Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className="relative w-full h-[420px] sm:h-[500px] lg:h-[560px] flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden rounded-2xl bg-gradient-to-b from-[#061209]/90 via-[#040c06]/95 to-[#020503] border border-emerald-900/40 shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(52,211,153,0.15)] backdrop-blur-md"
      >
        {/* WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block touch-none"
        />

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
                className={`w-3.5 h-3.5 ${autoRotate && !isInteracting ? 'animate-spin' : ''}`}
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
