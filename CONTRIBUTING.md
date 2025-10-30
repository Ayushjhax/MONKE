# Contributing to Driftly

Thanks for your interest in contributing! We welcome issues, features, and docs.

## Getting Started

1. Fork the repository to your GitHub account
2. Clone your fork locally
3. Create a branch for your change:
   ```bash
   git checkout -b feat/your-change
   ```
4. Install and run the frontend:
   ```bash
   cd MONKE/frontend
   npm install
   cp .env.example .env  # or create .env.local
   npm run dev
   ```
5. (Optional) Run the backend API with Bun:
   ```bash
   cd MONKE
   bun run api/server.ts
   ```

## Guidelines

- Follow the existing code style and formatting
- Keep changes focused; separate unrelated changes into different PRs
- Add or update documentation/README sections when adding features
- Update any environment variable notes if your feature needs new config

## Submitting Changes

1. Commit using clear, conventional messages:
   - `feat: add group deal locking endpoint`
   - `fix: correct redemption verification status code`
   - `docs: expand cNFT merchant benefits`
2. Push your branch and open a Pull Request from your fork to `main`
3. Fill in the PR template with context, screenshots, and testing notes
4. Respond to review comments and update your branch as needed

## Issue Reports

When filing an issue, please include:
- What happened vs. what you expected
- Steps to reproduce (routes, payloads, screenshots)
- Relevant logs/console output
- Environment and versions (Node, Bun, Next.js, OS)

## Security

Please do not open public issues for security vulnerabilities. Email a maintainer instead.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see `LICENSE.md`).


