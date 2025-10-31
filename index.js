#!/usr/bin/env node

import process from 'node:process';
import express from 'express';
import nunjucks from 'nunjucks';
import { DB } from 'pugsql';
import 'dotenv/config';
import Database from 'better-sqlite3';
import SqliteStoreFactory from 'better-sqlite3-session-store';
import crypto from 'crypto';
import flash from 'express-flash';
import session from 'express-session';
import morgan from 'morgan';
import passport from 'passport';
import strategies from './strategies.js';

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

const logPink = (text) => {
  console.log(`\u001b[35m${text}\u001b[0m`);
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

const renderHome = (req, res, page, slc) => {
  const { ag } = req.query;
  const categories = [].concat(req.query.categories ?? []);

  try {
    let courses = ag ? db.matchForAG({ ag }) : db.courses();
    if (categories) courses = getCategoryFiltered(courses, categories);

    if (slc) courses = db.matchForSlc({ slc: slc.toUpperCase() });

    const grades = Object.groupBy(db.grades(), (g) => g.course_id);
    courses.forEach((course) => {
      const gs = Object.groupBy(grades[course.course_id] ?? [], (g) => g.status);
      course.allowedGrades = (gs.allowed ?? []).map((g) => g.grade);
      course.recommendedGrades = (gs.recommended ?? []).map((g) => g.grade);
    });

    const slcs = Object.groupBy(db.slcs(), (s) => s.course_id);
    courses.forEach((course) => {
      course.slcs = (slcs[course.course_id] ?? []).map((s) => s.slc.trim());
    });

    const filteredCategories = Object.groupBy(db.categories(), (c) => c.course_id);
    courses.forEach((course) => {
      course.categories = (filteredCategories[course.course_id] ?? []).map((c) => c.category);
    });

    const prerequisites = Object.groupBy(db.prerequisites(), (c) => c.course_id);
    courses.forEach((course) => {
      course.prerequisites = prerequisites[course.course_id] ?? [];
      for (const prerequisite of course.prerequisites) {
        prerequisite.prerequisite_title = db.getTitleFromCourseId({
          courseId: prerequisite.prerequisite_id,
        });
      }
    });

    const icPairs = Object.groupBy(db.courseNumbers(), (c) => c.course_id);
    courses.forEach((course) => {
      course.ic_id = (icPairs[course.course_id] ?? []).map((p) => p.course_number);
    });

    const dbUser = db.user({ userId: req.session.userId });
    const user = { grade: dbUser.grade, slc: dbUser.slc };

    if (user) {
      courses.forEach((course) => {
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
      });
    }

    courses.sort((a, b) => b.score - a.score);

    if (slc) {
      const header = slcMap[slc];
      return res.render(`pages/${page}`, {
        courses,
        UCOP,
        user,
        slc,
        header,
      });
    }
    return res.render(`pages/${page}`, {
      courses,
      UCOP,
      user,
      levels,
      otherFilters,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Database error');
  }
};

/* AWS health route */

app.get('/health', (_req, res) => res.send('OK'));

/* Homepage routes */

app.get('/', requireLogin, async (req, res) => {
  renderHome(req, res, 'index.njk');
});

app.get('/slc', requireLogin, async (_req, res) => {
  res.render('pages/sectionHome.njk');
});

app.get('/slc/:slc', requireLogin, async (req, res) => {
  renderHome(req, res, 'section.njk', req.params.slc);
});

app.get('/edit', requireEditor, async (req, res) => {
  renderHome(req, res, 'edit.njk');
});

/* POST routes */

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

  try {
    const { grade, slc } = info;
    db.updateUserInfo({
      userId: req.session.userId,
      grade,
      slc,
    });
    logPink(`updating user: ${JSON.stringify(db.user({ userId: req.session.userId }), null, 2)}`);
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* User auth routes */

app.get('/login', (req, res) => {
  const passport = req.session.passport;

  if (!passport?.user?.google) {
    res.render('pages/login.njk', { error: req.flash('error') });
  } else {
    logPink('Authenticated with Google');
    req.session.userId = passport.user.google.id;
    req.session.email = passport.user.google.email;
    if (!db.hasUser({ userId: req.session.userId })) {
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
    res.redirect('/');
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
