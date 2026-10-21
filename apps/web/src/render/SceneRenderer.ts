import {
  ACESFilmicToneMapping,
  Color,
  Group,
  HemisphereLight,
  Mesh,
  Texture,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PMREMGenerator,
  Raycaster,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BALL_RADIUS, type Vec2 } from '@sinuca/core';
import type { GameController } from '../game/GameController';
import { AimGuide } from './AimGuide';
import { BallModels } from './BallModels';
import { CueModel } from './CueModel';
import { createMaterials } from './materials';
import { buildTableModel } from './table/TableModel';

const FOV = 30;
const LAMP_HEIGHT = 1150;

/**
 * Cena 3D da mesa: luz de duas luminárias sobre a mesa com sombras suaves,
 * reflexos de ambiente nas bolas e câmera de cima que se adapta a paisagem e retrato.
 */
export class SceneRenderer {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 50, 8000);
  private readonly world = new Group();
  private readonly balls: BallModels;
  private readonly cue: CueModel;
  private readonly guide: AimGuide;
  private readonly raycaster = new Raycaster();
  private readonly pickPlane = new Plane(new Vector3(0, 1, 0), -BALL_RADIUS);
  private portrait = false;
  draggingCue = false;

  constructor(
    container: HTMLElement,
    private readonly game: GameController,
  ) {
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.renderer.setClearColor(new Color('#090e10'), 0);
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;
    pmrem.dispose();

    const { length: L, width: W } = game.table.spec;
    this.world.position.set(-L / 2, 0, -W / 2);
    this.scene.add(this.world);

    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    const materials = createMaterials(aniso);
    this.world.add(buildTableModel(game.table, materials));
    this.balls = new BallModels(aniso);
    this.world.add(this.balls.group);
    this.cue = new CueModel(materials);
    this.world.add(this.cue.root);
    this.guide = new AimGuide(game.table);
    this.world.add(this.guide.group);

    this.scene.add(new HemisphereLight(0xe6efe9, 0x1a120c, 0.65));
    for (const x of [L / 4, (L * 3) / 4]) {
      const lamp = new SpotLight(0xfff1dc, 3.6, 0, 0.95, 0.75, 0);
      lamp.position.set(x, LAMP_HEIGHT, W / 2);
      lamp.target.position.set(x, 0, W / 2);
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(2048, 2048);
      lamp.shadow.camera.near = 400;
      lamp.shadow.camera.far = 1800;
      lamp.shadow.bias = -0.0004;
      lamp.shadow.radius = 4;
      this.world.add(lamp, lamp.target);
    }
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    this.portrait = height > width * 1.05;
    const aspect = width / Math.max(1, height);
    this.camera.aspect = aspect;
    const { length: L, width: W, railWidth: rw } = this.game.table.spec;
    const halfLong = L / 2 + rw + 30;
    const halfShort = W / 2 + rw + 30;
    const t = Math.tan(((FOV / 2) * Math.PI) / 180);
    const [vertical, horizontal] = this.portrait ? [halfLong, halfShort] : [halfShort, halfLong];
    const h = Math.max(vertical / t, horizontal / (t * aspect)) + 60;
    this.camera.position.set(0, h, 0);
    this.camera.up.set(this.portrait ? -1 : 0, 0, this.portrait ? 0 : -1);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = h * 0.3;
    this.camera.far = h + 600;
    this.camera.updateProjectionMatrix();
  }

  /** Converte um ponto da tela para coordenadas da mesa (mm), na altura do centro das bolas. */
  pick(clientX: number, clientY: number): Vec2 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new Vector3();
    if (!this.raycaster.ray.intersectPlane(this.pickPlane, hit)) return null;
    return { x: hit.x - this.world.position.x, y: hit.z - this.world.position.z };
  }

  render(time: number): void {
    const g = this.game;
    this.balls.update(g);
    const cue = g.cueBall;
    this.cue.update(
      cue.x,
      cue.y,
      g.aim,
      g.power * 240,
      g.spin,
      g.canAct && cue.active && !this.draggingCue,
    );
    this.guide.update(g, time, this.draggingCue);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    const geometries = new Set<Mesh['geometry']>();
    const materials = new Set<import('three').Material>();
    const textures = new Set<Texture>();
    this.scene.traverse((object) => {
      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material))
            if (value instanceof Texture) textures.add(value);
        }
      }
      if (object instanceof SpotLight) object.shadow.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
