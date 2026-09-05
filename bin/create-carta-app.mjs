#!/usr/bin/env node

import { appendFileSync, existsSync, readFileSync, realpathSync } from 'node:fs'
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

export function addSkillIgnore(directory) {
  const ignoreFile = resolve(directory, '.gitignore')
  const current = existsSync(ignoreFile) ? readFileSync(ignoreFile, 'utf8') : ''
  const entry = '/.agents/skills/'
  if (current.split('\n').includes(entry)) return

  const prefix = current && !current.endsWith('\n') ? '\n' : ''
  appendFileSync(ignoreFile, `${prefix}\n# Skills are installed separately from southneuhof/skills\n${entry}\n`)
}

export function createApp({ directory, remote, cwd = process.cwd() }) {
  const target = resolve(cwd, directory)
  if (existsSync(target)) throw new Error(`Target already exists: ${target}`)

  run('git', ['clone', '--branch', 'main', '--origin', 'carta', CARTA_REPOSITORY, target], cwd)
  if (remote) run('git', ['remote', 'add', 'origin', remote], target)

  run(
    npxCommand(),
    ['skills@latest', 'add', SKILLS_REPOSITORY, '--skill', '*', '--agent', 'codex', '--yes', '--copy'],
    target,
  )
  addSkillIgnore(target)
  run('pnpm', ['install', '--frozen-lockfile'], target)

  return target
}

export function main(args = process.argv.slice(2)) {
  try {
    const options = parseArgs(args)
    if (options.help) {
      console.log(HELP)
      return 0
    }

    const target = createApp(options)
    console.log(`\nCreated Carta application at ${target}`)
    console.log('Carta remote: https://github.com/southneuhof/carta.git')
    if (options.remote) console.log(`Project remote: ${options.remote}`)
    else console.log('No project remote was set. Add origin before you push.')
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    return 1
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main()
}
