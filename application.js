"use strict";
// WebGL
let canvas;
let gl;
let program;
let animating;
// Data
let vPosition;
let vNormal;
let materialDiffuse;
let materialSpecular;
let offset;
let objectLength;
let lightPosition = [3, 5, 0, 1];
let lightAmbient = [0.3, 0.3, 0.3, 1];
let lightDiffuse = [1, 1, 1, 1];
let lightSpecular = [1, 1, 1, 1];
// Controls
let lightAmbientInput;
let lightDiffuseInput;
let lightSpecularInput;
let skyBoxCheckbox;
let reflectionCheckbox;
let refractionCheckbox;
let shadowsCheckbox;
let camAnimationCheckbox;
let pointLightCheckbox;
let invertCheckbox;
let phongCheckbox;
let animationSpeed;
// File
let objUpload;
let mtlUpload;
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
    canvas = document.getElementById("webgl");
    animationSpeed = document.getElementById("animationSpeed");
    skyBoxCheckbox = document.getElementById("skyBoxCheckbox");
    reflectionCheckbox = document.getElementById("reflectionCheckbox");
    refractionCheckbox = document.getElementById("refractionCheckbox");
    shadowsCheckbox = document.getElementById("shadowsCheckbox");
    camAnimationCheckbox = document.getElementById("camAnimationCheckbox");
    pointLightCheckbox = document.getElementById("pointLightCheckbox");
    invertCheckbox = document.getElementById("invertCheckbox");
    phongCheckbox = document.getElementById("phongCheckbox");
    lightAmbientInput = document.getElementById("lightAmbient");
    lightDiffuseInput = document.getElementById("lightDiffuse");
    lightSpecularInput = document.getElementById("lightSpecular");
    objUpload = document.getElementById("objUpload");
    mtlUpload = document.getElementById("mtlUpload");
    // Listens for lightAmbient input and change colors
    lightAmbientInput.oninput = function () {
        if (lightAmbientInput.value == null || lightAmbientInput.value == "") {
            lightAmbient = [0.1, 0.1, 0.1, 1];
        }
        else {
            lightAmbient[0] = parseInt(lightAmbientInput.value.substr(1, 2), 16) / 255;
            lightAmbient[1] = parseInt(lightAmbientInput.value.substr(3, 2), 16) / 255;
            lightAmbient[2] = parseInt(lightAmbientInput.value.substr(5, 2), 16) / 255;
        }
        shaderChange();
    };
    // Listens for lightDiffuse input and change colors
    lightDiffuseInput.oninput = function () {
        if (lightDiffuseInput.value == null || lightDiffuseInput.value == "") {
            lightDiffuse = [1, 1, 1, 1];
        }
        else {
            lightDiffuse[0] = parseInt(lightDiffuseInput.value.substr(1, 2), 16) / 255;
            lightDiffuse[1] = parseInt(lightDiffuseInput.value.substr(3, 2), 16) / 255;
            lightDiffuse[2] = parseInt(lightDiffuseInput.value.substr(5, 2), 16) / 255;
        }
        shaderChange();
    };
    // Listens for lightSpecular input and change colors
    lightSpecularInput.oninput = function () {
        if (lightSpecularInput.value == null || lightSpecularInput.value == "") {
            lightSpecular = [1, 1, 1, 1];
        }
        else {
            lightSpecular[0] = parseInt(lightSpecularInput.value.substr(1, 2), 16) / 255;
            lightSpecular[1] = parseInt(lightSpecularInput.value.substr(3, 2), 16) / 255;
            lightSpecular[2] = parseInt(lightSpecularInput.value.substr(5, 2), 16) / 255;
        }
        shaderChange();
    };
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
    };
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
    };
    gl = WebGLUtils.setupWebGL(canvas, null);
    if (!gl)
        alert("WebGL isn't available");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    await download("car");
};
async function download(name, offsetR = [0, 0, 0]) {
    const mtlXMLHttp = new XMLHttpRequest();
    mtlXMLHttp.onreadystatechange = function () {
        if (mtlXMLHttp.readyState == 4 && mtlXMLHttp.status == 200) {
            modelMtl = mtlXMLHttp.responseText;
        }
    };
    mtlXMLHttp.open("GET", "resources/" + name + ".mtl", false);
    mtlXMLHttp.send();
    const objXMLHttp = new XMLHttpRequest();
    objXMLHttp.onreadystatechange = function () {
        if (objXMLHttp.readyState == 4 && objXMLHttp.status == 200) {
            modelObj = objXMLHttp.responseText;
        }
    };
    objXMLHttp.open("GET", "resources/" + name + ".obj", false);
    objXMLHttp.send();
    offset = offsetR;
    console.log("Download Success");
    await readIn();
}
// Reads the obj files in
async function readIn() {
    if (invertCheckbox.checked)
        gl.clearColor(1, 1, 1, 1);
    else
        gl.clearColor(0, 0, 0, 1);
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
async function parseObjectString(obj, mtl) {
    // if (modelObj === "" || modelMtl === "") return
    let listOfMaterials = [];
    let newmtls = mtl.split('newmtl');
    for (let mtlIndex = 1; mtlIndex < newmtls.length; mtlIndex++) {
        // Create material
        let material = [];
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
                    if (invertCheckbox.checked)
                        material[1] = [1 - +segs[1], 1 - +segs[2], 1 - +segs[3], 1];
                    else
                        material[1] = [+segs[1], +segs[2], +segs[3], 1];
                    break;
                case "Ks":
                    if (invertCheckbox.checked)
                        material[2] = [+segs[1], +segs[2], +segs[3], 1];
                    else
                        material[2] = [1 - +segs[1], 1 - +segs[2], 1 - +segs[3], 1];
                    break;
                default:
                    break;
            }
        }
        listOfMaterials.push(material);
    }
    // List of data
    let vertices = [];
    let vertexNormals = [];
    // Initialize for 1-index
    vertices.push([0, 0, 0, 0]);
    vertexNormals.push([0, 0, 0, 0]);
    // goes to default material (purple)
    let currentMtl = [];
    currentMtl.push(["notMe"]); // material[0] = name
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
                if (segs[1] != currentMtl[0])
                    listOfMaterials.forEach(function (value) {
                        if (segs[1] == value[0])
                            currentMtl = value;
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
    if (phongCheckbox.checked)
        program = initShaders(gl, "vShaderPhong", "fShaderPhong");
    else
        program = initShaders(gl, "vShaderGouraud", "fShaderGouraud");
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
    if (!animating)
        render();
}
// Animation
function render() {
    document.getElementById("camAnimationDegree").innerText = String(camDegree.toFixed(1));
    document.getElementById("camAnimationVariance").innerText = String(variance.toFixed(3));
    let cameraDistance = +document.getElementById("cameraDistance").value;
    if (cameraDistance !== 0) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Toggle point light
        if (pointLightCheckbox.checked)
            gl.uniform1f(gl.getUniformLocation(program, "lightOn"), 1);
        else
            gl.uniform1f(gl.getUniformLocation(program, "lightOn"), 0);
        // Projection Matrix
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(perspective(document.getElementById("fieldOfViewY").value, canvas.width / canvas.height, 0.1, document.getElementById("perspectiveFar").value)));
        let mvMatrix;
        // Spectator View
        let sin = Math.sin(radians(camDegree));
        let cos = Math.cos(radians(camDegree));
        mvMatrix = lookAt(mult(mat3(cos, 0, sin, 0, 1, 0, -sin, 0, cos), [cameraDistance, variance + 5, cameraDistance]), [0, 0, 0], [0, 1, 0]);
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
        if (camDegree > 359)
            camDegree -= 360;
        // Cam Variance
        if (variance > 3)
            varianceDir = false;
        else if (variance < -3)
            varianceDir = true;
        // Cam Variance Direction
        if (varianceDir)
            variance += 3 * (+animationSpeed.value / 360);
        else
            variance -= 3 * (+animationSpeed.value / 360);
        animating = true;
        requestAnimationFrame(render);
    }
    else
        animating = false;
}
// Keyboard Shortcuts
window.onkeypress = function (event) {
    switch (event.key) {
        // Toggle Shadows
        case "S":
        case "s":
            shadowsCheckbox.checked = !shadowsCheckbox.checked;
            if (!animating)
                render();
            break;
        // Toggle point light
        case "D":
        case "d":
            pointLightCheckbox.checked = !pointLightCheckbox.checked;
            if (!animating)
                render();
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
            if (!animating)
                render();
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
            document.getElementById("fieldOfViewY").value = "50";
            document.getElementById("cameraDistance").value = "7";
            document.getElementById("perspectiveFar").value = "30";
            document.getElementById("lightX").value = "3";
            document.getElementById("lightY").value = "5";
            document.getElementById("lightZ").value = "0";
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
};
//////////////////////////////////////////////////////////////////////////////
//
//  Angel.js
//
//////////////////////////////////////////////////////////////////////////////
//----------------------------------------------------------------------------
//
//  Helper functions
//
function _argumentsToArray(args) {
    return [].concat.apply([], Array.prototype.slice.apply(args));
}
//----------------------------------------------------------------------------
function radians(degrees) {
    return degrees * Math.PI / 180.0;
}
//----------------------------------------------------------------------------
//
//  Vector Constructors
//
function vec2() {
    var result = _argumentsToArray(arguments);
    switch (result.length) {
        case 0: result.push(0.0);
        case 1: result.push(0.0);
    }
    return result.splice(0, 2);
}
function vec3() {
    var result = _argumentsToArray(arguments);
    switch (result.length) {
        case 0: result.push(0.0);
        case 1: result.push(0.0);
        case 2: result.push(0.0);
    }
    return result.splice(0, 3);
}
function vec4() {
    var result = _argumentsToArray(arguments);
    switch (result.length) {
        case 0: result.push(0.0);
        case 1: result.push(0.0);
        case 2: result.push(0.0);
        case 3: result.push(1.0);
    }
    return result.splice(0, 4);
}
//----------------------------------------------------------------------------
//
//  Matrix Constructors
//
function mat2() {
    var v = _argumentsToArray(arguments);
    var m = [];
    switch (v.length) {
        case 0:
            v[0] = 1;
        case 1:
            m = [
                vec2(v[0], 0.0),
                vec2(0.0, v[0])
            ];
            break;
        default:
            m.push(vec2(v));
            v.splice(0, 2);
            m.push(vec2(v));
            break;
    }
    m.matrix = true;
    return m;
}
//----------------------------------------------------------------------------
function mat3() {
    var v = _argumentsToArray(arguments);
    var m = [];
    switch (v.length) {
        case 0:
            v[0] = 1;
        case 1:
            m = [
                vec3(v[0], 0.0, 0.0),
                vec3(0.0, v[0], 0.0),
                vec3(0.0, 0.0, v[0])
            ];
            break;
        default:
            m.push(vec3(v));
            v.splice(0, 3);
            m.push(vec3(v));
            v.splice(0, 3);
            m.push(vec3(v));
            break;
    }
    m.matrix = true;
    return m;
}
//----------------------------------------------------------------------------
function mat4() {
    var v = _argumentsToArray(arguments);
    var m = [];
    switch (v.length) {
        case 0:
            v[0] = 1;
        case 1:
            m = [
                vec4(v[0], 0.0, 0.0, 0.0),
                vec4(0.0, v[0], 0.0, 0.0),
                vec4(0.0, 0.0, v[0], 0.0),
                vec4(0.0, 0.0, 0.0, v[0])
            ];
            break;
        default:
            m.push(vec4(v));
            v.splice(0, 4);
            m.push(vec4(v));
            v.splice(0, 4);
            m.push(vec4(v));
            v.splice(0, 4);
            m.push(vec4(v));
            break;
    }
    m.matrix = true;
    return m;
}
//----------------------------------------------------------------------------
//
//  Generic Mathematical Operations for Vectors and Matrices
//
function equal(u, v) {
    if (u.length != v.length) {
        return false;
    }
    if (u.matrix && v.matrix) {
        for (var i = 0; i < u.length; ++i) {
            if (u[i].length != v[i].length) {
                return false;
            }
            for (var j = 0; j < u[i].length; ++j) {
                if (u[i][j] !== v[i][j]) {
                    return false;
                }
            }
        }
    }
    else if (u.matrix && !v.matrix || !u.matrix && v.matrix) {
        return false;
    }
    else {
        for (var i = 0; i < u.length; ++i) {
            if (u[i] !== v[i]) {
                return false;
            }
        }
    }
    return true;
}
//----------------------------------------------------------------------------
function add(u, v) {
    var result = [];
    if (u.matrix && v.matrix) {
        if (u.length != v.length) {
            throw "add(): trying to add matrices of different dimensions";
        }
        for (var i = 0; i < u.length; ++i) {
            if (u[i].length != v[i].length) {
                throw "add(): trying to add matrices of different dimensions";
            }
            result.push([]);
            for (var j = 0; j < u[i].length; ++j) {
                result[i].push(u[i][j] + v[i][j]);
            }
        }
        result.matrix = true;
        return result;
    }
    else if (u.matrix && !v.matrix || !u.matrix && v.matrix) {
        throw "add(): trying to add matrix and non-matrix variables";
    }
    else {
        if (u.length != v.length) {
            throw "add(): vectors are not the same dimension";
        }
        for (var i = 0; i < u.length; ++i) {
            result.push(u[i] + v[i]);
        }
        return result;
    }
}
//----------------------------------------------------------------------------
function subtract(u, v) {
    var result = [];
    if (u.matrix && v.matrix) {
        if (u.length != v.length) {
            throw "subtract(): trying to subtract matrices" +
                " of different dimensions";
        }
        for (var i = 0; i < u.length; ++i) {
            if (u[i].length != v[i].length) {
                throw "subtract(): trying to subtact matrices" +
                    " of different dimensions";
            }
            result.push([]);
            for (var j = 0; j < u[i].length; ++j) {
                result[i].push(u[i][j] - v[i][j]);
            }
        }
        result.matrix = true;
        return result;
    }
    else if (u.matrix && !v.matrix || !u.matrix && v.matrix) {
        throw "subtact(): trying to subtact  matrix and non-matrix variables";
    }
    else {
        if (u.length != v.length) {
            throw "subtract(): vectors are not the same length";
        }
        for (var i = 0; i < u.length; ++i) {
            result.push(u[i] - v[i]);
        }
        return result;
    }
}
//----------------------------------------------------------------------------
function mult(u, v) {
    var result = [];
    if (u.matrix && v.matrix) {
        if (u.length != v.length) {
            throw "mult(): trying to add matrices of different dimensions";
        }
        for (var i = 0; i < u.length; ++i) {
            if (u[i].length != v[i].length) {
                throw "mult(): trying to add matrices of different dimensions";
            }
        }
        for (var i = 0; i < u.length; ++i) {
            result.push([]);
            for (var j = 0; j < v.length; ++j) {
                var sum = 0.0;
                for (var k = 0; k < u.length; ++k) {
                    sum += u[i][k] * v[k][j];
                }
                result[i].push(sum);
            }
        }
        result.matrix = true;
        return result;
    }
    if (u.matrix && (u.length == v.length)) {
        for (var i = 0; i < v.length; i++) {
            var sum = 0.0;
            for (var j = 0; j < v.length; j++) {
                sum += u[i][j] * v[j];
            }
            result.push(sum);
        }
        return result;
    }
    else {
        if (u.length != v.length) {
            throw "mult(): vectors are not the same dimension";
        }
        for (var i = 0; i < u.length; ++i) {
            result.push(u[i] * v[i]);
        }
        return result;
    }
}
//----------------------------------------------------------------------------
//
//  Basic Transformation Matrix Generators
//
function translate(x, y, z) {
    if (Array.isArray(x) && x.length == 3) {
        z = x[2];
        y = x[1];
        x = x[0];
    }
    var result = mat4();
    result[0][3] = x;
    result[1][3] = y;
    result[2][3] = z;
    return result;
}
//----------------------------------------------------------------------------
function rotate(angle, axis) {
    if (!Array.isArray(axis)) {
        axis = [arguments[1], arguments[2], arguments[3]];
    }
    var v = normalize(axis);
    var x = v[0];
    var y = v[1];
    var z = v[2];
    var c = Math.cos(radians(angle));
    var omc = 1.0 - c;
    var s = Math.sin(radians(angle));
    var result = mat4(vec4(x * x * omc + c, x * y * omc - z * s, x * z * omc + y * s, 0.0), vec4(x * y * omc + z * s, y * y * omc + c, y * z * omc - x * s, 0.0), vec4(x * z * omc - y * s, y * z * omc + x * s, z * z * omc + c, 0.0), vec4());
    return result;
}
function rotateX(theta) {
    var c = Math.cos(radians(theta));
    var s = Math.sin(radians(theta));
    var rx = mat4(1.0, 0.0, 0.0, 0.0, 0.0, c, -s, 0.0, 0.0, s, c, 0.0, 0.0, 0.0, 0.0, 1.0);
    return rx;
}
function rotateY(theta) {
    var c = Math.cos(radians(theta));
    var s = Math.sin(radians(theta));
    var ry = mat4(c, 0.0, s, 0.0, 0.0, 1.0, 0.0, 0.0, -s, 0.0, c, 0.0, 0.0, 0.0, 0.0, 1.0);
    return ry;
}
function rotateZ(theta) {
    var c = Math.cos(radians(theta));
    var s = Math.sin(radians(theta));
    var rz = mat4(c, -s, 0.0, 0.0, s, c, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
    return rz;
}
//----------------------------------------------------------------------------
function scalem(x, y, z) {
    if (Array.isArray(x) && x.length == 3) {
        z = x[2];
        y = x[1];
        x = x[0];
    }
    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    return result;
}
//----------------------------------------------------------------------------
//
//  ModelView Matrix Generators
//
function lookAt(eye, at, up) {
    if (!Array.isArray(eye) || eye.length != 3) {
        throw "lookAt(): first parameter [eye] must be an a vec3";
    }
    if (!Array.isArray(at) || at.length != 3) {
        throw "lookAt(): second parameter [at] must be an a vec3";
    }
    if (!Array.isArray(up) || up.length != 3) {
        throw "lookAt(): third parameter [up] must be an a vec3";
    }
    if (equal(eye, at)) {
        return mat4();
    }
    var v = normalize(subtract(at, eye)); // view direction vector
    var n = normalize(cross(v, up)); // perpendicular vector
    var u = normalize(cross(n, v)); // "new" up vector
    v = negate(v);
    var result = mat4(vec4(n, -dot(n, eye)), vec4(u, -dot(u, eye)), vec4(v, -dot(v, eye)), vec4());
    return result;
}
//----------------------------------------------------------------------------
//
//  Projection Matrix Generators
//
function ortho(left, right, bottom, top, near, far) {
    if (left == right) {
        throw "ortho(): left and right are equal";
    }
    if (bottom == top) {
        throw "ortho(): bottom and top are equal";
    }
    if (near == far) {
        throw "ortho(): near and far are equal";
    }
    var w = right - left;
    var h = top - bottom;
    var d = far - near;
    var result = mat4();
    result[0][0] = 2.0 / w;
    result[1][1] = 2.0 / h;
    result[2][2] = -2.0 / d;
    result[0][3] = -(left + right) / w;
    result[1][3] = -(top + bottom) / h;
    result[2][3] = -(near + far) / d;
    return result;
}
//----------------------------------------------------------------------------
function perspective(fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(radians(fovy) / 2);
    var d = far - near;
    var result = mat4();
    result[0][0] = f / aspect;
    result[1][1] = f;
    result[2][2] = -(near + far) / d;
    result[2][3] = -2 * near * far / d;
    result[3][2] = -1;
    result[3][3] = 0.0;
    return result;
}
//----------------------------------------------------------------------------
//
//  Matrix Functions
//
function transpose(m) {
    if (!m.matrix) {
        return "transpose(): trying to transpose a non-matrix";
    }
    var result = [];
    for (var i = 0; i < m.length; ++i) {
        result.push([]);
        for (var j = 0; j < m[i].length; ++j) {
            result[i].push(m[j][i]);
        }
    }
    result.matrix = true;
    return result;
}
//----------------------------------------------------------------------------
//
//  Vector Functions
//
function dot(u, v) {
    if (u.length != v.length) {
        throw "dot(): vectors are not the same dimension";
    }
    var sum = 0.0;
    for (var i = 0; i < u.length; ++i) {
        sum += u[i] * v[i];
    }
    return sum;
}
//----------------------------------------------------------------------------
function negate(u) {
    var result = [];
    for (var i = 0; i < u.length; ++i) {
        result.push(-u[i]);
    }
    return result;
}
//----------------------------------------------------------------------------
function cross(u, v) {
    if (!Array.isArray(u) || u.length < 3) {
        throw "cross(): first argument is not a vector of at least 3";
    }
    if (!Array.isArray(v) || v.length < 3) {
        throw "cross(): second argument is not a vector of at least 3";
    }
    var result = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];
    return result;
}
//----------------------------------------------------------------------------
function length2(u) {
    return Math.sqrt(dot(u, u));
}
//----------------------------------------------------------------------------
function normalize(u, excludeLastComponent) {
    if (excludeLastComponent) {
        var last = u.pop();
    }
    var len = length2(u);
    if (!isFinite(len)) {
        throw "normalize: vector " + u + " has zero length";
    }
    for (var i = 0; i < u.length; ++i) {
        u[i] /= len;
    }
    if (excludeLastComponent) {
        u.push(last);
    }
    return u;
}
//----------------------------------------------------------------------------
function mix(u, v, s) {
    if (typeof s !== "number") {
        throw "mix: the last paramter " + s + " must be a number";
    }
    if (u.length != v.length) {
        throw "vector dimension mismatch";
    }
    var result = [];
    for (var i = 0; i < u.length; ++i) {
        result.push((1.0 - s) * u[i] + s * v[i]);
    }
    return result;
}
//----------------------------------------------------------------------------
//
// Vector and Matrix functions
//
function scale(s, u) {
    if (!Array.isArray(u)) {
        throw "scale: second parameter " + u + " is not a vector";
    }
    var result = [];
    for (var i = 0; i < u.length; ++i) {
        result.push(s * u[i]);
    }
    return result;
}
//----------------------------------------------------------------------------
//
//
//
function flatten(v) {
    if (v.matrix === true) {
        v = transpose(v);
    }
    var n = v.length;
    var elemsAreArrays = false;
    if (Array.isArray(v[0])) {
        elemsAreArrays = true;
        n *= v[0].length;
    }
    var floats = new Float32Array(n);
    if (elemsAreArrays) {
        var idx = 0;
        for (var i = 0; i < v.length; ++i) {
            for (var j = 0; j < v[i].length; ++j) {
                floats[idx++] = v[i][j];
            }
        }
    }
    else {
        for (var i = 0; i < v.length; ++i) {
            floats[i] = v[i];
        }
    }
    return floats;
}
//----------------------------------------------------------------------------
var sizeof = {
    'vec2': new Float32Array(flatten(vec2())).byteLength,
    'vec3': new Float32Array(flatten(vec3())).byteLength,
    'vec4': new Float32Array(flatten(vec4())).byteLength,
    'mat2': new Float32Array(flatten(mat2())).byteLength,
    'mat3': new Float32Array(flatten(mat3())).byteLength,
    'mat4': new Float32Array(flatten(mat4())).byteLength
};
// new functions 5/2/2015
// printing
function printm(m) {
    if (m.length == 2)
        for (var i = 0; i < m.length; i++)
            console.log(m[i][0], m[i][1]);
    else if (m.length == 3)
        for (var i = 0; i < m.length; i++)
            console.log(m[i][0], m[i][1], m[i][2]);
    else if (m.length == 4)
        for (var i = 0; i < m.length; i++)
            console.log(m[i][0], m[i][1], m[i][2], m[i][3]);
}
// determinants
function det2(m) {
    return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}
function det3(m) {
    var d = m[0][0] * m[1][1] * m[2][2]
        + m[0][1] * m[1][2] * m[2][0]
        + m[0][2] * m[2][1] * m[1][0]
        - m[2][0] * m[1][1] * m[0][2]
        - m[1][0] * m[0][1] * m[2][2]
        - m[0][0] * m[1][2] * m[2][1];
    return d;
}
function det4(m) {
    var m0 = [
        vec3(m[1][1], m[1][2], m[1][3]),
        vec3(m[2][1], m[2][2], m[2][3]),
        vec3(m[3][1], m[3][2], m[3][3])
    ];
    var m1 = [
        vec3(m[1][0], m[1][2], m[1][3]),
        vec3(m[2][0], m[2][2], m[2][3]),
        vec3(m[3][0], m[3][2], m[3][3])
    ];
    var m2 = [
        vec3(m[1][0], m[1][1], m[1][3]),
        vec3(m[2][0], m[2][1], m[2][3]),
        vec3(m[3][0], m[3][1], m[3][3])
    ];
    var m3 = [
        vec3(m[1][0], m[1][1], m[1][2]),
        vec3(m[2][0], m[2][1], m[2][2]),
        vec3(m[3][0], m[3][1], m[3][2])
    ];
    return m[0][0] * det3(m0) - m[0][1] * det3(m1)
        + m[0][2] * det3(m2) - m[0][3] * det3(m3);
}
function det(m) {
    if (m.matrix != true)
        console.log("not a matrix");
    if (m.length == 2)
        return det2(m);
    if (m.length == 3)
        return det3(m);
    if (m.length == 4)
        return det4(m);
}
//---------------------------------------------------------
// inverses
function inverse2(m) {
    var a = mat2();
    var d = det2(m);
    a[0][0] = m[1][1] / d;
    a[0][1] = -m[0][1] / d;
    a[1][0] = -m[1][0] / d;
    a[1][1] = m[0][0] / d;
    a.matrix = true;
    return a;
}
function inverse3(m) {
    var a = mat3();
    var d = det3(m);
    var a00 = [
        vec2(m[1][1], m[1][2]),
        vec2(m[2][1], m[2][2])
    ];
    var a01 = [
        vec2(m[1][0], m[1][2]),
        vec2(m[2][0], m[2][2])
    ];
    var a02 = [
        vec2(m[1][0], m[1][1]),
        vec2(m[2][0], m[2][1])
    ];
    var a10 = [
        vec2(m[0][1], m[0][2]),
        vec2(m[2][1], m[2][2])
    ];
    var a11 = [
        vec2(m[0][0], m[0][2]),
        vec2(m[2][0], m[2][2])
    ];
    var a12 = [
        vec2(m[0][0], m[0][1]),
        vec2(m[2][0], m[2][1])
    ];
    var a20 = [
        vec2(m[0][1], m[0][2]),
        vec2(m[1][1], m[1][2])
    ];
    var a21 = [
        vec2(m[0][0], m[0][2]),
        vec2(m[1][0], m[1][2])
    ];
    var a22 = [
        vec2(m[0][0], m[0][1]),
        vec2(m[1][0], m[1][1])
    ];
    a[0][0] = det2(a00) / d;
    a[0][1] = -det2(a10) / d;
    a[0][2] = det2(a20) / d;
    a[1][0] = -det2(a01) / d;
    a[1][1] = det2(a11) / d;
    a[1][2] = -det2(a21) / d;
    a[2][0] = det2(a02) / d;
    a[2][1] = -det2(a12) / d;
    a[2][2] = det2(a22) / d;
    return a;
}
function inverse4(m) {
    var a = mat4();
    var d = det4(m);
    var a00 = [
        vec3(m[1][1], m[1][2], m[1][3]),
        vec3(m[2][1], m[2][2], m[2][3]),
        vec3(m[3][1], m[3][2], m[3][3])
    ];
    var a01 = [
        vec3(m[1][0], m[1][2], m[1][3]),
        vec3(m[2][0], m[2][2], m[2][3]),
        vec3(m[3][0], m[3][2], m[3][3])
    ];
    var a02 = [
        vec3(m[1][0], m[1][1], m[1][3]),
        vec3(m[2][0], m[2][1], m[2][3]),
        vec3(m[3][0], m[3][1], m[3][3])
    ];
    var a03 = [
        vec3(m[1][0], m[1][1], m[1][2]),
        vec3(m[2][0], m[2][1], m[2][2]),
        vec3(m[3][0], m[3][1], m[3][2])
    ];
    var a10 = [
        vec3(m[0][1], m[0][2], m[0][3]),
        vec3(m[2][1], m[2][2], m[2][3]),
        vec3(m[3][1], m[3][2], m[3][3])
    ];
    var a11 = [
        vec3(m[0][0], m[0][2], m[0][3]),
        vec3(m[2][0], m[2][2], m[2][3]),
        vec3(m[3][0], m[3][2], m[3][3])
    ];
    var a12 = [
        vec3(m[0][0], m[0][1], m[0][3]),
        vec3(m[2][0], m[2][1], m[2][3]),
        vec3(m[3][0], m[3][1], m[3][3])
    ];
    var a13 = [
        vec3(m[0][0], m[0][1], m[0][2]),
        vec3(m[2][0], m[2][1], m[2][2]),
        vec3(m[3][0], m[3][1], m[3][2])
    ];
    var a20 = [
        vec3(m[0][1], m[0][2], m[0][3]),
        vec3(m[1][1], m[1][2], m[1][3]),
        vec3(m[3][1], m[3][2], m[3][3])
    ];
    var a21 = [
        vec3(m[0][0], m[0][2], m[0][3]),
        vec3(m[1][0], m[1][2], m[1][3]),
        vec3(m[3][0], m[3][2], m[3][3])
    ];
    var a22 = [
        vec3(m[0][0], m[0][1], m[0][3]),
        vec3(m[1][0], m[1][1], m[1][3]),
        vec3(m[3][0], m[3][1], m[3][3])
    ];
    var a23 = [
        vec3(m[0][0], m[0][1], m[0][2]),
        vec3(m[1][0], m[1][1], m[1][2]),
        vec3(m[3][0], m[3][1], m[3][2])
    ];
    var a30 = [
        vec3(m[0][1], m[0][2], m[0][3]),
        vec3(m[1][1], m[1][2], m[1][3]),
        vec3(m[2][1], m[2][2], m[2][3])
    ];
    var a31 = [
        vec3(m[0][0], m[0][2], m[0][3]),
        vec3(m[1][0], m[1][2], m[1][3]),
        vec3(m[2][0], m[2][2], m[2][3])
    ];
    var a32 = [
        vec3(m[0][0], m[0][1], m[0][3]),
        vec3(m[1][0], m[1][1], m[1][3]),
        vec3(m[2][0], m[2][1], m[2][3])
    ];
    var a33 = [
        vec3(m[0][0], m[0][1], m[0][2]),
        vec3(m[1][0], m[1][1], m[1][2]),
        vec3(m[2][0], m[2][1], m[2][2])
    ];
    a[0][0] = det3(a00) / d;
    a[0][1] = -det3(a10) / d;
    a[0][2] = det3(a20) / d;
    a[0][3] = -det3(a30) / d;
    a[1][0] = -det3(a01) / d;
    a[1][1] = det3(a11) / d;
    a[1][2] = -det3(a21) / d;
    a[1][3] = det3(a31) / d;
    a[2][0] = det3(a02) / d;
    a[2][1] = -det3(a12) / d;
    a[2][2] = det3(a22) / d;
    a[2][3] = -det3(a32) / d;
    a[3][0] = -det3(a03) / d;
    a[3][1] = det3(a13) / d;
    a[3][2] = -det3(a23) / d;
    a[3][3] = det3(a33) / d;
    return a;
}
function inverse(m) {
    if (m.matrix != true)
        console.log("not a matrix");
    if (m.length == 2)
        return inverse2(m);
    if (m.length == 3)
        return inverse3(m);
    if (m.length == 4)
        return inverse4(m);
}
function normalMatrix(m, flag) {
    var a = mat4();
    a = inverse(transpose(m));
    if (flag != true)
        return a;
    else {
        var b = mat3();
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++)
                b[i][j] = a[i][j];
        return b;
    }
}
//
//  initShaders.js
//
function initShaders(gl, vertexShaderId, fragmentShaderId) {
    var vertShdr;
    var fragShdr;
    var vertElem = document.getElementById(vertexShaderId);
    if (!vertElem) {
        alert("Unable to load vertex shader " + vertexShaderId);
        return -1;
    }
    else {
        vertShdr = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShdr, vertElem.text);
        gl.compileShader(vertShdr);
        if (!gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS)) {
            var msg = "Vertex shader failed to compile.  The error log is:"
                + "<pre>" + gl.getShaderInfoLog(vertShdr) + "</pre>";
            alert(msg);
            return -1;
        }
    }
    var fragElem = document.getElementById(fragmentShaderId);
    if (!fragElem) {
        alert("Unable to load vertex shader " + fragmentShaderId);
        return -1;
    }
    else {
        fragShdr = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShdr, fragElem.text);
        gl.compileShader(fragShdr);
        if (!gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS)) {
            var msg = "Fragment shader failed to compile.  The error log is:"
                + "<pre>" + gl.getShaderInfoLog(fragShdr) + "</pre>";
            alert(msg);
            return -1;
        }
    }
    var program = gl.createProgram();
    gl.attachShader(program, vertShdr);
    gl.attachShader(program, fragShdr);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog(program) + "</pre>";
        alert(msg);
        return -1;
    }
    return program;
}
/*
// Get a file as a string using  AJAX
function loadFileAJAX(name) {
    var xhr = new XMLHttpRequest(),
        okStatus = document.location.protocol === "file:" ? 0 : 200;
    xhr.open('GET', name, false);
    xhr.send(null);
    return xhr.status == okStatus ? xhr.responseText : null;
};


function initShadersFromFiles(gl, vShaderName, fShaderName) {
    function getShader(gl, shaderName, type) {
        var shader = gl.createShader(type),
            shaderScript = loadFileAJAX(shaderName);
        if (!shaderScript) {
            alert("Could not find shader source: "+shaderName);
        }
        gl.shaderSource(shader, shaderScript);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
    var vertexShader = getShader(gl, vShaderName, gl.VERTEX_SHADER),
        fragmentShader = getShader(gl, fShaderName, gl.FRAGMENT_SHADER),
        program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
        return null;
    }

    
    return program;
};
*/ 
/*
 * Copyright 2010, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @fileoverview This file contains functions every webgl program will need
 * a version of one way or another.
 *
 * Instead of setting up a context manually it is recommended to
 * use. This will check for success or failure. On failure it
 * will attempt to present an approriate message to the user.
 *
 *       gl = WebGLUtils.setupWebGL(canvas);
 *
 * For animated WebGL apps use of setTimeout or setInterval are
 * discouraged. It is recommended you structure your rendering
 * loop like this.
 *
 *       function render() {
 *         window.requestAnimFrame(render, canvas);
 *
 *         // do rendering
 *         ...
 *       }
 *       render();
 *
 * This will call your rendering function up to the refresh rate
 * of your display but will stop rendering if your app is not
 * visible.
 */
