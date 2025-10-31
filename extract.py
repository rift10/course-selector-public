#!/usr/bin/env python

import re
import json
from sys import argv, stderr, stdout

# Match the course title and metadata line
pat = r'^(.+?)(\(.*?\)\s*)?\s*(Year|Semester|Fall|Spring)\s*.*?(\d+(?:\.\d+)?)\s*Credits\s*'


def load_catalog(file):
    course = None
    courses = []
    prerequisite = False
    with open(file, encoding = 'utf-8') as f:
        for line in f:
            if m := re.fullmatch(pat, line[:-1]):
                course = {}
                course['title'] = m.group(1).strip()
                course['duration'] = m.group(3).strip()
                course['credits'] = float(m.group(4))
                course['categories'] = re.findall(r'\((.*?)\)', m.group(2) or '')
                course['description'] = ''
                course['prerequisite'] = None
                course['ag'] = None

                courses.append(course)

            elif re.search(r'Credits', line[:-1]):
                print(f'Uh oh: {line[:-1]}', file=stderr)

            else:
                course['description'] += line

    return courses

def main(argv):
    courses = load_catalog(argv[1])

    for c in courses:
        desc = c['description'].strip()
        if m := re.search(r'Prerequisites?:\s+(.*\.)', desc, flags=re.DOTALL):
            desc = re.sub(r'Prerequisites?:\s+(.*\.)', '', desc, flags=re.DOTALL)
            c['prerequisite'] = m.group(1)
            if c['prerequisite'].lower() == "none":
                c['prerequisite'] = None

        if m := re.search(r'UC/CSU\s+\((\w)\)', desc, flags=re.DOTALL):
            desc = re.sub(r'UC/CSU\s+\((\w)\)', '', desc, flags=re.DOTALL)
            c['ag'] = m.group(1)


        c['description'] = desc

    json.dump(courses, stdout, indent=2)


if __name__ == "__main__":
    main(argv)
