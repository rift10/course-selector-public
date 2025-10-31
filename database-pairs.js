import { readFile } from 'node:fs/promises';
import { DB } from 'pugsql';

/* This file is for inserting pairs into the database read from tsv files */

const db = new DB('sql/db.db').addQueries('sql/queries.sql').addQueries('sql/custom.sql');

const loadFile = async (fileName) => {
  try {
    return await readFile(fileName, { encoding: 'utf8' });
  } catch (err) {
    console.error('Error reading file:', err);
  }
};

const insertPairs = (data, type) => {
  const lines = data.trim().split('\n');
  const map = {};
  for (const line of lines) {
    const [key, value] = line.split('\t');
    if (map[key] === undefined) map[key] = [value];
    else map[key].push(value);
  }

  for (const key in map) {
    for (const value of [...map[key]]) {
      const courseId = db.getIdFromCourseTitle({ courseTitle: key });
      if (type === 'grade') {
        db.insertGrade({
          courseId,
          grade: value,
          status: 'allowed',
        });
      } else if (type === 'slc') {
        db.insertSlc({
          courseId,
          slc: value.trim(),
        });
      } else if (type === 'prereq') {
        db.insertPrerequisite({
          courseId,
          prerequisiteId: db.getIdFromCourseTitle({ courseTitle: value.trim() }),
          type: 'required',
        });
      } else if (type === 'ic-info') {
        db.insertCourseNumber({
          courseId: db.getIdFromCourseTitle({ courseTitle: value }),
          courseNumber: key,
        });
      }
    }
  }
};

insertPairs(await loadFile('grade-pairs.tsv'), 'grade');
insertPairs(await loadFile('slc-pairs.tsv'), 'slc');
insertPairs(await loadFile('prereqs.tsv'), 'prereq');
insertPairs(await loadFile('matched.tsv'), 'ic-info');
