// WebGL
let canvas: HTMLCanvasElement;
let gl: WebGLRenderingContext;
let program: WebGLProgram;
let animating: boolean;

// Data
let vPosition: number[][];
let vNormal: number[][];
let materialDiffuse: number[][];
let materialSpecular: number[][];
let offset: number[];
let objectLength: number[];
let lightPosition = [3, 5, 0, 1];
let lightAmbient = [0.3, 0.3, 0.3, 1];
let lightDiffuse = [1, 1, 1, 1];
let lightSpecular = [1, 1, 1, 1];

// Controls
let lightAmbientInput: HTMLInputElement;
let lightDiffuseInput: HTMLInputElement;
let lightSpecularInput: HTMLInputElement;
let skyBoxCheckbox: HTMLInputElement;
let reflectionCheckbox: HTMLInputElement;
let refractionCheckbox: HTMLInputElement;
let shadowsCheckbox: HTMLInputElement;
let camAnimationCheckbox: HTMLInputElement;
let pointLightCheckbox: HTMLInputElement;
let invertCheckbox: HTMLInputElement;
let phongCheckbox: HTMLInputElement;
let animationSpeed: HTMLInputElement;

// File
let objUpload: HTMLInputElement;
let mtlUpload: HTMLInputElement;
let modelObj = "";
let modelMtl = "";

// Animation: Degree to rotate camera about the Y axis
let camDegree = 0;
// Animation: Amount to bounce up or down
let variance = 0;
// Animation: variance direction
let varianceDir = true;

// Initialize
window.onload = async function () {
	canvas = <HTMLCanvasElement>document.getElementById("webgl");
	animationSpeed = <HTMLInputElement>document.getElementById("animationSpeed");
	skyBoxCheckbox = <HTMLInputElement>document.getElementById("skyBoxCheckbox");
	reflectionCheckbox = <HTMLInputElement>document.getElementById("reflectionCheckbox");
	refractionCheckbox = <HTMLInputElement>document.getElementById("refractionCheckbox");
	shadowsCheckbox = <HTMLInputElement>document.getElementById("shadowsCheckbox");
	camAnimationCheckbox = <HTMLInputElement>document.getElementById("camAnimationCheckbox");
	pointLightCheckbox = <HTMLInputElement>document.getElementById("pointLightCheckbox");
	invertCheckbox = <HTMLInputElement>document.getElementById("invertCheckbox");
	phongCheckbox = <HTMLInputElement>document.getElementById("phongCheckbox");
	lightAmbientInput = <HTMLInputElement>document.getElementById("lightAmbient");
	lightDiffuseInput = <HTMLInputElement>document.getElementById("lightDiffuse");
	lightSpecularInput = <HTMLInputElement>document.getElementById("lightSpecular");
	objUpload = <HTMLInputElement>document.getElementById("objUpload");
	mtlUpload = <HTMLInputElement>document.getElementById("mtlUpload");

	// Listens for lightAmbient input and change colors
	lightAmbientInput.oninput = function () {
		if (lightAmbientInput.value == null || lightAmbientInput.value == "") {
			lightAmbient = [0.1, 0.1, 0.1, 1];
		} else {
			lightAmbient[0] = parseInt(lightAmbientInput.value.substr(1, 2), 16) / 255;
			lightAmbient[1] = parseInt(lightAmbientInput.value.substr(3, 2), 16) / 255;
			lightAmbient[2] = parseInt(lightAmbientInput.value.substr(5, 2), 16) / 255;
		}
		shaderChange();
	}

	// Listens for lightDiffuse input and change colors
	lightDiffuseInput.oninput = function () {
		if (lightDiffuseInput.value == null || lightDiffuseInput.value == "") {
			lightDiffuse = [1, 1, 1, 1];
		} else {
			lightDiffuse[0] = parseInt(lightDiffuseInput.value.substr(1, 2), 16) / 255;
			lightDiffuse[1] = parseInt(lightDiffuseInput.value.substr(3, 2), 16) / 255;
			lightDiffuse[2] = parseInt(lightDiffuseInput.value.substr(5, 2), 16) / 255;
		}
		shaderChange();
	}

	// Listens for lightSpecular input and change colors
	lightSpecularInput.oninput = function () {
		if (lightSpecularInput.value == null || lightSpecularInput.value == "") {
			lightSpecular = [1, 1, 1, 1];
		} else {
			lightSpecular[0] = parseInt(lightSpecularInput.value.substr(1, 2), 16) / 255;
			lightSpecular[1] = parseInt(lightSpecularInput.value.substr(3, 2), 16) / 255;
			lightSpecular[2] = parseInt(lightSpecularInput.value.substr(5, 2), 16) / 255;
		}
		shaderChange();
	}

	// Listens for obj file upload and load file
	objUpload.onchange = await async function () {
		// @ts-ignore
		const files = this.files;
		if (files.length === 0) {
			console.log('No file is selected');
			return;
		}

		const reader = new FileReader();
		reader.onload = await async function (event) {
			// @ts-ignore
			modelObj = event.target.result;
			// @ts-ignore
			console.log(event.target.result);
			await readIn();
		};
		reader.readAsText(files[0]);
	}

	// Listens for mtl file upload and load file
	mtlUpload.onchange = await async function () {
		// @ts-ignore
		const files = this.files;
		if (files.length === 0) {
			console.log('No file is selected');
			return;
		}

		const reader = new FileReader();
		reader.onload = await async function (event) {
			// @ts-ignore
			modelMtl = event.target.result;
			// @ts-ignore
			console.log(event.target.result);
			await readIn();
		};
		reader.readAsText(files[0]);
	}

	gl = WebGLUtils.setupWebGL(canvas, null);
	if (!gl) alert("WebGL isn't available");

	gl.viewport(0, 0, canvas.width, canvas.height);

	gl.enable(gl.DEPTH_TEST);

	await download("car")
}

