#!/usr/bin/env perl

use warnings;
use strict;

while (<>) {
    /Berkeley High School Course Catalog 2025–26/ and next;
    /Key to Abbreviations: UCOP/ and next;
    /and Performing Arts, \(g\)-Elective;/ and next;
    /Education; \(ROP\)–Regional/ and next;
    print;
}
