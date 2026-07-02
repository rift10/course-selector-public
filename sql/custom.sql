-- :name category :get
select * from categories where course_id = $courseId;

-- :name updateCategory :run
update categories set (category) = ($category) where course_id = $courseId

-- :name matchForCourseTitle :get
select * from courses where title = $courseTitle;

-- :name getIdFromCourseTitle :one
select course_id from courses where title = $courseTitle;

-- :name getTitleFromCourseId :one
select title from courses where course_id = $courseId;

-- :name updateCourseText :run
update courses set (description, prerequisite) = ($description, $prerequisite) where course_id = $courseId

-- :name matchForAG :all
select * from courses where ag = $ag;

-- :name matchForCategory :all
select * from courses join categories using (course_id) where categories.category = $category

-- :name matchForSlc :all
select * from courses join slcs using (course_id) where slcs.slc = $slc

-- :name matchForGrade :all
select * from courses join grades using (course_id) where grades.grade = $grade

-- :name grade :get
select * from grades where course_id = $courseId;

-- :name updateGrade :run
update grades set (grade, status) = ($grade, $status) where course_id = $courseId

-- :name deleteGradeData :run
delete from grades where course_id = $courseId

-- :name deleteSlcData :run
delete from slcs where course_id = $courseId

-- :name slc :get
select * from slcs where course_id = $courseId;

-- :name updateSlc :run
update slcs set (slc) = ($slc) where course_id = $courseId

-- :name insertSlcProtected :insert
insert or ignore into slcs (course_id, slc) values ($courseId, $slc);

-- :name insertGradeRec :insert
insert or ignore into grades (course_id, grade, status) select cn.course_id, $grade as grade, 'recommended' as status
    from course_numbers cn where cn.course_number = $courseNumber; 

-- :name insertGradeRecFromGroup :insert
insert or ignore into grades (course_id, grade, status) select cn.course_id, rg.grade, 'recommended'
    from course_numbers cn cross join req_groups rg
    where cn.course_number = $courseNumber and rg.req_id = $reqId;

-- :name insertSlcFromIC :insert
insert or ignore into slcs (course_id, slc) select cn.course_id, $slc as slc
    from course_numbers cn where cn.course_number = $courseNumber; 

-- :name insertPrereqFromTitle :insert
insert into prerequisites (course_id, prerequisite_id, type) select $courseId, courses.course_id, $type
    from courses where title = $prereqTitle;

-- :name insertIcIdFromTitle :insert
insert into course_numbers (course_id, course_number) select courses.course_id, $courseNumber
    from courses where title = $title;

-- :name matchForIcCourseNumber :get
select * from ic_courses where course_number = $courseNumber;

-- :name hasUser :exists
select * from users where user_id = $userId;

-- :name updateUserInfo :insert
update users set (grade, slc, is_advanced) = ($grade, $slc, $isAdvanced) where user_id = $userId

-- :name deleteStar :run
delete from stars where course_id = $courseId and user_id = $userId

-- :name unmatchedCourses :all
select courses.course_id, courses.* from courses left join course_numbers using (course_id) where course_numbers.course_id is null;

-- :name userSchedule :all
select c.* from schedules s join courses c using (course_id) where s.user_id = $userId;

-- :name userScheduleAG :all
select c.* from schedules s join courses c using (course_id) where s.user_id = $userId and c.ag = $ag;

-- :name userScheduleNormalGrade :all
select c.* from schedules s join courses c using (course_id) join periods p using (course_id)
    where s.user_id = $userId and s.grade = $grade and p.allowed_period = 'normal';

-- :name userScheduleSubject :all
select c.* from schedules s
    join courses c using (course_id)
    join subjects su using (course_id) 
    where s.user_id = $userId and su.subject = $subject;

-- :name scheduleForGrade :all
select c.*, s.grade, s.period, s.semester, p.allowed_period from schedules s
    join courses c using (course_id)
    join periods p using (course_id)
    where s.user_id = $userId order by s.period;

