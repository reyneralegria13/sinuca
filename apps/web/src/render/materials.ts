import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import { createFeltTextures } from './textures/feltTexture';
import { createWoodTextures, MAPLE, WALNUT } from './textures/woodTexture';

export const FELT_COLOR = '#197c65';

export function createMaterials(maxAnisotropy: number) {
  const felt = createFeltTextures(maxAnisotropy);
  const walnut = createWoodTextures(WALNUT, 900, maxAnisotropy, 3);
  const maple = createWoodTextures(MAPLE, 600, maxAnisotropy, 9);

  return {
    felt: new MeshPhysicalMaterial({
      color: new Color(FELT_COLOR),
      map: felt.map,
      bumpMap: felt.bumpMap,
      bumpScale: 0.35,
      roughness: 0.93,
      sheen: 1,
      sheenRoughness: 0.75,
      sheenColor: new Color('#4fae8c'),
      envMapIntensity: 0.25,
    }),
    cushion: new MeshPhysicalMaterial({
      color: new Color('#125b49'),
      map: felt.map,
      bumpMap: felt.bumpMap,
      bumpScale: 0.35,
      roughness: 0.92,
      sheen: 1,
      sheenRoughness: 0.7,
      sheenColor: new Color('#4fae8c'),
      envMapIntensity: 0.25,
    }),
    rail: new MeshPhysicalMaterial({
      map: walnut.map,
      roughnessMap: walnut.roughnessMap,
      roughness: 0.55,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.7,
    }),
    brass: new MeshPhysicalMaterial({
      color: '#b99c60',
      metalness: 0.8,
      roughness: 0.38,
      envMapIntensity: 0.65,
    }),
    leather: new MeshStandardMaterial({ color: '#170d07', roughness: 0.55, envMapIntensity: 0.3 }),
    pocketLiner: new MeshStandardMaterial({
      color: '#020202',
      roughness: 1,
      side: DoubleSide,
      envMapIntensity: 0,
    }),
    pocketBottom: new MeshStandardMaterial({ color: '#010101', roughness: 1, envMapIntensity: 0 }),
    pearl: new MeshPhysicalMaterial({
      color: '#efe9db',
      roughness: 0.22,
      clearcoat: 1,
      iridescence: 0.7,
      iridescenceIOR: 1.6,
      envMapIntensity: 1,
    }),
    spot: new MeshStandardMaterial({
      color: '#e9e4d4',
      roughness: 0.9,
      transparent: true,
      opacity: 0.75,
    }),
    slate: new MeshStandardMaterial({ color: '#050806', roughness: 1 }),
    shaft: new MeshPhysicalMaterial({
      map: maple.map,
      roughnessMap: maple.roughnessMap,
      roughness: 0.4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.8,
    }),
    butt: new MeshPhysicalMaterial({
      map: walnut.map,
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1,
    }),
    ferrule: new MeshPhysicalMaterial({ color: '#f4f0e4', roughness: 0.3, clearcoat: 0.5 }),
    tip: new MeshStandardMaterial({ color: '#3e7fbf', roughness: 0.85 }),
    ring: new MeshPhysicalMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.25 }),
    wrap: new MeshStandardMaterial({ color: '#1b1612', roughness: 0.8 }),
    bumper: new MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.7 }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;
