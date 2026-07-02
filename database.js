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

db.insertGradRequirement({ reqId: 1, subject: 'gov', credit: 5 });
db.insertGradRequirement({ reqId: 2, subject: 'bio', credit: 10 });
db.insertGradRequirement({ reqId: 3, subject: 'econ', credit: 5 });
db.insertGradRequirement({ reqId: 4, subject: 'elect', credit: 70 });
db.insertGradRequirement({ reqId: 5, subject: 'eng', credit: 40 });
db.insertGradRequirement({ reqId: 6, subject: 'ethnic', credit: 10 });
db.insertGradRequirement({ reqId: 7, subject: 'math1', credit: 10 });
db.insertGradRequirement({ reqId: 8, subject: 'math', credit: 10 });
db.insertGradRequirement({ reqId: 9, subject: 'pe', credit: 20 });
db.insertGradRequirement({ reqId: 10, subject: 'phys', credit: 10 });
db.insertGradRequirement({ reqId: 11, subject: 'ush', credit: 10 });
db.insertGradRequirement({ reqId: 12, subject: 'wh', credit: 10 });
db.insertGradRequirement({ reqId: 13, subject: 'lacte', credit: 10 });

db.insertRequirementSubject({ reqId: 1, generalSubject: 'soc' });
db.insertRequirementSubject({ reqId: 2, generalSubject: 'sci' });
db.insertRequirementSubject({ reqId: 3, generalSubject: 'soc' });
db.insertRequirementSubject({ reqId: 4, generalSubject: 'elect' });
db.insertRequirementSubject({ reqId: 5, generalSubject: 'eng' });
db.insertRequirementSubject({ reqId: 6, generalSubject: 'soc' });
db.insertRequirementSubject({ reqId: 7, generalSubject: 'math' });
db.insertRequirementSubject({ reqId: 8, generalSubject: 'math' });
db.insertRequirementSubject({ reqId: 9, generalSubject: 'pe' });
db.insertRequirementSubject({ reqId: 10, generalSubject: 'sci' });
db.insertRequirementSubject({ reqId: 11, generalSubject: 'soc' });
db.insertRequirementSubject({ reqId: 12, generalSubject: 'soc' });
db.insertRequirementSubject({ reqId: 13, generalSubject: 'lacte' });
