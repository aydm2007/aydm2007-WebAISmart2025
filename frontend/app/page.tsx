
import ForecastChart from './components/ForecastChart';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

export default function HomePage() {
  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <div className="flex-1">
        <ChatInterface />
      </div>
    </div>
  );
}
