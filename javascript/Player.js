class Player {
  constructor(model, mixer, animationMap, camera, currentAction) {
    this.model = model;
    this.mixer = mixer;
    this.animationMap = animationMap;
    this.currentAction = currentAction;
    this.camera = camera;
    this.run = false;

    this.walkDirection = new THREE.Vector3();
    this.rotateAngle = new THREE.Vector3(0, 1, 0); 
    this.rotateQuarternion = new THREE.Quaternion();
    this.cameraTarget = new THREE.Vector3();

    this.isJumping = false;
    this.isJumpingAnimationPlaying = false;
    this.canJump = true;
    this.jumpCooldown = 0.6;
    this.lastJumpTime = 0;

    this.gravity = -70;
    this.verticalVelocity = 0; 
    this.jumpStrength = 20;
    this.xBuffer = 0.2;

    this.fade = 0.2;
    this.runVelocity = 10;
    this.walkVelocity = 6;
    this.crouchVelocity = 3;
    this.directions = ["w", "a", "s", "d"];

    this.spawnPoint = {
      x: 0,
      y: 0,
      z: 0
    };

    this.mixer.addEventListener('finished', (e) => {
      if (this.isJumpingAnimationPlaying && e.action === this.animationMap.get("Jump")) {
        this.isJumpingAnimationPlaying = false;
        this.isJumping = false;
      }
    });

    this.animationMap.forEach((value, key) => {
      if (key === currentAction) value.play();
    });
  }

  update(delta, keysPressed, currentTime, assets) {
    if (this.model.position.y < -100) {
      this.restoreDefault();
    }

    let play = "";
    if (keysPressed["w"] && this.canJump && !this.isJumpingAnimationPlaying) {
      play = "Jump";
      if (!this.isJumping) {
        this.isJumping = true;
        this.isJumpingAnimationPlaying = true;
        this.verticalVelocity = this.jumpStrength;
        this.canJump = false;
        this.lastJumpTime = currentTime;
      }
    } else if (!keysPressed["w"]) {
      if (currentTime - this.lastJumpTime >= this.jumpCooldown) {
        this.canJump = true;
      }
    }

    if (!this.isJumpingAnimationPlaying) {
      if ((keysPressed["a"] || keysPressed["d"]) && keysPressed["s"]) play = "Crouch";
      else if ((keysPressed["a"] || keysPressed["d"]) && this.run) play = "Run";
      else if (keysPressed["a"] || keysPressed["d"]) play = "Jog";
      else play = "Idle";
    } 
    else play = "Jump";

    if (this.currentAction !== play) {
      const toPlay = this.animationMap.get(play);
      const current = this.animationMap.get(this.currentAction);
      current.fadeOut(this.fade);
      toPlay.reset().fadeIn(this.fade).play();
      this.currentAction = play;
    }

    this.mixer.update(delta * 1.25);

    // if (this.isJumping) {
    //   this.verticalVelocity += this.gravity * delta; 
    //   this.model.position.y = Math.max(0, this.model.position.y + this.verticalVelocity * delta);

    //   if (this.model.position.y === 0) {
    //     this.isJumping = false;
    //     this.isJumpingAnimationPlaying = false;
    //     this.verticalVelocity = 0;
    //   }
    // }

    this.verticalVelocity += this.gravity * delta; 
    this.model.position.y += this.verticalVelocity * delta;
    for (let asset of assets) {
      if (!(this.model.position.x <= asset.position.x - asset.size.x / 2 - this.xBuffer 
      || this.model.position.x >= asset.position.x + asset.size.x / 2 + this.xBuffer) && 
      !(this.model.position.y <= asset.position.y - asset.size.y 
      || this.model.position.y >= asset.position.y + asset.size.y) && asset.position.z == 0) {
        this.model.position.y = asset.position.y + asset.size.y + 0.001;
        this.isJumping = false;
        this.isJumpingAnimationPlaying = false;
        this.verticalVelocity = 0;
        if (asset.isSpike) this.restoreDefault();
        if (asset.isCheckpoint) {
          this.spawnPoint.x = 133;
          this.spawnPoint.y = -4;
        }
        if (asset.isEnding) document.querySelector(".ending-screen").classList.remove("hidden");
      }
    }
    if (this.model.position.y >= -10) this.updateCameraY(this.verticalVelocity * delta);

    if (keysPressed["a"] || keysPressed["d"]) {
      const angleYCameraDirection = Math.atan2(
        (-this.camera.position.x + this.model.position.x), 
        (-this.camera.position.z + this.model.position.z)
      );
      
      const directionOffset = this.calculateOffset(keysPressed);
      
      const finalAngle = angleYCameraDirection + directionOffset;

      const targetRotation = new THREE.Quaternion().setFromAxisAngle(this.rotateAngle, finalAngle);
      this.model.quaternion.rotateTowards(targetRotation, 0.3);

      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);
      
      let velocity;
      if (this.run && !keysPressed["s"]) velocity = this.runVelocity;
      else if (keysPressed["s"]) velocity = this.crouchVelocity;
      else velocity = this.walkVelocity;

      const moveX = this.walkDirection.x * velocity * delta;
      const moveZ = this.walkDirection.z * velocity * delta;

      for (let asset of assets) {
        if (!(this.model.position.x + moveX <= asset.position.x - asset.size.x / 2 - this.xBuffer 
        || this.model.position.x + moveX >= asset.position.x + asset.size.x / 2 + this.xBuffer) && 
        !(this.model.position.y <= asset.position.y - asset.size.y 
        || this.model.position.y >= asset.position.y + asset.size.y) && asset.position.z == 0) {
          if (asset.isSpike) this.restoreDefault();
          else if (asset.isEnding) {
            stopTimer();
            document.querySelector(".ending-screen").classList.remove("hidden");
          }
          else return;
        } 
      }

      this.model.position.x += moveX;
      this.model.position.z += moveZ;
      this.updateCameraTarget(moveX, moveZ);
    }
  }

  updateCameraTarget(moveX, moveZ) {
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    this.cameraTarget.x = this.model.position.x;
    this.cameraTarget.y = this.model.position.y;
    this.cameraTarget.z = this.model.position.z;
  }

  updateCameraY(moveY) {
    this.camera.position.y += moveY;
    this.cameraTarget.y = this.model.position.y;
  }

  restoreDefault() {
    this.model.position.x = this.spawnPoint.x;
    this.model.position.y = this.spawnPoint.y * 1.5;
    this.model.position.z = this.spawnPoint.z;

    this.camera.position.x = this.spawnPoint.x;
    this.camera.position.y = this.spawnPoint.y + 5; 
    this.camera.position.z = this.spawnPoint.z + 15;

    this.cameraTarget.x = this.model.position.x;
    this.cameraTarget.y = this.model.position.y;
    this.cameraTarget.z = this.model.position.z;
  }

  calculateOffset(keysPressed) {
    let offset = 0;
    if (keysPressed["a"]) offset = Math.PI / 2;
    else if (keysPressed["d"]) offset = -Math.PI / 2;

    return offset;
  }
}
