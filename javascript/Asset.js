class Asset {
  constructor(scene, objPath, mtlPath, position = { x: 0, y: 0, z: 0 }, scale = 1, isSpike = false, radians = 0, isCheckpoint = false, isEnding = false) {
    this.scene = scene;
    this.objPath = objPath;
    this.mtlPath = mtlPath;
    this.position = position;
    this.scale = scale;
    this.isSpike = isSpike;
    this.radians = radians;
    this.isCheckpoint = isCheckpoint;
    this.isEnding = isEnding;
    this.object = null;
    this.boundingBox = null;
    this.size = {
      x: 0,
      y: 0,
      z: 0
    };
    this.load();
  }

  load() {
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.load(this.mtlPath, (materials) => {
      materials.preload();
      const objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(this.objPath, (object) => {
        object.scale.set(this.scale, this.scale, this.scale);
        object.position.set(this.position.x, this.position.y, this.position.z);
        object.rotation.y = this.radians;
        this.scene.add(object);
        this.object = object;
        this.updateBoundingBox();
      });
    });
  }

  updateBoundingBox() {
    if (this.object) {
      const box = new THREE.Box3().setFromObject(this.object);
      this.boundingBox = box;
      this.size.x = Math.abs(this.boundingBox.max.x - this.boundingBox.min.x);
      this.size.y = Math.abs(this.boundingBox.max.y - this.boundingBox.min.y);
      this.size.z = Math.abs(this.boundingBox.max.z - this.boundingBox.min.z);
    }
  }
}
