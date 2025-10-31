#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { similarity } from './lcs.js';

const enc = { encoding: 'utf-8' };

const lines = (file) => readFileSync(file, enc).split('\n');

const normalize = (s) => s.replace(/\(.*/, '');

const best = {};

lines(argv[2]).forEach((a) => {
  lines(argv[3]).forEach((b) => {
    const { aToB } = similarity(normalize(a), normalize(b));
    if (!(a in best) || aToB > best[a].similarity) {
      best[a] = { other: b, similarity: aToB };
    }
  });
});

Object.entries(best).forEach(([k, { other }]) => {
  console.log([k, other].join('\t'));
});
