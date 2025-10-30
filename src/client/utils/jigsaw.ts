/**
 * Simple Jigsaw Puzzle Utility - Clean Implementation
 */

export interface JigsawPiece {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tabs: {
    top: boolean | null; // true = tab out, false = blank in, null = flat edge
    right: boolean | null;
    bottom: boolean | null;
    left: boolean | null;
  };
  path: string;
  imageData?: ImageData;
}

export interface JigsawConfig {
  rows: number;
  cols: number;
  tabSize: number;
  randomness: number;
}

/**
 * Simple jigsaw piece generation - no overcomplicated logic
 */
export function createJigsawPieces(
  image: HTMLImageElement | HTMLCanvasElement,
  config: JigsawConfig
): JigsawPiece[] {
  const { rows, cols, tabSize, randomness } = config;
  const pieceWidth = image.width / cols;
  const pieceHeight = image.height / rows;
  const pieces: JigsawPiece[] = [];

  // Create canvas for image data
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  console.log(`🧩 Creating simple ${rows}x${cols} jigsaw puzzle`);

  // Simple approach: create each piece individually
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const piece: JigsawPiece = {
        id: row * cols + col,
        row,
        col,
        x: col * pieceWidth,
        y: row * pieceHeight,
        width: pieceWidth,
        height: pieceHeight,
        tabs: createSimpleTabs(row, col, rows, cols),
        path: '',
      };

      // Generate path and image data
      piece.path = generatePiecePath(piece, pieceWidth, pieceHeight, tabSize, randomness);
      piece.imageData = extractPieceImageData(ctx, piece, pieceWidth, pieceHeight, tabSize);

      pieces.push(piece);
    }
  }

  console.log(`✅ Created ${pieces.length} simple jigsaw pieces`);
  return pieces;
}

/**
 * Create simple, correct tabs for a piece
 */
function createSimpleTabs(row: number, col: number, rows: number, cols: number) {
  // Deterministic random based on position
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x) > 0.5;
  };

  return {
    // Border pieces get null (flat), interior pieces get true/false (tab/blank)
    top: row === 0 ? null : random(row * 1000 + col * 10 + 1),
    right: col === cols - 1 ? null : random(row * 1000 + col * 10 + 2),
    bottom: row === rows - 1 ? null : random(row * 1000 + col * 10 + 3),
    left: col === 0 ? null : random(row * 1000 + col * 10 + 4),
  };
}

/**
 * Generate SVG path for piece shape
 */
function generatePiecePath(
  piece: JigsawPiece,
  width: number,
  height: number,
  tabSize: number,
  randomness: number
): string {
  const tabWidth = width * tabSize;
  const tabHeight = height * tabSize;

  let path = `M 0 0`;

  // Top edge
  if (piece.tabs.top === null) {
    path += ` L ${width} 0`;
  } else {
    const midX = width / 2;
    const tabY = piece.tabs.top ? -tabHeight : tabHeight;
    path += ` L ${midX - tabWidth / 2} 0`;
    path += ` Q ${midX - tabWidth / 2} ${tabY / 2} ${midX} ${tabY}`;
    path += ` Q ${midX + tabWidth / 2} ${tabY / 2} ${midX + tabWidth / 2} 0`;
    path += ` L ${width} 0`;
  }

  // Right edge
  if (piece.tabs.right === null) {
    path += ` L ${width} ${height}`;
  } else {
    const midY = height / 2;
    const tabX = piece.tabs.right ? width + tabWidth : width - tabWidth;
    path += ` L ${width} ${midY - tabHeight / 2}`;
    path += ` Q ${width + tabWidth / 2} ${midY - tabHeight / 2} ${tabX} ${midY}`;
    path += ` Q ${width + tabWidth / 2} ${midY + tabHeight / 2} ${width} ${midY + tabHeight / 2}`;
    path += ` L ${width} ${height}`;
  }

  // Bottom edge
  if (piece.tabs.bottom === null) {
    path += ` L 0 ${height}`;
  } else {
    const midX = width / 2;
    const tabY = piece.tabs.bottom ? height + tabHeight : height - tabHeight;
    path += ` L ${midX + tabWidth / 2} ${height}`;
    path += ` Q ${midX + tabWidth / 2} ${height + tabHeight / 2} ${midX} ${tabY}`;
    path += ` Q ${midX - tabWidth / 2} ${height + tabHeight / 2} ${midX - tabWidth / 2} ${height}`;
    path += ` L 0 ${height}`;
  }

  // Left edge
  if (piece.tabs.left === null) {
    path += ` L 0 0`;
  } else {
    const midY = height / 2;
    const tabX = piece.tabs.left ? -tabWidth : tabWidth;
    path += ` L 0 ${midY + tabHeight / 2}`;
    path += ` Q ${-tabWidth / 2} ${midY + tabHeight / 2} ${tabX} ${midY}`;
    path += ` Q ${-tabWidth / 2} ${midY - tabHeight / 2} 0 ${midY - tabHeight / 2}`;
    path += ` L 0 0`;
  }

  path += ` Z`;
  return path;
}