const WebGLUtils = function () {
    /**
     * Creates the HTLM for a failure message
     * @param {string} canvasContainerId id of container of th
     *        canvas.
     * @return {string} The html.
     */
    var makeFailHTML = function (msg) {
        return '' +
            '<table style="background-color: #8CE; width: 100%; height: 100%;"><tr>' +
            '<td align="center">' +
            '<div style="display: table-cell; vertical-align: middle;">' +
            '<div style="">' + msg + '</div>' +
            '</div>' +
            '</td></tr></table>';
    };
    /**
     * Mesasge for getting a webgl browser
     * @type {string}
     */
    var GET_A_WEBGL_BROWSER = '' +
        'This page requires a browser that supports WebGL.<br/>' +
        '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';
    /**
     * Mesasge for need better hardware
     * @type {string}
     */
    var OTHER_PROBLEM = '' +
        "It doesn't appear your computer can support WebGL.<br/>" +
        '<a href="http://get.webgl.org/troubleshooting/">Click here for more information.</a>';
    /**
     * Creates a webgl context. If creation fails it will
     * change the contents of the container of the <canvas>
     * tag to an error message with the correct links for WebGL.
     * @param {Element} canvas. The canvas element to create a
     *     context from.
     * @param {WebGLContextCreationAttirbutes} opt_attribs Any
     *     creation attributes you want to pass in.
     * @return {WebGLRenderingContext} The created context.
     */
    var setupWebGL = function (canvas, opt_attribs) {
        function showLink(str) {
            var container = canvas.parentNode;
            if (container) {
                container.innerHTML = makeFailHTML(str);
            }
        }
        ;
        if (!window.WebGLRenderingContext) {
            showLink(GET_A_WEBGL_BROWSER);
            return null;
        }
        var context = create3DContext(canvas, opt_attribs);
        if (!context) {
            showLink(OTHER_PROBLEM);
        }
        return context;
    };
    /**
     * Creates a webgl context.
     * @param {!Canvas} canvas The canvas tag to get context
     *     from. If one is not passed in one will be created.
     * @return {!WebGLContext} The created context.
     */
    var create3DContext = function (canvas, opt_attribs) {
        var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
        var context = null;
        for (var ii = 0; ii < names.length; ++ii) {
            try {
                context = canvas.getContext(names[ii], opt_attribs);
            }
            catch (e) { }
            if (context) {
                break;
            }
        }
        return context;
    };
    return {
        create3DContext: create3DContext,
        setupWebGL: setupWebGL
    };
}();
/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();
//# sourceMappingURL=application.js.map