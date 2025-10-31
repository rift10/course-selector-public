#!/usr/bin/env python

import csv
import pugsql
import re

grades = ['freshman', 'sophomore', 'junior', 'senior']

queries = pugsql.module("sql/python")
queries.connect("sqlite:///sql/db.db")

data = []
prereqs = []

def add_courses(courses, grade):
    for course in courses:
        data.append((course['title'], grade))

def match_and_add_courses(grade, pattern):
    courses = queries.match_course_for_string(pattern=f"%{pattern}%")
    add_courses(courses, grade)

current_grade = 9
for grade in grades:
    match_and_add_courses(current_grade, grade)
    current_grade += 1

courses = queries.courses()
course_titles = list(map(lambda x: x['title'], queries.courses()))

for course in courses:
    if not course['prerequisite']: continue
    if m := re.search(r"grades?( |\n)(\d{1,2})-(\d{2})", course['prerequisite'], flags=re.DOTALL | re.IGNORECASE):
        grade = int(m.group(2))
        while grade <= int(m.group(3)):
            data.append((course['title'], grade))
            grade += 1
    elif m := re.search(r"grade( |\n)(\d{1,2})", course['prerequisite'], flags=re.DOTALL| re.IGNORECASE):
        data.append((course['title'], int(m.group(2))))

    for course_title in course_titles:
        if course_title in course['prerequisite']:
            # List of pairs of (course, prereq_to_that_course)
            prereqs.append((course['title'], course_title))

for pair in prereqs:
    for match in data:
        if (match[0] == pair[1]):
            # If the course title in the grade match is the prereq in this pair
            # then add the course of this pair and the next grade to the data set
            data.append((pair[0], min(match[1] + 1, 12)))


def write_file(file_name, data):
    with open(file_name, "w", newline="") as tsvfile:
        tsv_writer = csv.writer(tsvfile, delimiter="\t")
        tsv_writer.writerows(list(set(data)))

write_file("grade-pairs.tsv", data)

# This file also fills out prereqs.tsv for our base prerequisite linking data
write_file("prereqs.tsv", prereqs)
