const fs = require("fs")
const path = require("path")

const distDir = path.resolve(process.cwd(), "dist")
const iifeSource = path.join(distDir, "index.global.js")
const esmSource = path.join(distDir, "index.mjs")
const iifeTarget = path.join(distDir, "widget.js")
const esmTarget = path.join(distDir, "widget.mjs")

fs.copyFileSync(iifeSource, iifeTarget)
fs.copyFileSync(esmSource, esmTarget)

const dashboardWidgetPath = path.resolve(
  process.cwd(),
  "..",
  "..",
  "k256-app-dashboard",
  "public",
  "sdk",
  "widget.js"
)
fs.copyFileSync(iifeSource, dashboardWidgetPath)
