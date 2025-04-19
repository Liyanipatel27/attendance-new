import { useParams } from "react-router-dom";

const StudentDashboard = () => {
  const { id } = useParams();
  return <h2>Student Dashboard - ID: {id}</h2>;
};

export default StudentDashboard;
