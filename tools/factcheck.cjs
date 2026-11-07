#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and MedicalBooks contributors. MIT. */
/* Run every book's own regression checks (<slug>/scripts/*.cjs) from the book's folder, as in its own repository. */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const books = JSON.parse(fs.readFileSync(path.join(ROOT, "book.json"), "utf8")).books.map((entry) => path.dirname(entry));
let failed = 0;
for (const book of books) {
  const dir = path.join(ROOT, book, "scripts");
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".cjs")).sort()) {
    try {
      execFileSync(process.execPath, [path.join(dir, file)], { cwd: path.join(ROOT, book), stdio: ["ignore", "pipe", "pipe"] });
      console.log(`ok   ${book}/scripts/${file}`);
    } catch (error) {
      failed++;
      console.log(`FAIL ${book}/scripts/${file}\n${String(error.stderr || error.stdout || error.message).trim()}`);
    }
  }
}
process.exit(failed ? 1 : 0);
