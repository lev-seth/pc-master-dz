// Generates js/data.js from the cloned catalog (catalog/data/*.json)
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const catalogData = path.join(root, "catalog", "data");

const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(catalogData, name), "utf8"));

const products = read("products.json");
const categoryTree = read("categories.json");
const brands = read("brands.json");
const lookups = read("lookups.json");

// Flat map of category slug -> { slug, name, parent, specs }
const flat = {};
const walk = (nodes, parent) => {
  for (const node of nodes) {
    flat[node.slug] = {
      slug: node.slug,
      name: node.name,
      parent: parent || null,
      specs: (node.specs || []).map((s) => ({
        key: s.key,
        type: s.type,
        label: s.label,
        unit: s.unit,
        options: s.options,
      })),
    };
    if (node.children) walk(node.children, node.slug);
  }
};
walk(categoryTree, null);

const out =
  "/* Auto-generated from catalog/data — do not edit by hand. Run: node tools/build-data.js */\n" +
  "window.CATALOG = " +
  JSON.stringify({ products, categories: flat, brands, lookups }) +
  ";\n";

const outDir = path.join(root, "js");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "data.js"), out, "utf8");
console.log(
  "Wrote js/data.js:",
  (out.length / 1024).toFixed(1) + " KB,",
  products.length,
  "products,",
  Object.keys(flat).length,
  "categories"
);
