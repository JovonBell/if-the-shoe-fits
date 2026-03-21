/**
 * Generate a parametric foot GLB model using Three.js.
 * Creates a foot-shaped mesh (~270mm long, ~100mm wide, ~80mm tall)
 * and writes raw binary GLB manually to avoid browser API dependencies.
 *
 * GLB binary format reference:
 * https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
 *
 * Scale: 1 unit = 1mm in the exported model.
 */

import * as THREE from 'three';
import { writeFileSync } from 'fs';

/**
 * Build a foot-shaped geometry by merging several primitives.
 * The foot is oriented with heel at negative Y, toe at positive Y.
 * Units are in mm.
 */
function buildFootGeometry() {
  const mergedPositions = [];
  const mergedNormals = [];
  const mergedIndices = [];
  let indexOffset = 0;

  function addGeometry(geo, matrix) {
    const cloned = geo.clone();
    cloned.applyMatrix4(matrix);
    cloned.computeVertexNormals();

    const pos = cloned.attributes.position;
    const norm = cloned.attributes.normal;
    const idx = cloned.index;

    for (let i = 0; i < pos.count; i++) {
      mergedPositions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (norm) {
        mergedNormals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      } else {
        mergedNormals.push(0, 1, 0);
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        mergedIndices.push(idx.getX(i) + indexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        mergedIndices.push(i + indexOffset);
      }
    }

    indexOffset += pos.count;
  }

  // Heel sphere (rounded back of foot)
  const heelGeo = new THREE.SphereGeometry(42, 16, 12);
  addGeometry(heelGeo, new THREE.Matrix4().compose(
    new THREE.Vector3(0, -95, 20),
    new THREE.Quaternion(),
    new THREE.Vector3(1.0, 0.85, 0.9)
  ));

  // Main body box (arch + midsole region)
  const bodyGeo = new THREE.BoxGeometry(95, 160, 55, 4, 8, 4);
  addGeometry(bodyGeo, new THREE.Matrix4().compose(
    new THREE.Vector3(0, -10, 17),
    new THREE.Quaternion(),
    new THREE.Vector3(1, 1, 1)
  ));

  // Toe box
  const toeGeo = new THREE.BoxGeometry(85, 70, 40, 4, 4, 3);
  addGeometry(toeGeo, new THREE.Matrix4().compose(
    new THREE.Vector3(0, 95, 10),
    new THREE.Quaternion(),
    new THREE.Vector3(1, 1, 1)
  ));

  // Five toes as small spheres
  const toeOffsets = [
    { x: -32, y: 128, scale: new THREE.Vector3(0.7, 0.55, 0.5), r: 14 },
    { x: -16, y: 135, scale: new THREE.Vector3(0.75, 0.65, 0.55), r: 16 },
    { x: 0,   y: 140, scale: new THREE.Vector3(0.9,  0.75, 0.6),  r: 18 },
    { x: 16,  y: 138, scale: new THREE.Vector3(0.85, 0.7, 0.58),  r: 17 },
    { x: 31,  y: 130, scale: new THREE.Vector3(0.8,  0.6, 0.5),   r: 15 },
  ];

  for (const toe of toeOffsets) {
    const tGeo = new THREE.SphereGeometry(toe.r, 8, 6);
    addGeometry(tGeo, new THREE.Matrix4().compose(
      new THREE.Vector3(toe.x, toe.y, 8),
      new THREE.Quaternion(),
      toe.scale
    ));
  }

  // Ankle
  const ankleGeo = new THREE.CylinderGeometry(28, 35, 50, 12);
  addGeometry(ankleGeo, new THREE.Matrix4().compose(
    new THREE.Vector3(0, -105, 55),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0)),
    new THREE.Vector3(1, 1, 1)
  ));

  // Build merged geometry
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNormals, 3));
  merged.setIndex(mergedIndices);
  merged.computeVertexNormals();

  return merged;
}

// Build raw geometry
const geometry = buildFootGeometry();
geometry.computeBoundingBox();
const bbox = geometry.boundingBox;
const rawSize = new THREE.Vector3();
bbox.getSize(rawSize);
console.log('Raw bounding box:', rawSize);

// Scale to target: Y=270mm (length), X=100mm (width), Z=80mm (height)
const targetLength = 270;
const targetWidth  = 100;
const targetHeight = 80;

const scaleX = targetWidth  / rawSize.x;
const scaleY = targetLength / rawSize.y;
const scaleZ = targetHeight / rawSize.z;

const positions = geometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  positions.setX(i, positions.getX(i) * scaleX);
  positions.setY(i, positions.getY(i) * scaleY);
  positions.setZ(i, positions.getZ(i) * scaleZ);
}
positions.needsUpdate = true;
geometry.computeVertexNormals();
geometry.computeBoundingBox();
geometry.center();

const finalBbox = geometry.boundingBox;
const finalSize = new THREE.Vector3();
finalBbox.getSize(finalSize);
console.log('Final bounding box (should be ~270 x 100 x 80):', {
  x: finalSize.x.toFixed(1),
  y: finalSize.y.toFixed(1),
  z: finalSize.z.toFixed(1),
});

// === Manual GLB writer ===
// We write GLTF JSON + binary buffer chunk manually to avoid FileReader dependency.

