import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate a solid/gradient PNG buffer using raw PNG spec and zlib
function createPngBuffer(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // Deflate
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // No interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data: each row starts with filter byte 0
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None
    const gradientFactor = y / height;
    
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate distance from center for a modern rounded badge or circle
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.45;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      // Check if inside inner symbol (stylized checkmark or 'S' shape)
      const isInnerLogo = (
        (x > cx - radius * 0.5 && x < cx + radius * 0.5 && Math.abs(y - cy) < radius * 0.15) ||
        (Math.abs(x - cx) < radius * 0.15 && y > cy - radius * 0.5 && y < cy + radius * 0.5) ||
        (x > cx - radius * 0.35 && x < cx + radius * 0.35 && Math.abs((y - cy) - (x - cx) * 0.5) < radius * 0.12)
      );

      if (dist < radius) {
        if (isInnerLogo) {
          rawData[pxOffset] = 255; // White logo
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          // Sleek Indigo/Violet gradient
          rawData[pxOffset] = Math.min(255, Math.floor(79 + gradientFactor * 50));
          rawData[pxOffset + 1] = Math.min(255, Math.floor(70 + gradientFactor * 20));
          rawData[pxOffset + 2] = Math.min(255, Math.floor(229 - gradientFactor * 40));
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Outside rounded icon
        rawData[pxOffset] = 15;
        rawData[pxOffset + 1] = 23;
        rawData[pxOffset + 2] = 42;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation for PNG chunks
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

// Ensure directories
const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPngBuffer(192, 192, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPngBuffer(512, 512, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPngBuffer(512, 512, 99, 102, 241));
fs.writeFileSync(path.resolve('public/favicon.ico'), createPngBuffer(32, 32, 79, 70, 229));

console.log('✅ PWA Icons generated successfully in public/icons/');
