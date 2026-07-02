#!/usr/bin/env node

import process from 'node:process';
import Database from 'better-sqlite3';
import SqliteStoreFactory from 'better-sqlite3-session-store';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import flash from 'express-flash';
import session from 'express-session';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import passport from 'passport';
import { DB } from 'pugsql';
import strategies from './strategies.js';

dotenv.config({ quiet: true, path: './secrets/.env' });

// number of required years
const ucCredits = {
  a: 20, // 1 year world history && (1 year us history || (1 sem us history && 1 sem us gov))
  b: 40,
  c: 30, // math 1, math 2, additional
  d: 20, // 1 year physical, 1 year life
  e: 20, // same language
  f: 10,
  g: 10, // includes additional a-f courses
};

// number of recommended years
const ucRecCredits = {
  a: 20,
  b: 40,
  c: 40,
  d: 30,
  e: 30,
  f: 10,
  g: 10,
};

const UCOP = {
  a: 'Social Science',
  b: 'English',
  c: 'Math',
  d: 'Science',
  e: 'Foreign Language',
  f: 'Visual and Performing Arts',
  g: 'Elective',
};

const levels = {
  P: 'UC Approved',
  H: 'Honors',
  AP: 'Advanced Placement',
  SL: 'IB Standard Level',
  HL: 'IB Higher Level',
};

const slcFilters = {
  AC: 'Academic Choice',
  AHA: 'Arts and Humanities Academy',
  AMPS: 'Academy of Medicine and Public Service',
  BIHS: 'Berkeley International High School',
  CAS: 'Communication Arts and Sciences',
  // BIS: 'Berkeley Independent Study', // not supported yet
};

const gradeFilters = {
  9: 'Freshman',
  10: 'Sophomore',
  11: 'Junior',
  12: 'Senior',
};

const otherFilters = {
  PE: 'Physical Education',
  CTE: 'Career Technical Education',
};

const slcMap = {
  u9: 'Universal 9th Grade',
  ac: 'Academic Choice',
  aha: 'Arts and Humanities Academy',
  amps: 'Academy of Medicine and Public Service',
  bihs: 'Berkeley International High School',
  cas: 'Communication Arts and Sciences',
  bis: 'Berkeley Independent Study',
};

const ipAddress = process.env.IP_ADDRESS ?? '127.0.0.1';
const port = process.env.HTTP_PORT ?? 8080;

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('dev'));
app.use(flash());

const SqliteStore = SqliteStoreFactory(session);
const sessionDB = new Database('sessions.db');

