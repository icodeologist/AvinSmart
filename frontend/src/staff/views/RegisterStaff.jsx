import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StaffRegistrationForm from "../components/StaffRegistrationForm.jsx";

export default function RegisterStaff() {
  return (
    <>
      <PageHeader title="Register New Staff" subtitle="Add a new staff member to the system">
        <Link to="/" className="btn btn-secondary">
          <i className="ti ti-arrow-left me-1"></i>Back to Staff List
        </Link>
      </PageHeader>

      <div className="row g-4 mb-5">
        <div className="col-12">
          <StaffRegistrationForm />
        </div>
      </div>
    </>
  );
}