import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RubiksCube } from './RubiksCube.js';
import { ArrowIndicator } from './ArrowIndicator.js';
import { CubeTimer } from './timer.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera setup
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(5, 4, 5);

// Renderer setup
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Orbit controls for camera rotation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 15;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight2.position.set(-10, -10, -10);
scene.add(directionalLight2);

// Create Rubik's cube
const rubiksCube = new RubiksCube(scene);

// Create arrow indicator
const arrowIndicator = new ArrowIndicator(scene);

// Create timer instance
const timer = new CubeTimer();

// Track if cube is scrambled
let isScrambled = false;

// Debug display element
const debugDisplay = document.getElementById('debug-display');

// Raycaster for face selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedFace = null;
let dragStart = null;
let isDragging = false;
let clickedCubiePos = null;

// Handle mouse events for face rotation
// Use pointerdown with capture to intercept before OrbitControls
canvas.addEventListener('pointerdown', onPointerDown, true);
canvas.addEventListener('pointermove', onPointerMove, true);
canvas.addEventListener('pointerup', onPointerUp, true);

function onPointerDown(event) {
  if (rubiksCube.isAnimating) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(rubiksCube.cubies);

  if (intersects.length > 0) {
    // Stop the event from reaching OrbitControls
    event.stopPropagation();
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    selectedFace = getFaceFromIntersect(intersects[0]);
    clickedCubiePos = intersects[0].object.position.clone();

    // Show arrow indicators
    arrowIndicator.showForFace(selectedFace, clickedCubiePos);

    // Update debug display
    updateDebugDisplay(selectedFace, null, clickedCubiePos);
  }
}

function onPointerMove(event) {
  if (!isDragging || !dragStart || !selectedFace) return;

  // Stop event from reaching OrbitControls while dragging on cube
  event.stopPropagation();

  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;

  const dragDistance = Math.sqrt(dx * dx + dy * dy);

  // Update arrow highlighting and debug display as user drags
  if (dragDistance > 5) {
    arrowIndicator.highlightDirection(dx, dy, selectedFace);
    const rotation = determineRotation(selectedFace, dx, dy);
    updateDebugDisplay(selectedFace, rotation, clickedCubiePos, dx, dy);
  }

  if (dragDistance > 30) {
    const rotation = determineRotation(selectedFace, dx, dy);
    if (rotation) {
      rubiksCube.rotateFace(rotation.face, rotation.clockwise);
      
      // Record move for timer (starts timer on first move)
      if (isScrambled) {
        timer.recordMove();
      }
      
      checkSolved();
    }

    // Hide indicators
    arrowIndicator.hide();
    hideDebugDisplay();

    isDragging = false;
    selectedFace = null;
    dragStart = null;
    clickedCubiePos = null;
  }
}

function onPointerUp(event) {
  if (isDragging) {
    event.stopPropagation();
    arrowIndicator.hide();
    hideDebugDisplay();
  }
  isDragging = false;
  selectedFace = null;
  dragStart = null;
  clickedCubiePos = null;
}

function getFaceFromIntersect(intersect) {
  const normal = intersect.face.normal.clone();
  normal.transformDirection(intersect.object.matrixWorld);

  const pos = intersect.object.position.clone();

  // Determine which face was clicked
  if (Math.abs(normal.x) > 0.9) {
    return { axis: 'x', direction: normal.x > 0 ? 1 : -1, pos };
  } else if (Math.abs(normal.y) > 0.9) {
    return { axis: 'y', direction: normal.y > 0 ? 1 : -1, pos };
  } else if (Math.abs(normal.z) > 0.9) {
    return { axis: 'z', direction: normal.z > 0 ? 1 : -1, pos };
  }
  return null;
}

function determineRotation(face, dx, dy) {
  // Based on clicked face and drag direction, determine which layer to rotate
  // Directions are set so rotation follows the mouse movement
  if (face.axis === 'z') {
    // Clicked on front/back face
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal drag - rotate the row
      const row = Math.round(face.pos.y);
      if (row === 1) return { face: 'U', clockwise: (dx < 0) === (face.direction > 0) };
      if (row === -1) return { face: 'D', clockwise: (dx > 0) === (face.direction > 0) };
      return { face: 'E', clockwise: (dx > 0) === (face.direction > 0) };
    } else {
      // Vertical drag - rotate the column
      const col = Math.round(face.pos.x);
      if (col === 1) return { face: 'R', clockwise: (dy < 0) === (face.direction > 0) };
      if (col === -1) return { face: 'L', clockwise: (dy > 0) === (face.direction > 0) };
      return { face: 'M', clockwise: (dy > 0) === (face.direction > 0) };
    }
  } else if (face.axis === 'x') {
    // Clicked on left/right face
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal drag - rotate the row
      const row = Math.round(face.pos.y);
      if (row === 1) return { face: 'U', clockwise: dx < 0 };
      if (row === -1) return { face: 'D', clockwise: dx > 0 };
      return { face: 'E', clockwise: dx > 0 };
    } else {
      // Vertical drag - rotate the depth
      const depth = Math.round(face.pos.z);
      if (depth === 1) return { face: 'F', clockwise: (dy > 0) === (face.direction > 0) };
      if (depth === -1) return { face: 'B', clockwise: (dy < 0) === (face.direction > 0) };
      return { face: 'S', clockwise: (dy > 0) === (face.direction > 0) };
    }
  } else if (face.axis === 'y') {
    // Clicked on top/bottom face
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal drag - rotate the depth
      const depth = Math.round(face.pos.z);
      if (depth === 1) return { face: 'F', clockwise: (dx < 0) === (face.direction > 0) };
      if (depth === -1) return { face: 'B', clockwise: (dx > 0) === (face.direction > 0) };
      return { face: 'S', clockwise: (dx < 0) === (face.direction > 0) };
    } else {
      // Vertical drag - rotate the column
      const col = Math.round(face.pos.x);
      if (col === 1) return { face: 'R', clockwise: (dy < 0) === (face.direction > 0) };
      if (col === -1) return { face: 'L', clockwise: (dy > 0) === (face.direction > 0) };
      return { face: 'M', clockwise: (dy > 0) === (face.direction > 0) };
    }
  }

  return null;
}

