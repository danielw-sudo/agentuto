import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewportRenderer } from '../../../core/types/simulation';
import { GaussState } from './GaussEngine';

export class GaussRenderer3D implements ViewportRenderer<GaussState> {
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;

  // Meshes & Visual Objects
  private charge1Mesh: THREE.Mesh | null = null;
  private charge2Mesh: THREE.Mesh | null = null;
  private charge1Glow: THREE.Mesh | null = null;
  private charge2Glow: THREE.Mesh | null = null;
  private gaussianMesh: THREE.Mesh | null = null;
  private gaussianWire: THREE.LineSegments | null = null;
  private fieldArrows: THREE.ArrowHelper[] = [];

  private currentSurfaceType: number = -1;

  mount(container: HTMLElement | HTMLCanvasElement): void {
    if (container instanceof HTMLCanvasElement) {
      this.container = container.parentElement || document.body;
    } else {
      this.container = container;
    }

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 1.5, 7.5);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    // 3. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    // 5. Grid Helper (XY Plane)
    const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // Orient on XY plane
    this.scene.add(grid);

    // 6. Create Charge Meshes
    this.createCharges();

    // 7. Create Electric Field Arrow Grid
    this.createFieldArrows();
  }

  private createCharges(): void {
    if (!this.scene) return;

    // Charge 1
    const geom = new THREE.SphereGeometry(0.18, 24, 24);
    const glowGeom = new THREE.SphereGeometry(0.28, 16, 16);

    const mat1 = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    this.charge1Mesh = new THREE.Mesh(geom, mat1);
    this.scene.add(this.charge1Mesh);

    const glowMat1 = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    this.charge1Glow = new THREE.Mesh(glowGeom, glowMat1);
    this.scene.add(this.charge1Glow);

    // Charge 2
    const mat2 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    this.charge2Mesh = new THREE.Mesh(geom, mat2);
    this.scene.add(this.charge2Mesh);

    const glowMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    this.charge2Glow = new THREE.Mesh(glowGeom, glowMat2);
    this.scene.add(this.charge2Glow);
  }

  private createFieldArrows(): void {
    if (!this.scene) return;
    // 3D vector grid around z = 0 plane
    for (let x = -3.5; x <= 3.5; x += 1.0) {
      for (let y = -2.5; y <= 2.5; y += 1.0) {
        if (Math.hypot(x, y) < 0.3) continue;
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(x, y, 0),
          0.35,
          0x475569,
          0.12,
          0.08
        );
        this.fieldArrows.push(arrow);
        this.scene.add(arrow);
      }
    }
  }

  private updateGaussianSurface(state: GaussState): void {
    if (!this.scene) return;

    if (this.currentSurfaceType !== state.surfaceType) {
      // Rebuild geometry
      if (this.gaussianMesh) this.scene.remove(this.gaussianMesh);
      if (this.gaussianWire) this.scene.remove(this.gaussianWire);

      let geom: THREE.BufferGeometry;
      if (state.surfaceType === 0) {
        // Sphere
        geom = new THREE.SphereGeometry(1.0, 32, 24);
      } else if (state.surfaceType === 1) {
        // Cylinder
        geom = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 32);
      } else {
        // Cube
        geom = new THREE.BoxGeometry(2.0, 2.0, 2.0);
      }

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        transmission: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.gaussianMesh = new THREE.Mesh(geom, mat);
      this.scene.add(this.gaussianMesh);

      const wireGeom = new THREE.WireframeGeometry(geom);
      this.gaussianWire = new THREE.LineSegments(
        wireGeom,
        new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.5 })
      );
      this.scene.add(this.gaussianWire);

      this.currentSurfaceType = state.surfaceType;
    }

    // Scale and position Gaussian surface
    const rG = state.surfaceRadius;
    if (this.gaussianMesh && this.gaussianWire) {
      this.gaussianMesh.position.set(state.surfaceCenter.x, state.surfaceCenter.y, 0);
      this.gaussianMesh.scale.set(rG, rG, rG);

      this.gaussianWire.position.copy(this.gaussianMesh.position);
      this.gaussianWire.scale.copy(this.gaussianMesh.scale);

      // Color shifts based on net flux
      const mat = this.gaussianMesh.material as THREE.MeshPhysicalMaterial;
      if (state.enclosedChargeNc > 0) {
        mat.color.setHex(0xf59e0b); // Amber for positive outward flux
      } else if (state.enclosedChargeNc < 0) {
        mat.color.setHex(0x38bdf8); // Cyan for negative inward flux
      } else {
        mat.color.setHex(0x10b981); // Emerald for neutral zero flux
      }
    }
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(state: GaussState): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    // 1. Update Controls
    if (this.controls) {
      this.controls.update();
    }

    // 2. Update Charge Positions & Colors
    if (this.charge1Mesh && this.charge1Glow) {
      this.charge1Mesh.position.set(state.charge1Pos.x, state.charge1Pos.y, 0);
      this.charge1Glow.position.copy(this.charge1Mesh.position);

      const c1 = state.charge1Nc >= 0 ? 0xef4444 : 0x38bdf8;
      (this.charge1Mesh.material as THREE.MeshStandardMaterial).color.setHex(c1);
      (this.charge1Glow.material as THREE.MeshBasicMaterial).color.setHex(c1);
    }

    if (this.charge2Mesh && this.charge2Glow) {
      this.charge2Mesh.position.set(state.charge2Pos.x, state.charge2Pos.y, 0);
      this.charge2Glow.position.copy(this.charge2Mesh.position);

      const c2 = state.charge2Nc >= 0 ? 0xef4444 : 0x38bdf8;
      (this.charge2Mesh.material as THREE.MeshStandardMaterial).color.setHex(c2);
      (this.charge2Glow.material as THREE.MeshBasicMaterial).color.setHex(c2);
    }

    // 3. Update Gaussian Surface
    this.updateGaussianSurface(state);

    // 4. Update Field Arrows
    for (let i = 0; i < this.fieldArrows.length; i++) {
      const arrow = this.fieldArrows[i];
      const p = arrow.position;

      // Compute field at arrow position
      const r1x = p.x - state.charge1Pos.x;
      const r1y = p.y - state.charge1Pos.y;
      const d1 = Math.max(0.2, Math.hypot(r1x, r1y));
      const e1Mag = state.charge1Nc / (d1 * d1);

      const r2x = p.x - state.charge2Pos.x;
      const r2y = p.y - state.charge2Pos.y;
      const d2 = Math.max(0.2, Math.hypot(r2x, r2y));
      const e2Mag = state.charge2Nc / (d2 * d2);

      const ex = (r1x / d1) * e1Mag + (r2x / d2) * e2Mag;
      const ey = (r1y / d1) * e1Mag + (r2y / d2) * e2Mag;
      const eMag = Math.hypot(ex, ey);

      if (eMag > 1e-4) {
        arrow.setDirection(new THREE.Vector3(ex / eMag, ey / eMag, 0));
        const len = Math.min(0.65, Math.max(0.18, eMag * 0.25));
        arrow.setLength(len, len * 0.35, len * 0.25);
        arrow.setColor(new THREE.Color(state.enclosedChargeNc !== 0 ? 0x38bdf8 : 0x64748b));
      }
    }

    // 5. Render Three.js Scene
    this.renderer.render(this.scene, this.camera);
  }

  unmount(): void {
    this.dispose();
  }

  dispose(): void {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.fieldArrows = [];
  }
}
