import {
  BufferGeometry,
  InstancedMesh,
  Material,
  ShaderMaterial,
  Texture,
  type Object3D,
} from 'three';

export interface DisposeCounts {
  readonly geometries: number;
  readonly materials: number;
  readonly textures: number;
}

type WithGeometry = Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };

/**
 * Releases every GPU resource under `root`: geometries, materials and the textures they reference
 * (including shader uniforms). Shared resources are counted and disposed once. Returns what was released, so
 * leak tests can assert that nothing was left behind (ARCHITECTURE.md S12).
 */
export function disposeObject(root: Object3D): DisposeCounts {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();

  const collectTextures = (material: Material): void => {
    for (const value of Object.values(material)) {
      if (value instanceof Texture) textures.add(value);
    }
    if (material instanceof ShaderMaterial) {
      for (const uniform of Object.values(material.uniforms)) {
        if (uniform.value instanceof Texture) textures.add(uniform.value);
      }
    }
  };

  root.traverse((object) => {
    const item = object as WithGeometry;
    if (item.geometry) geometries.add(item.geometry);
    const material = item.material;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      materials.add(m);
      collectTextures(m);
    }
    if (object instanceof InstancedMesh) object.dispose();
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  return { geometries: geometries.size, materials: materials.size, textures: textures.size };
}
