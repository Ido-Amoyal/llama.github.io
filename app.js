// Variables for setup
let container;
let camera;
let renderer;
let scene;
let model;
let raycaster;
let mouse;
let previousMousePosition = { x: 0, y: 0 };
let selectedObject = null;
let clock = new THREE.Clock(); // Clock to keep track of time for floating effect
let isDragging = false; // Variable to check if the mouse is being dragged
let dragStartPosition = { x: 0, y: 0 }; // Starting position of the drag

let azimuthalAngle = 0; // Horizontal angle
let polarAngle = Math.PI / 2; // Vertical angle, starts at 90 degrees
const radius = 30; // Distance from camera to target

function init() {
  container = document.querySelector(".scene");

  // Create scene
  scene = new THREE.Scene();

  const fov = 35;
  const aspect = container.clientWidth / container.clientHeight;
  const near = 0.1;
  const far = 1000;

  // Camera setup
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  updateCameraPosition();

  const ambient = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(50, 50, 100);
  scene.add(light);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

  // Raycaster and Mouse Vector
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Load Model
  let loader = new THREE.GLTFLoader();
  loader.load("./Dado_cubes.glb", function (gltf) {
    scene.add(gltf.scene);
    model = gltf.scene; // Reference the entire model

    // Log the structure of the loaded model
    console.log(gltf);

    updateCameraPosition(); // Ensure the camera looks at the loaded model

    animate();
  });

  window.addEventListener("resize", onWindowResize);
  container.addEventListener("mousemove", onMouseMove); // Changed to container
  container.addEventListener("mousedown", onMouseDown); // Changed to container
  container.addEventListener("mouseup", onMouseUp); // Changed to container
}

function updateCameraPosition() {
  // Convert spherical coordinates to Cartesian coordinates
  const x = radius * Math.sin(polarAngle) * Math.sin(azimuthalAngle);
  const y = radius * Math.cos(polarAngle);
  const z = radius * Math.sin(polarAngle) * Math.cos(azimuthalAngle);

  camera.position.set(x, y, z);

  if (model) {
    // Set the camera to look at the model's position to center it horizontally
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    camera.lookAt(center);
  } else {
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Fallback if model is not loaded yet
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (model) {
    // Floating effect
    let elapsed = clock.getElapsedTime();
    model.position.y = Math.sin(elapsed) * 0.8; // Adjust the amplitude as needed
    model.position.x = Math.sin(elapsed) * 0.5; // Adjust the amplitude as needed
    flag=true;
    if(true==flag)
      {
        model.position.x = -Math.sin(elapsed) * 0.5; // Adjust the amplitude as needed    
      flag =false; 
      }
    
    checkCollisions(); // Check for collisions each frame
  }
  renderer.render(scene, camera);
}

function checkCollisions() {
  scene.children.forEach((object1, index) => {
    if (object1.isMesh) {
      for (let i = index + 1; i < scene.children.length; i++) {
        const object2 = scene.children[i];
        if (object2.isMesh) {
          const box1 = new THREE.Box3().setFromObject(object1);
          const box2 = new THREE.Box3().setFromObject(object2);
          if (box1.intersectsBox(box2)) {
            resolveCollision(object1, object2);
          }
        }
      }
    }
  });
}

function resolveCollision(object1, object2) {
  const box1 = new THREE.Box3().setFromObject(object1);
  const box2 = new THREE.Box3().setFromObject(object2);

  const collisionNormal = new THREE.Vector3();
  box1.getCenter(collisionNormal).sub(box2.getCenter(new THREE.Vector3())).normalize();

  const pushStrength = 0.05; // Adjust push strength
  const displacement1 = collisionNormal.clone().multiplyScalar(pushStrength);
  const displacement2 = collisionNormal.clone().multiplyScalar(-pushStrength);

  object1.position.add(displacement1);
  object2.position.add(displacement2);
}

function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates relative to the container
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  if (isDragging) {
    // Calculate the change in angles based on mouse movement
    const deltaX = (event.clientX - previousMousePosition.x) * 0.005;
    const deltaY = (event.clientY - previousMousePosition.y) * 0.005;

    azimuthalAngle -= deltaX;
    polarAngle -= deltaY;

    // Clamp the polar angle to prevent the camera from flipping
    polarAngle = Math.max(0.1, Math.min(Math.PI - 0.1, polarAngle));

    updateCameraPosition();
  }

  // Calculate objects intersecting the raycaster
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    document.body.style.cursor = 'pointer';
    selectedObject = intersects[0].object;

    // Change the color of the selected object
    selectedObject.traverse(function (child) {
      if (child.isMesh) {
        child.material.color.set(0xff0500); // Set the color to red
      }
    });

    // Calculate the direction and magnitude of the push based on mouse movement
    const deltaX = (event.clientX - previousMousePosition.x) * 0.01; // Increase the multiplier for more noticeable push
    const deltaY = (event.clientY - previousMousePosition.y) * 0.01; // Increase the multiplier for more noticeable push

    const pushStrength = 50; // Increase push strength for a more noticeable effect
    const direction = new THREE.Vector3(deltaX * pushStrength, deltaY * pushStrength, 0);

    // Apply a smooth transition to the object's position and rotation using gsap
    gsap.to(selectedObject.position, {
      x: selectedObject.position.x + direction.x,
      y: selectedObject.position.y - direction.y, // Invert y for correct direction
      duration: 0.5, // Increase duration for smoother effect
      ease: "power2.out"
    });

    // Add rotation effect for full 360-degree spin horizontally and vertically
    gsap.to(selectedObject.rotation, {
      x: "+=2 * Math.PI", // Full 360-degree spin on the x-axis
      y: "+=2 * Math.PI", // Full 360-degree spin on the y-axis
      duration: 0.5, // Sync with position animation duration
      ease: "power2.out"
    });
  } else {
    document.body.style.cursor = 'default';
    selectedObject = null;
  }

  previousMousePosition.x = event.clientX;
  previousMousePosition.y = event.clientY;
}

function onMouseDown(event) {
  if (event.button === 0) { // Left mouse button
    isDragging = true;
    dragStartPosition.x = event.clientX;
    dragStartPosition.y = event.clientY;
  }
}

function onMouseUp(event) {
  if (event.button === 0) { // Left mouse button
    isDragging = false;
  }
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

init();