-- :name scheduleForSubject :all
select c.*, sc.grade, sc.period, sc.semester, su.subject from schedules sc 
    join courses c using (course_id)
    join subjects su using (course_id)
    where sc.user_id = $userId order by sc.period;

-- :name userPeriodsForGrade :all
select p.allowed_period from schedules s
    join periods p using (course_id) 
    where s.user_id = $userId and s.grade = $grade;

-- :name fullCourse :get
select c.*, su.subject, p.allowed_period from courses c 
    join subjects su using (course_id)
    join periods p using (course_id)
    where course_id = $courseId;

-- :name fullCourses :all
select c.*, su.subject, p.allowed_period from courses c 
    join subjects su using (course_id)
    join periods p using (course_id)

-- :name deleteSchedule :run
delete from schedules where course_id = $courseId and user_id = $userId and grade = $grade limit 1

-- :name deleteUserDefaultClasses :run
delete from schedules where user_id = $userId and is_default = 'true';

-- :name deleteFullSchedule :run
delete from schedules where user_id = $userId;

-- :name insertClass :insert
insert into schedules (user_id, course_id, grade, semester, period, is_default) 
    select
        $userId, c.course_id, $grade, c.duration,
        (select count(*) from schedules where user_id = $userId and grade = $grade),
        'true' as is_default
        from courses c join course_numbers cn using (course_id) where cn.course_number = $courseNumber;

-- :name insertDefaultSchedule :insert
insert into schedules (user_id, course_id, grade, semester, period, is_default)
    select
        $userId as user_id, c.course_id, dc.grade, c.duration,
        row_number() over (
            partition by dc.grade
            order by c.ag
        ) as period,
        'true' as is_default
    from courses c
        join course_numbers cn using (course_id)
        join default_courses dc using (course_number)
        join users using (slc)
        where users.user_id = $userId

-- :name insertFreshmanDefaults :insert
insert into schedules (user_id, course_id, grade, semester, period, is_default)
    select
        $userId as user_id, c.course_id, dc.grade, c.duration,
        row_number() over (
            partition by dc.grade
            order by c.ag
        ) as period,
        'true' as is_default
    from courses c
        join course_numbers cn using (course_id)
        join default_courses dc using (course_number)
        where dc.grade = 9
        group by dc.slc, dc.grade, c.ag
        having count(*) = 1;

-- :name selectDefaultCourses :all
select * from courses c
    join course_numbers cn using (course_id)
    join default_courses dc using (course_number)
    join users using (slc)
    where users.user_id = $userId
    group by dc.slc, dc.grade, c.ag
    having count(*) = 1;

-- :name gradReqs :all
select gr.*, rs.general_subject from grad_requirements gr join requirement_subjects rs using (req_id);

-- :name defaults :all
select c.* from courses c
    join course_numbers using (course_id)
    join default_courses d using (course_number)
    join users u using (slc)
    where u.user_id = $userId;

-- :name electives :all
select * from courses join subjects s using (course_id) where s.subject = 'lacte' or s.subject = 'elect' or s.subject = 'pe'

-- :name reqGroup :get
select * from req_groups where req_id = $reqId;

-- :name getReqGroups :all
select rg.req_id as id, rg.req_text as text
    from req_groups rg
    left join requirements r using (req_id)
    left join course_numbers cn using (course_number)
    left join courses c using (course_id)
    left join schedules s
        on s.course_id = c.course_id
        and s.user_id = $userId
    where rg.slc = $slc
    and rg.grade = $grade
        group by rg.req_id
        having count(distinct s.course_id) = 0;

-- :name getCoursesForGroup :all
select * from courses
    join course_numbers using (course_id)
    join requirements using (course_number)
    join req_groups rg using (req_id)
    where rg.req_id = $reqId

-- :name getReqIdForCourse :all
select rg.req_id from courses c
    join course_numbers using (course_id)
    join requirements using (course_number)
    join req_groups rg using (req_id)
    where c.course_id = $courseId