/**
 * Extract image data for piece
 */
function extractPieceImageData(
  ctx: CanvasRenderingContext2D,
  piece: JigsawPiece,
  width: number,
  height: number,
  tabSize: number
): ImageData {
  const tabWidth = width * tabSize;
  const tabHeight = height * tabSize;

  const extendedX = piece.x - (piece.tabs.left === true ? tabWidth : 0);
  const extendedY = piece.y - (piece.tabs.top === true ? tabHeight : 0);
  const extendedWidth =
    width + (piece.tabs.left === true ? tabWidth : 0) + (piece.tabs.right === true ? tabWidth : 0);
  const extendedHeight =
    height +
    (piece.tabs.top === true ? tabHeight : 0) +
    (piece.tabs.bottom === true ? tabHeight : 0);

  return ctx.getImageData(extendedX, extendedY, extendedWidth, extendedHeight);
}

/**
 * Create Phaser texture from piece
 */
export function createPieceTexture(
  scene: { textures: { addCanvas: (key: string, canvas: HTMLCanvasElement) => void } },
  piece: JigsawPiece,
  textureKey: string
): void {
  if (!piece.imageData) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  canvas.width = piece.imageData.width;
  canvas.height = piece.imageData.height;

  // Draw image data
  ctx.putImageData(piece.imageData, 0, 0);

  // Create mask
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Could not get 2D context for mask');

  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;

  const path2D = new Path2D(piece.path);
  maskCtx.fillStyle = 'white';
  maskCtx.fill(path2D);

  // Apply mask
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0);

  scene.textures.addCanvas(textureKey, canvas);
}

/**
 * Check if piece is border piece
 */
export function isBorderPiece(piece: JigsawPiece): boolean {
  return (
    piece.tabs.top === null ||
    piece.tabs.right === null ||
    piece.tabs.bottom === null ||
    piece.tabs.left === null
  );
}

/**
 * Get puzzle statistics
 */
export function getPuzzleStats(pieces: JigsawPiece[]) {
  let borderPieces = 0;
  let corners = 0;

  pieces.forEach((piece) => {
    const nullTabs = [piece.tabs.top, piece.tabs.right, piece.tabs.bottom, piece.tabs.left].filter(
      (tab) => tab === null
    ).length;

    if (nullTabs > 0) {
      borderPieces++;
      if (nullTabs === 2) corners++;
    }
  });

  return {
    total: pieces.length,
    borderPieces,
    interiorPieces: pieces.length - borderPieces,
    corners,
  };
}

/**
 * Shuffle pieces
 */
export function shufflePieces(
  pieces: JigsawPiece[],
  bounds: { width: number; height: number }
): void {
  pieces.forEach((piece) => {
    piece.x = Math.random() * (bounds.width - piece.width);
    piece.y = Math.random() * (bounds.height - piece.height);
  });
}

/**
 * Check if pieces can connect
 */
export function canPiecesConnect(piece1: JigsawPiece, piece2: JigsawPiece): boolean {
  const rowDiff = Math.abs(piece1.row - piece2.row);
  const colDiff = Math.abs(piece1.col - piece2.col);

  if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
    if (piece1.row === piece2.row) {
      // Horizontal connection
      if (piece1.col < piece2.col) {
        return (
          piece1.tabs.right !== null &&
          piece2.tabs.left !== null &&
          piece1.tabs.right !== piece2.tabs.left
        );
      } else {
        return (
          piece2.tabs.right !== null &&
          piece1.tabs.left !== null &&
          piece2.tabs.right !== piece1.tabs.left
        );
      }
    } else {
      // Vertical connection
      if (piece1.row < piece2.row) {
        return (
          piece1.tabs.bottom !== null &&
          piece2.tabs.top !== null &&
          piece1.tabs.bottom !== piece2.tabs.top
        );
      } else {
        return (
          piece2.tabs.bottom !== null &&
          piece1.tabs.top !== null &&
          piece2.tabs.bottom !== piece1.tabs.top
        );
      }
    }
  }

  return false;
}
