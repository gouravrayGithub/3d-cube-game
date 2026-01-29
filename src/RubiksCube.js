import * as THREE from 'three';

// Standard Rubik's cube colors
const COLORS = {
  white: 0xffffff,
  yellow: 0xffff00,
  red: 0xff0000,
  orange: 0xff8c00,
  blue: 0x0000ff,
  green: 0x00ff00,
  black: 0x111111, // inner faces
};

// Face indices: 0=right(+x), 1=left(-x), 2=top(+y), 3=bottom(-y), 4=front(+z), 5=back(-z)
const FACE_COLORS = {
  right: COLORS.red,
  left: COLORS.orange,
  top: COLORS.white,
  bottom: COLORS.yellow,
  front: COLORS.green,
  back: COLORS.blue,
};

export class RubiksCube {
  constructor(scene) {
    this.scene = scene;
    this.cubies = [];
    this.group = new THREE.Group();
    this.rotationGroup = new THREE.Group();
    this.isAnimating = false;
    this.animationQueue = [];

    this.scene.add(this.group);
    this.scene.add(this.rotationGroup);

    this.createCube();
  }

  createCubie(x, y, z) {
    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);

    // Determine colors for each face based on position
    const materials = [
      new THREE.MeshStandardMaterial({ color: x === 1 ? FACE_COLORS.right : COLORS.black }),  // +x
      new THREE.MeshStandardMaterial({ color: x === -1 ? FACE_COLORS.left : COLORS.black }),  // -x
      new THREE.MeshStandardMaterial({ color: y === 1 ? FACE_COLORS.top : COLORS.black }),    // +y
      new THREE.MeshStandardMaterial({ color: y === -1 ? FACE_COLORS.bottom : COLORS.black }),// -y
      new THREE.MeshStandardMaterial({ color: z === 1 ? FACE_COLORS.front : COLORS.black }),  // +z
      new THREE.MeshStandardMaterial({ color: z === -1 ? FACE_COLORS.back : COLORS.black }),  // -z
    ];

    const cubie = new THREE.Mesh(geometry, materials);
    cubie.position.set(x, y, z);

    // Store original position for face detection
    cubie.userData.position = { x, y, z };

    return cubie;
  }

  createCube() {
    // Create 3x3x3 cubies
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = this.createCubie(x, y, z);
          this.cubies.push(cubie);
          this.group.add(cubie);
        }
      }
    }
  }

  getCubiesOnFace(face) {
    const cubies = [];

    this.cubies.forEach(cubie => {
      const pos = cubie.position;
      const roundedX = Math.round(pos.x);
      const roundedY = Math.round(pos.y);
      const roundedZ = Math.round(pos.z);

      switch (face) {
        case 'R': if (roundedX === 1) cubies.push(cubie); break;
        case 'L': if (roundedX === -1) cubies.push(cubie); break;
        case 'U': if (roundedY === 1) cubies.push(cubie); break;
        case 'D': if (roundedY === -1) cubies.push(cubie); break;
        case 'F': if (roundedZ === 1) cubies.push(cubie); break;
        case 'B': if (roundedZ === -1) cubies.push(cubie); break;
        case 'M': if (roundedX === 0) cubies.push(cubie); break;
        case 'E': if (roundedY === 0) cubies.push(cubie); break;
        case 'S': if (roundedZ === 0) cubies.push(cubie); break;
      }
    });

    return cubies;
  }

  getRotationAxis(face) {
    switch (face) {
      case 'R': case 'L': case 'M': return new THREE.Vector3(1, 0, 0);
      case 'U': case 'D': case 'E': return new THREE.Vector3(0, 1, 0);
      case 'F': case 'B': case 'S': return new THREE.Vector3(0, 0, 1);
      default: return new THREE.Vector3(0, 1, 0);
    }
  }

  getRotationDirection(face, clockwise) {
    // Determine rotation direction based on face
    const directions = {
      'R': -1, 'L': 1, 'U': -1, 'D': 1, 'F': -1, 'B': 1, 'M': 1, 'E': 1, 'S': -1
    };
    return directions[face] * (clockwise ? 1 : -1);
  }

  rotateFace(face, clockwise = true, duration = 300) {
    return new Promise((resolve) => {
      if (this.isAnimating) {
        this.animationQueue.push({ face, clockwise, duration, resolve });
        return;
      }

      this.isAnimating = true;
      const cubies = this.getCubiesOnFace(face);
      const axis = this.getRotationAxis(face);
      const direction = this.getRotationDirection(face, clockwise);
      const targetAngle = (Math.PI / 2) * direction;

      // Move cubies to rotation group
      cubies.forEach(cubie => {
        this.group.remove(cubie);
        this.rotationGroup.add(cubie);
      });

      // Animate rotation
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease function
        const eased = 1 - Math.pow(1 - progress, 3);

        // Set rotation
        if (axis.x) this.rotationGroup.rotation.x = targetAngle * eased;
        if (axis.y) this.rotationGroup.rotation.y = targetAngle * eased;
        if (axis.z) this.rotationGroup.rotation.z = targetAngle * eased;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete - apply final positions
          this.finishRotation(cubies);
          resolve();

          // Process queue
          if (this.animationQueue.length > 0) {
            const next = this.animationQueue.shift();
            this.rotateFace(next.face, next.clockwise, next.duration).then(next.resolve);
          }
        }
      };

      requestAnimationFrame(animate);
    });
  }

  finishRotation(cubies) {
    // Apply rotation to world positions and move back to main group
    cubies.forEach(cubie => {
      // Get world position and apply
      const worldPos = new THREE.Vector3();
      cubie.getWorldPosition(worldPos);

      const worldQuat = new THREE.Quaternion();
      cubie.getWorldQuaternion(worldQuat);

      this.rotationGroup.remove(cubie);
      this.group.add(cubie);

      cubie.position.copy(worldPos);
      cubie.quaternion.copy(worldQuat);

      // Round positions to avoid floating point errors
      cubie.position.x = Math.round(cubie.position.x);
      cubie.position.y = Math.round(cubie.position.y);
      cubie.position.z = Math.round(cubie.position.z);
    });

    // Reset rotation group
    this.rotationGroup.rotation.set(0, 0, 0);
    this.isAnimating = false;
  }

  async scramble(moves = 20) {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];

    for (let i = 0; i < moves; i++) {
      const face = faces[Math.floor(Math.random() * faces.length)];
      const clockwise = Math.random() > 0.5;
      await this.rotateFace(face, clockwise, 100);
    }
  }

  reset() {
    // Remove all cubies
    this.cubies.forEach(cubie => {
      this.group.remove(cubie);
      this.rotationGroup.remove(cubie);
      cubie.geometry.dispose();
      cubie.material.forEach(m => m.dispose());
    });

    this.cubies = [];
    this.createCube();
  }

  // Check if cube is solved
  isSolved() {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];

    for (const face of faces) {
      const cubies = this.getCubiesOnFace(face);
      if (cubies.length !== 9) return false;

      // Get the color that should be on this face
      const faceIndex = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 }[face];
      const firstColor = cubies[0].material[faceIndex].color.getHex();

      for (const cubie of cubies) {
        if (cubie.material[faceIndex].color.getHex() !== firstColor) {
          return false;
        }
      }
    }

    return true;
  }
}
