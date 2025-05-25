# Getting Started with Bitbucket AI Code Review

This guide will help you set up and run the Bitbucket AI Code Review application step by step.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 3. Configure Your Credentials

1. Open the application in your browser
2. You'll be redirected to the Configuration page
3. Fill in the required credentials (see setup guides below)
4. Click "Save Configuration"
5. Navigate to "Repository Search" to start reviewing PRs

---

## 🔧 Setup Guides

### Gemini API Setup

1. **Get API Key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key (starts with `AIza...`)

2. **Enter in Configuration:**
   - Paste the API key in the "Gemini API Token" field
   - Click "Test API Key" to verify it works

### Bitbucket App Password Setup

1. **Create App Password:**
   - Go to [Bitbucket Settings → App passwords](https://bitbucket.org/account/settings/app-passwords/)
   - Click "Create app password"
   - Give it a descriptive name (e.g., "AI Code Review Tool")

2. **Set Permissions:**
   Select these permissions:
   - **Account**: Read
   - **Repositories**: Read
   - **Pull requests**: Read (and Write if you want to post comments)

3. **Save Credentials:**
   - Copy the generated app password
   - Enter your Bitbucket username and app password in the configuration

---

## 🎯 How to Use

### 1. Search for Repositories
- Enter a repository name or keyword in the search box
- Browse through the search results
- Click "View PRs" on any repository to see its pull requests

### 2. Review Pull Requests
- Browse through Open, Merged, or Declined PRs
- Click "🤖 Review" on any PR to get an AI code review
- View the generated review with detailed feedback

### 3. Manage Reviews
- Copy reviews to clipboard
- View diff statistics
- Track which PRs have been reviewed
- (Coming soon: Post reviews as PR comments)

---

## 📊 Features

### ✅ Implemented
- Repository search with pagination
- Pull request listing by status
- AI-powered code review using Gemini Flash
- Review history tracking with IndexedDB
- Responsive design with Tailwind CSS
- Credential validation and testing

### 🚧 Coming Soon
- Post AI reviews as PR comments
- Bulk review multiple PRs
- Custom review templates
- Review analytics and metrics
- Export reviews to various formats

---

## 🔍 Troubleshooting

### Common Issues

**"Invalid Bitbucket credentials"**
- Double-check your username (no spaces or @ symbol)
- Ensure your app password has the correct permissions
- Try the "Test Connection" button to verify

**"Invalid Gemini API key"**
- Verify the API key starts with "AIza"
- Check that your Google account has API access enabled
- Try the "Test API Key" button

**"No repositories found"**
- Make sure you're searching in repositories you have access to
- Try different search terms
- Check that your Bitbucket credentials are correct

**"Failed to fetch pull requests"**
- Ensure the repository exists and you have read access
- Check that the repository has pull requests
- Verify your Bitbucket app password has "Pull requests: Read" permission

### Performance Tips

- **Large PRs**: Reviews of very large PRs (>1000 lines) may take longer
- **API Limits**: Be mindful of Gemini API rate limits for frequent reviews
- **Browser Storage**: The app uses IndexedDB to store review history locally

---

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
├── services/           # API services (Bitbucket, Gemini)
├── db/                 # IndexedDB utilities
├── utils/              # Helper functions
└── styles/             # CSS styles
```

### Key Technologies
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB via idb library
- **HTTP**: Axios for API calls
- **Routing**: React Router

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

## 🔐 Security Notes

- **API Keys**: Never commit API keys to version control
- **Local Storage**: All data is stored locally in your browser
- **No Backend**: This is a pure frontend application
- **HTTPS**: Use HTTPS in production for secure API calls

---

## 📚 API References

- [Bitbucket REST API v2.0](https://developer.atlassian.com/cloud/bitbucket/rest/)
- [Gemini API Documentation](https://ai.google.dev/api)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.
