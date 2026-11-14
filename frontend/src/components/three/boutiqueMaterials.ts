// Material factory for the quality tiers. On medium/high, surfaces are
// physically based (MeshStandardMaterial). On low they fall back to the much
// cheaper Lambert (matte) and Phong (metals and gloss) models: no GGX or
// image-based lighting per pixel, which is most of the cost on integrated GPUs.
import * as THREE from "three";

type SurfaceParams = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  emissive?: THREE.ColorRepresentation;
  emissiveMap?: THREE.Texture | null;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  side?: THREE.Side;
};

/** A matte or glossy surface: Standard when `rich`, Lambert (or Phong if glossy/metal) otherwise. */
export function surface(rich: boolean, p: SurfaceParams): THREE.Material {
  if (rich) return new THREE.MeshStandardMaterial(p);
  const { roughness = 1, metalness = 0, envMapIntensity, ...rest } = p;
  void envMapIntensity;
  if (metalness > 0.5 || roughness < 0.3) {
    return new THREE.MeshPhongMaterial({
      ...rest,
      specular: metalness > 0.5 ? new THREE.Color(p.color ?? "#ffffff").multiplyScalar(0.9) : new THREE.Color("#444444"),
      shininess: Math.round(10 + (1 - roughness) * 80),
    });
  }
  return new THREE.MeshLambertMaterial(rest);
}
