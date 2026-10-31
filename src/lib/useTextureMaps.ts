import { useEffect, useState } from "react";
import * as THREE from "three";
import type { GeneratedTextures } from "@/types";

export interface TextureMaps {
  facade?: THREE.Texture;
  floor?: THREE.Texture;
  roof?: THREE.Texture;
}

/** Load data-URL textures into tiling THREE textures (shared by viewers). */
export function useTextureMaps(textures: GeneratedTextures): TextureMaps {
  const [maps, setMaps] = useState<TextureMaps>({});

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    const entries = Object.entries(textures).filter(
      ([, v]) => typeof v === "string" && v.length > 0
    ) as Array<[string, string]>;
    if (entries.length === 0) {
      setMaps({});
      return;
    }
    Promise.all(
      entries.map(async ([key, url]) => {
        const tex = await loader.loadAsync(url);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(3, 3);
        return [key, tex] as const;
      })
    )
      .then((pairs) => {
        if (alive) setMaps(Object.fromEntries(pairs));
      })
      .catch(() => {
        if (alive) setMaps({});
      });
    return () => {
      alive = false;
    };
  }, [textures]);

  return maps;
}
