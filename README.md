# Catalog conversion

## Milestones

### Demo for VP Clegg

- [X] Filter course view
- [ ] Course edit view w/ editable IC course #'s
- [ ] Sample SLC pages a la PDF catalog.
- [X] Link courses to IC course numbers in DB.

### Deploy to counselors

- [ ] All editing UI complete (everything that needs to be editable can be)
- [ ] Change logging in DB

### Deploy to students

- [ ] Separate logged in & logged out site versions
- [ ] Login screen to choose grade/slc
- [ ] Personalized recommendations based on grade/slc 

## Todo

- [ ] UI improvements
  - [X] Make pills in the course cards also act as filter toggles.
  - [X] Color code each a-g credit & level
  - [X] Add duration/credit info to classes
  - [ ] Make navbar sticky
  - [ ] Add favicon.ico
  - [X] Add dark mode/light mode toggle
  - [ ] Improve login page look
    - [X] Add customized error messages (eg wrong domain)
  - [X] Add a message that a course was successfully updated
  - [X] Add sidebar for action buttons (logout, editing, etc)
  - [ ] Maybe improve grade/slc display for each course (not pills)
- [ ] Filtering
  - [X] Categories like P, AP, CTE, etc
  - [ ] Add afam, mlp, inclusive ed filters
  - [ ] SLC/Grade
- [X] Parse prerequisites into machine-readable form (link to other courses)
  - [X] Link prerequisites to other courses in the UI
- [X] Add grade meta data to courses. Maybe two: "open to", and "generally for"
- [X] Link with IC course codes
  - [X] Get IC course codes
  - [X] Map between catalog names and course codes
  - [X] Get course code info pairs
    - [X] Python script to dump tsv of catalog name & slc pairs
    - [X] Python script to dump tsv of catalog name & grade pairs
  - [X] Add IC course code data to the ui
- [ ] Put data in SQLite database.
  - [X] Create schema.sql
  - [X] Import JSON files into SQL database
  - [ ] Fill out all SQL tables
- [X] Start serving from database
  - [X] Set up an express server
  - [X] Add nunjucks for templating
  - [X] Generate the same main page but from the database rather than the json file
    - [ ] Try using htmx
- [ ] User authentication
  - [X] Hook up to Google auth
  - [X] Restrict login to only berkeley.net
  - [ ] Allow admins to make people editors
  - [ ] Extra login page to select grade/slc for students?
  - [ ] Create separate 'logged out' version and 'logged in' version of the website
- [X] Add separate pages that map to different sections of the pdf (slcs, subjects, etc)
  - [X] Add info blurbs for each page
- [ ] Personalized recommendations
  - [X] Store users' grade & slc info
  - [X] Recommend courses based on whether a person can take a class based on slc/grade
  - [X] Sort courses by prerequisites and grade-level so earlier courses are listed first (maybe have a relevance score for each course)
  - [ ] Recomemend courses based on previous courses taken (don't recommend if already taken)
  - [ ] Recomemend courses based on credits left to graduate/for UCs
- [ ] Schedule creation
  - [ ] Let users add classes to a 'shopping cart' (potential schedule)
  - [ ] Store users' past courses in database
  - [ ] Have progress bars for each a-g credit (or something similar)
  - [ ] Maybe have different schedule sheets for all four years
- [ ] Online editing
  - [X] Checkboxes to edit the grades/slcs each course is open to
  - [X] UI for changing course descriptions
  - [X] UI for changing grade/slc course metadata
  - [ ] UI for changing a-g & rigor course metadata
  - [ ] UI for changing course title (maybe store ic title and editable title in db)
  - [ ] UI for changing linked prerequisites (dropdown menu)
  - [ ] UI for changing linked ic course ids
  - [X] Add optional Google auth for berkeley.net addresses for write actions
  - [ ] Store log of edits in DB recording who, when, and new value.
  - [ ] Allow editors to add in new courses

## How we got here

Downloaded course catalog [BHS_CourseCatalog_2025-26_Final-Web.pdf](https://bhs.berkeleyschools.net/wp-content/uploads/2025/06/BHS_CourseCatalog-25-26.pdf)

`catalog-2025-26.txt` was made by opening
`BHS_CourseCatalog_2025-26_Final-Web.pdf` in Preview, selecting all, and
copying.

`catalog.txt` was made by first running `catalog-2025-26.txt` through `clean.pl`
but then mostly hand cleaning it to extract just the course title lines and the
course descriptions.

The script `extract.py` can build a JSON file from `catalog.txt`. See the
`Makefile` for details.
