import * as THREE from 'three';
import { ViewportRenderer } from '../../../core/types/simulation';
import { InductionState } from './InductionEngine';

export class InductionRenderer3D implements ViewportRenderer<InductionState> {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  // Scene elements
  private magnetGroup: THREE.Group | null = null;
  private coilGroup: THREE.Group | null = null;
  private springLine: THREE.Line | null = null;
  private springGeometry: THREE.BufferGeometry | null = null;
  private currentRingMesh: THREE.Mesh | null = null;
  private currentRingMaterial: THREE.MeshBasicMaterial | null = null;

  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 9.0;
  private cameraTheta = 0.5; // azimuth
  private cameraPhi = 1.35;  // elevation

  mount(container: HTMLElement): void {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080e);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.updateCameraPosition();

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x6366f1, 0.6);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);

    // 5. Floor Grid
    const grid = new THREE.GridHelper(12, 24, 0x334155, 0x1e293b);
    grid.position.y = -3.5;
    this.scene.add(grid);

    // 6. Solenoid Coil Group (Centered at y = 0)
    this.coilGroup = new THREE.Group();
    this.buildSolenoidCoil();
    this.scene.add(this.coilGroup);

    // 7. Oscillating Bar Magnet
    this.magnetGroup = new THREE.Group();
    this.buildBarMagnet();
    this.scene.add(this.magnetGroup);

    // 8. Dynamic Spring (Ceiling at y = 4.2 down to magnet top)
    this.buildSpring();

    // 9. Mouse controls for orbital viewing
    this.setupInteractivity();
  }

  private buildSolenoidCoil(): void {
    if (!this.coilGroup) return;

    const coilRadius = 0.8;
    const turns = 10;
    const coilHeight = 1.4;

    // Helical copper turns
    const points: THREE.Vector3[] = [];
    const segments = 300;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2;
      const x = coilRadius * Math.cos(angle);
      const z = coilRadius * Math.sin(angle);
      const y = (t - 0.5) * coilHeight;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const coilGeom = new THREE.TubeGeometry(curve, 250, 0.045, 8, false);
    const copperMaterial = new THREE.MeshStandardMaterial({
      color: 0xc87d55,
      metalness: 0.9,
      roughness: 0.25,
    });
    const coilMesh = new THREE.Mesh(coilGeom, copperMaterial);
    this.coilGroup.add(coilMesh);

    // Solenoid transparent acrylic cylinder casing
    const casingGeom = new THREE.CylinderGeometry(coilRadius + 0.08, coilRadius + 0.08, coilHeight + 0.2, 32, 1, true);
    const casingMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.15,
      roughness: 0.1,
      transmission: 0.85,
    });
    const casing = new THREE.Mesh(casingGeom, casingMat);
    this.coilGroup.add(casing);

    // Glowing Current Ring indicator around coil center (y = 0)
    const ringGeom = new THREE.TorusGeometry(coilRadius + 0.15, 0.03, 16, 64);
    this.currentRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.0,
    });
    this.currentRingMesh = new THREE.Mesh(ringGeom, this.currentRingMaterial);
    this.currentRingMesh.rotation.x = Math.PI / 2;
    this.coilGroup.add(this.currentRingMesh);
  }

  private buildBarMagnet(): void {
    if (!this.magnetGroup) return;

    const radius = 0.35;
    const halfHeight = 0.65;

    // North Pole (Red) - Top half
    const northGeom = new THREE.CylinderGeometry(radius, radius, halfHeight, 32);
    const northMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red
      metalness: 0.4,
      roughness: 0.3,
    });
    const northMesh = new THREE.Mesh(northGeom, northMat);
    northMesh.position.y = halfHeight / 2;
    this.magnetGroup.add(northMesh);

    // South Pole (Blue) - Bottom half
    const southGeom = new THREE.CylinderGeometry(radius, radius, halfHeight, 32);
    const southMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // Blue
      metalness: 0.4,
      roughness: 0.3,
    });
    const southMesh = new THREE.Mesh(southGeom, southMat);
    southMesh.position.y = -halfHeight / 2;
    this.magnetGroup.add(southMesh);

    // Center metallic divider band
    const bandGeom = new THREE.CylinderGeometry(radius + 0.01, radius + 0.01, 0.06, 32);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const band = new THREE.Mesh(bandGeom, bandMat);
    this.magnetGroup.add(band);
  }

  private buildSpring(): void {
    if (!this.scene) return;

    // Ceiling Anchor Bar
    const ceilingGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.position.y = 4.2;
    this.scene.add(ceiling);

    // Spring Line
    const pointsCount = 200;
    const positions = new Float32Array(pointsCount * 3);

    this.springGeometry = new THREE.BufferGeometry();
    this.springGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const springMaterial = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      linewidth: 2,
    });

    this.springLine = new THREE.Line(this.springGeometry, springMaterial);
    this.scene.add(this.springLine);
  }

  private updateSpring(magnetTopY: number): void {
    if (!this.springGeometry) return;

    const ceilingY = 4.2;
    const springLen = ceilingY - magnetTopY;
    const turns = 14;
    const radius = 0.22;

    const positions = this.springGeometry.attributes.position.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1);
      const angle = frac * turns * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = ceilingY - frac * springLen;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    this.springGeometry.attributes.position.needsUpdate = true;
  }

  render(state: InductionState): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    // Update Magnet Position (state.z maps directly to 3D Y coordinate)
    if (this.magnetGroup) {
      this.magnetGroup.position.y = state.z;
    }

    // Update Spring attachment to magnet top (magnet top is state.z + 0.65)
    this.updateSpring(state.z + 0.65);

    // Update Lenz's Law Current Ring
    if (this.currentRingMaterial) {
      const absCurrent = Math.abs(state.current);
      const opacity = Math.min(1.0, absCurrent * 0.4);
      this.currentRingMaterial.opacity = opacity;

      // Color indicates Lenz's induced direction
      if (state.current >= 0) {
        this.currentRingMaterial.color.setHex(0x06b6d4); // Cyan for +I
      } else {
        this.currentRingMaterial.color.setHex(0xf59e0b); // Amber for -I
      }
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateCameraPosition(): void {
    if (!this.camera) return;
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0.4, 0);
  }

  private setupInteractivity(): void {
    if (!this.container) return;

    const onMouseDown = (e: MouseEvent) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.007;
      this.cameraPhi = Math.max(0.2, Math.min(Math.PI - 0.2, this.cameraPhi - deltaY * 0.007));

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.cameraDistance = Math.max(3.5, Math.min(20.0, this.cameraDistance + e.deltaY * 0.008));
      this.updateCameraPosition();
    };

    this.container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.container.addEventListener('wheel', onWheel, { passive: false });

    (this as any)._cleanupEvents = () => {
      this.container?.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.container?.removeEventListener('wheel', onWheel);
    };
  }

  unmount(): void {
    if ((this as any)._cleanupEvents) {
      (this as any)._cleanupEvents();
    }

    if (this.scene) {
      this.scene.traverse((obj: THREE.Object3D) => {
        if ('geometry' in obj && (obj as any).geometry) {
          (obj as any).geometry.dispose();
        }
        if ('material' in obj && (obj as any).material) {
          const mat = (obj as any).material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else {
            mat.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.container = null;
    this.magnetGroup = null;
    this.coilGroup = null;
    this.springLine = null;
    this.springGeometry = null;
    this.currentRingMesh = null;
    this.currentRingMaterial = null;
  }
}
