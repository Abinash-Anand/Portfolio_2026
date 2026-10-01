import {
  BoxGeometry,
  DataTexture,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
} from 'three';
import { disposeObject } from './dispose';

const texture = () => new DataTexture(new Uint8Array(4), 1, 1);

describe('disposeObject', () => {
  it('releases geometries, materials and textures, counting each shared resource once', () => {
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial({ map: texture() });
    const group = new Group();
    group.add(
      new Mesh(geometry, material),
      new Mesh(geometry, material),
      new Mesh(new BoxGeometry()),
    );

    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(material.map as DataTexture, 'dispose');

    const counts = disposeObject(group);

    expect(counts.geometries).toBe(2);
    expect(counts.materials).toBe(2); // the shared one, and the default material of the third mesh
    expect(counts.textures).toBe(1);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });

  it('finds textures held in shader uniforms, which a plain material walk would miss', () => {
    const atlas = texture();
    const shader = new ShaderMaterial({
      uniforms: { uAtlas: { value: atlas }, uTime: { value: 0 } },
    });
    const dispose = vi.spyOn(atlas, 'dispose');

    const counts = disposeObject(new Mesh(new BoxGeometry(), shader));

    expect(counts.textures).toBe(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes instanced meshes, which keep their own instance buffers', () => {
    const mesh = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), 4);
    const dispose = vi.spyOn(mesh, 'dispose');
    disposeObject(mesh);
    expect(dispose).toHaveBeenCalled();
  });

  it('handles arrays of materials and an empty group', () => {
    const mesh = new Mesh(new BoxGeometry(), [new MeshBasicMaterial(), new MeshBasicMaterial()]);
    expect(disposeObject(mesh).materials).toBe(2);
    expect(disposeObject(new Group())).toEqual({ geometries: 0, materials: 0, textures: 0 });
  });
});
