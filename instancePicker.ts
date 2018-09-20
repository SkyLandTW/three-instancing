import * as THREE from "three";
import { InstancedSimpleGeometry } from "./instancedGeometries";

// GPU-based Picker from https://www.carbon3d.com/softwareteam/javascript-challenges/ by Brian Li
// GPUPicker from https://github.com/brianxu/GPUPicker/blob/master/GPUPicker.js

const instancedIdMaterial = new THREE.ShaderMaterial({
    vertexShader: `
attribute float instanceId;
attribute vec3 instancePosition;
attribute vec4 instanceQuaternion;
attribute vec3 instanceScale;
varying vec4 output_color;
vec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, vec3 scale ) {
    position *= scale;
    position += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );
    return position + translation;
}
void main() {
    vec3 transformed = applyTRS( position, instancePosition, instanceQuaternion, instanceScale );
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    vec3 a = fract(vec3(1.0/255.0, 1.0/(255.0*255.0), 1.0/(255.0*255.0*255.0)) * instanceId);
    a -= a.xxy * vec3(0.0, 1.0/255.0, 1.0/255.0);
    output_color = vec4(a, 1);
}
`,
    fragmentShader: `
varying vec4 output_color;
void main() {
    gl_FragColor = output_color;
}
`
});

const idMaterial = new THREE.ShaderMaterial({
    vertexShader: `
attribute float id;
varying vec4 output_color;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 a = fract(vec3(1.0/255.0, 1.0/(255.0*255.0), 1.0/(255.0*255.0*255.0)) * id);
    a -= a.xxy * vec3(0.0, 1.0/255.0, 1.0/255.0);
    output_color = vec4(a, 1);
}
`,
    fragmentShader: `
varying vec4 output_color;
void main() {
    gl_FragColor = output_color;
}
`
});

function addIdToGeometryIfNeeded(geometry: THREE.BufferGeometry, id: number): void {
    if (!(geometry instanceof InstancedSimpleGeometry)) {
        if (!geometry.getAttribute("id")) {
            geometry.addAttribute("id", new THREE.Float32BufferAttribute([id], 1, true));
        }
    }
}

class PickingMesh extends THREE.Mesh {
    readonly origin: THREE.Mesh;

    constructor(origin: THREE.Mesh, geometry?: THREE.Geometry | THREE.BufferGeometry, material?: THREE.MeshMaterialType | THREE.MeshMaterialType[]) {
        super(geometry, material);
        this.origin = origin;
    }
}

export interface PickedInstance {
    readonly object: THREE.Object3D;
    readonly instanceIndex: number;
}

export class InstancePicker {
    private readonly scene: THREE.Scene;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly pickingRenderTarget: THREE.WebGLRenderTarget;
    private readonly pickingScene: THREE.Scene;
    private readonly meshIdToPickingMesh = new Map<number, PickingMesh>();
    private pixelBuffer: Uint8Array;

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.renderer = renderer;
        const size = renderer.getSize();
        this.pickingRenderTarget = new THREE.WebGLRenderTarget(size.width, size.height);
        this.pickingScene = new THREE.Scene();
        this.pixelBuffer = new Uint8Array(4 * size.width * size.height);
    }

    updatePixelBuffer(camera: THREE.Camera) {
        const newSize = this.renderer.getSize();
        if (this.pickingRenderTarget.width !== newSize.width || this.pickingRenderTarget.height !== newSize.height) {
            this.pickingRenderTarget.setSize(newSize.width, newSize.height);
            this.pixelBuffer = new Uint8Array(4 * newSize.width * newSize.height);
        }
        const sceneObjIds = new Set<number>();
        // add from scene to pickingScene
        this.scene.traverse(obj => {
            if (!(obj instanceof THREE.Mesh))
                return;
            if (!(obj.geometry instanceof THREE.BufferGeometry))
                return;
            sceneObjIds.add(obj.id);
            let pickingMesh = this.meshIdToPickingMesh.get(obj.id);
            if (pickingMesh) {
                if (pickingMesh.geometry !== obj.geometry) {
                    pickingMesh.geometry = obj.geometry;
                    addIdToGeometryIfNeeded(obj.geometry, obj.id);
                }
            } else {
                if (obj.geometry instanceof InstancedSimpleGeometry) {
                    pickingMesh = new PickingMesh(obj, obj.geometry, instancedIdMaterial);
                } else if (obj.geometry instanceof THREE.BufferGeometry) {
                    pickingMesh = new PickingMesh(obj, obj.geometry, idMaterial);
                }
                addIdToGeometryIfNeeded(obj.geometry, obj.id);;
                this.meshIdToPickingMesh.set(obj.id, pickingMesh);
                this.pickingScene.add(pickingMesh);
            }
        });
        // remove from pickingScene if not exists in scene
        for (let pickingObj of this.pickingScene.children.slice(0)) {
            if (pickingObj instanceof PickingMesh) {
                if (!sceneObjIds.has(pickingObj.origin.id)) {
                    this.pickingScene.remove(pickingObj);
                }
            }
        }
        this.renderer.render(this.pickingScene, camera, this.pickingRenderTarget);
        this.renderer.readRenderTargetPixels(this.pickingRenderTarget, 0, 0, newSize.width, newSize.height, this.pixelBuffer);
    }

    getPickedObject(mouseCoords: THREE.Vector2): [THREE.Mesh, number] {
        const scene = this.pickingScene;
        const id = this.getPickedId(mouseCoords);
        if (id && scene) {
            for (let obj of scene.children) {
                if (!(obj instanceof PickingMesh))
                    continue;
                if (obj.geometry instanceof InstancedSimpleGeometry) {
                    const index = obj.geometry.findIndexById(id);
                    if (index !== undefined && index !== null)
                        return [obj.origin, index];
                } else {
                    if (obj.origin.id === id) {
                        return [obj.origin, null];
                    }
                }
            }
            return [null, null];
        }
        return [null, null];
    }

    getPickedId(mouseCoords: THREE.Vector2): number {
        const index = mouseCoords.x + (this.pickingRenderTarget.height - mouseCoords.y) * this.pickingRenderTarget.width;
        const id = this.pixelBuffer[index * 4 + 2] * 255 ** 2 +
            this.pixelBuffer[index * 4 + 1] * 255 +
            this.pixelBuffer[index * 4 + 0];
        return id;
    }
}