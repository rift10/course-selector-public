-- :name courses :many
select * from courses;

-- :name match_course_for_string :many
select * from courses where title like :pattern or description like :pattern;

-- :name get_unmatched_courses :many
select * from courses left join slcs using (course_id) where slcs.slc is null;