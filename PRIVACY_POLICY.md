# Privacy Policy — Gemini Folders

**Last updated: February 12, 2026**

## What Gemini Folders Does

Gemini Folders is a browser extension that lets you organize your Google Gemini chats into custom folders. It adds a folder interface to the Gemini sidebar so you can group, search, and manage your conversations.

## Data We Collect

Gemini Folders collects the following data, solely for the purpose of providing the extension's functionality:

| Data | Purpose |
|------|---------|
| **Google account email and profile name** | Used to authenticate you and associate your folders with your account |
| **Chat titles and IDs** | Read from the Gemini sidebar to let you organize chats into folders |
| **Folder names and structure** | Created by you to organize your chats |

## How Data Is Stored

- All user data (folders, chat references, metadata) is stored in **Google Firebase Firestore**, a cloud database operated by Google.
- Data is stored **per-user** — each user can only access their own folders and settings.
- Firestore security rules enforce that **no user can read or modify another user's data**.
- Authentication is handled via **Google Sign-In** through Chrome's identity API.

## Data We Do NOT Collect

- We do **not** collect chat message content — only titles and IDs visible in the sidebar.
- We do **not** collect browsing history, keystrokes, or any data outside of gemini.google.com.
- We do **not** use analytics, tracking pixels, or third-party advertising.
- We do **not** sell, share, or transfer any user data to third parties.

## Permissions Explained

| Permission | Why It's Needed |
|-----------|-----------------|
| `storage` | Persists user preferences (e.g., logout state) locally in the browser |
| `identity` | Authenticates you with Google Sign-In to secure your data |
| Host access to `gemini.google.com` | Reads chat titles from the sidebar and displays the folder UI |
| Host access to `*.firebaseio.com`, `*.googleapis.com`, `*.firebaseapp.com` | Connects to Firebase for secure data storage and authentication |

## Data Retention

Your data is retained in Firebase for as long as your account exists. You can delete all your folders at any time through the extension. To request complete data deletion, contact us at the email below.

## Contact

If you have questions about this privacy policy, contact: **divyanshgangwar3004@gmail.com**
