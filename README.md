# Arcade

A collection of retro-style arcade games built with Phaser 3 and React.

## Games

- **Gravity Rotator**: A platformer where jumping rotates gravity through four directions
- **Pong**: Classic Pong game
- More games coming soon!

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push to the `main` or `master` branch.

### Setup Instructions

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - The workflow will automatically deploy on the next push to `main` or `master`

3. **Configure base path (if needed)**:
   - If your repository name is different from your GitHub Pages URL (e.g., `username.github.io/repo-name`), update `vite.config.ts`:
     ```typescript
     base: '/your-repo-name/',
     ```

4. **Access your site**:
   - After deployment, your site will be available at:
     - `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` (if using a repository name)
     - `https://YOUR_USERNAME.github.io/` (if using a user/organization page)

The GitHub Actions workflow will automatically build and deploy your site whenever you push changes to the main branch.

