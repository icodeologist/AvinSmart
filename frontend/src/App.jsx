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
import SignUp from "./views/SignUp.jsx";
import NotFound from "./views/NotFound.jsx";
import CashFlow from "./views/CashFlow.jsx";
import AdminProfile from "./views/AdminProfile.jsx";
import PosLogin from "./views/PosLogin.jsx";
import PosPage from "./views/PosPage.jsx";
import Notifications from "./views/Notifications.jsx";
import Welcome from "./views/Welcome.jsx";
import { getAdminToken } from "./api/config.js";

function Landing() {
  return <Welcome />;
}

function RequireAdmin() {
  return getAdminToken() ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Landing />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
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
      <Route path="/pos/login" element={<PosLogin />} />
      <Route path="/pos" element={<PosPage />} />
      <Route path="/admin/login" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
