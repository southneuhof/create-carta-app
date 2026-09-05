#!/usr/bin/env node

import { existsSync, realpathSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CARTA_REPOSITORY = 'https://github.com/southneuhof/carta.git'
const SKILLS_REPOSITORY = 'southneuhof/skills'
const HELP = `Usage: create-carta-app <directory> [--remote <url>]

Create a Carta application with full Carta history and all Carta skills.
`

export function parseArgs(args) {
  let directory
  let remote

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--help' || arg === '-h') return { help: true }
    if (arg === '--remote') {
      remote = args[++index]
      if (!remote) throw new Error('--remote requires a URL.')
      continue
    }
    if (arg.startsWith('--remote=')) {
      remote = arg.slice('--remote='.length)
      if (!remote) throw new Error('--remote requires a URL.')
      continue
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
    if (directory) throw new Error('Only one application directory is allowed.')
    directory = arg
  }

  if (!directory) throw new Error('An application directory is required.')
  return { directory, remote }
}

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

function shellQuote(value) {
  return process.platform === 'win32' ? `"${value.replaceAll('"', '\\"')}"` : `'${value.replaceAll("'", "'\\''")}'`
}

export function successMessage(target, remote) {
  const lines = [
    `✔ Created Carta app in ${target}`,
    '',
    'Next steps:',
    '',
    `  cd ${shellQuote(target)}`,
    '',
    '  # Configure the API and web environment files',
    '  cp apps/api/.env.example apps/api/.env',
    '  cp apps/web/.env.example apps/web/.env',
    '',
    '  # Start PostgreSQL, then run:',
    '  pnpm --filter @southneuhof/api db:migrate',
    '  pnpm --filter @southneuhof/api db:seed',
    '  pnpm dev',
    '',
  ]

  if (remote) {
    lines.push('Your project remote is ready.', '', '  git push -u origin main')
  } else {
    lines.push(
      'No project remote was configured. Add one before you push:',
      '',
      '  git remote add origin <private-repo-url>',
      '  git push -u origin main',
    )
  }

  return `\n${lines.join('\n')}\n`
}

export function createApp({ directory, remote, cwd = process.cwd() }) {
  const target = resolve(cwd, directory)
  if (existsSync(target)) throw new Error(`Target already exists: ${target}`)

  run('git', ['clone', '--branch', 'main', '--origin', 'carta', CARTA_REPOSITORY, target], cwd)
  if (remote) run('git', ['remote', 'add', 'origin', remote], target)

  run(
    npxCommand(),
    ['skills@latest', 'add', SKILLS_REPOSITORY, '--skill', '*', '--yes', '--copy'],
    target,
  )
  run('pnpm', ['install', '--frozen-lockfile'], target)

  return target
}

export function main(args = process.argv.slice(2)) {
  let target
  try {
    const options = parseArgs(args)
    if (options.help) {
      console.log(HELP)
      return 0
    }

    target = resolve(process.cwd(), options.directory)
    createApp(options)
    console.log(successMessage(target, options.remote))
    return 0
  } catch (error) {
    console.error(`\n✖ Could not create Carta app.\n\n${error instanceof Error ? error.message : error}`)
    if (target) console.error(`\nThe target may be incomplete. Inspect it before retrying:\n  ${target}`)
    return 1
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main()
}
