## Transcript Highlights

### 1. Project restructuring around new vision (Session 1, midway)
Sometime after building the voting page, I asked Claude to, one at a time, redo each page to fit a more scaled-back vision of my website. After some tinkering and rewriting some code, Claude was able to scrap the account-based model in favor of a no-login system where poll data is stored in the browser via localStorage.

### 2. Diagnosing repeated "Unexpected Token" errors (Session 1, near the end)
When trying to create a poll, an error occurred that prevented it from taking place and essentially would stifle any further testing. I allowed  Claude to try multiple solutions, even when they didn't work, and eventually, it discovered that the problem was an error involving stale Node.js processes. 

### 3. Discovering a simple markup error that broke certain systems (Session 2, near the start)
When I tested the site after a new commit, certain sections of the Create A Poll page broke, mainly the Category dropdown and the live preview. Claude determined that a single missing quotation mark caused whole sections to get swallowed, so it is important that I was able to catch that.