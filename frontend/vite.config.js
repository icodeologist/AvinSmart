import { defineConfig } from 'vite';
import { resolve } from 'path'
import glob from 'fast-glob'
import react from '@vitejs/plugin-react'
// Grab all HTML files inside src (including subfolders)
const htmlFiles = glob.sync('./src/**/*.html')

// React staff module is a single SPA entry mounted at /staff.
// Map its clean routes to the entry HTML so both the dev server
// and `vite preview` support /staff, /staff/register and /staff/salaries
// without per-route HTML files.
const staffSpaRewrite = () => {
  const isStaffRoute = (path) => {
    if (path === '/staff' || path === '/staff/') return true;
    if (!path.startsWith('/staff/')) return false;
    if (path.startsWith('/staff-app')) return false;
    const last = path.slice('/staff/'.length);
    // Let dev module/asset requests (e.g. /staff/main.jsx) pass through.
    if (/\.[a-zA-Z0-9]+$/.test(last)) return false;
    return true;
  };

  const middleware = (req, _res, next) => {
    if (req.method === 'GET') {
      const path = (req.url || '').split('?')[0];
      if (isStaffRoute(path)) {
        req.url = '/staff-app.html';
      }
    }
    next();
  };

  return {
    name: 'staff-spa-rewrite',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
   base: '/',
   plugins: [react(), staffSpaRewrite()],
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
      input: htmlFiles.length
        ? Object.fromEntries(
            htmlFiles.map(file => [
              file.replace(/^\.\/src\//, '').replace(/\.html$/, ''),
              resolve(__dirname, file),
            ])
          )
        : resolve(__dirname, 'src/index.html'),
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