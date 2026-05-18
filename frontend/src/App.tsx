
import { useStore } from './store/useStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

function App() {
  const { user } = useStore();

  return (
    <div className="app-container">
      {!user ? <Login /> : <Dashboard />}
    </div>
  );
}

export default App;
