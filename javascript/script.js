// TIMER
let gameStartTime;
let timerInterval;
const timer = document.querySelector(".time-taken");

function startTimer() {
  gameStartTime = performance.now();
  timerInterval = setInterval(() => {
    const elapsedTime = ((performance.now() - gameStartTime) / 1000).toFixed(2);
    timer.textContent = `${elapsedTime}S`;
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4f4ff);

// CAMERA
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);
camera.lookAt(0, 1, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// RESIZE
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = false;
scene.add(directionalLight);

// LOADING
const loading = document.querySelector(".loading-screen");

// ASSETS
let fbxModels = {};
let fbxSaved;
const animationsMap = new Map();
const loader = new THREE.FBXLoader();
let mixer;
let player;

// FBX FILES
const fbxFiles = [
  { name: "Idle", path: "fbxFiles/idle.fbx" },
  { name: "Jog", path: "fbxFiles/jog.fbx" },
  { name: "Run", path: "fbxFiles/run.fbx" },
  { name: "Jump", path: "fbxFiles/jump.fbx"},
  { name: "Crouch", path: "fbxFiles/crouch.fbx" }
];

const loadFBXAnimations = (fbxFiles, onLoadComplete) => {
  let loadedCount = 0;
  fbxFiles.forEach(({ name, path }, index) => {
    setTimeout(() => {
      console.log(name);
      loader.load(path, (fbx) => {
        fbx.scale.set(0.02, 0.02, 0.02);
        fbx.traverse((object) => {
          if (object.isMesh) object.castShadow = true;
        });

        fbxModels[name] = fbx;
        fbx.rotation.y = Math.PI / 2;

        if (!mixer) {
          mixer = new THREE.AnimationMixer(fbx);
          scene.add(fbx);
        }

        const clip = fbx.animations[0];
        if (clip) animationsMap.set(name, mixer.clipAction(clip));

        loadedCount++;
        if (loadedCount === fbxFiles.length) onLoadComplete();
      });
    }, index * 500);
  });
};

loadFBXAnimations(fbxFiles, () => {
  loading.classList.add("hidden");
  player = new Player(fbxModels["Idle"], mixer, animationsMap, camera, "Idle");
  startTimer();
});

// KEY HANDLING
const keysPressed = {};
document.addEventListener("keydown", (event) => {
  if (event.key === "Shift" && player) player.run = true;
  else keysPressed[event.key.toLowerCase()] = true; 
}, false);

document.addEventListener("keyup", (event) => {
  if (event.key === "Shift" && player) player.run = false;
  else keysPressed[event.key.toLowerCase()] = false;
}, false);

// CONTROL PANEL
const instructions = document.querySelector('.controls');
const closeButton = document.querySelector('.close-controls');

function showInstructions() {
    instructions.style.display = 'block';
}

closeButton.addEventListener('click', () => {
    instructions.style.display = 'none';
});

window.onload = showInstructions;

// ENDING SCREEN
const playAgainBtn = document.querySelector(".play-again-button");

playAgainBtn.addEventListener("click", (event) => {
  document.querySelector(".ending-screen").classList.add("hidden");
  player.spawnPoint.x = 0;
  player.spawnPoint.y = 0;
  player.restoreDefault();
  startTimer();
})

// ANIMATE
const clock = new THREE.Clock();
function animate() {
  if (player) {
    const delta = clock.getDelta();
    const currentTime = clock.getElapsedTime(); // Elapsed time in seconds
    player.update(delta, keysPressed, currentTime, assets); 
  }
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