function checkSolved() {
  setTimeout(() => {
    if (rubiksCube.isSolved()) {
      // Stop timer when solved
      timer.stop();
      
      const finalTime = timer.getFormattedTime();
      const finalMoves = timer.getMoveCount();
      
      showMessage(`Solved! 🎉 Time: ${finalTime} | Moves: ${finalMoves}`, 'success');
      
      isScrambled = false;
      document.getElementById('pause-btn').disabled = true;
    }
  }, 350);
}

function showMessage(text, type = 'info') {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = `message ${type}`;
  msg.style.opacity = '1';
  setTimeout(() => {
    msg.style.opacity = '0';
  }, 2000);
}

function updateDebugDisplay(face, rotation, cubiePos, dx = 0, dy = 0) {
  if (!debugDisplay) return;

  const axisNames = { x: 'Left/Right', y: 'Top/Bottom', z: 'Front/Back' };
  const faceName = axisNames[face.axis] || face.axis;
  const faceDir = face.direction > 0 ? '+' : '-';

  let html = `<strong>Clicked Face:</strong> ${faceName} (${faceDir}${face.axis})<br>`;
  html += `<strong>Cubie Position:</strong> (${cubiePos.x.toFixed(0)}, ${cubiePos.y.toFixed(0)}, ${cubiePos.z.toFixed(0)})<br>`;
  html += `<strong>Drag:</strong> dx=${dx.toFixed(0)}, dy=${dy.toFixed(0)}<br>`;

  if (rotation) {
    const dirText = rotation.clockwise ? 'Clockwise' : 'Counter-clockwise';
    html += `<strong>Will Rotate:</strong> <span class="highlight">${rotation.face}</span> ${dirText}`;
  } else {
    html += `<strong>Drag to select rotation</strong>`;
  }

  debugDisplay.innerHTML = html;
  debugDisplay.style.opacity = '1';
}

function hideDebugDisplay() {
  if (debugDisplay) {
    debugDisplay.style.opacity = '0';
  }
}

// Keyboard controls
document.addEventListener('keydown', (event) => {
  if (rubiksCube.isAnimating) return;

  const clockwise = !event.shiftKey;
  const key = event.key.toUpperCase();

  let moved = false;
  
  switch (key) {
    case 'R': rubiksCube.rotateFace('R', clockwise); moved = true; break;
    case 'L': rubiksCube.rotateFace('L', clockwise); moved = true; break;
    case 'U': rubiksCube.rotateFace('U', clockwise); moved = true; break;
    case 'D': rubiksCube.rotateFace('D', clockwise); moved = true; break;
    case 'F': rubiksCube.rotateFace('F', clockwise); moved = true; break;
    case 'B': rubiksCube.rotateFace('B', clockwise); moved = true; break;
    case 'M': rubiksCube.rotateFace('M', clockwise); moved = true; break;
    case 'E': rubiksCube.rotateFace('E', clockwise); moved = true; break;
    case 'S': rubiksCube.rotateFace('S', clockwise); moved = true; break;
    case ' ': // Spacebar for pause
      if (isScrambled && timer.hasStarted) {
        event.preventDefault();
        document.getElementById('pause-btn').click();
      }
      break;
  }

  // Record move for timer
  if (moved && isScrambled) {
    timer.recordMove();
    checkSolved();
  }
});

// Pause button handler
document.getElementById('pause-btn').addEventListener('click', () => {
  if (timer.isTimerRunning()) {
    timer.pause();
    document.getElementById('pause-btn').textContent = 'Resume';
    showMessage('Timer paused', 'info');
  } else if (timer.hasStarted) {
    timer.resume();
    document.getElementById('pause-btn').textContent = 'Pause';
    showMessage('Timer resumed', 'info');
  }
});

// Button handlers
document.getElementById('scramble-btn').addEventListener('click', () => {
  rubiksCube.scramble(20);
  
  // Initialize timer (ready to start on first move)
  timer.initialize();
  isScrambled = true;
  
  // Enable pause button
  document.getElementById('pause-btn').disabled = false;
  
  showMessage('Cube scrambled! Make your first move to start timer', 'info');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  rubiksCube.reset();
  
  // Reset timer
  timer.reset();
  isScrambled = false;
  
  // Disable pause button
  document.getElementById('pause-btn').disabled = true;
  
  showMessage('Cube reset', 'info');
});

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
