import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewportRenderer } from '../../../core/types/simulation';
import { LorenzState } from './LorenzEngine';

export class LorenzRenderer3D implements ViewportRenderer<LorenzState> {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;

  private p1Mesh: THREE.Mesh | null = null;
  private p2Mesh: THREE.Mesh | null = null;
  private p1Light: THREE.PointLight | null = null;
  private p2Light: THREE.PointLight | null = null;

  private trail1Geo: THREE.BufferGeometry | null = null;
  private trail2Geo: THREE.BufferGeometry | null = null;
  private maxTrail: number = 700;
  private trail1Positions: Float32Array = new Float32Array(this.maxTrail * 3);
  private trail2Positions: Float32Array = new Float32Array(this.maxTrail * 3);

  mount(container: HTMLElement): void {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0c);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, -65, 35);
    this.camera.up.set(0, 0, 1);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 25); // Target center of the butterfly attractor
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 150;
    this.controls.minDistance = 5;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, -30, 50);
    this.scene.add(dirLight);

    // 6. Base Reference Grid
    const grid = new THREE.GridHelper(60, 30, 0x3b82f6, 0x1f2937);
    grid.position.set(0, 0, 0);
    grid.rotation.x = Math.PI / 2;
    this.scene.add(grid);

    // 7. Particle 1 (Cyan)
    const geo1 = new THREE.SphereGeometry(0.7, 24, 24);
    const mat1 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
    });
    this.p1Mesh = new THREE.Mesh(geo1, mat1);
    this.scene.add(this.p1Mesh);

    this.p1Light = new THREE.PointLight(0x38bdf8, 2.5, 15);
    this.scene.add(this.p1Light);

    // 8. Particle 2 (Twin / Magenta)
    const geo2 = new THREE.SphereGeometry(0.7, 24, 24);
    const mat2 = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xdb2777,
      emissiveIntensity: 0.9,
    });
    this.p2Mesh = new THREE.Mesh(geo2, mat2);
    this.scene.add(this.p2Mesh);

    this.p2Light = new THREE.PointLight(0xec4899, 2.5, 15);
    this.scene.add(this.p2Light);

    // 9. Trail Lines (BufferGeometry)
    this.trail1Geo = new THREE.BufferGeometry();
    this.trail1Geo.setAttribute('position', new THREE.BufferAttribute(this.trail1Positions, 3));
    const trailMat1 = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const line1 = new THREE.Line(this.trail1Geo, trailMat1);
    this.scene.add(line1);

    this.trail2Geo = new THREE.BufferGeometry();
    this.trail2Geo.setAttribute('position', new THREE.BufferAttribute(this.trail2Positions, 3));
    const trailMat2 = new THREE.LineBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.85 });
    const line2 = new THREE.Line(this.trail2Geo, trailMat2);
    this.scene.add(line2);
  }

  render(state: LorenzState, _alpha?: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    if (this.p1Mesh && this.p1Light) {
      this.p1Mesh.position.set(state.pos1.x, state.pos1.y, state.pos1.z);
      this.p1Light.position.set(state.pos1.x, state.pos1.y, state.pos1.z);
    }

    if (this.p2Mesh && this.p2Light) {
      this.p2Mesh.position.set(state.pos2.x, state.pos2.y, state.pos2.z);
      this.p2Light.position.set(state.pos2.x, state.pos2.y, state.pos2.z);
    }

    // Update Trail 1
    if (this.trail1Geo && state.trailPoints1) {
      const count1 = Math.min(state.trailPoints1.length, this.maxTrail);
      for (let i = 0; i < count1; i++) {
        const pt = state.trailPoints1[i];
        this.trail1Positions[i * 3] = pt.x;
        this.trail1Positions[i * 3 + 1] = pt.y;
        this.trail1Positions[i * 3 + 2] = pt.z;
      }
      this.trail1Geo.attributes.position.needsUpdate = true;
      this.trail1Geo.setDrawRange(0, count1);
    }

    // Update Trail 2
    if (this.trail2Geo && state.trailPoints2) {
      const count2 = Math.min(state.trailPoints2.length, this.maxTrail);
      for (let i = 0; i < count2; i++) {
        const pt = state.trailPoints2[i];
        this.trail2Positions[i * 3] = pt.x;
        this.trail2Positions[i * 3 + 1] = pt.y;
        this.trail2Positions[i * 3 + 2] = pt.z;
      }
      this.trail2Geo.attributes.position.needsUpdate = true;
      this.trail2Geo.setDrawRange(0, count2);
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

    this.p1Mesh = null;
    this.p2Mesh = null;
    this.p1Light = null;
    this.p2Light = null;
    this.trail1Geo = null;
    this.trail2Geo = null;
    this.camera = null;
  }
}
