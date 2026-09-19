import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import Dashboard from "./views/Dashboard.jsx";
import CreateBill from "./views/CreateBill.jsx";
import Inventory from "./views/Inventory.jsx";
import CreateProduct from "./views/CreateProduct.jsx";
import AddCategory from "./views/AddCategory.jsx";
import ManageOutlets from "./views/ManageOutlets.jsx";
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

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/products/create" element={<CreateProduct />} />
        <Route path="/categories/add" element={<AddCategory />} />
        <Route path="/outlets" element={<ManageOutlets />} />
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
      <Route path="/pos/login" element={<PosLogin />} />
      <Route path="/pos" element={<PosPage />} />
      <Route path="/login" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