async function download(name: string, offsetR: number[] = [0, 0, 0]) {
	const mtlXMLHttp = new XMLHttpRequest();
	mtlXMLHttp.onreadystatechange = function () {
		if (mtlXMLHttp.readyState == 4 && mtlXMLHttp.status == 200) {
			modelMtl = mtlXMLHttp.responseText;
		}
	}
	mtlXMLHttp.open("GET", "resources/" + name +".mtl", false);
	mtlXMLHttp.send();

	const objXMLHttp = new XMLHttpRequest();
	objXMLHttp.onreadystatechange = function () {
		if (objXMLHttp.readyState == 4 && objXMLHttp.status == 200) {
			modelObj = objXMLHttp.responseText;
		}
	}
	objXMLHttp.open("GET", "resources/" + name + ".obj", false);
	objXMLHttp.send();

	offset = offsetR;

	console.log("Download Success")

	await readIn();
}

// Reads the obj files in
async function readIn() {
	if (invertCheckbox.checked) gl.clearColor(1, 1, 1, 1);
	else gl.clearColor(0, 0, 0, 1);
	// Get info from link
	// - Read .mtl before .obj
	// - Keep temporary list of materials for the object
	// - Read object in order
	// - Add to list of vPosition, vNormal and shading stuff
	// - When encounter more than 3 vertices in a face, use fan triangulation
	vPosition = [];
	vNormal = [];
	materialDiffuse = [];
	materialSpecular = [];
	objectLength = [];

	const offsetR = offset;
	offset = [0, 0, 0];

	// Ground
	vPosition.push([20, -0.001, 20, 1]);
	vPosition.push([-20, -0.001, 20, 1]);
	vPosition.push([-20, -0.001, -20, 1]);
	vPosition.push([-20, -0.001, -20, 1]);
	vPosition.push([20, -0.001, -20, 1]);
	vPosition.push([20, -0.001, 20, 1]);
	for (let i = 0; i < 6; i++) {
		vNormal.push([1, 0, 1, 0]);
		materialDiffuse.push([0.5, 0.5, 0.5, 0]);
	}
	materialSpecular.push([1, 0, 0, 0]);
	materialSpecular.push([0, 1, 0, 0]);
	materialSpecular.push([0, 0, 1, 0]);
	materialSpecular.push([0, 0, 1, 0]);
	materialSpecular.push([0, 1, 0, 0]);
	materialSpecular.push([1, 0, 0, 0]);
	objectLength.push(vPosition.length);


	offset = offsetR;
	await parseObjectString(modelObj, modelMtl);
	objectLength.push(vPosition.length);

	shaderChange();
}

