import * as THREE from "three";

// based on https://threejs.org/examples/#webgl_buffergeometry_instancing_lambert

declare module "three" {
    export class InstancedBufferAttribute extends THREE.BufferAttribute {
        // r96 added "normalized" parameter
        constructor(data: ArrayLike<number>, itemSize: number, normalized: boolean, meshPerAttribute?: number);
        meshPerAttribute: number;
    }
}

export class InstancedSimpleGeometry extends THREE.InstancedBufferGeometry {
    readonly blueprint: THREE.BufferGeometry;
    private readonly instanceIds: Float32Array;
    private readonly instancePositions: Float32Array;
    private readonly instanceQuaternions: Float32Array;
    private readonly instanceScales: Float32Array;
    private readonly instanceColors: Float32Array;
    private readonly instanceIdToIndex = new Map<number, number>();

    constructor(blueprint: THREE.BufferGeometry,
        count: number,
        instancePositions: Float32Array,
        instanceQuaternions: Float32Array,
        instanceScales: Float32Array,
        instanceColors: Float32Array) {
        super();
        this.blueprint = blueprint;
        this.index = blueprint.index;
        for (let name in blueprint.attributes) {
            if (blueprint.attributes.hasOwnProperty(name)) {
                this.addAttribute(name, blueprint.attributes[name]);
            }
        }
        this.instanceIds = new Float32Array(count);
        for (let index = 0; index < count; index++) {
            const id = (new THREE.Object3D()).id; // to get unique bufferGeometryId for each of instance.
            this.instanceIds[index] = id;
            this.instanceIdToIndex.set(id, index);
        }
        this.instancePositions = instancePositions || new Float32Array(count * 3);
        this.instanceQuaternions = instanceQuaternions || new Float32Array(count * 4);
        this.instanceScales = instanceScales || new Float32Array(count * 3);
        if (!instanceScales) {
            this.instanceScales.fill(1, 0, this.instanceScales.length);
        }
        this.instanceColors = instanceColors || new Float32Array(count * 3);
        if (!instanceColors) {
            this.instanceColors.fill(1, 0, this.instanceColors.length);
        }
        this.addAttribute("instanceId", new THREE.InstancedBufferAttribute(new Float32Array(this.instanceIds), 1, true));
        this.addAttribute("instancePosition", new THREE.InstancedBufferAttribute(new Float32Array(this.instancePositions), 3, true));
        this.addAttribute("instanceQuaternion", new THREE.InstancedBufferAttribute(new Float32Array(this.instanceQuaternions), 4, true));
        this.addAttribute("instanceScale", new THREE.InstancedBufferAttribute(new Float32Array(this.instanceScales), 3, true));
        this.addAttribute("instanceColor", new THREE.InstancedBufferAttribute(new Float32Array(this.instanceColors), 3, true));
    }

    getInstancePosition(index: number): THREE.Vector3 {
        return new THREE.Vector3(
            this.instancePositions[index * 3 + 0],
            this.instancePositions[index * 3 + 1],
            this.instancePositions[index * 3 + 2]);
    }

    findIndexById(id: number): number {
        return this.instanceIdToIndex.get(id);
    }
}

function populateQuaternionArray<T>(itemList: T[], getQuaternion?: (item: T) => THREE.Quaternion): Float32Array {
    if (getQuaternion) {
        const array = new Float32Array(itemList.length * 4);
        let i = 0;
        for (let item of itemList) {
            const vec = getQuaternion(item);
            array[i++] = vec.x;
            array[i++] = vec.y;
            array[i++] = vec.z;
            array[i++] = vec.w;
        }
        return array;
    }
    return null;
}

function populateVector3Array<T>(itemList: T[], getVector3?: (item: T) => THREE.Vector3): Float32Array {
    if (getVector3) {
        const array = new Float32Array(itemList.length * 3);
        let i = 0;
        for (let item of itemList) {
            const vec = getVector3(item);
            array[i++] = vec.x;
            array[i++] = vec.y;
            array[i++] = vec.z;
        }
        return array;
    }
    return null;
}

export class InstancedMappedGeometry<T> extends InstancedSimpleGeometry {
    private readonly indexToSource: T[];

    constructor(blueprint: THREE.BufferGeometry,
        sourceList: T[],
        getPosition?: (item: T) => THREE.Vector3,
        getQuaternion?: (item: T) => THREE.Quaternion,
        getScale?: (item: T) => THREE.Vector3,
        getColor?: (item: T) => THREE.Vector3) {
        super(
            blueprint,
            sourceList.length,
            populateVector3Array(sourceList, getPosition),
            populateQuaternionArray(sourceList, getQuaternion),
            populateVector3Array(sourceList, getScale),
            populateVector3Array(sourceList, getColor));
        this.indexToSource = sourceList.slice(0);
    }

    findSourceByindex(index: number): T {
        return this.indexToSource[index];
    }

    findSourceById(id: number): T {
        const index = this.findIndexById(id);
        if (index === undefined || index === null)
            return null;
        return this.indexToSource[index];
    }
}