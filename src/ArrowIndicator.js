import * as THREE from 'three';

export class ArrowIndicator {
  constructor(scene) {
    this.scene = scene;
    this.arrows = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  // Create a curved arrow showing rotation direction
  createCurvedArrow(center, axis, radius, clockwise, color) {
    const arrowGroup = new THREE.Group();

    // Create arc
    const segments = 20;
    const arcAngle = Math.PI * 0.6; // 108 degrees arc
    const points = [];

    const startAngle = clockwise ? 0 : arcAngle;
    const endAngle = clockwise ? arcAngle : 0;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;

      let x, y, z;
      if (axis === 'x') {
        x = 0;
        y = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
      } else if (axis === 'y') {
        x = Math.cos(angle) * radius;
        y = 0;
        z = Math.sin(angle) * radius;
      } else {
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
        z = 0;
      }

      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    const arc = new THREE.Line(geometry, material);
    arrowGroup.add(arc);

    // Create arrowhead
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];
    const direction = new THREE.Vector3().subVectors(lastPoint, secondLastPoint).normalize();

    // Create cone for arrowhead
    const coneGeometry = new THREE.ConeGeometry(0.12, 0.25, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);

    // Position and orient the cone
    cone.position.copy(lastPoint);

    // Orient cone along the direction
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(up, direction);
    cone.setRotationFromQuaternion(quaternion);

    arrowGroup.add(cone);

    arrowGroup.position.copy(center);

    return arrowGroup;
  }

  // Show arrows for the clicked face
  showForFace(face, clickPos) {
    this.hide();

    const offset = 0.1; // Offset from cube surface
    const arrowRadius = 0.4;

    // Calculate center position for arrows based on clicked cubie
    const center = clickPos.clone();

    // Determine which arrows to show based on clicked face axis
    if (face.axis === 'z') {
      // Front/back face - show horizontal (U/D/E) and vertical (R/L/M) arrows
      center.z += face.direction * (0.5 + offset);

      // Horizontal arrow (affects U/D/E based on row)
      const hArrow1 = this.createCurvedArrow(center, 'z', arrowRadius, true, 0x00ff00);
      const hArrow2 = this.createCurvedArrow(center, 'z', arrowRadius, false, 0xff6600);

      this.arrows.push({ arrow: hArrow1, type: 'horizontal', clockwise: true });
      this.arrows.push({ arrow: hArrow2, type: 'horizontal', clockwise: false });
      this.group.add(hArrow1);
      this.group.add(hArrow2);

    } else if (face.axis === 'x') {
      // Left/right face - show horizontal (U/D/E) and vertical (F/B/S) arrows
      center.x += face.direction * (0.5 + offset);

      // Horizontal arrow
      const hArrow1 = this.createCurvedArrow(center, 'x', arrowRadius, true, 0x00ff00);
      const hArrow2 = this.createCurvedArrow(center, 'x', arrowRadius, false, 0xff6600);

      this.arrows.push({ arrow: hArrow1, type: 'horizontal', clockwise: true });
      this.arrows.push({ arrow: hArrow2, type: 'horizontal', clockwise: false });
      this.group.add(hArrow1);
      this.group.add(hArrow2);

    } else if (face.axis === 'y') {
      // Top/bottom face - show horizontal (F/B/S) and vertical (R/L/M) arrows
      center.y += face.direction * (0.5 + offset);

      // Horizontal arrow
      const hArrow1 = this.createCurvedArrow(center, 'y', arrowRadius, true, 0x00ff00);
      const hArrow2 = this.createCurvedArrow(center, 'y', arrowRadius, false, 0xff6600);

      this.arrows.push({ arrow: hArrow1, type: 'horizontal', clockwise: true });
      this.arrows.push({ arrow: hArrow2, type: 'horizontal', clockwise: false });
      this.group.add(hArrow1);
      this.group.add(hArrow2);
    }
  }

  // Highlight the arrow that matches current drag direction
  highlightDirection(dx, dy, face) {
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    this.arrows.forEach(({ arrow, type }) => {
      const shouldHighlight = (type === 'horizontal') === isHorizontal;
      arrow.traverse(child => {
        if (child.material) {
          child.material.opacity = shouldHighlight ? 1.0 : 0.3;
        }
      });
    });
  }

  hide() {
    this.arrows.forEach(({ arrow }) => {
      this.group.remove(arrow);
      arrow.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.arrows = [];
  }
}
