import * as THREE from 'three';

/**
 * Exports a Three.js Object3D / Group hierarchy to a binary .GLB file
 * and triggers a client-side browser download.
 */
export async function exportHouseToGLB(
  object: THREE.Object3D,
  filename = 'architectural-villa-3d.glb',
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();

    exporter.parse(
      object,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          const blob = new Blob([gltf], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          const output = JSON.stringify(gltf, null, 2);
          const blob = new Blob([output], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename.replace('.glb', '.gltf');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      },
      (error) => {
        console.error('Failed to export 3D model to GLB:', error);
      },
      {
        binary: true,
        onlyVisible: true,
        embedImages: true,
      },
    );
  } catch (err) {
    console.error('Error importing GLTFExporter or executing export:', err);
  }
}

