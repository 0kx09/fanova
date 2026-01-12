# Quick GitHub Setup Guide

## 🚀 Quick Steps

### 1. Create GitHub Repository
- Go to https://github.com/new
- Name: `fanova`
- Choose **Private** (recommended)
- **Don't** initialize with README
- Click **Create repository**

### 2. Run These Commands

Open PowerShell or Git Bash in `C:\Fanova`:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Fanova AI Model Creator"

# Add GitHub repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fanova.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Authentication

When pushing, GitHub will ask for credentials:
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your password)
  - Create token: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Select `repo` scope
  - Copy the token and use it as your password

## ✅ Verify

Go to `https://github.com/YOUR_USERNAME/fanova` - you should see all your files!

## 🔄 Future Updates

```bash
git add .
git commit -m "Your change description"
git push
```

## ⚠️ Important

- `.env` files are automatically ignored (in .gitignore)
- `node_modules/` is automatically ignored
- Never commit sensitive information!
