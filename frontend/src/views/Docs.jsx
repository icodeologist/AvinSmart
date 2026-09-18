import PageHeader from "../components/layout/PageHeader.jsx";

export default function Docs() {
  return (
    <>
      <PageHeader title="Documentation" subtitle="This documentation will guide you through the setup and usage of the InApp Inventory Dashboard template." />

      <div className="row">
        <div className="col-12">
          <div className="mb-4">
            <div className="mb-2">
              <h2 className="h5 mb-1">Prerequisites</h2>
              <p>Before you begin, ensure you have the following installed:</p>
            </div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item ps-0">Node.js (v14 or higher)</li>
              <li className="list-group-item ps-0">npm or yarn package manager</li>
              <li className="list-group-item ps-0">[Any other specific tools/dependencies]</li>
            </ul>
          </div>

          <div className="mb-4">
            <h2 className="h5 mb-2">Installation</h2>
            <ol className="list-group list-group-numbered list-group-flush">
              <li className="list-group-item ps-0">Clone the repository or download the template</li>
              <li className="list-group-item ps-0">Navigate to the project directory</li>
              <li className="list-group-item ps-0">
                Install dependencies:
                <pre className="bg-light border rounded p-3 mt-2"><code>npm install</code></pre>
              </li>
            </ol>
          </div>

          <div className="mb-6">
            <h2 className="h5 mb-2">Run the app</h2>
            <p>To start the development server:</p>
            <pre className="bg-light border rounded p-3"><code>npm run dev</code></pre>
          </div>

          <div className="mb-4">
            <h2 className="h5 mb-2">Next Steps</h2>
            <ol className="list-group list-group-numbered list-group-flush">
              <li className="list-group-item ps-0">Review the main entry point in <code>src/js/main.js</code></li>
              <li className="list-group-item ps-0">Customize components according to your needs</li>
              <li className="list-group-item ps-0">
                Build for production:
                <pre className="bg-light border rounded p-3 mt-4"><code>npm run build</code></pre>
              </li>
            </ol>
          </div>

          <div className="mb-4">
            <h2 className="h5 mb-0">Project Structure</h2>
            <pre>
              <code>
{`inapp/
├── src/
│   ├── assest/         # Static assets
│   │   ├── images/     # Images
│   │   ├── js/         # JS
│   │   ├── scss/       # CSS and styling
│   └── Pages           # All Pages
├── vite.config.js/     # Config Files
├── package.json        # Project dependencies
├── README.md           # Documentation
└── .gitignore          # Git ignore file
`}
              </code>
            </pre>
          </div>

          <div className="mb-2">
            <h2 className="h5">Support</h2>
            <p>
              For issues or questions, please refer to the documentation or create an issue in the repository. Also you can contact
              us at <a href="#!" className="text-primary">CodesCandy</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}