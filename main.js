 // GLOBAL VARIABLES
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    
    let scene;
    let currentFigure = null;
    let currentBaseScale = new BABYLON.Vector3(1, 1, 1);
    let hemisphereLight;
    let arcCamera; // Global ArcRotateCamera
    
    // Animation settings
    let autoRotate = false;
    let rotationSpeed = 0.01;
    
    // Create the basic scene with hemispheric light and ArcRotateCamera.
    function createScene() {
      const scene = new BABYLON.Scene(engine);
      hemisphereLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
      hemisphereLight.intensity = 0.8;
      hemisphereLight.diffuse = new BABYLON.Color3(1, 1, 1);
      arcCamera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);
      arcCamera.attachControl(canvas, true);
      return scene;
    }
    scene = createScene();
    
    // Dictionary with Educational Geometry Info.
    const geometryInfo = {
      cube: "Cube:\nVolume = a³\nSurface Area = 6a²\nA cube is a regular hexahedron with square faces.",
      sphere: "Sphere:\nVolume = (4/3)πr³\nSurface Area = 4πr²\nA sphere is a perfectly round 3D object.",
      cylinder: "Cylinder:\nVolume = πr²h\nSurface Area = 2πr (r+h)\nA cylinder has two circular bases and a curved lateral surface.",
      torus: "Torus:\nVolume = 2π²Rr²\nSurface Area = 4π²Rr\nA torus is shaped like a doughnut.",
      cone: "Cone:\nVolume = (1/3)πr²h\nSurface Area = πr (r+l)\nA cone tapers from a circular base to a point.",
      tetrahedron: "Tetrahedron:\nVolume = a³/(6√2)\nSurface Area = √3 a²\nA tetrahedron has 4 triangular faces.",
      octahedron: "Octahedron:\nVolume = (√2/3)a³\nSurface Area = 2√3 a²\nAn octahedron has 8 triangular faces.",
      dodecahedron: "Dodecahedron:\nVolume = ((15+7√5)/4)a³\nSurface Area = 3√(25+10√5)a²\nA dodecahedron has 12 pentagonal faces.",
      icosahedron: "Icosahedron:\nVolume = (5(3+√5)/12)a³\nSurface Area = 5√3 a²\nAn icosahedron has 20 triangular faces.",
      ellipsoid: "Ellipsoid:\nVolume = (4/3)πabc\nSurface Area ≈ 4π[((a^p b^p + a^p c^p + b^p c^p)/3)]^(1/p), p≈1.6075\nA stretched sphere with three distinct radii.",
      pyramid: "Square Pyramid:\nVolume = (1/3)a²h\nA pyramid has a square base tapering to a point.",
      prism: "Triangular Prism:\nVolume = (Base Area)*Height\nA prism has two triangular bases connected by rectangular faces.",
      hyperboloid: "Hyperboloid (One Sheet):\nDefined by: x²+y²−z² = 1\nA doubly ruled surface approximated parametrically.",
      knot: "Torus Knot:\nA complex, intertwined closed curve winding around a torus.",
      custom: "Custom Shape:\nDefine your own shape by providing vertices and indices as JSON arrays."
    };
    
    // --- EXPORT & SCREENSHOT FUNCTIONS ---
    function downloadBlob(blob, filename) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
    document.getElementById("exportOBJ").addEventListener("click", () => {
      if (!currentFigure) {
        alert("No object to export!");
        return;
      }
      const objString = BABYLON.OBJExport.OBJ([currentFigure], scene);
      const blob = new Blob([objString], { type: "text/plain" });
      downloadBlob(blob, "model.obj");
    });
    document.getElementById("exportGLTF").addEventListener("click", () => {
      BABYLON.GLTF2Export.GLBAsync(scene, "scene").then((glb) => {
        glb.downloadFiles();
      });
    });
    document.getElementById("downloadImage").addEventListener("click", () => {
      const dataURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "screenshot.png";
      link.click();
    });
    // --- END EXPORT FUNCTIONS ---
    
    // --- FUNCTION: Create a Custom Hyperboloid ---
    function createHyperboloid() {
      const segmentsU = 30, segmentsV = 20, vMax = 1, size = 1;
      let positions = [], indices = [], uvs = [];
      for (let i = 0; i <= segmentsU; i++) {
        let u = (2 * Math.PI * i) / segmentsU;
        for (let j = 0; j <= segmentsV; j++) {
          let v = -vMax + (2 * vMax * j) / segmentsV;
          let x = Math.cosh(v) * Math.cos(u);
          let y = Math.cosh(v) * Math.sin(u);
          let z = Math.sinh(v);
          positions.push(x * size, y * size, z * size);
          uvs.push(i / segmentsU, j / segmentsV);
        }
      }
      for (let i = 0; i < segmentsU; i++) {
        for (let j = 0; j < segmentsV; j++) {
          let first = i * (segmentsV + 1) + j;
          let second = first + segmentsV + 1;
          indices.push(first, second, first + 1);
          indices.push(second, second + 1, first + 1);
        }
      }
      let customMesh = new BABYLON.Mesh("hyperboloid", scene);
      let vertexData = new BABYLON.VertexData();
      vertexData.positions = positions;
      vertexData.indices = indices;
      vertexData.uvs = uvs;
      let normals = [];
      BABYLON.VertexData.ComputeNormals(positions, indices, normals);
      vertexData.normals = normals;
      vertexData.applyToMesh(customMesh);
      return customMesh;
    }
    // --- END Hyperboloid Function ---

    // --- FUNCTION: Create a Custom Shape from User Input ---
    function createCustomShape() {
      let vertices = prompt("Enter vertices as a JSON array (e.g., [0,0,0, 1,0,0, 1,1,0, 0,1,0]):", "[0,0,0,1,0,0,1,1,0,0,1,0]");
      let indices = prompt("Enter indices as a JSON array (e.g., [0,1,2, 0,2,3]):", "[0,1,2,0,2,3]");
      try {
        vertices = JSON.parse(vertices);
        indices = JSON.parse(indices);
      } catch (e) {
        alert("Invalid JSON format. Please try again.");
        return null;
      }
      let customMesh = new BABYLON.Mesh("custom", scene);
      let vertexData = new BABYLON.VertexData();
      vertexData.positions = vertices;
      vertexData.indices = indices;
      let normals = [];
      BABYLON.VertexData.ComputeNormals(vertices, indices, normals);
      vertexData.normals = normals;
      vertexData.applyToMesh(customMesh);
      return customMesh;
    }
    // --- END Custom Shape Function ---

    // --- FUNCTION: Create Shape Based on Type ---
    function createShape(shapeType) {
      if (currentFigure) {
        currentFigure.dispose();
        currentFigure = null;
      }
      const material = new BABYLON.StandardMaterial("mat", scene);
      const colorValue = document.getElementById("colorPicker").value;
      material.diffuseColor = BABYLON.Color3.FromHexString(colorValue);
      switch (shapeType) {
        case "cube":
          currentFigure = BABYLON.MeshBuilder.CreateBox("cube", { size: 2 }, scene);
          break;
        case "sphere":
          currentFigure = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
          break;
        case "cylinder":
          currentFigure = BABYLON.MeshBuilder.CreateCylinder("cylinder", { height: 2, diameter: 2, tessellation: 32 }, scene);
          break;
        case "torus":
          currentFigure = BABYLON.MeshBuilder.CreateTorus("torus", { diameter: 2, thickness: 0.5, tessellation: 32 }, scene);
          break;
        case "cone":
          currentFigure = BABYLON.MeshBuilder.CreateCylinder("cone", { height: 2, diameterTop: 0, diameterBottom: 2, tessellation: 32 }, scene);
          break;
        case "tetrahedron":
          currentFigure = BABYLON.MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: 2 }, scene);
          break;
        case "octahedron":
          currentFigure = BABYLON.MeshBuilder.CreatePolyhedron("octahedron", { type: 2, size: 2 }, scene);
          break;
        case "dodecahedron":
          currentFigure = BABYLON.MeshBuilder.CreatePolyhedron("dodecahedron", { type: 3, size: 2 }, scene);
          break;
        case "icosahedron":
          currentFigure = BABYLON.MeshBuilder.CreatePolyhedron("icosahedron", { type: 4, size: 2 }, scene);
          break;
        case "ellipsoid":
          currentFigure = BABYLON.MeshBuilder.CreateSphere("ellipsoid", { diameter: 2, segments: 32 }, scene);
          currentFigure.scaling = new BABYLON.Vector3(1.5, 1, 0.75);
          break;
        case "pyramid":
          currentFigure = BABYLON.MeshBuilder.CreateCylinder("pyramid", { height: 2, diameterTop: 0, diameterBottom: 2, tessellation: 4 }, scene);
          break;
        case "prism":
          currentFigure = BABYLON.MeshBuilder.CreateCylinder("prism", { height: 2, diameter: 2, tessellation: 3 }, scene);
          break;
        case "hyperboloid":
          currentFigure = createHyperboloid();
          break;
        case "knot":
          currentFigure = BABYLON.MeshBuilder.CreateTorusKnot("knot", { radius: 1.5, tube: 0.4, radialSegments: 32, tubularSegments: 100 }, scene);
          break;
        case "custom":
          currentFigure = createCustomShape();
          if (!currentFigure) return;
          break;
        default:
          console.error("Unknown shape type: " + shapeType);
          return;
      }
      if (currentFigure) {
        currentFigure.material = material;
        currentFigure.position = BABYLON.Vector3.Zero();
        currentBaseScale = currentFigure.scaling.clone();
        // Reset translation sliders.
        document.getElementById("translateXSlider").value = 0;
        document.getElementById("translateYSlider").value = 0;
        document.getElementById("translateZSlider").value = 0;
        document.getElementById("translateXValue").textContent = "0.0";
        document.getElementById("translateYValue").textContent = "0.0";
        document.getElementById("translateZValue").textContent = "0.0";
        updateInfoPanel(shapeType);
      }
    }
    // --- END Create Shape Function ---

    // --- Update Educational Info Panel ---
    function updateInfoPanel(shapeType) {
      const infoPanel = document.getElementById("infoPanel");
      const infoText = geometryInfo[shapeType] || "No information available.";
      infoPanel.textContent = infoText;
    }
    // --- END Info Panel Update ---

    // --- SHAPE MENU EVENT LISTENERS ---
    const shapeButtons = document.querySelectorAll("#menu button");
    shapeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const shapeType = btn.getAttribute("data-shape");
        createShape(shapeType);
        document.getElementById("scaleSlider").value = 1;
        document.getElementById("scaleValue").textContent = "1.00";
      });
    });
    // --- END Shape Menu LISTENERS ---

    // --- Update Object Color ---
    document.getElementById("colorPicker").addEventListener("input", function () {
      if (currentFigure && currentFigure.material) {
        currentFigure.material.diffuseColor = BABYLON.Color3.FromHexString(this.value);
      }
    });
    // --- END Color Control ---

    // --- SCALE CONTROL ---
    document.getElementById("scaleSlider").addEventListener("input", function () {
      const scaleVal = parseFloat(this.value);
      document.getElementById("scaleValue").textContent = scaleVal.toFixed(2);
      if (currentFigure) {
        currentFigure.scaling = currentBaseScale.multiplyByFloats(scaleVal, scaleVal, scaleVal);
      }
    });
    // --- END Scale Control ---

    // --- LIGHTING CONTROL ---
    document.getElementById("lightIntensitySlider").addEventListener("input", function () {
      const intensity = parseFloat(this.value);
      document.getElementById("lightIntensityValue").textContent = intensity.toFixed(2);
      if (hemisphereLight) {
        hemisphereLight.intensity = intensity;
      }
    });
    document.getElementById("lightColorPicker").addEventListener("input", function () {
      const hex = this.value;
      if (hemisphereLight) {
        hemisphereLight.diffuse = BABYLON.Color3.FromHexString(hex);
      }
    });
    // --- END Lighting Control ---

    // --- MATERIAL EDITOR CONTROL ---
    document.getElementById("specularPowerSlider").addEventListener("input", function () {
      const sp = parseFloat(this.value);
      document.getElementById("specularPowerValue").textContent = sp;
      if (currentFigure && currentFigure.material) {
        currentFigure.material.specularPower = sp;
      }
    });
    document.getElementById("specularColorPicker").addEventListener("input", function () {
      const hex = this.value;
      if (currentFigure && currentFigure.material) {
        currentFigure.material.specularColor = BABYLON.Color3.FromHexString(hex);
      }
    });
    document.getElementById("emissiveColorPicker").addEventListener("input", function () {
      const hex = this.value;
      if (currentFigure && currentFigure.material) {
        currentFigure.material.emissiveColor = BABYLON.Color3.FromHexString(hex);
      }
    });
    // --- END Material Editor Control ---

    // --- ANIMATION CONTROL ---
    document.getElementById("autoRotateCheckbox").addEventListener("change", function () {
      autoRotate = this.checked;
    });
    document.getElementById("rotationSpeedSlider").addEventListener("input", function () {
      rotationSpeed = parseFloat(this.value);
      document.getElementById("rotationSpeedValue").textContent = rotationSpeed.toFixed(3);
    });
    // --- END Animation Control ---

    // --- CAMERA CONTROL ---
    document.getElementById("cameraAlphaSlider").addEventListener("input", function () {
      arcCamera.alpha = parseFloat(this.value);
      document.getElementById("cameraAlphaValue").textContent = parseFloat(this.value).toFixed(2);
    });
    document.getElementById("cameraBetaSlider").addEventListener("input", function () {
      arcCamera.beta = parseFloat(this.value);
      document.getElementById("cameraBetaValue").textContent = parseFloat(this.value).toFixed(2);
    });
    document.getElementById("cameraRadiusSlider").addEventListener("input", function () {
      arcCamera.radius = parseFloat(this.value);
      document.getElementById("cameraRadiusValue").textContent = parseFloat(this.value).toFixed(1);
    });
    // --- END Camera Control ---

    // --- PRESET PANEL ---
    const presets = {
      default: {
        shape: "cube",
        objectColor: "#ff0000",
        scale: 1,
        lightIntensity: 0.8,
        lightColor: "#ffffff",
        specularPower: 64,
        specularColor: "#ffffff",
        emissiveColor: "#000000",
        cameraAlpha: Math.PI / 2,
        cameraBeta: Math.PI / 3,
        cameraRadius: 10,
        translation: { x: 0, y: 0, z: 0 },
      },
      night: {
        shape: "cube",
        objectColor: "#4444ff",
        scale: 1,
        lightIntensity: 0.3,
        lightColor: "#888888",
        specularPower: 10,
        specularColor: "#222222",
        emissiveColor: "#111111",
        cameraAlpha: Math.PI / 2,
        cameraBeta: Math.PI / 4,
        cameraRadius: 12,
        translation: { x: 0, y: 0, z: 0 },
      },
      bright: {
        shape: "sphere",
        objectColor: "#ffff00",
        scale: 1.5,
        lightIntensity: 1.5,
        lightColor: "#ffffff",
        specularPower: 80,
        specularColor: "#ffffff",
        emissiveColor: "#000000",
        cameraAlpha: Math.PI / 3,
        cameraBeta: Math.PI / 4,
        cameraRadius: 8,
        translation: { x: 0, y: 0, z: 0 },
      },
      warm: {
        shape: "pyramid",
        objectColor: "#ff8800",
        scale: 1,
        lightIntensity: 1.0,
        lightColor: "#ffcc99",
        specularPower: 50,
        specularColor: "#ffaa66",
        emissiveColor: "#331100",
        cameraAlpha: Math.PI / 2,
        cameraBeta: Math.PI / 3,
        cameraRadius: 10,
        translation: { x: 0, y: 0, z: 0 },
      },
    };
    document.querySelectorAll("#presetPanel button").forEach((btn) => {
      btn.addEventListener("click", function () {
        const presetName = btn.getAttribute("data-preset");
        const preset = presets[presetName];
        // Update shape and all parameters using preset values.
        createShape(preset.shape);
        document.getElementById("colorPicker").value = preset.objectColor;
        if (currentFigure && currentFigure.material) {
          currentFigure.material.diffuseColor = BABYLON.Color3.FromHexString(preset.objectColor);
        }
        document.getElementById("scaleSlider").value = preset.scale;
        document.getElementById("scaleValue").textContent = preset.scale.toFixed(2);
        if (currentFigure) {
          currentFigure.scaling = currentBaseScale.multiplyByFloats(preset.scale, preset.scale, preset.scale);
        }
        document.getElementById("lightIntensitySlider").value = preset.lightIntensity;
        document.getElementById("lightIntensityValue").textContent = preset.lightIntensity.toFixed(2);
        if (hemisphereLight) {
          hemisphereLight.intensity = preset.lightIntensity;
        }
        document.getElementById("lightColorPicker").value = preset.lightColor;
        if (hemisphereLight) {
          hemisphereLight.diffuse = BABYLON.Color3.FromHexString(preset.lightColor);
        }
        document.getElementById("specularPowerSlider").value = preset.specularPower;
        document.getElementById("specularPowerValue").textContent = preset.specularPower;
        if (currentFigure && currentFigure.material) {
          currentFigure.material.specularPower = preset.specularPower;
        }
        document.getElementById("specularColorPicker").value = preset.specularColor;
        if (currentFigure && currentFigure.material) {
          currentFigure.material.specularColor = BABYLON.Color3.FromHexString(preset.specularColor);
        }
        document.getElementById("emissiveColorPicker").value = preset.emissiveColor;
        if (currentFigure && currentFigure.material) {
          currentFigure.material.emissiveColor = BABYLON.Color3.FromHexString(preset.emissiveColor);
        }
        arcCamera.alpha = preset.cameraAlpha;
        document.getElementById("cameraAlphaSlider").value = preset.cameraAlpha;
        document.getElementById("cameraAlphaValue").textContent = preset.cameraAlpha.toFixed(2);
        arcCamera.beta = preset.cameraBeta;
        document.getElementById("cameraBetaSlider").value = preset.cameraBeta;
        document.getElementById("cameraBetaValue").textContent = preset.cameraBeta.toFixed(2);
        arcCamera.radius = preset.cameraRadius;
        document.getElementById("cameraRadiusSlider").value = preset.cameraRadius;
        document.getElementById("cameraRadiusValue").textContent = preset.cameraRadius.toFixed(1);
        // For translation, reset sliders and update position.
        document.getElementById("translateXSlider").value = preset.translation.x;
        document.getElementById("translateYSlider").value = preset.translation.y;
        document.getElementById("translateZSlider").value = preset.translation.z;
        document.getElementById("translateXValue").textContent = preset.translation.x.toFixed(1);
        document.getElementById("translateYValue").textContent = preset.translation.y.toFixed(1);
        document.getElementById("translateZValue").textContent = preset.translation.z.toFixed(1);
        if (currentFigure) {
          currentFigure.position.x = preset.translation.x;
          currentFigure.position.y = preset.translation.y;
          currentFigure.position.z = preset.translation.z;
        }
      });
    });
    // --- END Preset Panel ---

    // --- IMPORT PANEL ---
    document.getElementById("importFileInput").addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (!file) return;
      const fileURL = URL.createObjectURL(file);
      // Use SceneLoader.ImportMesh with an empty mesh name and container URL.
      BABYLON.SceneLoader.ImportMesh(
        "",
        "",
        fileURL,
        scene,
        function (meshes, particleSystems, skeletons) {
          // Merge meshes if more than one.
          if (meshes.length > 1) {
            currentFigure = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false);
          } else {
            currentFigure = meshes[0];
          }
          if (currentFigure) {
            // Apply a new standard material with the chosen object color.
            const material = new BABYLON.StandardMaterial("mat", scene);
            const colorValue = document.getElementById("colorPicker").value;
            material.diffuseColor = BABYLON.Color3.FromHexString(colorValue);
            currentFigure.material = material;
            currentFigure.position = BABYLON.Vector3.Zero();
            currentBaseScale = currentFigure.scaling.clone();
            // Reset translation sliders.
            document.getElementById("translateXSlider").value = 0;
            document.getElementById("translateYSlider").value = 0;
            document.getElementById("translateZSlider").value = 0;
            document.getElementById("translateXValue").textContent = "0.0";
            document.getElementById("translateYValue").textContent = "0.0";
            document.getElementById("translateZValue").textContent = "0.0";
            // Update info panel.
            updateInfoPanel("custom");
          }
          // Revoke object URL.
          URL.revokeObjectURL(fileURL);
        }
      );
    });
    // --- END Import Panel ---

    // --- TRANSLATION PANEL ---
    const translateXSlider = document.getElementById("translateXSlider");
    const translateYSlider = document.getElementById("translateYSlider");
    const translateZSlider = document.getElementById("translateZSlider");
    translateXSlider.addEventListener("input", function () {
      const val = parseFloat(this.value);
      document.getElementById("translateXValue").textContent = val.toFixed(1);
      if (currentFigure) {
        currentFigure.position.x = val;
      }
    });
    translateYSlider.addEventListener("input", function () {
      const val = parseFloat(this.value);
      document.getElementById("translateYValue").textContent = val.toFixed(1);
      if (currentFigure) {
        currentFigure.position.y = val;
      }
    });
    translateZSlider.addEventListener("input", function () {
      const val = parseFloat(this.value);
      document.getElementById("translateZValue").textContent = val.toFixed(1);
      if (currentFigure) {
        currentFigure.position.z = val;
      }
    });
    // --- END Translation Panel ---

    // --- RENDER LOOP ---
    engine.runRenderLoop(() => {
      if (autoRotate && currentFigure) {
        currentFigure.rotation.y += rotationSpeed;
      }
      scene.render();
    });
    window.addEventListener("resize", () => {
      engine.resize();
    });
