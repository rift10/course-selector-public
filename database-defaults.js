import { DB } from 'pugsql';

const slcs = ['AC', 'AHA', 'AMPS', 'BIHS', 'CAS'];

const db = new DB('sql/db.db').addQueries('sql/queries.sql').addQueries('sql/custom.sql');

const insertDefaultCourse = (courseNumber, slc, grade) => {
  db.insertGradeRec({ courseNumber, grade });
  db.insertSlcFromIC({ courseNumber, slc });
  db.insertDefaultCourse({ courseNumber, slc, grade });
};

const insertRequirement = (courseNumber, slc, reqId) => {
  db.insertGradeRecFromGroup({ courseNumber, reqId });
  db.insertSlcFromIC({ courseNumber, slc });
  db.insertRequirement({ reqId, courseNumber });
};

const insertDefaultMaths = (slc) => {
  let reqId = `${slc}-fresh-math`;
  db.insertReqGroup({ reqId, reqText: 'Math Options', slc, grade: 9 });
  insertRequirement('AC01Y', slc, reqId); // math 1
  insertRequirement('AC97Y', slc, reqId); // advanced math 1
  reqId = `${slc}-soph-math`;
  db.insertReqGroup({ reqId, reqText: 'Math Options', slc, grade: 10 });
  insertRequirement('AC02Y', slc, reqId); // math 2
  insertRequirement('AC99Y', slc, reqId); // advanced math  2
  reqId = `${slc}-jun-math`;
  db.insertReqGroup({ reqId, reqText: 'Math Options', slc, grade: 11 });
  insertRequirement('AC03Y', slc, reqId); // math 3
  insertRequirement('AC96Y', slc, reqId); // advanced math 3
  reqId = `${slc}-sen-math`;
  db.insertReqGroup({ reqId, reqText: 'Math Options', slc, grade: 12 });
  insertRequirement('AC83Y', slc, reqId); // ap stat
  insertRequirement('AC39Y', slc, reqId); // ap calc ab
  insertRequirement('AC71Y', slc, reqId); // ap calc bc
};

const insertDefaultSciences = (slc) => {
  let reqId = `${slc}-soph-chem`;
  db.insertReqGroup({ reqId, reqText: 'Chemistry Options', slc, grade: 10 });
  insertRequirement('AD50Y', slc, reqId); // chem
  insertRequirement('AD54Y', slc, reqId); // ap chem

  reqId = `${slc}-jun-bio`;
  db.insertReqGroup({ reqId, reqText: 'Biology Options', slc, grade: 11 });
  insertRequirement('AD10Y', slc, reqId); // bio
  insertRequirement('AD20Y', slc, reqId); // ap bio
  // insertRequirement('AD56Y', slc, reqId); // biotech 1/2

  // insertScienceElectives(slc, 12);
};

const _insertScienceElectives = (slc, grade) => {
  const reqId = `${slc}-${grade === 11 ? 'jun' : 'sen'}-sci`;
  db.insertReqGroup({ reqId, slc, grade });
  insertRequirement('AD70Y', slc, reqId); // ap physics 1
  insertRequirement('AD72Y', slc, reqId); // ap physics c
  insertRequirement('AS55Y', slc, reqId); // mechatronics
  insertRequirement('AD27Y', slc, reqId); // anatomy
  insertRequirement('AS45Y', slc, reqId); // ap csp
  insertRequirement('AD56Y', slc, reqId); // biotech 3/4
  insertRequirement('AD63Y', slc, reqId); // biotech 3/4
};

const insertEnglishElectives = (grade) => {
  const reqId = `ac-${grade === 11 ? 'jun' : 'sen'}-eng`;
  insertRequirement('LA09Y', 'AC', reqId); // latinx lit
  insertRequirement('BA06Y', 'AC', reqId); // afam lit
  insertRequirement('MA20Y', 'AC', reqId); // lgbtqia+ lit
  insertRequirement('MA45Y', 'AC', reqId); // aapi lit
  insertRequirement('HA71F', 'AC', reqId); // world of media
};

