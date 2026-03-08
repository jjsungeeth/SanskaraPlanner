import logo from '../logo.png';

export default function Header() {
  return (
    <header className="bg-sans-pink py-4 shadow-md text-sans-white">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={logo} 
            alt="Sanskara Planner Logo" 
            className="h-14 w-auto object-contain"
          />
          <h1 className="text-2xl md:text-3xl font-bold hidden sm:block">
            Planner in My Pocket
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-medium">Jason & Partner</span>
          <button className="bg-white text-sans-pink px-5 py-2 rounded-md font-medium hover:bg-gray-100 transition">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}