import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div id="overlay" className={mobileOpen ? "overlay show" : "overlay"} onClick={() => setMobileOpen(false)}></div>

      <Topbar
        onToggle={() => setCollapsed((value) => !value)}
        onMobileOpen={() => setMobileOpen(true)}
      />

      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} />

      <main id="content" className={collapsed ? "content py-10 full" : "content py-10"}>
        <div className="container-fluid">
          <Outlet />

          <div className="row">
            <div className="col-12">
              <footer className="text-center py-2 mt-6 text-secondary">
                <p className="mb-0">Developed by <a href="https://github.com/icodeologist" target="_blank" className="text-primary">icodeologist</a></p>
              </footer>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}