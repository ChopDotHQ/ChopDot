import { useAppState } from '../../state/AppStateContext';
import { Screen, ScreenHeader, ScreenContent } from '../primitives/Screen';
import { Button } from '../primitives/Button';
import { MoneyAmount } from '../primitives/MoneyAmount';
import { PersonRow } from '../primitives/PersonRow';
import { EmptyState } from '../primitives/EmptyState';
import { BottomAction } from '../primitives/BottomAction';
import { CheckCircle } from 'lucide-react';

export function StyleGuide({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useAppState();

  return (
    <Screen>
      <ScreenHeader title="Style Guide" onBack={onBack} />
      
      <ScreenContent className="p-6 space-y-8">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buttons & Actions</h2>
          
          <div className="space-y-3">
            <Button variant="primary" fullWidth>Primary Action</Button>
            <Button variant="secondary" fullWidth>Secondary Action</Button>
            <Button variant="success" fullWidth>Success Action</Button>
            <Button variant="danger" fullWidth>Danger Action</Button>
            <Button variant="muted" fullWidth>Muted Action</Button>
            <Button variant="primary" fullWidth disabled>Disabled Action</Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Money Amount</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors space-y-4 flex flex-col items-center">
            <div className="text-4xl">
              <MoneyAmount amount={125.50} currency="USD" />
            </div>
            <div className="text-green-600 text-xl">
              <MoneyAmount amount={15.00} currency="USD" signDisplay="always" />
            </div>
            <div className="text-orange-600 text-xl">
              <MoneyAmount amount={-42.30} currency="USD" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Person Row</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors space-y-2">
            <PersonRow name="Alice Smith" />
            <PersonRow name="Bob Jones" subtitle="Paid $15.00" />
            <PersonRow 
              name="Charlie" 
              isCurrentUser 
              rightElement={<span className="text-sm font-semibold text-green-600">Gets $5.00</span>} 
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empty State</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <EmptyState 
              title="No activities found" 
              description="You haven't added any expenses yet." 
              icon={<CheckCircle className="w-12 h-12" />} 
            />
          </div>
        </div>

      </ScreenContent>
      
      <BottomAction>
        <Button variant="primary" fullWidth>Sample Bottom Action</Button>
      </BottomAction>
    </Screen>
  );
}