// Uses a file name to fetch and parse .obj files and it's corresponding .mtl files
async function parseObjectString(obj: string, mtl: string) {
	// if (modelObj === "" || modelMtl === "") return
	let listOfMaterials: any[] = [];

	let newmtls = mtl.split('newmtl');
	for (let mtlIndex = 1; mtlIndex < newmtls.length; mtlIndex++) {
		// Create material
		let material: any[] = [];
		material.push(["notMe"]); // material[0] = name
		material.push([1, 0, 1, 1]); // material[1] = diffuseColors
		material.push([1, 1, 1, 1]); // material[2] = specularColors

		// Add name
		let thisMtl = newmtls[mtlIndex];
		let lines = thisMtl.split('\n');
		material[0] = lines[0].split(" ")[1];

		// Parse material
		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			let thisLine = lines[lineIndex];
			let segs = thisLine.split(" ");
			switch (segs[0]) {
				case "Kd":
					if (invertCheckbox.checked) material[1] = [1 - +segs[1], 1 - +segs[2], 1 - +segs[3], 1];
					else material[1] = [+segs[1], +segs[2], +segs[3], 1];
					break;
				case "Ks":
					if (invertCheckbox.checked) material[2] = [+segs[1], +segs[2], +segs[3], 1];
					else material[2] = [1 - +segs[1], 1 - +segs[2], 1 - +segs[3], 1];
					break;
				default:
					break;
			}
		}
		listOfMaterials.push(material);
	}


	// List of data
	let vertices: number[][] = [];
	let vertexNormals: number[][] = [];

	// Initialize for 1-index
	vertices.push([0, 0, 0, 0]);
	vertexNormals.push([0, 0, 0, 0]);

	// goes to default material (purple)
	let currentMtl: any[] = [];
	currentMtl.push(["notMe"]);    // material[0] = name
	currentMtl.push([0.3, 0.3, 0.3, 1]); // material[1] = diffuseColors
	currentMtl.push([1, 1, 1, 1]); // material[2] = specularColors

	let lines = obj.split('\n');
	lines.forEach(function (value, index) {
		let segs = value.split(" ");
		switch (segs[0]) {
			case "v":
				vertices.push([+segs[1] + offset[0], +segs[2] + offset[1], +segs[3] + offset[2], 1]);
				break;
			case "vn":
				vertexNormals.push([+segs[1], +segs[2], +segs[3], 0]);
				break;
			case "usemtl":
				if (segs[1] != currentMtl[0]) listOfMaterials.forEach(function (value) {
					if (segs[1] == value[0]) currentMtl = value;
				});
				break;
			case "f":
				// Handles if a face needs to be fan triangulated
				for (let i = 3; i < segs.length; i++) {
					vPosition.push(vertices[+segs[1].split("/")[0]]);
					vPosition.push(vertices[+segs[i - 1].split("/")[0]]);
					vPosition.push(vertices[+segs[i].split("/")[0]]);

					vNormal.push(vertexNormals[+segs[1].split("/")[2]]);
					vNormal.push(vertexNormals[+segs[i - 1].split("/")[2]]);
					vNormal.push(vertexNormals[+segs[i].split("/")[2]]);

					materialDiffuse.push(currentMtl[1]);
					materialDiffuse.push(currentMtl[1]);
					materialDiffuse.push(currentMtl[1]);

					materialSpecular.push(currentMtl[2]);
					materialSpecular.push(currentMtl[2]);
					materialSpecular.push(currentMtl[2]);
				}
				break;
			default:
				break;
		}
	});
}

// switch lighting modes
function shaderChange() {
	if (phongCheckbox.checked) program = initShaders(gl, "vShaderPhong", "fShaderPhong");
	else program = initShaders(gl, "vShaderGouraud", "fShaderGouraud");

	gl.useProgram(program);

	// vPosition
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vPosition), gl.STATIC_DRAW);
	const vPositionPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPositionPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPositionPosition);

	// vNormal
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vNormal), gl.STATIC_DRAW);
	const vNormalPosition = gl.getAttribLocation(program, "vNormal");
	gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vNormalPosition);

	// materialDiffuse
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(materialDiffuse), gl.STATIC_DRAW);
	const materialDiffusePosition = gl.getAttribLocation(program, "materialDiffuse");
	gl.vertexAttribPointer(materialDiffusePosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(materialDiffusePosition);

	// materialSpecular
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(materialSpecular), gl.STATIC_DRAW);
	const materialSpecularPosition = gl.getAttribLocation(program, "materialSpecular");
	gl.vertexAttribPointer(materialSpecularPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(materialSpecularPosition);

	// Light Calculation
	gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), lightPosition);
	gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), lightAmbient);
	gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), lightDiffuse);
	gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), lightSpecular);
	gl.uniform1f(gl.getUniformLocation(program, "shininess"), 20);

	if (!animating) render();
}

