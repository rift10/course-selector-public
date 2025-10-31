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

-- :name matchForAG :all
select * from courses where ag = $ag;

-- :name updateCourseText :run
update courses set (description, prerequisite) = ($description, $prerequisite) where course_id = $courseId

-- :name matchForCategory :all
select * from courses join categories on courses.course_id = categories.course_id where categories.category = $category

-- :name matchForSlc :all
select * from courses join slcs on courses.course_id = slcs.course_id where slcs.slc = $slc

-- :name grade :get
select * from grades where course_id = $courseId;

-- :name updateGrade :run
update grades set (grade, status) = ($grade, $status) where course_id = $courseId

-- :name deleteGradeData :run
delete from grades where course_id = $courseId

-- :name deleteSlcData :run
delete from slcs where course_id = $courseId

-- :name matchForIcCourseNumber :get
select * from ic_courses where course_number = $courseNumber;

-- :name slc :get
select * from slcs where course_id = $courseId;

-- :name updateSlc :run
update slcs set (slc) = ($slc) where course_id = $courseId

-- :name hasUser :exists
select * from users where user_id = $userId;

-- :name updateUserInfo :insert
update users set (grade, slc) = ($grade, $slc) where user_id = $userId
