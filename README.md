# MFEDemo

Enterprise Micro Frontend demo — a React 19 shell loading MFEs built in React, Vue, and Angular via Webpack 5 Module Federation and Native Federation + Web Components.

## Architecture

| App              | Framework             | Type                                  | Port        | Repo         |
| ---------------- | --------------------- | ------------------------------------- | ----------- | ------------ |
| Shell            | React 19              | Webpack MF host                       | `:3000`     | monorepo     |
| React MFE        | React 19              | Webpack MF remote                     | `:3001`     | monorepo     |
| Vue MFE          | Vue 3                 | Webpack MF remote                     | `:3002`     | monorepo     |
| Auth Server      | JSON Server           | REST API                              | `:3100`     | monorepo     |
| Angular MFE      | Angular 21 (Zoneless) | Native Federation + Web Component     | `:4201`     | monorepo     |
| **Angular Todo** | **Angular 21**        | **Native Federation + Web Component** | **`:4200`** | **polyrepo** |

All remote URLs, routes, and metadata are controlled centrally via [`mfe.manifest.json`](./mfe.manifest.json) — the single source of truth for the platform.

## Polyrepo: Angular Todo

The Angular Todo app is an external polyrepo integrated as an MFE. It exposes a `<angular-todo-app>` Web Component consumed by the shell.

- **Repository:** https://github.com/sudeep31/angularTodo
- **Local path:** `C:/AngularToDO/angularTodo`
- **Start command:** `npm run start:mfe` (from the angularTodo repo root)

## Getting Started

Start each service in a separate terminal:

```bash
# Auth Server
cd auth-server && npm start

# React MFE — :3001
cd mfe-react-app && npm start

# Vue MFE — :3002
cd mfe-vue-app && npm start

# Angular MFE — :4201
cd mfe-angular-app && npm start

# Angular Todo (polyrepo) — :4200
cd C:/AngularToDO/angularTodo && npm run start:mfe

# Shell — :3000 (open this in the browser)
cd shell && npm start
```

Or use Nx from the workspace root:

```bash
npx nx run shell:start
npx nx run angularTodo:start
```