slcs.forEach((slc) => insertDefaultMaths(slc));
// slcs.forEach((slc) => insertScienceElectives(slc, 11));
insertDefaultSciences('AC');
insertDefaultSciences('BIHS');
// insertScienceElectives('CAS', 12);
// insertScienceElectives('AMPS', 12);

/*********************************** U9 ***********************************/

db.insertDefaultCourse({ courseNumber: 'AB94Y', slc: 'U9', grade: 9 }); // freshman seminar
db.insertDefaultCourse({ courseNumber: 'AA98Y', slc: 'U9', grade: 9 }); // english
db.insertDefaultCourse({ courseNumber: 'AD01Y', slc: 'U9', grade: 9 }); // physics

/*********************************** AC ***********************************/

insertDefaultCourse('MB96Y', 'AC', 10); // world history
insertDefaultCourse('MA18Y', 'AC', 10); // world literature

db.insertReqGroup({ reqId: 'AC-jun-soc', reqText: 'History Options', slc: 'AC', grade: 11 });
insertRequirement('XR04Y', 'AC', 'AC-jun-soc'); // us history
insertRequirement('MB12Y', 'AC', 'AC-jun-soc'); // apush
insertRequirement('BB04Y', 'AC', 'AC-jun-soc'); // afam us history 1/2

db.insertReqGroup({ reqId: 'AC-jun-eng', reqText: 'English Options', slc: 'AC', grade: 11 });
insertRequirement('XX14Y', 'AC', 'AC-jun-eng'); // us lit
insertRequirement('MA78Y', 'AC', 'AC-jun-eng'); // ap lang
insertRequirement('MA20Y', 'AC', 'AC-jun-eng'); // queer lit
insertEnglishElectives(11);

db.insertReqGroup({ reqId: 'AC-sen-eng', reqText: 'English Options', slc: 'AC', grade: 12 });
insertRequirement('MA51Y', 'AC', 'AC-sen-eng'); // short story
insertRequirement('MA44Y', 'AC', 'AC-sen-eng'); // ap lit
insertRequirement('BA65Y', 'AC', 'AC-sen-eng'); // afam ap lit
insertRequirement('MA20Y', 'AC', 'AC-sen-eng'); // queer lit
insertRequirement('HA71F', 'AC', 'AC-sen-eng'); // world of media
insertEnglishElectives(12);

insertDefaultCourse('MB77F', 'AC', 12); // ap us gov

db.insertReqGroup({ reqId: 'AC-sen-econ', reqText: 'Economics Options', slc: 'AC', grade: 12 });
insertRequirement('XR03Y', 'AC', 'AC-sen-econ'); // econ
insertRequirement('BB28F', 'AC', 'AC-sen-econ'); // afam econ
insertRequirement('MB58F', 'AC', 'AC-sen-econ'); // ap macro

/*********************************** AHA ***********************************/

insertDefaultCourse('HB96Y', 'AHA', 10); // aha world history
insertDefaultCourse('HA18Y', 'AHA', 10); // aha world literature
insertDefaultCourse('HD27Y', 'AHA', 10); // aha honors anatomy and physiology
// TODO
// insertDefaultCourse('XX10Y', 'AHA', 10, 'false'); // aha advanced creative arts

insertDefaultCourse('HB07Y', 'AHA', 11); // aha us history
insertDefaultCourse('HA53F', 'AHA', 11); // aha ap language and composition
insertDefaultCourse('HD50Y', 'AHA', 11); // aha chemistry
// TODO
// insertDefaultCourse('HG20Y', 'AHA', 11, 'false'); // aha advanced drawing & painting

insertDefaultCourse('HB77F', 'AHA', 12); // aha ap gov
insertDefaultCourse('HB58S', 'AHA', 12); // aha econ
insertDefaultCourse('HA44Y', 'AHA', 12); // aha ap literature and composition
insertDefaultCourse('DA92F', 'AHA', 12); // best english
insertDefaultCourse('DB91F', 'AHA', 12); // best history

