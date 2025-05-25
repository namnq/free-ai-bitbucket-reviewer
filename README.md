# Bitbucket AI Code Review WebApp

🚀 **Ready to use**: https://namnq.github.io/free-ai-bitbucket-reviewer

## 📖 Overview
This is a pure frontend web application that automatically reviews Pull Requests (PRs) on Bitbucket using the Bitbucket API and an LLM (Gemini Flash). All processing and data storage occur directly in the browser (IndexedDB) without any backend server.

---

## 🎯 Main Features
1. **Configuration Page**  
   - Enter and save configurations:
     - LLM Token (to call Gemini Flash)
     - Bitbucket Username & App Password (to call the Bitbucket API)
     - Review Prompt (provided by default, editable before/after)
   - Configuration data is stored using IndexedDB.

2. **Repository Search & Pagination**  
   - Search for repositories by any substring (Bitbucket API supports the query `name~"<term>"`).
   - Display results as a list, with pagination support (pagelen = 10 results/page).
   - Each repository in the list shows: full name (`workspace/repo_slug`), description (if available), and status (public/private).

3. **Pull Request Listing**  
   - Clicking a repository automatically calls the API to fetch the list of PRs (Pull Requests) for that repository.
   - Display the list of PRs including: PR ID, title, author, status (OPEN, MERGED, DECLINED), creation date.
   - Indicate whether a PR has been reviewed by AI or not (based on data stored in IndexedDB).

4. **AI Code Review (Gemini Flash)**  
   - Each PR has a "Review" button. When clicked:
     1. Call the Bitbucket API to get the PR diff (endpoint `/diff`).
     2. Retrieve the prompt from the configuration, combine it with the diff, and send the request to the Gemini Flash API.
     3. Show a loading spinner while waiting for results.
     4. When Gemini returns the review, display the content (optionally save it).
     5. Save the reviewed PR status in IndexedDB.
     6. Mark that PR as "Reviewed by AI" in the interface.

---

## 📂 Folder Structure (example using React + Vite)
```
bitbucket-ai-review/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ConfigForm.jsx
│   │   ├── RepoSearch.jsx
│   │   ├── RepoListItem.jsx
│   │   ├── PRList.jsx
│   │   └── PRListItem.jsx
│   ├── db/
│   │   └── indexedDB.js
│   ├── services/
│   │   ├── bitbucketApi.js
│   │   └── geminiFlashApi.js
│   ├── utils/
│   │   └── auth.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles/
│       └── global.css
├── .gitignore
├── package.json
└── README.md 
```

---

