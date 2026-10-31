export class Vec3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  static from(v: { x: number; y: number; z: number }): Vec3 {
    return new Vec3(v.x, v.y, v.z);
  }

  static zero(): Vec3 {
    return new Vec3(0, 0, 0);
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vec3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  addScaled(v: Vec3, s: number): Vec3 {
    return new Vec3(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s);
  }

  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  magSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  mag(): number {
    return Math.sqrt(this.magSq());
  }

  normalize(): Vec3 {
    const m = this.mag();
    if (m === 0) return new Vec3(0, 0, 0);
    return new Vec3(this.x / m, this.y / m, this.z / m);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}
