import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

const vertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vPosition;
  uniform float uOpacity;
  void main() {
    float intensity = 0.6 + vPosition.y * 0.2;
    vec3 cyan = vec3(0.0, 0.94, 1.0);
    gl_FragColor = vec4(cyan * intensity, uOpacity);
  }
`;

function SphereMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, raycaster, pointer } = useThree();
  const hoveredRef = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uOpacity: { value: 0.7 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: true,
    });
  }, []);

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
    };
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Auto rotation
    const rotationSpeed = hoveredRef.current ? 0.012 : 0.004;
    meshRef.current.rotation.y += rotationSpeed;
    meshRef.current.rotation.x += rotationSpeed * 0.5;

    // Float
    meshRef.current.position.y = Math.sin(time * 0.8) * 0.08;

    // Mouse parallax on group — lerp toward target to avoid
    // spawning a new gsap tween every frame
    const targetX = mousePos.current.y * 0.08;
    const targetY = mousePos.current.x * 0.08;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.03;

    // Raycaster hover detection
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current);
    const isNowHovered = intersects.length > 0;

    if (isNowHovered !== hoveredRef.current) {
      hoveredRef.current = isNowHovered;
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
      tweenRef.current = gsap.to(materialRef.current.uniforms.uOpacity, {
        value: isNowHovered ? 1.0 : 0.7,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={material}>
        <icosahedronGeometry args={[2.2, 1]} />
      </mesh>
    </group>
  );
}

export default function GeodesicSphere() {
  return (
    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#00f0ff" />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#ff1b8d" />
        <SphereMesh />
      </Canvas>
    </div>
  );
}
