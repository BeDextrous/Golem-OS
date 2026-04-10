# Golem OS

A lightweight Google Apps Script-based productivity dashboard powered by a Google Sheet backend.

## Project Purpose

Golem OS is designed to centralize tasks, objectives, notes, links, and reading lists in a single web app experience. It uses Apps Script for backend spreadsheet synchronization and an HTML/CSS UI for quick capture and view navigation.

## Repository Structure

- `Code.js` — Apps Script server code and spreadsheet sync functions
- `Index.html` — front-end UI and client-side state management
- `appsscript.json` — Apps Script project manifest
- `progress-archive.ipynb` — local progress tracking notebook

## Setup

1. Clone or open the repository in VS Code.
2. Ensure `clasp` is installed and authenticated for Google Apps Script.
3. Confirm the Google Sheet ID in `Code.js` matches your workspace spreadsheet.
4. Use `clasp push` to deploy changes once testing is complete.

## Development Workflow

- Edit `Index.html` for UI and client-side behavior.
- Edit `Code.js` for server-side spreadsheet handling and Apps Script entry points.
- Keep spreadsheet tab headers aligned with the object keys used in the script.
- Use the notebook archive to record development progress and decisions.

## Contribution Guidelines

- Open issues for enhancements or bugs.
- Keep UI changes separate from backend sync updates.
- Document new spreadsheet columns and expected values in the README.
