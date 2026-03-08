import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import './index.css';

function App() {
 return (
   <div className="min-h-screen bg-sans-white">
     <Header />
     <main className="container mx-auto px-4 py-8">
       <Dashboard />
     </main>
   </div>
 );
}

export default App;