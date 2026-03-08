import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{ width: "220px", borderRight: "1px solid #ddd", padding: "20px" }}>
      <h3>TalentX</h3>

      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <NavLink to="/student/jobs">Job Profiles</NavLink>
        <NavLink to="/student/profile">My Profile</NavLink>
        <NavLink to="/student/interviews">Interviews</NavLink>
        <NavLink to="/student/assessments">Assessments</NavLink>
      </nav>
    </div>
  );
}
