// de Bruijn pentagrid → Penrose rhombus tiling (dual construction)
let FAMILY_COUNT = 5;
let ANGLE_STEP = (2 * Math.PI) / FAMILY_COUNT;
const PALETTES = {
  qingxin: [
    "#F3FAF9",
    "#EAF4F4",
    "#FBE7F0",
    "#DDEFEA",
    "#CCE3DE",
    "#F7DCE8",
    "#BFDCD2",
    "#A4C3B2",
    "#E6F4DA",
    "#D8E2DC",
    "#E4EEDC",
    "#FFF2B3",
    "#F6F4D2",
    "#FFE6A7",
    "#F9F7E8",
  ],
  yan: [
    "#FAFCFD",
    "#F4F8FA",
    "#EEF4F7",
    "#E9F0F4",
    "#E3EBF0",
    "#DFE7EC",
    "#EDE6ED",
    "#E8ECE5",
    "#F1EEE3",
    "#D8E2E9",
    "#D1DCE5",
    "#C9D6E0",
    "#C3D0DB",
    "#BCCAD6",
  ],
};

let seed = 1;
let lineSpacing = 60; // Will be redefined in rebuild
let lineRange = 12; // Will be redefined in rebuild
let edgeLength = 40; // Will be redefined in rebuild
let familyOffsets = [];
let familyNormals = [];
let familyVectors = [];
let paletteMode = "qingxin";

function setup() {
  createCanvas(windowWidth, windowHeight);
  smooth();
  // noLoop();
  rebuild();
}

function draw() {
  background(255);
  translate(width / 2, height / 2);
  drawTiles();
}

function rebuild() {
  randomSeed(seed);
  ANGLE_STEP = (2 * Math.PI) / FAMILY_COUNT;
  // Offsets set line phases; sum to 0 (mod 1) for a consistent pentagrid.
  const baseOffsets = Array.from({ length: FAMILY_COUNT - 1 }, () => random());
  const sum = baseOffsets.reduce((acc, v) => acc + v, 0);
  familyOffsets = [...baseOffsets, (1 - (sum % 1)) % 1];
  lineSpacing = max(40, min(width, height) / 18);
  edgeLength = lineSpacing;
  lineRange = Math.ceil(min(width, height) / lineSpacing) + 10;
  familyNormals = [];
  familyVectors = [];
  for (let i = 0; i < FAMILY_COUNT; i += 1) {
    const angle = ANGLE_STEP * i;
    const normal = createVector(Math.cos(angle), Math.sin(angle));
    familyNormals.push(normal);
    familyVectors.push(normal.copy().mult(edgeLength));
  }
  redraw();
}

function familyLineOffset(index, k) {
  return (k + familyOffsets[index]) * lineSpacing;
}

function intersectLines(n1, d1, n2, d2) {
  const det = n1.x * n2.y - n1.y * n2.x;
  if (abs(det) < 1e-6) return null;
  const x = (d1 * n2.y - d2 * n1.y) / det;
  const y = (n1.x * d2 - n2.x * d1) / det;
  return createVector(x, y);
}

function cellIndexAt(point) {
  return familyNormals.map((n, idx) => {
    // Which strip between parallel lines the point falls into.
    const t = (n.x * point.x + n.y * point.y) / lineSpacing - familyOffsets[idx];
    return Math.ceil(t - 1e-9);
  });
}

function vertexFromCellIndex(indexes) {
  const out = createVector(0, 0);
  for (let i = 0; i < FAMILY_COUNT; i += 1) {
    // Dual vertex = sum of family direction vectors scaled by indices.
    out.x += familyVectors[i].x * indexes[i];
    out.y += familyVectors[i].y * indexes[i];
  }
  return out;
}

function rhombusAt(i, j, k, l) {
  // Each intersection of two families corresponds to one rhombus in the dual.
  const n1 = familyNormals[i];
  const n2 = familyNormals[j];
  const d1 = familyLineOffset(i, k);
  const d2 = familyLineOffset(j, l);
  const intersection = intersectLines(n1, d1, n2, d2);
  if (!intersection) return null;

  const baseIndex = cellIndexAt(intersection);
  baseIndex[i] = k;
  baseIndex[j] = l;
  const v0 = vertexFromCellIndex(baseIndex);
  const v1 = p5.Vector.add(v0, familyVectors[i]);
  const v2 = p5.Vector.add(v1, familyVectors[j]);
  const v3 = p5.Vector.add(v0, familyVectors[j]);

  return [v0, v1, v2, v3];
}

function inViewport(points) {
  const limitX = width * 0.55;
  const limitY = height * 0.55;
  return points.some((p) => abs(p.x) < limitX && abs(p.y) < limitY);
}

function rhombusType(i, j) {
  const delta = abs(i - j);
  const angle = Math.min(delta, FAMILY_COUNT - delta) * ANGLE_STEP;
  // Use acute angle between families to decide thin (36°) vs thick (72°).
  const acute = Math.min(angle, Math.PI - angle);
  return acute > Math.PI / 5 ? "thick" : "thin";
}

function drawTiles() {
  const palette = PALETTES[paletteMode];
  const paletteSize = palette.length;
  for (let i = 0; i < FAMILY_COUNT; i += 1) {
    for (let j = i + 1; j < FAMILY_COUNT; j += 1) {
      const familyPair = i * FAMILY_COUNT + j;
      for (let k = -lineRange; k <= lineRange; k += 1) {
        for (let l = -lineRange; l <= lineRange; l += 1) {
          const corners = rhombusAt(i, j, k, l);
          if (!corners || !inViewport(corners)) continue;
          const colorSeed = familyPair + k + l;
          const colorIndex = ((colorSeed % paletteSize) + paletteSize) % paletteSize;
          const fillColor = palette[colorIndex];
          fill(fillColor);
          stroke(13, 15, 26, 140);
          strokeWeight(1);
          beginShape();
          corners.forEach((p) => vertex(p.x, p.y));
          endShape(CLOSE);
        }
      }
    }
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    FAMILY_COUNT = min(FAMILY_COUNT + 1, 10);
    rebuild();
  } else if (keyCode === DOWN_ARROW) {
    FAMILY_COUNT = max(FAMILY_COUNT - 1, 3);
    rebuild();
  } else if (key === "r" || key === "R") {
    seed += 1;
    rebuild();
  } else if (key === "c" || key === "C") {
    paletteMode = paletteMode === "qingxin" ? "yan" : "qingxin";
    redraw();
  } else if (key === "s" || key === "S") {
    saveCanvas(`penrose-pentagrid-${seed}`, "png");
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuild();
}