app.use(
  session({
    store: new SqliteStore({
      client: sessionDB,
      expired: {
        clear: true,
        intervalMs: 900000, // ms = 15min
      },
    }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(strategies.google);

passport.serializeUser((user, done) => {
  logPink(`serializing user: ${JSON.stringify(user, null, 2)}`);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const db = new DB(`${process.env.DB_DIR}/${process.env.DB_FILE}`)
  .addQueries('sql/queries.sql')
  .addQueries('sql/custom.sql');

nunjucks.configure('views', {
  autoescape: true,
  express: app,
});

/* Constants from db */

const bhsCredits = db.gradRequirements().reduce((acc, curr) => {
  acc[curr.subject] = curr.credit;
  return acc;
}, {});

const bhsGradReqs = db.gradReqs();

/* Useful functions */

const logPink = (text) => {
  console.log(`\u001b[35m${text}\u001b[0m`);
};

const handleSemesters = (courseList) => {
  const nums = [];
  course: for (let i = 0; i < [...courseList].length; i++) {
    if (courseList[i].duration !== 'Year') {
      for (let j = 0; j < nums.length; j++) {
        if (courseList[i].period === courseList[nums[j]].period) {
          courseList[nums[j]].hasPair = true;
          courseList[i].skip = true;
          continue course;
        }
      }
      nums.push(i);
    }
  }
};

// old version -- isnt as good but works sometimes
// const handleSemesters = (courseList) => {
//   for (let i = 1; i < [...courseList].length; i++) {
//     if (
//       courseList[i].period === courseList[i - 1].period &&
//       courseList[i].duration !== 'Year' &&
//       courseList[i - 1].duration !== 'Year'
//     ) {
//       courseList[i - 1].hasPair = true;
//       courseList[i].skip = true;
//     }
//   }
// };

const countCredit = (creditArray) => {
  return (
    10 * (creditArray ?? []).filter((c) => c.duration === 'Year').length +
    5 * (creditArray ?? []).filter((c) => c.duration !== 'Year').length
  );
};

const adjustCredit = (electCredit, otherType, otherCredit) => {
  return (
    electCredit + (otherCredit > bhsCredits[otherType] ? otherCredit - bhsCredits[otherType] : 0)
  );
};

const electCredit = (schedule) => {
  const govCredit = countCredit(schedule.gov);
  const econCredit = countCredit(schedule.econ);
  const whCredit = countCredit(schedule.wh);
  const ushCredit = countCredit(schedule.ush);
  const engCredit = countCredit(schedule.eng);
  const math1Credit = countCredit(schedule.math1);
  const mathCredit = countCredit(schedule.math);
  const bioCredit = countCredit(schedule.bio);
  const physCredit = countCredit(schedule.phys);
  const peCredit = countCredit(schedule.pe);
  const lacteCredit = countCredit(schedule.lacte);
  let electCredit = countCredit(schedule.elect);
  electCredit = adjustCredit(electCredit, 'gov', govCredit);
  electCredit = adjustCredit(electCredit, 'wh', whCredit);
  electCredit = adjustCredit(electCredit, 'ush', ushCredit);
  electCredit = adjustCredit(electCredit, 'econ', econCredit);
  electCredit = adjustCredit(electCredit, 'eng', engCredit);
  electCredit = adjustCredit(electCredit, 'math1', math1Credit);
  electCredit = adjustCredit(electCredit, 'math', mathCredit);
  electCredit = adjustCredit(electCredit, 'bio', bioCredit);
  electCredit = adjustCredit(electCredit, 'phys', physCredit);
  electCredit = adjustCredit(electCredit, 'lacte', lacteCredit);
  electCredit = adjustCredit(electCredit, 'pe', peCredit);
  return electCredit;
};

const updateDefaultClasses = (userId, isAdvanced) => {
  db.deleteFullSchedule({ userId });
  db.insertFreshmanDefaults({ userId });
  db.insertDefaultSchedule({ userId });
  if (isAdvanced === 'true') {
    db.insertClass({ userId, courseNumber: 'AC97Y', grade: 9 });
    db.insertClass({ userId, courseNumber: 'AC99Y', grade: 10 });
    db.insertClass({ userId, courseNumber: 'AC96Y', grade: 11 });
  } else {
    db.insertClass({ userId, courseNumber: 'AC01Y', grade: 9 });
    db.insertClass({ userId, courseNumber: 'AC02Y', grade: 10 });
    db.insertClass({ userId, courseNumber: 'AC03Y', grade: 11 });
  }
};

const requireLogin = (req, res, next) => {
  if (!req.session?.userId) res.redirect('/login');
  else next();
};

const requireEditor = (req, res, next) => {
  requireLogin(req, res, () => {
    const role = db.user({ userId: req.session.userId }).role;
    if (!(role === 'editor' || role === 'admin')) res.redirect('/');
    else next();
  });
};

const getCategoryFiltered = (all, categories) => {
  let result = [...all];
  for (const c of categories) {
    const add = db.matchForCategory({ category: c });
    result = result.filter((course) => add.map((a) => a.course_id).includes(course.course_id));
  }
  return result;
};

const getSlcFiltered = (all, slcs) => {
  let result = [...all];
  if (!Array.isArray(slcs)) {
    const add = db.matchForSlc({ slc: slcs.toUpperCase() });
    result = result.filter((course) => add.map((a) => a.course_id).includes(course.course_id));
    return result;
  }
  for (const c of slcs) {
    const add = db.matchForSlc({ slc: c.toUpperCase() });
    result = result.filter((course) => add.map((a) => a.course_id).includes(course.course_id));
  }
  return result;
};

const getGradeFiltered = (all, grades) => {
  let result = [...all];
  for (const g of grades) {
    const add = db.matchForGrade({ grade: g });
    [...add].forEach((a) => logPink(a.title));
    result = result.filter((course) => add.map((a) => a.course_id).includes(course.course_id));
  }
  return result;
};

const renderHome = (req, res, page, section) => {
  const { ag } = req.query;
  const categories = [].concat(req.query.categories ?? []);
  const slcs = [].concat(req.query.slc ?? []);
  const grade = [].concat(req.query.grade ?? []);

  try {
    let courses = ag ? db.matchForAG({ ag }) : db.courses();
    if (categories) courses = getCategoryFiltered(courses, categories);
    if (slcs) courses = getSlcFiltered(courses, slcs);
    if (grade) courses = getGradeFiltered(courses, grade);
    if (section) courses = getSlcFiltered(courses, section);

    const filteredCategories = Object.groupBy(db.categories(), (c) => c.course_id);
    const grades = Object.groupBy(db.grades(), (c) => c.course_id);
    const filteredSlcs = Object.groupBy(db.slcs(), (c) => c.course_id);
    const icPairs = Object.groupBy(db.courseNumbers(), (c) => c.course_id);
    const prerequisites = Object.groupBy(db.prerequisites(), (c) => c.course_id);
    const dbUser = db.user({ userId: req.session.userId });
    const user = {
      grade: dbUser.grade,
      slc: dbUser.slc,
      role: dbUser.role,
      isAdvanced: dbUser.is_advanced,
    };

    courses.forEach((course) => {
      course.star = db.starForUserAndCourse({
        userId: req.session.userId,
        courseId: course.course_id,
      });
      course.categories = (filteredCategories[course.course_id] ?? []).map((c) => c.category);
      course.slcs = (filteredSlcs[course.course_id] ?? []).map((s) => s.slc.trim());
      const gs = Object.groupBy(grades[course.course_id] ?? [], (g) => g.status);
      course.allowedGrades = (gs.allowed ?? []).map((g) => g.grade);
      course.recommendedGrades = (gs.recommended ?? []).map((g) => g.grade);
      course.ic_id = (icPairs[course.course_id] ?? []).map((p) => p.course_number);
      course.prerequisites = prerequisites[course.course_id] ?? [];
      for (const prerequisite of course.prerequisites) {
        prerequisite.prerequisite_title = db.getTitleFromCourseId({
          courseId: prerequisite.prerequisite_id,
        });
      }
      // course ordering algorithm
      if (user) {
        let score = 0;
        if (course.recommendedGrades.includes(user.grade)) score += 0.6;
        else if (course.recommendedGrades.length > 0) {
          if (user.grade > Math.max(course.recommendedGrades)) score -= 0.2;
          else {
            const demerit = 0.1;
            score -= Math.max(Math.min(...course.recommendedGrades) - user.grade, 0) * demerit;
          }
        }
        if (course.allowedGrades.includes(user.grade)) score += 0.2;
        else if (course.allowedGrades.length > 0) {
          if (user.grade > Math.max(course.allowedGrades)) score -= 0.5;
          else {
            const demerit = 0.2;
            score -= Math.max(Math.min(...course.allowedGrades) - user.grade, 0) * demerit;
          }
        }
        if (course.slcs.includes(user.slc)) score += 0.4;
        else score -= 0.5;
        course.score = Math.max(-1, Math.min(score, 1));
      }
    });

    courses.sort((a, b) => b.score - a.score);

    if (section) {
      const header = slcMap[section];
      return res.render(`pages/${page}`, {
        courses,
        UCOP,
        user,
        slc: section,
        header,
      });
    }
    return res.render(`pages/${page}`, {
      courses,
      UCOP,
      levels,
      slcFilters,
      gradeFilters,
      otherFilters,
      user,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Database error');
  }
};

/* AWS health route */

app.get('/health', (_req, res) => res.send('OK'));

/* Homepage routes */

app.get('/setup', requireLogin, async (req, res) => {
  const dbUser = db.user({ userId: req.session.userId });
  const user = {
    grade: dbUser.grade,
    slc: dbUser.slc,
    role: dbUser.role,
    isAdvanced: dbUser.is_advanced,
  };

  res.render('pages/setup.njk', {
    user,
  });
});

app.get('/', requireLogin, async (req, res) => {
  renderHome(req, res, 'index.njk');
});

app.get('/plan', requireLogin, async (req, res) => {
  const option = req.query.option;

  try {
    const dbUser = db.user({ userId: req.session.userId });
    const user = {
      grade: dbUser.grade,
      slc: dbUser.slc,
      isAdvanced: dbUser.is_advanced,
      role: dbUser.role,
    };

    const gradeSchedules = Object.groupBy(
      db.scheduleForGrade({ userId: req.session.userId }),
      (c) => c.grade,
    );

    for (const [_key, array] of Object.entries(gradeSchedules)) {
      handleSemesters(array);
    }

    const agSchedule = Object.groupBy(db.userSchedule({ userId: req.session.userId }), (c) => c.ag);
    const subjectSchedule = Object.groupBy(
      db.scheduleForSubject({ userId: req.session.userId }),
      (c) => c.subject,
    );

    let courses = null;
    if (option) {
      courses = db.getCoursesForGroup({ reqId: option });
    } else {
      // TODO: decide which one is better
      courses = db.fullCourses();
      // courses = db.defaults({ userId: req.session.userId }).concat(db.electives());
    }

    courses.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });

    courses = [...new Map(courses.map((course) => [course.course_id, course])).values()];

    res.render('pages/planner.njk', {
      courses,
      UCOP,
      user,
      fresh: gradeSchedules[9],
      soph: gradeSchedules[10],
      junior: gradeSchedules[11],
      senior: gradeSchedules[12],
      sophOptions: db.getReqGroups({ userId: req.session.userId, slc: user.slc, grade: 10 }),
      juniorOptions: db.getReqGroups({ userId: req.session.userId, slc: user.slc, grade: 11 }),
      seniorOptions: db.getReqGroups({ userId: req.session.userId, slc: user.slc, grade: 12 }),
      aCredit: countCredit(agSchedule.a),
      bCredit: countCredit(agSchedule.b),
      cCredit: countCredit(agSchedule.c),
      dCredit: countCredit(agSchedule.d),
      eCredit: countCredit(agSchedule.e),
      fCredit: countCredit(agSchedule.f),
      gCredit: countCredit(agSchedule.g),
      ucReqA: ucCredits.a,
      ucReqB: ucCredits.b,
      ucReqC: ucCredits.c,
      ucReqD: ucCredits.d,
      ucReqE: ucCredits.e,
      ucReqF: ucCredits.f,
      ucReqG: ucCredits.g,
      totalUC: Object.values(ucCredits).reduce((a, b) => a + b, 0),
      ucRecA: ucRecCredits.a,
      ucRecB: ucRecCredits.b,
      ucRecC: ucRecCredits.c,
      ucRecD: ucRecCredits.d,
      ucRecE: ucRecCredits.e,
      ucRecF: ucRecCredits.f,
      ucRecG: ucRecCredits.g,
      totalRecUC: Object.values(ucRecCredits).reduce((a, b) => a + b, 0),
      ethnicCredit: countCredit(subjectSchedule.ethnic),
      govCredit: countCredit(subjectSchedule.gov),
      econCredit: countCredit(subjectSchedule.econ),
      ushCredit: countCredit(subjectSchedule.ush),
      whCredit: countCredit(subjectSchedule.wh),
      engCredit: countCredit(subjectSchedule.eng),
      mathCredit: countCredit(subjectSchedule.math),
      math1Credit: countCredit(subjectSchedule.math1),
      bioCredit: countCredit(subjectSchedule.bio),
      physCredit: countCredit(subjectSchedule.phys),
      lacteCredit: countCredit(subjectSchedule.lacte),
      peCredit: countCredit(subjectSchedule.pe),
      electCredit: electCredit(subjectSchedule),
      bhsReqEthnic: bhsCredits.ethnic,
      bhsReqGov: bhsCredits.gov,
      bhsReqEcon: bhsCredits.econ,
      bhsReqUsh: bhsCredits.ush,
      bhsReqWh: bhsCredits.wh,
      bhsReqEng: bhsCredits.eng,
      bhsReqMath: bhsCredits.math,
      bhsReqMath1: bhsCredits.math1,
      bhsReqBio: bhsCredits.bio,
      bhsReqPhys: bhsCredits.phys,
      bhsReqLacte: bhsCredits.lacte,
      bhsReqElect: bhsCredits.elect,
      bhsReqPe: bhsCredits.pe,
      totalSoc: bhsGradReqs
        .filter((a) => a.general_subject === 'soc')
        .reduce((acc, curr) => acc + curr.credit, 0),
      totalSci: bhsGradReqs
        .filter((a) => a.general_subject === 'sci')
        .reduce((acc, curr) => acc + curr.credit, 0),
      totalMath: bhsGradReqs
        .filter((a) => a.general_subject === 'math')
        .reduce((acc, curr) => acc + curr.credit, 0),
      totalBHS: bhsGradReqs.reduce((acc, curr) => acc + curr.credit, 0),
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Database error');
  }
});

app.get('/filter-plan', requireLogin, async (req, res) => {
  const reqId = req.query.option;
  const group = db.reqGroup({ reqId });
  if (reqId === 'none') {
    res.render('partials/filterPlan.njk', {
      UCOP,
      courses: db.courses(),
    });
    return;
  }
  res.render('partials/filterPlan.njk', {
    UCOP,
    text: `${group.grade}th ${group.req_text}`,
    courses: db.getCoursesForGroup({ reqId }),
  });
});

app.get('/slc', requireLogin, async (req, res) => {
  res.render('pages/sectionHome.njk', {
    user: db.user({ userId: req.session.userId }),
  });
});

app.get('/slc/:slc', requireLogin, async (req, res) => {
  renderHome(req, res, 'section.njk', req.params.slc);
});

app.get('/edit', requireEditor, async (req, res) => {
  renderHome(req, res, 'edit.njk');
});

/* POST routes */

app.post('/update-schedule', requireLogin, (req, res) => {
  const { update } = req.body;
  const { isAdding, courseId, grade, oldGrade, period } = update;

  try {
    const course = db.fullCourse({ courseId });
    const ag = course.ag;
    const subject = course.subject;
    const semester = course.duration;
    let success = true;
    let reqId = null;
    let message = null;
    if (isAdding && oldGrade) {
      db.deleteSchedule({ userId: req.session.userId, courseId, grade: oldGrade });
    }
    if (
      isAdding &&
      (((course.allowed_period === '0' || course.allowed_period === '7') &&
        db
          .userPeriodsForGrade({ userId: req.session.userId, grade: update.grade })
          .some((c) => c.allowed_period === course.allowed_period)) ||
        (course.allowed_period === 'normal' &&
          countCredit(db.userScheduleNormalGrade({ userId: req.session.userId, grade })) >= 60))
    ) {
      success = false;
      message = `Can't add another ${course.allowed_period} period class`;
    } else if (isAdding) {
      db.insertSchedule({
        userId: req.session.userId,
        courseId,
        grade,
        semester,
        period,
        isDefault: 'false',
      });
      reqId = [...db.getReqIdForCourse({ courseId }).map((r) => r.req_id)];
    } else {
      db.deleteSchedule({ userId: req.session.userId, courseId, grade });
    }
    res.json({
      ag,
      subject,
      newAg: countCredit(db.userScheduleAG({ userId: req.session.userId, ag })),
      newSubject: countCredit(db.userScheduleSubject({ userId: req.session.userId, subject })),
      newElect: electCredit(
        Object.groupBy(db.scheduleForSubject({ userId: req.session.userId }), (c) => c.subject),
      ),
      reqId,
      success,
      message,
    });
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/update-data', requireEditor, (req, res) => {
  const { update } = req.body;

  try {
    const {
      courseId,
      courseTitle,
      description,
      prerequisite,
      allowedGrades,
      recommendedGrades,
      slcs,
    } = update;
    db.deleteGradeData({ courseId });
    db.deleteSlcData({ courseId });
    db.updateCourseText({ courseId, description, prerequisite });

    for (const grade of allowedGrades) db.insertGrade({ courseId, grade, status: 'allowed' });
    for (const grade of recommendedGrades)
      db.insertGrade({ courseId, grade, status: 'recommended' });
    for (const slc of slcs) db.insertSlc({ courseId, slc });
    res.json({
      success: true,
      message: `Successfully updated ${courseTitle}`,
    });
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/update-user-info', (req, res) => {
  const { info } = req.body;
  var { grade, slc, isAdvanced } = info;
  isAdvanced = isAdvanced.trim();
  grade = grade.trim();
  slc = slc.trim();

  try {
    const user = db.user({ userId: req.session.userId });
    const currentSlc = user.slc;
    if (user.grade === Number(grade) && currentSlc === slc && user.is_advanced === isAdvanced) {
      res.json({
        success: true,
        alreadyExists: true,
      });
      return;
    }
    db.updateUserInfo({
      userId: req.session.userId,
      grade,
      slc,
      isAdvanced,
    });
    if (currentSlc !== slc || isAdvanced !== user.is_advanced) {
      updateDefaultClasses(req.session.userId, isAdvanced);
    }
    logPink(`updating user: ${JSON.stringify(user, null, 2)}`);
    res.json({
      success: true,
      message: 'Successfully updated user info, reload page for changes to take effect',
    });
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/update-star', requireLogin, (req, res) => {
  const { update } = req.body;
  const { courseId, isStarred } = update;

  try {
    if (isStarred) {
      db.insertStar({ userId: req.session.userId, courseId });
    } else {
      db.deleteStar({ userId: req.session.userId, courseId });
    }
    res.json({
      success: true,
    });
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* User auth routes */

app.get('/login', (req, res) => {
  let newUser = false;
  const passport = req.session.passport;

  if (!passport?.user?.google) {
    res.render('pages/login.njk', { error: req.flash('error') });
  } else {
    logPink('Authenticated with Google');
    req.session.userId = passport.user.google.id;
    req.session.email = passport.user.google.email;
    if (!db.hasUser({ userId: req.session.userId })) {
      newUser = true;
      db.insertUserWithDefaultValues({
        userId: req.session.userId,
        email: passport.user.google.email,
        grade: null,
        slc: null,
      });
      if (process.env.ADMIN.split(',').includes(passport.user.google.email))
        db.updateUserRole({ userId: req.session.userId, role: 'admin' });
      logPink(
        `inserting user: ${JSON.stringify(db.user({ userId: req.session.userId }), null, 2)}`,
      );
    }
    if (newUser) {
      res.redirect('/setup');
    } else {
      res.redirect('/');
    }
  }
});

app.get('/auth/google', (req, res, next) => {
  logPink('Authenticating with Google');

  const state = encodeURIComponent(
    JSON.stringify({
      nonce: crypto.randomBytes(16).toString('hex'),
    }),
  );

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureFlash: true,
    successRedirect: '/',
  })(req, res, next);
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy();
    res.redirect('/login');
  });
});

const server = app.listen(port, ipAddress, (error) => {
  if (error) throw error; // e.g. EADDRINUSE
  const { address, port } = server.address();
  console.log(`http://${address}:${port}/`);
});
