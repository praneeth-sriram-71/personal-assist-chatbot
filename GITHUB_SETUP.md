# GitHub Repository Setup Instructions

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `personal-assistant-chatbot` (or your preferred name)
3. Choose **Public** or **Private**
4. **DO NOT** check "Initialize this repository with a README"
5. Click **"Create repository"**

## Step 2: Copy Your Repository URL

After creating the repository, GitHub will show you a page with setup instructions. Copy the repository URL. It will look like one of these:

- HTTPS: `https://github.com/YOUR_USERNAME/personal-assistant-chatbot.git`
- SSH: `git@github.com:YOUR_USERNAME/personal-assistant-chatbot.git`

## Step 3: Run These Commands

Once you have your repository URL, run these commands in PowerShell:

```powershell
# Add your GitHub repository as remote origin
git remote add origin YOUR_REPOSITORY_URL_HERE

# Push your code to GitHub
git push -u origin main
```

**Replace `YOUR_REPOSITORY_URL_HERE` with the actual URL you copied from GitHub.**

## Example:

If your repository URL is `https://github.com/username/personal-assistant-chatbot.git`, run:

```powershell
git remote add origin https://github.com/username/personal-assistant-chatbot.git
git push -u origin main
```

## Troubleshooting

If you get authentication errors:
- For HTTPS: GitHub will prompt for username and password (use a Personal Access Token as password)
- For SSH: Make sure you have SSH keys set up with GitHub

To create a Personal Access Token:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. Use this token as your password when pushing

