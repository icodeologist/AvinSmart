import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ManageStaff from "./views/ManageStaff.jsx";
import RegisterStaff from "./views/RegisterStaff.jsx";
import ManageSalaries from "./views/ManageSalaries.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ManageStaff />} />
        <Route path="/register" element={<RegisterStaff />} />
        <Route path="/salaries" element={<ManageSalaries />} />
        <Route path="*" element={<ManageStaff />} />
      </Route>
    </Routes>
  );
}