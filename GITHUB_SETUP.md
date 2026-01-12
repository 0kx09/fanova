# Uploading Fanova to GitHub

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Repository name: `fanova` (or your preferred name)
4. Description: "AI Model Creator - Fanova"
5. Choose **Private** (recommended) or **Public**
6. **DO NOT** initialize with README, .gitignore, or license (we'll add these)
7. Click **Create repository**

## Step 2: Initialize Git in Your Project

Open your terminal in the project directory (`C:\Fanova`) and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Fanova AI Model Creator"
```

## Step 3: Connect to GitHub

```bash
# Add your GitHub repository as remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/fanova.git

# OR if using SSH:
# git remote add origin git@github.com:yourusername/fanova.git

# Verify remote was added
git remote -v
```

## Step 4: Push to GitHub

```bash
# Push to GitHub (main branch)
git branch -M main
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your password)
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token with `repo` scope
  - Use this token as your password

## Step 5: Verify Upload

1. Go to your GitHub repository page
2. You should see all your files
3. Make sure `.env` files are NOT visible (they should be in .gitignore)

## Future Updates

After making changes:

```bash
# Check what changed
git status

# Add changed files
git add .

# Commit changes
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## Important Notes

✅ **DO commit:**
- Source code files
- Configuration files (package.json, etc.)
- Documentation
- Public assets

❌ **DON'T commit:**
- `.env` files (contains secrets)
- `node_modules/` (too large, install with npm)
- `build/` folder (generated files)
- Log files
- Personal credentials

## Troubleshooting

### "Repository not found"
- Check your repository URL is correct
- Make sure you have access to the repository
- Verify your GitHub username

### "Authentication failed"
- Use Personal Access Token instead of password
- Make sure token has `repo` scope

### "Large files error"
- Make sure `node_modules/` is in .gitignore
- Make sure `build/` is in .gitignore
- If you accidentally committed large files, see below

### Remove accidentally committed files

```bash
# Remove from git but keep locally
git rm --cached -r node_modules/
git rm --cached -r build/
git rm --cached server/.env

# Commit the removal
git commit -m "Remove sensitive/large files"

# Push
git push
```

## Setting Up on Server

After pushing to GitHub, on your Digital Ocean server:

```bash
cd /var/www
git clone https://github.com/yourusername/fanova.git
cd fanova
# Then follow deployment steps
```
