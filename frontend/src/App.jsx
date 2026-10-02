import { Navigate, Outlet, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import Dashboard from "./views/Dashboard.jsx";
import CreateBill from "./views/CreateBill.jsx";
import Inventory from "./views/Inventory.jsx";
import CreateProduct from "./views/CreateProduct.jsx";
import AddCategory from "./views/AddCategory.jsx";
import ManageOutlets from "./views/ManageOutlets.jsx";
import OutletProducts from "./views/OutletProducts.jsx";
import Reports from "./views/Reports.jsx";
import Docs from "./views/Docs.jsx";
import ManageStaff from "./views/ManageStaff.jsx";
import RegisterStaff from "./views/RegisterStaff.jsx";
import ManageSalaries from "./views/ManageSalaries.jsx";
import SignIn from "./views/SignIn.jsx";
import RegisterAdmin from "./views/RegisterAdmin.jsx";
import NotFound from "./views/NotFound.jsx";
import CashFlow from "./views/CashFlow.jsx";
import AdminProfile from "./views/AdminProfile.jsx";
import PosLogin from "./views/PosLogin.jsx";
import PosPage from "./views/PosPage.jsx";
import Notifications from "./views/Notifications.jsx";
import Welcome from "./views/Welcome.jsx";
import PriceUpdates from "./views/PriceUpdates.jsx";
import LiveDashboard from "./views/LiveDashboard.jsx";
import { getAdminToken, getPosToken } from "./api/config.js";

function Landing() {
  return <Welcome />;
}

function RequireAdmin() {
  try {
    const staff = JSON.parse(sessionStorage.getItem("avinSmartPosStaff") || "null");
    if (staff) {
      if (getPosToken() && ["sales", "inventory_staff"].includes(staff.role) && ["/inventory", "/price-updates", "/profile"].includes(window.location.pathname)) return <Outlet />;
      return <Navigate to={staff.role === "sales" ? "/pos" : "/staff/login"} replace />;
    }
  } catch {
    return <Navigate to="/" replace />;
  }
  if (getAdminToken()) return <Outlet />;
  return <Navigate to="/" replace />;
}

function RequirePOS() {
  if (getPosToken()) {
    try {
      const staff = JSON.parse(sessionStorage.getItem("avinSmartPosStaff") || "null");
      if (["sales", "inventory_staff"].includes(staff?.role)) return <Outlet />;
    } catch {
      // Invalid session data falls through to the staff login page.
    }
  }
  return <Navigate to="/staff/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Landing />} />
      <Route element={<RequireAdmin />}>
        <Route path="/profile/live-dashboard" element={<LiveDashboard />} />
        <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/price-updates" element={<PriceUpdates />} />
        <Route path="/products/create" element={<Navigate to="/outlets" replace />} />
        <Route path="/categories/add" element={<Navigate to="/outlets" replace />} />
        <Route path="/outlets" element={<ManageOutlets />} />
        <Route path="/outlets/categories/add" element={<AddCategory />} />
        <Route path="/outlets/:outletId" element={<OutletProducts />} />
        <Route path="/outlets/:outletId/products/create" element={<CreateProduct />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/cash-flow" element={<CashFlow />} />
        <Route path="/profile" element={<AdminProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/bills/create" element={<CreateBill />} />
        <Route path="/staff" element={<ManageStaff />} />
        <Route path="/staff/register" element={<RegisterStaff />} />
        <Route path="/staff/salaries" element={<ManageSalaries />} />
        </Route>
      </Route>
      <Route path="/staff/login" element={<PosLogin />} />
      <Route path="/pos/login" element={<Navigate to="/staff/login" replace />} />
      <Route path="/staff/sales/login" element={<Navigate to="/staff/login" replace />} />
      <Route path="/staff/inventory/login" element={<Navigate to="/staff/login" replace />} />
      <Route element={<RequirePOS />}>
        <Route path="/pos" element={<PosPage />} />
      </Route>
      <Route path="/admin/login" element={<SignIn />} />
      <Route path="/register" element={<RegisterAdmin />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
