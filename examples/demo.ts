import * as THREE from "three";
import * as instancing from "../";
import "three-orbitcontrols";

const globeRadius = 0.5;

// from https://callumprentice.github.io/apps/voronoi_airports/index.html
function fromLatLon(latLon: LatLon, height?: number): THREE.Vector3 {
    const radius = (height || latLon.height) ? globeRadius * (1 + latLon.height) : globeRadius;
    const phi = ((90.0 - latLon.latitude) * Math.PI) / 180.0;
    const theta = ((360.0 - latLon.longitude) * Math.PI) / 180.0;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

// from https://stackoverflow.com/a/36860652/3488757
function getRelativeCoordinates(e: MouseEvent, element: HTMLElement): [number, number] {
    const eventX = e.pageX;
    const eventY = e.pageY;
    let ref: Element = element;
    let offsetLeft = 0;
    let offsetTop = 0;
    while (ref instanceof HTMLElement) {
        offsetLeft += ref.offsetLeft;
        offsetTop += ref.offsetTop;
        ref = ref.offsetParent;
    }
    return [
        eventX - offsetLeft,
        eventY - offsetTop,
    ];
}

class LatLon {
    readonly latitude: number;
    readonly longitude: number;
    readonly height?: number;

    constructor(lat: number, lon: number, height?: number) {
        this.latitude = lat;
        this.longitude = lon;
        this.height = height;
    }

    toString(): string {
        return `${this.latitude},${this.longitude},${this.height}`;
    }
}

// Simple globe adapted from https://callumprentice.github.io/apps/voronoi_airports/index.html
class World {
    private static createRenderer(holder: HTMLElement): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setClearColor(0x000000, 0.0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(holder.clientWidth, holder.clientHeight);
        holder.appendChild(renderer.domElement);
        return renderer;
    };

    private static createCameraControls(canvas: HTMLCanvasElement, aspect: number): [THREE.PerspectiveCamera, THREE.OrbitControls] {
        const camera = new THREE.PerspectiveCamera(45.0, aspect, 0.01, 1000.0);
        const controls = new THREE.OrbitControls(camera, canvas);
        controls.enablePan = false;
        controls.rotateSpeed = 0.5;
        controls.enableDamping = true;
        controls.dampingFactor = 0.75;
        controls.minDistance = globeRadius * 1.1;
        controls.maxDistance = globeRadius * 3;
        return [camera, controls];
    };

    private static createScene(mapUrl: string): THREE.Scene {
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0x333333));
        const lightNorth = new THREE.DirectionalLight(0xffffff, 0.25);
        lightNorth.position.set(0, globeRadius * +6, 0);
        scene.add(lightNorth);
        const lightSouth = new THREE.DirectionalLight(0xffffff, 0.25);
        lightSouth.position.set(0, globeRadius * -6, 0);
        scene.add(lightSouth);
        const geometry = new THREE.SphereBufferGeometry(globeRadius, 256, 256);
        const earthMaterial = new THREE.MeshPhongMaterial({
            transparent: false,
            map: new THREE.TextureLoader().load(mapUrl),
        });
        scene.add(new THREE.Mesh(geometry, earthMaterial));
        return scene;
    };

    protected readonly holder: HTMLElement;
    protected readonly renderer: THREE.WebGLRenderer;
    protected readonly scene: THREE.Scene;
    protected readonly camera: THREE.PerspectiveCamera;
    protected readonly controls: THREE.OrbitControls;

    constructor(holder: HTMLElement, initialCoords: LatLon, mapUrl: string) {
        this.holder = holder;
        this.renderer = World.createRenderer(this.holder);
        [this.camera, this.controls] = World.createCameraControls(
            this.renderer.domElement,
            this.holder.clientWidth / this.holder.clientHeight);
        this.camera.position.copy(fromLatLon(initialCoords));
        this.scene = World.createScene(mapUrl);
        //
        this.animateCallback = this.animate.bind(this);
        //
        this.onMouseMoveCallback = this.onMouseMove.bind(this);
        holder.addEventListener("mousemove", this.onMouseMoveCallback, false);
        //
        this.onWindowResizeCallback = this.onWindowResize.bind(this);
        window.addEventListener("resize", this.onWindowResizeCallback, false);
    }

    start(): void {
        this.animateCallback();
    }

    readonly animateCallback: () => void;

    private animate(): void {
        requestAnimationFrame(this.animateCallback);
        this.onRendering();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.onRendered();
    };

    protected onRendering(): void {
    }

    protected onRendered(): void {
    }

    private readonly onMouseMoveCallback: (event: MouseEvent) => void;

    private onMouseMove(event: MouseEvent) {
        this.onMouseMoving();
        let mouseCoordsRelative: THREE.Vector2;
        let mouseCoordsProjected: THREE.Vector2;
        const [x, y] = getRelativeCoordinates(event, this.holder);
        console.log(`m ${x} ${y}`);
        if (x >= 0 && x < this.holder.clientWidth && y >= 0 && y < this.holder.clientHeight) {
            mouseCoordsRelative = new THREE.Vector2(x, y);
            mouseCoordsProjected = new THREE.Vector2(
                (x / this.holder.clientWidth) * 2 - 1,
                -(y / this.holder.clientHeight) * 2 + 1);
        } else {
            mouseCoordsRelative = null;
            mouseCoordsProjected = null;
        }
        this.onMouseMoved(mouseCoordsRelative, mouseCoordsProjected);
    }

    protected onMouseMoving(): void {
    }

    protected onMouseMoved(relative?: THREE.Vector2, projected?: THREE.Vector2): void {
    }

    private readonly onWindowResizeCallback: () => void;

    private onWindowResize() {
        // console.log(`${this.holder.clientWidth}x${this.holder.clientHeight}`);
        this.camera.aspect = this.holder.clientWidth / this.holder.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.holder.clientWidth, this.holder.clientHeight);
    };
}

class PickableWorld extends World {
    private readonly gpuPicker: instancing.InstancePicker;
    private renderSequence = 0;

    constructor(holder: HTMLElement, initialCoords: LatLon, mapUrl: string) {
        super(holder, initialCoords, mapUrl);
        this.gpuPicker = new instancing.InstancePicker(this.scene, this.renderer);
    }

    protected onRendered(): void {
        if (this.renderSequence++ % 4 === 0) {
            this.gpuPicker.updatePixelBuffer(this.camera);
        }
    }

    protected getPickedObject(mouseCoords: THREE.Vector2): [THREE.Mesh, number] {
        return this.gpuPicker.getPickedObject(mouseCoords);
    }
}

class DemoNode {
    coordinates: LatLon;
    name: string;
}

export class RealWorld extends PickableWorld {
    private readonly nodeList: DemoNode[];
    constructor(holder: HTMLElement, initialCoords: LatLon, mapUrl: string) {
        super(holder, initialCoords, mapUrl);
        this.nodeList = [];
        for (let i = 0; i < 10000; i++) {

        }
    }
}

const world = new PickableWorld(
    document.querySelector("#threeHolder"),
    new LatLon(40, 100, 1.1),
    "world.topo.bathy.200407.3x5400x2700.jpg"
);
world.start();