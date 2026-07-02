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

      switch (type) {
        case 'grade':
          db.insertGrade({
            courseId,
            grade: value,
            status: 'allowed',
          });
          break;

        case 'slc':
          db.insertSlcProtected({
            courseId,
            slc: value.trim(),
          });
          break;

        case 'prereq':
          db.insertPrereqFromTitle({
            courseId,
            prereqTitle: value.trim(),
            type: 'required',
          });
          break;

        case 'ic-info':
          db.insertIcIdFromTitle({
            title: value,
            courseNumber: key,
          });
          break;
        case 'subject':
          db.insertSubject({
            courseId,
            subject: value.trim(),
          });
          break;
        case 'period':
          db.insertPeriod({
            courseId: db.getIdFromCourseTitle({ courseTitle: value }),
            allowedPeriod: key.trim(),
          });
          break;
      }
    }
  }
};

insertPairs(await loadFile('tsvs/subject-pairs.tsv'), 'subject');
insertPairs(await loadFile('tsvs/grade-pairs.tsv'), 'grade');
insertPairs(await loadFile('tsvs/slc-pairs.tsv'), 'slc');
insertPairs(await loadFile('tsvs/prereqs.tsv'), 'prereq');
insertPairs(await loadFile('tsvs/periods.tsv'), 'period');

// insert real ic ids
insertPairs(await loadFile('tsvs/matched.tsv'), 'ic-info');

// insert fake ic ids
let i = 10;
for (const c of [...db.unmatchedCourses()]) {
  db.insertCourseNumber({
    courseId: c.course_id,
    courseNumber: `XX${i}${c.duration.trim() === 'Year' ? 'Y' : 'S'}`,
  });
  i++;
}
