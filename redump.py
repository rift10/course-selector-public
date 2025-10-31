#!/usr/bin/env python

import re
import json
from sys import argv, stderr, stdout

with open(argv[1]) as f:
    data = sorted(json.load(f), key=lambda x: x['title'])

def cats(categories):
    return ''.join(f'({cat})' for cat in categories)

seen = set()

for course in data:
    dup = 'DUP: ' if course['title'] in seen else ''
    seen.add(course['title'])

    print(f"{dup}{course['title']} {cats(course['categories'])} {course['duration']} · {course['credits']} Credits")
    print()
    print(course['description'])
    print()
