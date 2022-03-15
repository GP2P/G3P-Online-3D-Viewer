G3P Online .obj Viewer
===

https://gp2p.github.io/G3P-Online-.obj-Viewer/

This project is an almost static website that allows user to load a local .obj model along with its .mtl materials, and
a Node.js server using the express framework, not connected to a database. It provides sample models for the user. It
is a site that uses canvas and WebGL to render.

### Features:

- **.obj Viewer:** This site allows viewing of any .obj 3D models that use labels `v`, `vn`, `usemtl`, and `f`
  along with its corresponding .mtl material that use labels `Kd` and `Ks`. All other labels are ignored, which means
  this viewer does not handle ambient color, weighted specular color, transparency, optical density, textures, etc.
- **Load Sample Models:** The server serves some 3D models, big and small, for the user to choose from. Each button
  corresponds to a 3D model (a pair of .obj and .mtl files) stored on the server, clicking the button downloads the
  files with an XMLHttpRequest and the webpage will render it once it finishes downloading from the server. Each sample
  model comes with a set of customized viewing settings to better showcase the object. The sample models are mostly
  from [free3d.com](free3d.com) and links for each model is in the html file.
- **Load Local Models:** The user can load a local 3D model (a pair of .obj and .mtl files) and the webpage will render
  it as much as supported tags go.
- **Responsive:** This site is again, responsive to window size / device width, especially the viewing canvas window.
- **CSS Template:** This site used a template from RapidWeaver
- **Code Reuse:** This site used code from one of my previous open source projects, the structural JavaScript working
  flow remains similar while the contents are changed.
- **Animation:** Animate the 3rd person camera to rotate around the object and move up and down for variance
- **Change Animation Speed:** Change the animation's speed from 0.1°/s to 1°/s in the control section
- **Shadows:** Objects casts shadows to the ground
- **Change Light Position:** Change where the light is and see how the lighting and shadows change
- **Lighting Mode Change:** Toggle between Gouraud shading and Phong shading
- **X-ray:** Invert rendered material colors and the background
- **Light Colors:** Change the Ambient Light Color, Diffuse Light Color and Specular Light Color in the control section
- **FOV:** Change the y-axis field of view from 1 to 150 in the control section
- **Distance:** Change the camera's distance from -25 to 25 in the control section
- **Perspective Far:** Change the perspective view's far limitation from 0 to 100 in the control section
- **"Super Reset":** Pressing the R key resets the Lighting Mode, Ambient Light Color, Diffuse Light Color, Specular
  Light Color, Animation, Animation Speed, Animation Degree, Animation Variance, Point Light, X-ray, field of view,
  camera distance and perspective far.
- Note: the loading of .mtl files does not get affected by what was stored in the mtllib section of the .obj file, for
  example, if car.obj's mtllib changes to car2.mtl, the program will still proceed to try load car.mtl given by the
  user. If an .mtl does not exist or a material is not found in the .mtl library, the default grey material will be
  used.
