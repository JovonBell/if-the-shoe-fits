/**
 * Load foot.glb and measure its actual bounding box dimensions.
 * This is used to verify TEMPLATE_DIMENSIONS in mesh-deform.ts.
 *
 * The GLB was generated with target dimensions:
 * Y (length) = 270mm, X (width) = 100mm, Z (height) = 80mm
 *
 * We verify by reading the GLB binary and parsing the POSITION accessor.
 */

import { readFileSync } from 'fs';
import * as THREE from 'three';

// Read the GLB file
const glbBuffer = readFileSync('/Users/joshuabellhome/if-the-shoe-fits/public/models/foot.glb');

// Parse GLB binary format
// Header: magic(4) + version(4) + length(4) = 12 bytes
const magic = glbBuffer.readUInt32LE(0);
const version = glbBuffer.readUInt32LE(4);
const totalLength = glbBuffer.readUInt32LE(8);

if (magic !== 0x46546C67) {
  console.error('Not a valid GLB file');
  process.exit(1);
}

console.log('GLB version:', version, '| Total size:', totalLength, 'bytes');

// Chunk 0 (JSON)
const chunk0Length = glbBuffer.readUInt32LE(12);
const chunk0Type = glbBuffer.readUInt32LE(16);
const jsonStr = glbBuffer.slice(20, 20 + chunk0Length).toString('utf8').trimEnd();
const gltf = JSON.parse(jsonStr);

// Chunk 1 (BIN)
const binOffset = 20 + chunk0Length;
const chunk1Length = glbBuffer.readUInt32LE(binOffset);
const binData = glbBuffer.slice(binOffset + 8, binOffset + 8 + chunk1Length);

console.log('Mesh primitives:', gltf.meshes[0].primitives.length);

// Get the POSITION accessor (index 0)
const posAccessor = gltf.accessors[0];
const posView = gltf.bufferViews[posAccessor.bufferView];

console.log('Position accessor:', {
  count: posAccessor.count,
  type: posAccessor.type,
  componentType: posAccessor.componentType,
});

// Read positions from binary buffer
const posStart = posView.byteOffset + (posAccessor.byteOffset || 0);
const positions = new Float32Array(binData.buffer, binData.byteOffset + posStart, posAccessor.count * 3);

let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

for (let i = 0; i < posAccessor.count; i++) {
  const x = positions[i * 3 + 0];
  const y = positions[i * 3 + 1];
  const z = positions[i * 3 + 2];

  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  if (z < minZ) minZ = z;
  if (z > maxZ) maxZ = z;
}

const width = maxX - minX;
const length = maxY - minY;
const height = maxZ - minZ;

console.log('\n=== Actual GLB bounding box dimensions ===');
console.log(`Width  (X): ${width.toFixed(2)} mm  [min: ${minX.toFixed(2)}, max: ${maxX.toFixed(2)}]`);
console.log(`Length (Y): ${length.toFixed(2)} mm  [min: ${minY.toFixed(2)}, max: ${maxY.toFixed(2)}]`);
console.log(`Height (Z): ${height.toFixed(2)} mm  [min: ${minZ.toFixed(2)}, max: ${maxZ.toFixed(2)}]`);

// Also print from accessor min/max if available
if (posAccessor.min && posAccessor.max) {
  console.log('\nFrom accessor min/max:');
  console.log(`Width  (X): ${(posAccessor.max[0] - posAccessor.min[0]).toFixed(2)} mm`);
  console.log(`Length (Y): ${(posAccessor.max[1] - posAccessor.min[1]).toFixed(2)} mm`);
  console.log(`Height (Z): ${(posAccessor.max[2] - posAccessor.min[2]).toFixed(2)} mm`);
}

const TEMPLATE = { length_mm: 270, width_mm: 100, height_mm: 80 };
const discrepancyX = Math.abs(width - TEMPLATE.width_mm) / TEMPLATE.width_mm * 100;
const discrepancyY = Math.abs(length - TEMPLATE.length_mm) / TEMPLATE.length_mm * 100;
const discrepancyZ = Math.abs(height - TEMPLATE.height_mm) / TEMPLATE.height_mm * 100;

console.log('\n=== Comparison with TEMPLATE_DIMENSIONS ===');
console.log(`Width  discrepancy: ${discrepancyX.toFixed(1)}% (TEMPLATE.width_mm = ${TEMPLATE.width_mm})`);
console.log(`Length discrepancy: ${discrepancyY.toFixed(1)}% (TEMPLATE.length_mm = ${TEMPLATE.length_mm})`);
console.log(`Height discrepancy: ${discrepancyZ.toFixed(1)}% (TEMPLATE.height_mm = ${TEMPLATE.height_mm})`);

if (discrepancyX < 10 && discrepancyY < 10 && discrepancyZ < 10) {
  console.log('\nRESULT: TEMPLATE_DIMENSIONS matches GLB (all discrepancies < 10%). No update needed.');
} else {
  console.log('\nRESULT: TEMPLATE_DIMENSIONS NEEDS UPDATE. Actual dims:');
  console.log(`  length_mm: ${Math.round(length)},  // was ${TEMPLATE.length_mm}`);
  console.log(`  width_mm: ${Math.round(width)},   // was ${TEMPLATE.width_mm}`);
  console.log(`  height_mm: ${Math.round(height)},  // was ${TEMPLATE.height_mm}`);
}