/*********************************** AMPS ***********************************/

insertDefaultCourse('DB97Y', 'AMPS', 10); // world history
insertDefaultCourse('DA19Y', 'AMPS', 10); // world lit
insertDefaultCourse('DD51Y', 'AMPS', 10); // amps chem

insertDefaultCourse('XX11Y', 'AMPS', 11); // amps advanced english
insertDefaultCourse('XR12Y', 'AMPS', 11); // biological health sciences
insertDefaultCourse('DB12Y', 'AMPS', 11); // apush
insertDefaultCourse('XX15Y', 'AMPS', 11); // community service
// TODO
// insertDefaultCourse('AD56Y', 'AMPS', 11, 'false'); // biotech 1/2

insertDefaultCourse('DB77F', 'AMPS', 12); // amps ap gov
insertDefaultCourse('XX20Y', 'AMPS', 12); // advanced english & public health
insertDefaultCourse('DB59F', 'AMPS', 12); // econ
insertDefaultCourse('DD36Y', 'AMPS', 12); // forensic science

/*********************************** BIHS ***********************************/

insertDefaultCourse('IB96Y', 'BIHS', 10); // global history
insertDefaultCourse('IA18Y', 'BIHS', 10); // global lit
insertDefaultCourse('IB79S', 'BIHS', 10); // comp val bel
insertDefaultCourse('IB80F', 'BIHS', 10); // bihs econ

insertDefaultCourse('IB09F', 'BIHS', 11); // tok 1
insertDefaultCourse('IB10Y', 'BIHS', 11); // ib sl history
insertDefaultCourse('IA15Y', 'BIHS', 11); // ib sl english 1

// TODO
insertRequirement('ID72Y', 'BIHS', 'BIHS-jun-bio'); // ib sl bio
// insertDefaultCourse('ID78Y', 'BIHS', 11); // ib sl environmental systems & societies

// TODO: gov is actually IB75S for bihs
insertDefaultCourse('XR13Y', 'BIHS', 12); // us gov
insertDefaultCourse('IB09Y', 'BIHS', 12); // tok 2
insertDefaultCourse('IB07Y', 'BIHS', 12); // ib hl history
insertDefaultCourse('IA75Y', 'BIHS', 12); // ib hl english 2

insertRequirement('IC76Y', 12, 'BIHS-sen-math'); // ib sl math application
insertRequirement('IC77Y', 12, 'BIHS-sen-math'); // ib sl math analysis
insertRequirement('IC78Y', 12, 'BIHS-sen-math'); // ib hl math analysis

/*********************************** CAS ***********************************/

insertDefaultCourse('FB96Y', 'CAS', 10); // world history
insertDefaultCourse('FA18Y', 'CAS', 10); // world lit
insertDefaultCourse('FD27Y', 'CAS', 10); // anatomy
insertDefaultCourse('FG73Y', 'CAS', 10); // computer art

insertDefaultCourse('FB07Y', 'CAS', 11); // apush
insertDefaultCourse('FA53S', 'CAS', 11); // ap lang
insertDefaultCourse('FD50Y', 'CAS', 11); // chem
insertDefaultCourse('AN83Y', 'CAS', 11); // video production

// TODO: gov/econ is getting counted as 10 econ + 10 gov
insertDefaultCourse('XX17Y', 'CAS', 12); // gov/econ
insertDefaultCourse('FB91F', 'CAS', 12); // best history
insertDefaultCourse('FA44Y', 'CAS', 12); // ap lit

db.insertReqGroup({ reqId: 'CAS-sen-art', reqText: 'Art Options', slc: 'CAS', grade: 12 });
insertRequirement('FN10Y', 'CAS', 'CAS-sen-art'); // advanced studio editing
insertRequirement('FN15Y', 'CAS', 'CAS-sen-art'); // advanced digital photography
