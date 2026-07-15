import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reviewDir = path.join(root, "product", "journey-reviews");

const requiredHeadings = [
  "## User Story",
  "## One Next Action",
  "## Screenshots",
  "## Wireframe Read",
  "## Product Gate",
  "## Visual Quality Gate",
  "## Findings",
  "## Fixes",
  "## Decision",
];

const productScores = ["Friction", "Trust", "Clarity", "Language", "Total", "Decision"];
const visualScores = [
  "Hierarchy",
  "Spacing",
  "Typography",
  "Shape system",
  "Color discipline",
  "Copy tightness",
  "State timing",
  "Mobile fit",
  "Desktop fit",
  "Comparative bar",
  "Total",
  "Decision",
];

function fail(message) {
  console.error(`journey review validation failed: ${message}`);
  process.exitCode = 1;
}

function parseSection(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start === -1) return "";
  const next = markdown.slice(start + heading.length).match(/\n## /);
  const end = next ? start + heading.length + next.index : markdown.length;
  return markdown.slice(start, end);
}

function parseTotal(section) {
  const match = section.match(/-\s*Total:\s*(\d+(?:\.\d+)?)\s*\/10/i);
  return match ? Number(match[1]) : null;
}

function parseDecision(section) {
  const match = section.match(/-\s*Decision:\s*(PASS|FAIL)/i);
  return match ? match[1].toUpperCase() : null;
}

function validateScoreLines(file, sectionName, section, labels) {
  for (const label of labels) {
    const pattern =
      label === "Decision"
        ? new RegExp(`-\\s*${label}:\\s*(PASS|FAIL)`, "i")
        : new RegExp(`-\\s*${label}:\\s*\\d+(?:\\.\\d+)?\\s*/\\d+`, "i");
    if (!pattern.test(section)) {
      fail(`${file} missing ${sectionName} score line: ${label}`);
    }
  }
}

function validateScreenshots(file, section, decision) {
  const screenshotRefs = [...section.matchAll(/`([^`]+\.(?:png|jpg|jpeg|webp))`/gi)].map((match) => match[1]);
  if (decision === "PASS" && screenshotRefs.length < 3) {
    fail(`${file} is PASS but has fewer than 3 screenshot references`);
  }
  for (const ref of screenshotRefs) {
    const fullPath = path.join(root, ref);
    if (!fs.existsSync(fullPath)) {
      fail(`${file} references missing screenshot: ${ref}`);
    }
  }
}

if (!fs.existsSync(reviewDir)) {
  fail("product/journey-reviews directory does not exist");
} else {
  const files = fs
    .readdirSync(reviewDir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .sort();

  if (files.length === 0) {
    fail("no journey review files found");
  }

  for (const file of files) {
    const fullPath = path.join(reviewDir, file);
    const markdown = fs.readFileSync(fullPath, "utf8");

    for (const heading of requiredHeadings) {
      if (!markdown.includes(heading)) {
        fail(`${file} missing required heading: ${heading}`);
      }
    }

    const productGate = parseSection(markdown, "## Product Gate");
    const visualGate = parseSection(markdown, "## Visual Quality Gate");
    const screenshots = parseSection(markdown, "## Screenshots");
    const decisionSection = parseSection(markdown, "## Decision");

    validateScoreLines(file, "Product Gate", productGate, productScores);
    validateScoreLines(file, "Visual Quality Gate", visualGate, visualScores);

    const productTotal = parseTotal(productGate);
    const visualTotal = parseTotal(visualGate);
    const productDecision = parseDecision(productGate);
    const visualDecision = parseDecision(visualGate);
    const shipPass = /Ship decision:\s*PASS/i.test(decisionSection);

    if (productDecision === "PASS" && (productTotal === null || productTotal < 8)) {
      fail(`${file} Product Gate is PASS but total is below 8/10`);
    }
    if (visualDecision === "PASS" && (visualTotal === null || visualTotal < 8)) {
      fail(`${file} Visual Quality Gate is PASS but total is below 8/10`);
    }
    if (shipPass && (productDecision !== "PASS" || visualDecision !== "PASS")) {
      fail(`${file} ships PASS without both product and visual gates passing`);
    }

    validateScreenshots(file, screenshots, shipPass ? "PASS" : "FAIL");
  }

  if (!process.exitCode) {
    console.log(`Validated ${files.length} journey review(s).`);
  }
}
