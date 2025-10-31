#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { similarity } from './lcs.js';

const enc = { encoding: 'utf-8' };

const findBest = (pairs) =>
  pairs.reduce((acc, x) => (x.similarity > acc.similarity ? x : acc), {
    similarity: -1,
  });

const names = (x) => {
  return {
    title: x.catalog.title,
    icTitle: x.ic.courseName,
    courseNumber: x.ic.courseNumber,
    similarity: x.similarity,
  };
};

const matching = (a, b) =>
  a.catalog.title === b.catalog.title || a.ic.courseName === b.ic.courseName;

const match = (pairs) => {
  let newPairs = pairs;
  const matched = [];
  while (newPairs.length > 0) {
    const best = findBest(newPairs);
    matched.push(best);
    newPairs = newPairs.filter((x) => !matching(x, best));
  }
  return matched;
};

const nameSimilarity = (catalog, ic) => {
  const c = catalog.title.toLowerCase().trim();
  const i = ic.courseName
    .toLowerCase()
    .replace(/(?:\(\w+\)\s*)+$/, '')
    .trim();
  const s = similarity(c, i).total;
  return s;
};

const data = (file) => JSON.parse(readFileSync(file, enc));

const allPairs = [];

const catalogCourses = data('public/catalog.json');
const icCourses = data('ic-courses.json');

console.warn(`${catalogCourses.length} courses in catalog`);
console.warn(`${icCourses.length} courses in IC`);

catalogCourses.forEach((catalog) => {
  icCourses.forEach((ic) => {
    allPairs.push({ catalog, ic, similarity: nameSimilarity(catalog, ic) });
  });
});

const matched = match(allPairs);

console.log(JSON.stringify(matched.map(names), null, 2));
