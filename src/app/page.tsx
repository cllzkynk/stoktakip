import StockTrackerApp from '@/components/app/StockTrackerApp';
import PasswordGate from '@/components/app/PasswordGate';

export default function Home() {
  return (
    <PasswordGate>
      <StockTrackerApp />
    </PasswordGate>
  );
}
