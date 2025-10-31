.PHONY: all clean matching match-pairs

all: public/catalog.json matches.json sql/db.db sql/queries.sql match-pairs

run:
	npx nodemon --delay 2 --watch . -e js,json,njk,html,sql index.js

pretty:
	npx @biomejs/biome check --write .

fix:
	npx @biomejs/biome check --write --unsafe .

deploy:
	sqlite3 sql/db.db .dump > dump.sql
	fly secrets import --stage < .env
	fly deploy

publish:
	rsync -r public/ ~/web/www.gigamonkeys.com/misc/bhs-catalog/

public/catalog.json: extract.py catalog.txt
	uv run extract.py catalog.txt > $@

ic-courses.json: ic-courses.csv
	mlr --icsv --ojson cat $< | jq '[ .[] | .courseInfo ]' > $@

match-pairs: sql/schema.sql grade.py slc.py database-pairs.js
	uv run grade.py
	uv run slc.py
	node database-pairs.js

matches.json: match-names.js public/catalog.json ic-courses.json
	./$< > $@

matches.csv: matches.json
	mlr --ijson --ocsv cat $< > $@

sql/db.db: sql/schema.sql sql/queries.sql
	sqlite3 $@ < sql/schema.sql
	node database.js
	sqlite3 --tabs $@ '.import matched.tsv matched'

sql/queries.sql: sql/schema.sql
	npx puglify sql/schema.sql > $@

matching: potential-matches.tsv unmatched.tsv unmatched-ic.tsv

potential-matches.tsv: sql/db.db
	sqlite3 --header --tabs sql/db.db "select *, case when similarity = 1.0 then 'TRUE' else 'FALSE' end ok from potential_matches order by similarity desc;" > $@

unmatched.tsv: sql/db.db
	sqlite3 --header --tabs sql/db.db 'select courses.title from courses left join matched using (title) where matched.title is null;' > $@

unmatched-ic.tsv: sql/db.db
	sqlite3 --header --tabs sql/db.db 'select course_number, ic.title, sections from ic_courses ic left join matched using (course_number) where matched.course_number is null order by sections desc, ic.title;' > $@


clean:
	rm -f ic-courses.json
	rm -f matches.csv
	rm -f matches.json
	rm -f potential-matches.tsv
	rm -f public/catalog.json
	rm -f sql/db.db
	rm -f sql/queries.sql
	rm -f unmatched*.tsv
	rm -f grade-pairs.tsv
	rm -f slc-pairs.tsv
	rm -f prereqs.tsv
