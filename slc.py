#!/usr/bin/env python

import csv
import pugsql

slcs = ['AHA', 'AMPS', 'BIHS', 'CAS']

queries = pugsql.module('sql/python')
queries.connect('sqlite:///sql/db.db')

data = []


def add_courses(courses, slc):
    for course in courses:
        data.append((course['title'], slc))


def match_and_add_courses(slc, pattern):
    courses = queries.match_course_for_string(pattern=f'%{pattern}%')
    add_courses(courses, slc)


for slc in slcs:
    match_and_add_courses(slc, slc)

match_and_add_courses('U9', 'freshman')

# Assume anything with 'IB' is BIHS
match_and_add_courses('BIHS', 'IB')

# Assume all other courses are AC
ac_courses = filter(
    (lambda course: course['title'] not in [item[0] for item in data]),
    queries.get_unmatched_courses()
)
add_courses(ac_courses, 'AC')


with open("slc-pairs.tsv", "w", newline="") as tsvfile:
    tsv_writer = csv.writer(tsvfile, delimiter="\t")
    tsv_writer.writerows(set(data))
