import fs from 'node:fs'
import path from 'node:path'
import Module from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GENERATED_CJS = /\/src\/lib\/registry\/gen\/.*\.js$/

const cjsCache = (Module as unknown as { _cache: Record<string, NodeModule> })._cache

/**
 * Compiles CommonJS source as CJS regardless of file extension or the
 * project's own `"type": "module"` — Node's normal `require()` refuses
 * plain `.js` files under an ESM-type package.json, which is exactly what
 * these generated files are, so this bypasses that extension-based
 * sniffing and invokes Node's CJS compiler directly. Recursively
 * pre-populates Node's own require cache for any sibling generated file a
 * given file `require()`s, so that when the compiled body's *native*
 * `require()` call runs, it hits the cache (a plain lookup, no format
 * detection) instead of Node's loader — which would otherwise hit the
 * same "type": "module" wall for that nested require too.
 */
function ensureCjsCompiled(filePath: string): NodeModule {
  const cached = cjsCache[filePath]
  if (cached) return cached

  const source = fs.readFileSync(filePath, 'utf-8')
  for (const match of source.matchAll(/require\((['"])([^'"]+)\1\)/g)) {
    const specifier = match[2]
    if (!specifier.startsWith('.')) continue
    const resolved = path.resolve(path.dirname(filePath), specifier)
    if (GENERATED_CJS.test(resolved)) ensureCjsCompiled(resolved)
  }

  const mod = new Module(filePath)
  mod.filename = filePath
  // @ts-expect-error -- _nodeModulePaths is a Node internal, not in the public types
  mod.paths = Module._nodeModulePaths(path.dirname(filePath))
  cjsCache[filePath] = mod
  try {
    // @ts-expect-error -- _compile is a Node internal, not in the public types
    mod._compile(source, filePath)
  } catch (err) {
    delete cjsCache[filePath]
    throw err
  }
  return mod
}

/**
 * protoc-gen-js's output (src/lib/registry/gen/**\/*.js) is CommonJS
 * (`require(...)` / `goog.object.extend(exports, ...)`), not ESM. Vite's
 * dev server only applies CJS-to-ESM interop to node_modules dependencies
 * reached through its dependency pre-bundler, not to project source — so
 * without this, `require()` calls inside the generated files are undefined
 * in the browser under `pnpm dev`. (The production `vite build` path
 * handles this fine on its own via Rolldown's native commonjs support, so
 * this only needs to run in dev — see `apply: 'serve'` below.)
 *
 * This rewrites each `require('specifier')` call into a hoisted `import`
 * (letting Vite's normal resolution/interop handle the target, whether
 * that's a real npm package like `google-protobuf` or a sibling generated
 * file processed by this same plugin), and wraps the file body in a bare
 * `module`/`exports` shim so the rest of the generated code — which
 * assumes those two ambient CommonJS bindings — runs unmodified.
 *
 * The generated code populates its exports dynamically
 * (`goog.object.extend(exports, proto.registry.v1)`), which static
 * analysis can't see through — so named ESM exports (what `import * as
 * ns` and the generated *ClientPb.ts files' own cross-references to this
 * module need) are synthesized by actually compiling the real file in
 * Node (see `ensureCjsCompiled` above) and reading off its true
 * `Object.keys()`, rather than guessing.
 */
function protoGenCjsInterop(): Plugin {
  return {
    name: 'registry-proto-cjs-interop',
    apply: 'serve',
    transform(code, id) {
      if (!GENERATED_CJS.test(id)) return
      const specifiers = [
        ...new Set([...code.matchAll(/require\((['"])([^'"]+)\1\)/g)].map((m) => m[2])),
      ]
      if (specifiers.length === 0) return

      const importNames = specifiers.map((_, i) => `__req_${i}`)
      const importLines = specifiers
        .map((spec, i) => `import ${importNames[i]} from ${JSON.stringify(spec)}`)
        .join('\n')

      let body = code
      specifiers.forEach((spec, i) => {
        const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        body = body.replace(
          new RegExp(`require\\((['"])${escaped}\\1\\)`, 'g'),
          importNames[i],
        )
      })

      const exportedKeys = Object.keys(ensureCjsCompiled(id).exports as object)
      const namedExports = exportedKeys
        .map((key) => `export const ${key} = module.exports[${JSON.stringify(key)}]`)
        .join('\n')

      return {
        code: `${importLines}\nconst module = { exports: {} }\nconst exports = module.exports\n${body}\n${namedExports}\nexport default module.exports\n`,
        map: null,
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), protoGenCjsInterop()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Same-origin /api passthrough to the local backend, mirroring
      // nginx.conf.template's prod proxy_pass so app code never needs to
      // know whether it's running under Vite or nginx.
      '/api': {
        target: 'http://localhost:50051',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
