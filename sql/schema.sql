create table if not exists courses(
  course_id integer primary key,
  title text unique not null,
  description text,
  prerequisite text,
  duration text,
  credits integer,
  ag text
);

create table if not exists subjects(
  course_id integer,
  subject text,
  foreign key (course_id) references courses(course_id)
);

create table if not exists grad_requirements(
  req_id integer primary key,
  subject text,
  credit integer
);

create table if not exists requirement_subjects(
  req_id integer,
  general_subject text,
  foreign key (req_id) references grad_requirements(req_id)
);

create table if not exists prerequisites(
  course_id integer,
  prerequisite_id integer,
  type text, -- required or recommended
  foreign key (course_id) references courses(course_id)
  foreign key (prerequisite_id) references courses(course_id)
);

create table if not exists categories(
  course_id integer,
  category text,
  foreign key (course_id) references courses(course_id)
);

create table if not exists slcs(
  course_id integer,
  slc text,
  unique(course_id, slc),
  foreign key (course_id) references courses(course_id)
);

create table if not exists grades(
  course_id integer,
  grade integer,
  status text, -- allowed or recommended
  check (grade between 9 and 12),
  foreign key (course_id) references courses(course_id)
);

create table if not exists ic_courses(
  ic_course_id integer primary key,
  course_number text unique,
  title text,
  sections integer,
  department_name text
) without rowid;

-- Populated from matches.json
create table if not exists potential_matches(
  course_number text primary key,
  title text,
  ic_title text,
  similarity real,
  foreign key (course_number) references ic_courses(course_number),
  foreign key (title) references courses(title)
);

-- Hand curated
create table if not exists course_numbers(
  course_id integer, -- from our system
  course_number text, -- from IC
  primary key (course_id),
  foreign key (course_id) references courses(course_id)
  -- commenting out to get the fake ids to work
  -- foreign key (course_number) references ic_courses(course_number)
);

-- Unused so far
create table if not exists matched (course_number text, title text);

create table if not exists users(
  user_id text primary key,
  email text not null,
  role text not null default 'user',
  grade integer,
  slc text,
  is_advanced text default 'false'
) without rowid;

create table if not exists stars(
  user_id text,
  course_id integer,
  primary key (user_id, course_id),
  foreign key (course_id) references courses(course_id),
  foreign key (user_id) references users(user_id)
);

create table if not exists schedules(
  user_id text,
  course_id integer,
  grade integer,
  semester text,
  period integer,
  is_default text, -- true or false
  foreign key (user_id) references users(user_id),
  foreign key (course_id) references courses(course_id)
);

create table if not exists default_courses(
  course_number text,
  slc text,
  grade integer
);

create table if not exists req_groups(
  req_id text,
  req_text text,
  slc text,
  grade integer
);

create table if not exists requirements(
  req_id text,
  course_number text
);

create table if not exists periods(
  course_id integer,
  allowed_period text, -- normal, 0, 7, ext
  foreign key (course_id) references courses(course_id)
);