// Animation
function render() {
	document.getElementById("camAnimationDegree")!.innerText = String(camDegree.toFixed(1));
	document.getElementById("camAnimationVariance")!.innerText = String(variance.toFixed(3));

	let cameraDistance = +(<HTMLInputElement>document.getElementById("cameraDistance")).value;
	if (cameraDistance !== 0) {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Toggle point light
		if (pointLightCheckbox.checked)
			gl.uniform1f(gl.getUniformLocation(program, "lightOn"), 1);
		else gl.uniform1f(gl.getUniformLocation(program, "lightOn"), 0);

		// Projection Matrix
		gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(perspective(
			(<HTMLInputElement>document.getElementById("fieldOfViewY")).value, canvas.width / canvas.height, 0.1,
			(<HTMLInputElement>document.getElementById("perspectiveFar")).value)));

		let mvMatrix;
		// Spectator View
		let sin = Math.sin(radians(camDegree));
		let cos = Math.cos(radians(camDegree));
		mvMatrix = lookAt(mult(mat3(cos, 0, sin, 0, 1, 0, -sin, 0, cos),
			[cameraDistance, variance + 5, cameraDistance]), [0, 0, 0], [0, 1, 0]);

		// Draw triangles
		gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(mvMatrix));
		gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelMatrix"), false, flatten(mvMatrix));
		gl.drawArrays(gl.TRIANGLES, 0, objectLength[0] + objectLength[1]);
		gl.uniform1f(gl.getUniformLocation(program, "reflection"), 0);

		// Draw Shadows
		if (shadowsCheckbox.checked && pointLightCheckbox.checked) {
			let m = mat4();
			m[3][3] = 0;
			m[3][1] = -1 / lightPosition[1];
			const shadowModelMatrix = mult(mult(translate(lightPosition[0], lightPosition[1], lightPosition[2]), m), translate(-lightPosition[0], -lightPosition[1], -lightPosition[2]));
			gl.uniform1f(gl.getUniformLocation(program, "lightOn"), 0);

			// Shadows
			gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(mult(mvMatrix, shadowModelMatrix)));
			gl.drawArrays(gl.TRIANGLES, objectLength[0], objectLength[1]);
		}
	}

	// Animation based on rendering ticks: (not relative to time, progresses one step per frame)
	if (camAnimationCheckbox.checked) {
		// Cam Degree
		camDegree += +animationSpeed.value / 10;
		if (camDegree > 359) camDegree -= 360;
		// Cam Variance
		if (variance > 3) varianceDir = false;
		else if (variance < -3) varianceDir = true;
		// Cam Variance Direction
		if (varianceDir) variance += 3 * (+animationSpeed.value / 360);
		else variance -= 3 * (+animationSpeed.value / 360);

		animating = true;
		requestAnimationFrame(render);
	} else animating = false;
}

// Keyboard Shortcuts
window.onkeypress = function (event: { key: any; }) {
	switch (event.key) {
		// Toggle Shadows
		case "S":
		case "s":
			shadowsCheckbox.checked = !shadowsCheckbox.checked;
			if (!animating) render();
			break;
		// Toggle point light
		case "D":
		case "d":
			pointLightCheckbox.checked = !pointLightCheckbox.checked;
			if (!animating) render();
			break;
		// Toggle between Gouraud shading and Phong shading
		case "Q":
		case "q":
			phongCheckbox.checked = !phongCheckbox.checked;
			shaderChange();
			break;
		// Toggle X-Ray
		case "X":
		case "x":
			invertCheckbox.checked = !invertCheckbox.checked;
			readIn();
			break;
		// Toggle Animation
		case "A":
		case "a":
			camAnimationCheckbox.checked = !camAnimationCheckbox.checked;
			if (!animating) render();
			break;
		// Change animation speed with numbers
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
		case "6":
		case "7":
		case "8":
		case "9":
			animationSpeed.value = event.key;
			break;
		case "0":
			animationSpeed.value = "10";
			break;
		// Super Reset
		case "R":
		case "r":
			(<HTMLInputElement>document.getElementById("fieldOfViewY")).value = "50";
			(<HTMLInputElement>document.getElementById("cameraDistance")).value = "7";
			(<HTMLInputElement>document.getElementById("perspectiveFar")).value = "30";
			(<HTMLInputElement>document.getElementById("lightX")).value = "3";
			(<HTMLInputElement>document.getElementById("lightY")).value = "5";
			(<HTMLInputElement>document.getElementById("lightZ")).value = "0";
			lightPosition = [3, 5, 0, 1];
			lightAmbient = [0.3, 0.3, 0.3, 1];
			lightDiffuse = [1, 1, 1, 1];
			lightSpecular = [1, 1, 1, 1];
			shadowsCheckbox.checked = false;
			camAnimationCheckbox.checked = false;
			pointLightCheckbox.checked = true;
			phongCheckbox.checked = false;
			invertCheckbox.checked = false;
			animationSpeed.value = "1";
			camDegree = 0;
			variance = 0;
			varianceDir = true;
			readIn();
			break;
		default:
			break;
	}
}
