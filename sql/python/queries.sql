-- :name courses :many
select * from courses;

-- :name match_course_for_string :many
select * from courses where title like :pattern or description like :pattern