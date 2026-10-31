import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewportRenderer } from '../../../core/types/simulation';
import { KeplerState } from './KeplerEngine';

export class KeplerRenderer3D implements ViewportRenderer<KeplerState> {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;

  // Meshes
  private starMesh: THREE.Mesh | null = null;
  private starLight: THREE.PointLight | null = null;
  private starGlow: THREE.Mesh | null = null;
  private planetMesh: THREE.Mesh | null = null;

  // Trajectory Line
  private trailLine: THREE.Line | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private readonly maxTrailPoints: number = 600;
  private trailPositions: Float32Array = new Float32Array(this.maxTrailPoints * 3);

  // Vector Arrows
  private velocityArrow: THREE.ArrowHelper | null = null;
  private forceArrow: THREE.ArrowHelper | null = null;

  // Guide rings
  private guideRingsGroup: THREE.Group | null = null;

  mount(container: HTMLElement): void {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060810);

    // 2. Camera (Looking down at an angle on the orbital plane)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, -18, 18);
    this.camera.up.set(0, 0, 1); // Z is normal to orbital plane (XY)

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 80;
    this.controls.minDistance = 2;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // 6. Central Star
    const starGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    this.starMesh = new THREE.Mesh(starGeo, starMat);
    this.scene.add(this.starMesh);

    // Corona / Glow outer shell
    const glowGeo = new THREE.SphereGeometry(1.05, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfb8500,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    this.starGlow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.starGlow);

    // Star omnidirectional light
    this.starLight = new THREE.PointLight(0xfff3b0, 2.5, 100);
    this.scene.add(this.starLight);

    // 7. Planet / Satellite
    const planetGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    this.planetMesh = new THREE.Mesh(planetGeo, planetMat);
    this.scene.add(this.planetMesh);

    // 8. Dynamic Trajectory Trail
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.trailLine = new THREE.Line(this.trailGeometry, trailMat);
    this.scene.add(this.trailLine);

    // 9. Coordinate Grid on XY Orbital Plane
    const grid = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // Lie in XY plane
    this.scene.add(grid);

    // Concentric Reference Distance Rings
    this.guideRingsGroup = new THREE.Group();
    const ringRadii = [2, 4, 6, 8, 10];
    const ringMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 });
    ringRadii.forEach((r) => {
      const ringGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const segments = 64;
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0));
      }
      ringGeo.setFromPoints(points);
      const ring = new THREE.Line(ringGeo, ringMat);
      this.guideRingsGroup?.add(ring);
    });
    this.scene.add(this.guideRingsGroup);

    // 10. Velocity & Force Vectors
    const dummyDir = new THREE.Vector3(0, 1, 0);
    const dummyOrigin = new THREE.Vector3(0, 0, 0);
    this.velocityArrow = new THREE.ArrowHelper(dummyDir, dummyOrigin, 1.5, 0x22c55e, 0.4, 0.2);
    this.forceArrow = new THREE.ArrowHelper(dummyDir, dummyOrigin, 1.2, 0xef4444, 0.35, 0.18);
    this.scene.add(this.velocityArrow);
    this.scene.add(this.forceArrow);
  }

  render(state: KeplerState): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.controls?.update();

    // 1. Update Planet Position
    if (this.planetMesh) {
      this.planetMesh.position.set(state.pos.x, state.pos.y, state.pos.z);
    }

    // 2. Update Trajectory Buffer
    if (this.trailLine && this.trailGeometry) {
      const points = state.trailPoints;
      const count = points.length;

      for (let i = 0; i < count; i++) {
        this.trailPositions[i * 3] = points[i].x;
        this.trailPositions[i * 3 + 1] = points[i].y;
        this.trailPositions[i * 3 + 2] = points[i].z;
      }

      this.trailGeometry.setDrawRange(0, count);
      this.trailGeometry.attributes.position.needsUpdate = true;
    }

    // 3. Update Velocity Vector (Green Arrow)
    if (this.velocityArrow) {
      this.velocityArrow.position.set(state.pos.x, state.pos.y, state.pos.z);
      const speed = state.speed;
      if (speed > 1e-4) {
        const velDir = new THREE.Vector3(state.vel.x, state.vel.y, state.vel.z).normalize();
        this.velocityArrow.setDirection(velDir);
        // Visual arrow length scaled logarithmically or clamped to avoid screen clutter
        const arrowLength = Math.min(4.0, Math.max(0.6, speed * 0.4));
        this.velocityArrow.setLength(arrowLength, arrowLength * 0.25, arrowLength * 0.15);
        this.velocityArrow.visible = true;
      } else {
        this.velocityArrow.visible = false;
      }
    }

    // 4. Update Gravitational Force Vector (Red Arrow toward origin)
    if (this.forceArrow) {
      this.forceArrow.position.set(state.pos.x, state.pos.y, state.pos.z);
      const r = state.r;
      if (r > 1e-3) {
        // Points inward: from planet towards star (0, 0, 0)
        const forceDir = new THREE.Vector3(-state.pos.x, -state.pos.y, -state.pos.z).normalize();
        this.forceArrow.setDirection(forceDir);
        // a ~ GM / r^2: map to visual length
        const forceMag = 1.0 / (r * r);
        const fLength = Math.min(3.5, Math.max(0.5, forceMag * 15.0));
        this.forceArrow.setLength(fLength, fLength * 0.25, fLength * 0.15);
        this.forceArrow.visible = true;
      } else {
        this.forceArrow.visible = false;
      }
    }

    // 5. Subtle Star Pulse Animation
    if (this.starGlow) {
      const pulse = 1.05 + 0.05 * Math.sin(state.time * 3.0);
      this.starGlow.scale.set(pulse, pulse, pulse);
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  unmount(): void {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.trailGeometry) {
      this.trailGeometry.dispose();
      this.trailGeometry = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse((obj: any) => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m && typeof m.dispose === 'function' && m.dispose());
          } else if (typeof obj.material.dispose === 'function') {
            obj.material.dispose();
          }
        }
      });
      this.scene = null;
    }
    this.starMesh = null;
    this.starLight = null;
    this.starGlow = null;
    this.planetMesh = null;
    this.trailLine = null;
    this.velocityArrow = null;
    this.forceArrow = null;
    this.guideRingsGroup = null;
    this.camera = null;
  }

  dispose(): void {
    this.unmount();
  }
}