## 🛠️ Technologies Used
- **Framework & Tooling**  
  - React (v18+) + Vite  
  - JavaScript (ES6+)
  - [idb](https://github.com/jakearchibald/idb) (IndexedDB wrapper)  
  - Axios (or `fetch` API) for REST API calls  
  - TailwindCSS (or plain CSS) for styling

- **API & LLM**  
  - Bitbucket REST API (v2.0)  
  - Gemini Flash (LLM) API  

- **Local Storage**  
  - IndexedDB (via the `idb` library)  

---

## 🚀 Installation & Running Instructions

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/bitbucket-ai-review.git
   cd bitbucket-ai-review
   ```

2. **Install dependencies**  
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**  
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   - By default, React-Vite will run at `http://localhost:3000` (or the specified port).

4. **Access the application**  
   - Open a browser and navigate to `http://localhost:3000`.
   - First, go to the **Configuration** page, enter the LLM Token, Bitbucket Username/App Password, adjust the Prompt if needed, then click “Save”.

5. **Usage**  
   - Switch to the **Repository Search** tab (or navigate to `/search`):
     1. Enter a repository name (or a keyword) in the search box.
     2. Click “Search” → Repository results will display with pagination.
     3. Click on a repository row → PR list for that repository will appear below.
     4. For each PR:
        - If you want the AI to review it, click the “Review” button.
        - Wait for the loading → Once completed, the status will change to “Reviewed by AI”.

---

## 🧩 IndexedDB Schema Details
- **Database**: `bitbucket_ai_review`

1. **Object Store: `config`**  
   - Key Path: `"singleton"` (only one record)  
   - Value Object format:  
     ```js
     {
       llmToken: "string",
       bitbucketUsername: "string",
       bitbucketAppPassword: "string",
       reviewPrompt: "string"
     }
     ```

2. **Object Store: `reviewed_prs`**  
   - Key Path: `prKey` (for example: `"<workspace>/<repo_slug>#<pr_id>"`)  
   - Value Object format:  
     ```js
     {
       repoFullName: "workspace/repo_slug",   // e.g., "team-x/my-repo"
       prId: 123,                             // PR ID
       reviewedAt: "2025-05-23T10:00:00Z"      // ISO timestamp
     }
     ```

---

## 🗂️ Task Breakdown (Completed)
1. **Initialize Project**  
   - React + Vite template  
   - Install `idb`, `axios`, `tailwindcss` (if needed)

2. **Set Up IndexedDB**  
   - Create `bitbucket_ai_review` database  
   - Create object stores: `config`, `reviewed_prs`  
   - Implement helper functions:  
     - `getConfig()`, `saveConfig(configObj)`  
     - `isPRReviewed(prKey)`, `markPRReviewed(prKey, repoFullName, prId)`

3. **Build Configuration Page**  
   - Component `ConfigForm.jsx`:
     - Form fields: LLM Token, Bitbucket Username, App Password, Review Prompt (textarea)
     - Load existing data from IndexedDB on mount
     - On “Save” → validate → call `saveConfig()`

4. **Build Repository Search Page**  
   - Component `RepoSearch.jsx`:
     - State variables: `searchTerm`, `currentPage`, `repoList`, `isLoading`, `error`, `totalPages`
     - `handleSearch()` → call `bitbucketApi.searchRepositories(searchTerm, currentPage)`
     - Display repository list (via `RepoListItem.jsx`)
     - Implement pagination (Next/Prev)

   - Service `bitbucketApi.searchRepositories(term, page)`:
     - URL: `https://api.bitbucket.org/2.0/repositories?q=name~"${term}"&pagelen=10&page=${page}`
     - Basic Auth: Base64(username:appPassword)
     - Returns `{ values: [ ... ], page: x, pagelen: 10, size: totalCount }`

5. **Display Repository List**  
   - `RepoListItem.jsx`:  
     - Props: `repo` (object from API)
     - Display name, description, public/private status  
     - “View PR” button

6. **Fetch & Display PRs for a Repository**  
   - On “View PR” click:
     - Call `bitbucketApi.getPullRequests(repoFullName)`
     - API: `https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests?pagelen=10&page=1`  
     - Returns array of PR objects
   - Component `PRList.jsx`:
     - Props: `repoFullName`, `prList`
     - Each row: `PRListItem.jsx` displays ID, title, author, status
     - If PR is already reviewed (check `isPRReviewed(repoFullName + "#" + prId)`), show “Reviewed by AI” badge
     - “Review” button appears only if not yet reviewed

7. **Fetch PR Diff & AI Review Call**  
   - Service `bitbucketApi.getPRDiff(repoFullName, prId)`:
     - Endpoint: `https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diff`
     - Returns plain-text diff or patch
   - Service `geminiFlashApi.reviewCode(diffText, prompt, llmToken)`:
     - POST to Gemini Flash endpoint
     - Header: `Authorization: Bearer <llmToken>`
     - Body: `{ "prompt": "<prompt>", "content": "<diffText>" }`
     - Returns JSON with `"reviewResult": "string"`
   - In `PRListItem.jsx`:
     - On “Review” click:
       1. Replace “Review” text with spinner (toggle `isLoading` state)
       2. Call `getPRDiff(...)` → retrieve `diffText`
       3. Call `reviewCode(diffText, prompt, llmToken)` → retrieve `reviewResult`
       4. Save reviewed status: `markPRReviewed(repoFullName + "#" + prId, repoFullName, prId)`
       5. Update UI: show “Reviewed by AI” badge, display “Review completed” message

8. **Error Handling & UI Feedback**  
   - If no configuration is found (e.g., LLM Token or App Password missing), prompt user to configure first.
   - If API call returns error (401, 404, 500), display error message (e.g., “Invalid credentials”, “Repository not found”, “PR has no diff”, etc.).
   - If Gemini Flash call fails, show “AI Review failed” with retry option.

9. **UI Polishing & Responsiveness**  
   - Simple, clear layout  
   - Appropriate color scheme, spacing, readable fonts  
   - Responsive design for smaller screens (mobile/tablet)

10. **(Optional) Extensions**  
    - Save AI review content (create `reviews` store in IndexedDB)  
    - Allow direct commenting on PR via Bitbucket API endpoint [POST /pullrequests/{pr_id}/comments](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pr-id-comments-post)  
    - Support multiple workspaces (allow user to select workspace if their account has more)

---

## 📌 Contribution Guidelines
1. Fork this repository.
2. Create a new branch with a clear name, e.g., `feature/config-page` or `bugfix/pr-loading`.
3. Code, commit, and push to your branch.
4. Open a Pull Request (PR) with a clear description of changes.
5. Wait for review & merge.

---

## 🎫 License
This project is licensed under the MIT License.

---

## 🔗 References
- Bitbucket REST API v2.0 Documentation: https://developer.atlassian.com/cloud/bitbucket/rest/
- GitHub: idb (IndexedDB wrapper): https://github.com/jakearchibald/idb
- Gemini Flash API Documentation: https://developers.google.com/llm
- ReactJS Docs: https://reactjs.org/docs/getting-started.html
- ViteJS Docs: https://vitejs.dev/guide/