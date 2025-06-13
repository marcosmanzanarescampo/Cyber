import fs from "fs";
import path from "path";

const routesDir = "./backend/routes"; // adapte si besoin

function extractRoutesWithParams(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const matches = [];

  lines.forEach((line, idx) => {
    // chercher router.<method>(<string contenant ':')
    const routeRegex =
      /router\.(get|post|patch|delete|put|all)\s*\(\s*["'`](.+)["'`]/i;
    const match = line.match(routeRegex);
    if (match) {
      const routePath = match[2];
      if (routePath.includes(":")) {
        matches.push({
          file: filePath,
          line: idx + 1,
          route: routePath.trim(),
          method: match[1].toUpperCase(),
        });
      }
    }
  });

  return matches;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith(".js")) {
      results = results.concat(extractRoutesWithParams(filePath));
    }
  });
  return results;
}

const routesWithParams = walk(routesDir);

if (routesWithParams.length === 0) {
  console.log("Aucune route paramétrée détectée.");
} else {
  console.log("Routes paramétrées détectées :");
  routesWithParams.forEach(({ file, line, route, method }) => {
    console.log(`- ${method} ${route}  (fichier: ${file} ligne: ${line})`);
  });
}
