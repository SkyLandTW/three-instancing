three-instancing
================

Simple code for OpenGL instancing in THREE.js.

It contains:

- materials: currently only MeshPhongMaterial.
- geometries to pass instancing parameters.
- a GPU based Picker for InstancedSimpleGeometry

For THREE.js r96


Examples
--------

See [Demo](examples/demo.html). TypeScript is required to build *build/build.js*.


Details
-------

- InstancedSimpleGeometry allows you to pass ids (for picking), positions, quaternions, scales and color multipliers
- InstancedMappedGeometry provides a sample to track instance IDs to their corresponding models
- InstancedMeshPhongMaterial is the instancing version of MeshPhongMaterial, adapted from THREE.js's instancing example
- InstancePicker is the instancing version of GpuPicker adapted from [Brian Li](https://www.carbon3d.com/softwareteam/javascript-challenges/)'s and [brianxu](https://github.com/brianxu/GPUPicker)'s works

To make more built-in materials for instancing, just check
[InstancedMeshPhongMaterial](instancedMaterials.ts). In the shader definitions
all relevant parts are marked with *#ifdef INSTANCED*, and the original source
can retrieved by *window.THREE.ShaderLib*.