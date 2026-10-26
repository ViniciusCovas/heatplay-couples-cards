# GetClose: full project guide (PDF)

## Login status
Sign-in records show a successful email + password login for viniciuscovas@gmail.com at 21:13 UTC on the live site. The failed attempt at 21:10 was before the temporary password was set. No fix needed. If it fails again, I will check whether the preview and live site use different addresses.

## PDF contents
1. Cover: GetClose logo, colors, and tagline
2. Brand: logo, color palette, fonts, card styles, tone of voice
3. Game concept: two players, a room code, taking turns answering and rating each other, closeness score
4. Levels: Spark, Connection, Fire, No Filter (with names in ES/FR/PT), colors, sample questions
5. Screen-by-screen walkthrough with real screenshots: Home, Sign in, Create room, Join room, Closeness choice, Level select, Waiting room, Card, Answer, Rating, Level up, Results/Insights, Credits purchase, Admin
6. Game flow diagram: room phases, turn order, how the two phones stay in sync
7. Credits, payments, and emails
8. Rebuild notes: what to keep (design, questions) and what to redo (syncing between players)

## Technical details
- Take screenshots of each page from the running app, signed in as the user's account
- Pull brand colors and fonts from the app's style files; read level and question data from the database
- Build the PDF and check every page as an image before delivering
- Save to /mnt/documents/GetClose_Project_Guide.pdf