function writeGLB(geometry) {
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const indexAttr = geometry.index;

  const vertexCount = posAttr.count;
  const indexCount = indexAttr ? indexAttr.count : 0;

  // Collect position data as Float32
  const posArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    posArray[i * 3 + 0] = posAttr.getX(i);
    posArray[i * 3 + 1] = posAttr.getY(i);
    posArray[i * 3 + 2] = posAttr.getZ(i);
  }

  // Collect normal data as Float32
  const normArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    normArray[i * 3 + 0] = normAttr.getX(i);
    normArray[i * 3 + 1] = normAttr.getY(i);
    normArray[i * 3 + 2] = normAttr.getZ(i);
  }

  // Collect index data as Uint32 (use Uint16 if possible)
  let indexArray;
  let indexComponentType;
  if (vertexCount <= 65535) {
    indexArray = new Uint16Array(indexCount);
    indexComponentType = 5123; // UNSIGNED_SHORT
  } else {
    indexArray = new Uint32Array(indexCount);
    indexComponentType = 5125; // UNSIGNED_INT
  }
  for (let i = 0; i < indexCount; i++) {
    indexArray[i] = indexAttr.getX(i);
  }

  // Compute min/max for position accessor
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = posArray[i * 3], y = posArray[i * 3 + 1], z = posArray[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  // Binary buffer layout:
  // [0]   position: Float32 * vertexCount * 3
  // [1]   normal:   Float32 * vertexCount * 3
  // [2]   indices:  Uint16/Uint32 * indexCount  (padded to 4 bytes)
  const posBytes = posArray.byteLength;   // vertexCount * 3 * 4
  const normBytes = normArray.byteLength; // vertexCount * 3 * 4
  const idxBytes = indexArray.byteLength;
  const idxPadded = (idxBytes + 3) & ~3; // pad to 4 bytes

  const totalBinaryBytes = posBytes + normBytes + idxPadded;
  const binaryBuffer = Buffer.alloc(totalBinaryBytes, 0);

  // Copy position data
  const posNodeBuf = Buffer.from(posArray.buffer);
  posNodeBuf.copy(binaryBuffer, 0);

  // Copy normal data
  const normNodeBuf = Buffer.from(normArray.buffer);
  normNodeBuf.copy(binaryBuffer, posBytes);

  // Copy index data
  const idxNodeBuf = Buffer.from(indexArray.buffer);
  idxNodeBuf.copy(binaryBuffer, posBytes + normBytes);

  // Build GLTF JSON
  const gltf = {
    asset: { version: '2.0', generator: 'if-the-shoe-fits foot generator' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'Foot' }],
    meshes: [{
      name: 'FootMesh',
      primitives: [{
        attributes: {
          POSITION: 0,
          NORMAL: 1,
        },
        indices: 2,
        material: 0,
        mode: 4, // TRIANGLES
      }]
    }],
    materials: [{
      name: 'FootSkin',
      pbrMetallicRoughness: {
        baseColorFactor: [0.831, 0.643, 0.514, 1.0],  // warm skin tone #D4A483
        metallicFactor: 0.0,
        roughnessFactor: 0.8,
      },
      doubleSided: false,
    }],
    accessors: [
      {
        // 0: POSITION
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3',
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
      },
      {
        // 1: NORMAL
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3',
      },
      {
        // 2: indices
        bufferView: 2,
        byteOffset: 0,
        componentType: indexComponentType,
        count: indexCount,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      {
        // 0: position
        buffer: 0,
        byteOffset: 0,
        byteLength: posBytes,
        target: 34962, // ARRAY_BUFFER
      },
      {
        // 1: normal
        buffer: 0,
        byteOffset: posBytes,
        byteLength: normBytes,
        target: 34962, // ARRAY_BUFFER
      },
      {
        // 2: indices
        buffer: 0,
        byteOffset: posBytes + normBytes,
        byteLength: idxBytes,
        target: 34963, // ELEMENT_ARRAY_BUFFER
      },
    ],
    buffers: [{
      byteLength: totalBinaryBytes,
    }],
  };

  const jsonStr = JSON.stringify(gltf);
  // Pad JSON to 4 bytes
  const jsonPadded = jsonStr.padEnd(Math.ceil(jsonStr.length / 4) * 4, ' ');
  const jsonBytes = Buffer.from(jsonPadded, 'utf8');

  // GLB structure:
  // Header: magic(4) + version(4) + length(4) = 12 bytes
  // Chunk 0 (JSON): chunkLength(4) + chunkType(4) + chunkData
  // Chunk 1 (BIN):  chunkLength(4) + chunkType(4) + chunkData
  const headerSize = 12;
  const chunk0HeaderSize = 8;
  const chunk1HeaderSize = 8;
  const totalSize = headerSize + chunk0HeaderSize + jsonBytes.length + chunk1HeaderSize + binaryBuffer.length;

  const glb = Buffer.alloc(totalSize);
  let offset = 0;

  // Header
  glb.writeUInt32LE(0x46546C67, offset); offset += 4; // magic 'glTF'
  glb.writeUInt32LE(2, offset); offset += 4;           // version 2
  glb.writeUInt32LE(totalSize, offset); offset += 4;   // total length

  // Chunk 0 (JSON)
  glb.writeUInt32LE(jsonBytes.length, offset); offset += 4;
  glb.writeUInt32LE(0x4E4F534A, offset); offset += 4; // 'JSON'
  jsonBytes.copy(glb, offset); offset += jsonBytes.length;

  // Chunk 1 (BIN)
  glb.writeUInt32LE(binaryBuffer.length, offset); offset += 4;
  glb.writeUInt32LE(0x004E4942, offset); offset += 4; // 'BIN\0'
  binaryBuffer.copy(glb, offset); offset += binaryBuffer.length;

  return glb;
}

const glbBuffer = writeGLB(geometry);
writeFileSync('/Users/joshuabellhome/if-the-shoe-fits/public/models/foot.glb', glbBuffer);
console.log(`\nWrote public/models/foot.glb: ${(glbBuffer.length / 1024).toFixed(1)} KB`);
console.log('Done!');
