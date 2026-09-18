import { defineConfig } from 'vite';
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

// Single-page app clean routes. Vite dev serves existing HTML files for their
// extension-less paths (e.g. /inventory -> inventory.html), which would bypass
// the React SPA. Rewrite these clean routes back to the SPA shell (index.html)
// so the dev server behaves like the built app.
const spaCleanRoutes = new Set([
  '/', '/inventory', '/products/create', '/categories/add', '/outlets',
  '/reports', '/docs', '/login', '/signup', '/signin', '/404',
])

const isSpaCleanRoute = (path) => {
  if (spaCleanRoutes.has(path)) return true;
  if (path.startsWith('/staff')) {
    const last = path.slice('/staff'.length).split('?')[0];
    return last === '' || last === '/' || /^\/[A-Za-z0-9-_]+$/.test(last);
  }
  return false;
}

const spaRewrite = () => {
  const middleware = (req, _res, next) => {
    if (req.method === 'GET') {
      const path = (req.url || '').split('?')[0];
      if (isSpaCleanRoute(path)) {
        req.url = '/index.html';
      }
    }
    next();
  };

  return {
    name: 'spa-clean-route-rewrite',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
   base: '/',
   plugins: [react(), spaRewrite()],
   root: resolve(__dirname, 'src'),   // ✅ keeps dev server working
   server: {
    host: true,
    port: 3000,
    hot: true,
    open: true,
  },
  css: {
    preprocessorOptions: {
        scss: {

        },
      }
  },
    build: {
    outDir: resolve(__dirname, 'dist'), // ✅ output outside src
    emptyOutDir: true,
    rollupOptions: {
      // Single-page app: only the SPA shell is built. The legacy *.html pages
      // in src/ are kept as reference but not emitted, so clean routes resolve
      // to the React app on the built/preview server too.
      input: resolve(__dirname, 'src/index.html'),
         output: {
          chunkFileNames: 'assets/js/[name].js',
          entryFileNames: 'assets/js/[name].js',

          assetFileNames: ({name}) => {
            if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')){
                return 'assets/images/[name][extname]';
            }

            if (/\.css$/.test(name ?? '')) {
                return 'assets/css/[name][extname]';
            }

            // default value
            // ref: https://rollupjs.org/guide/en/#outputassetfilenames
            return 'assets/[name][extname]';
          },



      },
    },
  },
});