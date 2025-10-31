import { readFile } from 'node:fs/promises';
import { DB } from 'pugsql';

const catalog = JSON.parse(await readFile('./public/catalog.json', 'utf-8'));
const icCourses = JSON.parse(await readFile('./ic-courses.json', 'utf-8'));
const matches = JSON.parse(await readFile('./matches.json', 'utf-8'));

const db = new DB('sql/db.db', 'sql/schema.sql')
  .addQueries('sql/queries.sql')
  .addQueries('sql/custom.sql');

catalog.forEach((course) => {
  const courseId = db.makeCourse(course);

  [...course.categories].forEach((category) => db.insertCategory({ courseId, category }));
});

icCourses.forEach((course) => {
  db.insertIcCourse({
    icCourseId: course.courseID,
    courseNumber: course.courseNumber,
    title: course.courseName,
    sections: course.sections,
    departmentName: course.departmentName,
  });
});

matches.forEach((match) => db.insertPotentialMatch(match));
