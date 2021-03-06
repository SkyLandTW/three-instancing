import * as THREE from "three";

// based on https://threejs.org/examples/#webgl_buffergeometry_instancing_lambert

const phong_instancedVertexShader = `
#define PHONG
#ifdef INSTANCED
    attribute vec3 instancePosition;
    attribute vec4 instanceQuaternion;
    attribute vec3 instanceScale;
    attribute vec3 instanceColor;
    varying vec3 instanceColorOutput;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
    varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
vec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, vec3 scale ) {
    position *= scale;
    position += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );
    return position + translation;
}
void main() {
    #include <uv_vertex>
    #include <uv2_vertex>
    #include <color_vertex>
#ifdef INSTANCED
	instanceColorOutput = instanceColor;
#endif
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
#ifndef FLAT_SHADED
    vNormal = normalize( transformedNormal );
#endif
    #include <begin_vertex>
#ifdef INSTANCED
    transformed = applyTRS( transformed.xyz, instancePosition, instanceQuaternion, instanceScale );
#endif
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <displacementmap_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    vViewPosition = - mvPosition.xyz;
    #include <worldpos_vertex>
    #include <envmap_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>
}
`;

const phong_instancedFragShader = `
#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#ifdef INSTANCED
    varying vec3 instanceColorOutput;
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
    #include <clipping_planes_fragment>
    vec4 diffuseColor = vec4( diffuse, opacity );
#ifdef INSTANCED
    diffuseColor.xyz *= instanceColorOutput;
#endif
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;
    #include <logdepthbuf_fragment>
    #include <map_fragment>
    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <specularmap_fragment>
    #include <normal_fragment_begin>
    #include <normal_fragment_maps>
    #include <emissivemap_fragment>
    #include <lights_phong_fragment>
    #include <lights_fragment_begin>
    #include <lights_fragment_maps>
    #include <lights_fragment_end>
    #include <aomap_fragment>
    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
    #include <envmap_fragment>
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
    #include <premultiplied_alpha_fragment>
    #include <dithering_fragment>
}
`;

export class InstancedMeshPhongMaterial extends THREE.MeshPhongMaterial {
    uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.phong.uniforms);
    vertexShader = phong_instancedVertexShader;
    fragmentShader = phong_instancedFragShader;

    constructor(parameters?: THREE.MeshPhongMaterialParameters) {
        super(parameters);
        this.type = "InstancedMeshPhongMaterial";
        this["defines"] = this["defines"] || {};
        this["defines"]["INSTANCED"] = "";
    }
}

// source from THREE.ShaderLib.points.vertexShader
const points_instancedVertexShader = `
uniform float size;
uniform float scale;
#ifdef INSTANCED
    attribute vec3 instancePosition;
    attribute vec4 instanceQuaternion;
    attribute vec3 instanceScale;
    attribute vec4 instanceColor;
    varying vec4 instanceColorOutput;
#endif
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
vec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, vec3 scale ) {
    position *= scale;
    position += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );
    return position + translation;
}
void main() {
    #include <color_vertex>
    #include <begin_vertex>
#ifdef INSTANCED
    transformed = applyTRS( transformed.xyz, instancePosition, instanceQuaternion, instanceScale );
    instanceColorOutput = instanceColor;
#endif
    #include <morphtarget_vertex>
    #include <project_vertex>
    gl_PointSize = size;
    #ifdef USE_SIZEATTENUATION
        bool isPerspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 );
        if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
    #endif
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <worldpos_vertex>
    #include <fog_vertex>
}
`;

// source from THREE.ShaderLib.points.fragmentShader
const points_instancedFragShader = `
uniform vec3 diffuse;
uniform float opacity;
#ifdef INSTANCED
    varying vec4 instanceColorOutput;
#endif
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
    #include <clipping_planes_fragment>
    vec3 outgoingLight = vec3( 0.0 );
    vec4 diffuseColor = vec4( diffuse, opacity );
#ifdef INSTANCED
    diffuseColor *= instanceColorOutput;
#endif
    #include <logdepthbuf_fragment>
    #include <map_particle_fragment>
    #include <color_fragment>
    #include <alphatest_fragment>
    outgoingLight = diffuseColor.rgb;
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #include <premultiplied_alpha_fragment>
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
}
`;

export class InstancedPointsMaterial extends THREE.PointsMaterial {
    uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.points.uniforms);
    vertexShader = points_instancedVertexShader;
    fragmentShader = points_instancedFragShader;

    constructor(parameters?: THREE.PointsMaterialParameters) {
        super(parameters);
        this.type = "InstancedPointsMaterial";
        this["defines"] = this["defines"] || {};
        this["defines"]["INSTANCED"] = "";
    }
}

// THREE.ShaderLib.basic.vertexShader
const basic_instancedVertexShader = `
#ifdef INSTANCED
    attribute vec3 instancePosition;
    attribute vec4 instanceQuaternion;
    attribute vec3 instanceScale;
    attribute vec4 instanceColor;
    varying vec4 instanceColorOutput;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
vec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, vec3 scale ) {
    position *= scale;
    position += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );
    return position + translation;
}
void main() {
    #include <uv_vertex>
    #include <uv2_vertex>
    #include <color_vertex>
    #include <skinbase_vertex>
    #ifdef USE_ENVMAP
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #endif
    #include <begin_vertex>
#ifdef INSTANCED
    transformed = applyTRS( transformed.xyz, instancePosition, instanceQuaternion, instanceScale );
    instanceColorOutput = instanceColor;
#endif
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <worldpos_vertex>
    #include <clipping_planes_vertex>
    #include <envmap_vertex>
    #include <fog_vertex>
}
`;

// THREE.ShaderLib.basic.fragmentShader
const basic_instancedFragmentShader = `
uniform vec3 diffuse;
uniform float opacity;
#ifdef INSTANCED
    varying vec4 instanceColorOutput;
#endif
#ifndef FLAT_SHADED
    varying vec3 vNormal;
#endif
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
    #include <clipping_planes_fragment>
    vec4 diffuseColor = vec4( diffuse, opacity );
#ifdef INSTANCED
    diffuseColor *= instanceColorOutput;
#endif
    #include <logdepthbuf_fragment>
    #include <map_fragment>
    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <specularmap_fragment>
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    #ifdef USE_LIGHTMAP
        reflectedLight.indirectDiffuse += texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;
    #else
        reflectedLight.indirectDiffuse += vec3( 1.0 );
    #endif
    #include <aomap_fragment>
    reflectedLight.indirectDiffuse *= diffuseColor.rgb;
    vec3 outgoingLight = reflectedLight.indirectDiffuse;
    #include <envmap_fragment>
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #include <premultiplied_alpha_fragment>
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
}
`;

export class InstancedLineMaterial extends THREE.LineBasicMaterial {
    uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.points.uniforms);
    vertexShader = basic_instancedVertexShader;
    fragmentShader = basic_instancedFragmentShader;

    constructor(parameters?: THREE.LineBasicMaterialParameters) {
        super(parameters);
        this.type = "InstancedLineMaterial";
        this["defines"] = this["defines"] || {};
        this["defines"]["INSTANCED"] = "";
    }
}
