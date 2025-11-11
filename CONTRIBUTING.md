# Contributing to Coherent.js

We love your input! We want to make contributing to Coherent.js as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with GitHub

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html), So All Code Changes Happen Through Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Getting Started

1. Ensure you have [Node.js](https://nodejs.org/) (version 20 or higher) and [pnpm](https://pnpm.io/) installed
2. Fork the repository
3. Clone your fork: `git clone https://github.com/your-username/coherent.js.git`
4. Create a branch: `git checkout -b my-branch-name`
5. Install dependencies: `pnpm install`
6. Make your changes
7. Run tests: `pnpm test`
8. Push and submit a pull request

## How to Report a Bug

### Security Bugs

Please **do not** report security vulnerabilities through public GitHub issues. Instead, please report them directly to thomas.drouvin@gmail.com. Please see our [security policy](SECURITY.md) for more details.

### Regular Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/Tomdrouv1/coherent.js/issues/new/choose); it's that easy!

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## How to Suggest a Feature

If you find yourself wishing for a feature that doesn't exist in Coherent.js, you are probably not alone. [Open an issue](https://github.com/Tomdrouv1/coherent.js/issues/new/choose) on our issues list on GitHub which describes the feature you would like to see, why you need it, and how it should work.

## Code Review Process

The core team looks at Pull Requests on a regular basis in a bi-weekly triage meeting. After feedback has been given we expect responses within two weeks. After two weeks we may close the pull request if it isn't showing any activity.

## Style Guide

### Code Style

We use ESLint to enforce code style. You can check your code by running:

```bash
pnpm run lint
```

To automatically fix style issues:

```bash
pnpm run lint:fix
```

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- When only changing documentation, include [ci skip] in the commit title

### JavaScript Style

- Use 2 spaces for indentation rather than tabs
- Prefer `const` over `let` (avoid `var`)
- Use strict equality checks (`===` and `!==`)
- Avoid using `eval()` and implied eval
- Avoid using `new Function()`
- Write tests for new features and bug fixes

## Testing

We use [Vitest](https://vitest.dev/) for testing. All new features should include tests.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests for a specific package
pnpm --filter @coherent.js/core run test

# Run a specific test file
pnpm --filter @coherent.js/core run test -- test/some-file.test.js
```

### Writing Tests

- Place test files in the `test/` directory of each package
- Use clear, descriptive test names
- Test one thing per test when possible
- Include both positive and negative test cases

For more details on testing, see our [guidelines](.junie/guidelines.md).

## Documentation

- Update documentation when you change APIs
- Document new features
- Follow the existing documentation style
- Run the documentation locally to verify it renders correctly

## Any Contributions You Make Will Be Under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## References

This document was adapted from common open-source contribution guidelines.

Thank you for contributing to Coherent.js!
