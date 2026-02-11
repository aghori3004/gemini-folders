# Chrome Web Store — Permissions Justification

Use these responses when the Chrome Web Store Developer Dashboard asks you to justify each permission.

---

## `storage`

**Justification:**
Used to persist the user's login/logout preference locally using `chrome.storage.local`. When a user explicitly signs out, the extension saves a flag so that they are not automatically re-logged-in on page reload. No sensitive data is stored — only a boolean preference flag.

---

## `identity`

**Justification:**
Used to authenticate the user via `chrome.identity.getAuthToken()` with Google Sign-In. The extension requires authentication to associate folders with the correct user account in Firebase Firestore. Only the `userinfo.email` and `userinfo.profile` OAuth scopes are requested — no access to Drive, Calendar, or other Google services.

---

## Host Permission: `https://gemini.google.com/*`

**Justification:**
The extension injects a content script into the Gemini web app to:
1. Display the folder management UI in the sidebar.
2. Read chat titles and IDs from network responses (via XHR/fetch interception) to populate the folder interface.
3. Track URL changes to highlight the currently active chat.

The extension does NOT read chat message content — only sidebar-visible metadata (titles, IDs, timestamps).

---

## Host Permissions: `https://*.firebaseio.com/*`, `https://*.googleapis.com/*`, `https://*.firebaseapp.com/*`

**Justification:**
Required for the Firebase SDK to communicate with Firestore (data storage) and Firebase Auth (user authentication). All user data is stored securely in Firebase Firestore with per-user security rules that prevent cross-user data access.

---

## Single Purpose Description

**"Gemini Folders organizes your Google Gemini AI chats into customizable folders for easy access and management."**
