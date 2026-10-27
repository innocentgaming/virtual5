/**
 * Ultra-lightweight standalone QR Code matrix & SVG generator.
 * Supports Byte encoding (ISO-8859-1 / UTF-8 URLs and text) with Level L Error Correction.
 * Produces crisp, scalable SVG markup and downloadable SVG data URLs without third-party dependencies.
 */

// QR Code specification constants for Version 1 to 4 (fits URLs up to 78 chars, sufficient for website links)
interface QRVersionSpec {
  version: number;
  size: number;
  totalCodewords: number;
  dataCodewords: number;
  ecCodewords: number;
}

const QR_SPECS: QRVersionSpec[] = [
  { version: 1, size: 21, totalCodewords: 26, dataCodewords: 19, ecCodewords: 7 },
  { version: 2, size: 25, totalCodewords: 44, dataCodewords: 34, ecCodewords: 10 },
  { version: 3, size: 29, totalCodewords: 70, dataCodewords: 55, ecCodewords: 15 },
  { version: 4, size: 33, totalCodewords: 100, dataCodewords: 80, ecCodewords: 20 },
];

// Galois Field GF(256) tables for Reed-Solomon error correction
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMultiply(poly[j], GF_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function calculateReedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const result = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      result[j] ^= gfMultiply(gen[j], factor);
    }
  }
  return result;
}

/**
 * Encodes text into a QR Code 2D boolean grid (true = dark, false = light)
 */
export function generateQRMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text);
  const spec = QR_SPECS.find((s) => s.dataCodewords >= utf8.length + 3) || QR_SPECS[QR_SPECS.length - 1];
  const size = spec.size;

  // Initialize matrix and reserved flags
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean, reserved = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (reserved) isReserved[r][c] = true;
    }
  };

  // 1. Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isDark =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(nr, nc, isDark, true);
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0, true);
    setModule(i, 6, i % 2 === 0, true);
  }

  // 3. Dark module and format info reservation
  setModule(size - 8, 8, true, true);
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true;
    if (!isReserved[i][8]) isReserved[i][8] = true;
    if (!isReserved[8][size - 1 - i]) isReserved[8][size - 1 - i] = true;
    if (!isReserved[size - 1 - i][8]) isReserved[size - 1 - i][8] = true;
  }

  // 4. Alignment pattern for Version 2+
  if (spec.version >= 2) {
    const pos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        setModule(pos + r, pos + c, isBorder || isCenter, true);
      }
    }
  }

  // 5. Data stream assembly (Byte Mode: 0100)
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(utf8.length, 8); // Character count indicator
  for (const byte of utf8) pushBits(byte, 8);
  pushBits(0, Math.min(4, spec.dataCodewords * 8 - bits.length)); // Terminator
  while (bits.length % 8 !== 0) bits.push(0); // Pad to byte boundary

  const dataBytes = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < bits.length / 8 && i < spec.dataCodewords; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) byteVal = (byteVal << 1) | bits[i * 8 + b];
    dataBytes[i] = byteVal;
  }

  // Pad bytes 0xEC, 0x11
  let padToggle = false;
  for (let i = Math.floor(bits.length / 8); i < spec.dataCodewords; i++) {
    dataBytes[i] = padToggle ? 0x11 : 0xec;
    padToggle = !padToggle;
  }

  // 6. Reed Solomon Error Correction codewords
  const ecBytes = calculateReedSolomon(dataBytes, spec.ecCodewords);
  const totalStream = new Uint8Array(spec.totalCodewords);
  totalStream.set(dataBytes, 0);
  totalStream.set(ecBytes, spec.dataCodewords);

  // Flatten into final bits
  const finalBits: number[] = [];
  for (const byte of totalStream) {
    for (let b = 7; b >= 0; b--) finalBits.push((byte >> b) & 1);
  }

  // 7. Place data bits into matrix in zigzag 2-column paths
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isReserved[r][c]) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          setModule(r, c, (bit === 1) !== mask, false);
        }
      }
    }
    upwards = !upwards;
  }

  // 8. Write format bits (Mask 0 + Error Correction L = 0b111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  const formatCoordsTopLeft: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  const formatCoordsSplit: [number, number][] = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];

  for (let i = 0; i < 15; i++) {
    const isDark = formatBits[i] === 1;
    const [r1, c1] = formatCoordsTopLeft[i];
    const [r2, c2] = formatCoordsSplit[i];
    matrix[r1][c1] = isDark;
    matrix[r2][c2] = isDark;
  }

  return matrix;
}

/**
 * Returns clean SVG markup string for the given text
 */
export function generateQRSvg(
  text: string,
  options: { size?: number; fgColor?: string; bgColor?: string; quietZone?: number } = {}
): string {
  const { size = 220, fgColor = '#1f2937', bgColor = '#ffffff', quietZone = 2 } = options;
  const matrix = generateQRMatrix(text);
  const matrixSize = matrix.length;
  const totalCells = matrixSize + quietZone * 2;
  const cellSize = size / totalCells;

  let pathData = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = (c + quietZone) * cellSize;
        const y = (r + quietZone) * cellSize;
        pathData += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-label="QR Code linking to ${text}">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="8"/>
  <path d="${pathData}" fill="${fgColor}"/>
</svg>`;
}

/**
 * Generates an SVG Data URI suitable for <img src="..."> or instant downloads
 */
export function generateQRDataUrl(text: string, options?: { size?: number; fgColor?: string; bgColor?: string }): string {
  const svg = generateQRSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const generateQrCodeSvg = generateQRSvg;
export const generateQrCodeDataUrl = generateQRDataUrl;

