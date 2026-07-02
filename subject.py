#!/usr/bin/env python

import csv
import pugsql

queries = pugsql.module("sql/python")
queries.connect("sqlite:///sql/db.db")

subjectMatching = {
    "a": "soc",
    "b": "eng",
    "c": "math",
    "d": "sci",
    "e": "lacte",
    "f": "lacte",
    "g": "elect",
}

data = []

for course in queries.courses():
    print(course["ag"])
    if course["ag"] is not None: 
        data.append((course["title"], subjectMatching[course["ag"]]))
    else:
        data.append((course["title"], "unmatched"))

with open("subject-pairs.tsv", "w", newline="") as tsvfile:
    tsv_writer = csv.writer(tsvfile, delimiter="\t")
    tsv_writer.writerows(set(data))
