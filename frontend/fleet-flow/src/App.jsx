import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        {/* Simple Login Page (No Sidebar/Navbar) */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard Pages (With Sidebar/Navbar) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="trips" element={<Trips />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
