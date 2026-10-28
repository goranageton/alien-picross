const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Palette: Authentic Game Boy 4-tone + accent glow
const PALETTE = {
  bg: [12, 36, 12, 255],        // #0c240c deep dark green
  darkest: [15, 56, 15, 255],   // #0f380f classic GB darkest
  dark: [48, 98, 48, 255],       // #306230 GB mid-dark
  light: [139, 172, 15, 255],   // #8bac0f GB mid-light
  bright: [155, 188, 15, 255],  // #9bbc0f GB brightest
  glow: [220, 255, 120, 255],   // #dcff78 eye glint & antenna glow
  trans: [0, 0, 0, 0]
};

// 24x24 pixel grid
// . = trans/bg, A = antenna/head bright, a = head light, D = dark outline, O = eye darkest, * = glow
const ALIEN_GRID_24 = [
  "........................",
  "....***..........***....",
  "...*****........*****...",
  "...*****........*****...",
  "....***..........***....",
  ".....DD..........DD.....",
  "......DD........DD......",
  ".......DD......DD.......",
  ".....DDDDDDDDDDDDDD.....",
  "...DDDAAAAAAAAAAAADDD...",
  "..DDAAAAAAAAAAAAAAAADD..",
  "..DAAAAAAAaAAAAAAAaaAD..",
  ".DAAAOOOOAAAAAAOOOOaaAD.",
  ".DAAOO**OOAAAAOO**OOaaD.",
  ".DAAOOOOOOAAAAOOOOOOaaD.",
  ".DAAAOOOOAAAAAAOOOOaaAD.",
  "..DAAAAAAAAAaAAAAAAaaD..",
  "..DDAAAAAADDDDAAAAAaDD..",
  "...DDDAAAODDDDOAAADDD...",
  "....DDDDDAAAAAADDDDD....",
  "......DDDAAAAAADDD......",
  "...*...DDAAAAAADD...*...",
  "..***...DDDDDDDD...***..",
  "...*................*..."
];

function createPng(width, height, getPixel) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));
  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // filter byte None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }
  const idat = zlib.deflateSync(rawData);
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xEDB88320);
      }
    }
    return ~c;
  }
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function getGridColor(ch, isForegroundOnly) {
  switch (ch) {
    case 'A': return PALETTE.bright;
    case 'a': return PALETTE.light;
    case 'D': return PALETTE.dark;
    case 'O': return PALETTE.darkest;
    case '*': return PALETTE.glow;
    default: return isForegroundOnly ? PALETTE.trans : PALETTE.bg;
  }
}

function generateIconBuffer(size, isForegroundOnly = false, isRound = false) {
  const gridW = 24;
  const gridH = 24;
  // Apply circular crop if isRound
  const radius = size / 2;

  return createPng(size, size, (x, y) => {
    if (isRound) {
      const dx = x - radius + 0.5;
      const dy = y - radius + 0.5;
      if (dx * dx + dy * dy > radius * radius) {
        return PALETTE.trans;
      }
    }

    // Scale mapping with slight 10% padding so icon fits nicely in circle/squircle
    const padding = Math.floor(size * 0.08);
    const innerSize = size - padding * 2;
    if (x < padding || x >= size - padding || y < padding || y >= size - padding) {
      return isForegroundOnly ? PALETTE.trans : PALETTE.bg;
    }

    const gx = Math.floor(((x - padding) / innerSize) * gridW);
    const gy = Math.floor(((y - padding) / innerSize) * gridH);
    const ch = ALIEN_GRID_24[Math.min(gridH - 1, Math.max(0, gy))][Math.min(gridW - 1, Math.max(0, gx))];
    return getGridColor(ch, isForegroundOnly);
  });
}

// Android mipmap target dimensions
const MIPMAPS = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
];

const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

console.log('Generating Alien Pixel Icons for Android...');

MIPMAPS.forEach(({ folder, size, fgSize }) => {
  const targetDir = path.join(resDir, folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  // Standard square icon with rounded corners/full canvas
  const icLauncher = generateIconBuffer(size, false, false);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), icLauncher);

  // Round icon
  const icRound = generateIconBuffer(size, false, true);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), icRound);

  // Foreground adaptive icon (transparent background)
  const icFg = generateIconBuffer(fgSize, true, false);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), icFg);

  console.log(`Generated icons for ${folder} (${size}x${size}, fg ${fgSize}x${fgSize})`);
});

// Update ic_launcher_background.xml to Game Boy dark green
const bgXmlPath = path.join(resDir, 'values', 'ic_launcher_background.xml');
fs.writeFileSync(bgXmlPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0c240c</color>
</resources>
`);
console.log('Updated ic_launcher_background to #0c240c');

// Update mipmap-anydpi-v26 files to ensure adaptive launcher references foreground png or drawable
const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
if (fs.existsSync(anydpiDir)) {
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`);

  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`);
}

console.log('Successfully generated all Android Pixel Alien icons!');
