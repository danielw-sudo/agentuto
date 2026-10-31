import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewportRenderer } from '../../../core/types/simulation';
import { LorentzState } from './LorentzEngine';

export class LorentzRenderer3D implements ViewportRenderer<LorentzState> {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;

  // Visual Meshes
  private particleMesh: THREE.Mesh | null = null;
  private particleLight: THREE.PointLight | null = null;
  private trailLine: THREE.Line | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private fieldArrowsGroup: THREE.Group | null = null;

  private maxTrailPoints: number = 500;
  private trailPositions: Float32Array = new Float32Array(this.maxTrailPoints * 3);

  mount(container: HTMLElement): void {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0c);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, -2, 22);
    this.camera.up.set(0, 1, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 60;
    this.controls.minDistance = 3;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    this.scene.add(dirLight);

    // 6. Coordinate Grid Helper
    const grid = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1f2937);
    grid.rotation.x = Math.PI / 2; // place in XY plane
    this.scene.add(grid);

    // 7. Particle Sphere
    const sphereGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.particleMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.scene.add(this.particleMesh);

    this.particleLight = new THREE.PointLight(0x38bdf8, 2.5, 8);
    this.scene.add(this.particleLight);

    // 8. Trajectory Trail
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3)
    );
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    this.trailLine = new THREE.Line(this.trailGeometry, trailMat);
    this.scene.add(this.trailLine);

    // 9. Procedural Magnetic Field Indicators (Vector Field)
    this.setupFieldIndicators();
  }

  private setupFieldIndicators(): void {
    if (!this.scene) return;
    this.fieldArrowsGroup = new THREE.Group();

    const arrowColor = 0x6366f1;
    const dir = new THREE.Vector3(0, 0, 1);
    const length = 1.2;

    for (let x = -10; x <= 10; x += 5) {
      for (let y = -10; y <= 10; y += 5) {
        const origin = new THREE.Vector3(x, y, -0.6);
        const arrowHelper = new THREE.ArrowHelper(dir, origin, length, arrowColor, 0.35, 0.2);
        this.fieldArrowsGroup.add(arrowHelper);
      }
    }

    this.scene.add(this.fieldArrowsGroup);
  }

  render(state: LorentzState, _alpha?: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    // Update particle position
    if (this.particleMesh && this.particleLight) {
      this.particleMesh.position.set(state.pos.x, state.pos.y, state.pos.z);
      this.particleLight.position.set(state.pos.x, state.pos.y, state.pos.z);
    }

    // Update trajectory buffer
    if (this.trailGeometry && state.trailPoints) {
      const count = Math.min(state.trailPoints.length, this.maxTrailPoints);
      for (let i = 0; i < count; i++) {
        const pt = state.trailPoints[i];
        this.trailPositions[i * 3] = pt.x;
        this.trailPositions[i * 3 + 1] = pt.y;
        this.trailPositions[i * 3 + 2] = pt.z;
      }
      this.trailGeometry.attributes.position.needsUpdate = true;
      this.trailGeometry.setDrawRange(0, count);
    }

    // Dynamically adjust magnetic field indicator vectors
    if (this.fieldArrowsGroup) {
      const bz = state.magneticFieldZ ?? 2.0;
      const bSign = bz >= 0 ? 1 : -1;
      const bMag = Math.abs(bz);
      this.fieldArrowsGroup.visible = bMag > 0.05;
      const bScale = Math.min(Math.max(bMag / 2.0, 0.4), 2.0);
      this.fieldArrowsGroup.scale.set(1, 1, bSign * bScale);
    }

    if (this.controls) {
      this.controls.update();
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

    if (this.renderer) {
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
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

    this.particleMesh = null;
    this.particleLight = null;
    this.trailLine = null;
    this.trailGeometry = null;
    this.fieldArrowsGroup = null;
    this.camera = null;
  }
}
