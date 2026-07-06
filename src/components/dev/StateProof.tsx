import { useReducer, useState } from 'react';
import { createCleanState, reducer, getNetPosition } from '../../state/store';

export function StateProof({ onBack }: { onBack?: () => void }) {
  const [state, dispatch] = useReducer(reducer, createCleanState());
  const [scenarioResult, setScenarioResult] = useState<{
    leoStatus: string;
    ninaStatus: string;
    minaNetPosition: number;
    savedRecordOpenAmount: number | undefined;
  } | null>(null);

  const runScenario = () => {
    let finalState = createCleanState();
    const dispatchScenario = (action: Parameters<typeof reducer>[1]) => {
      finalState = reducer(finalState, action);
      dispatch(action); // Update UI
    };

    dispatchScenario({ type: 'RESET_TO_CLEAN' });
    
    const mina = { id: 'u1', name: 'Mina' };
    const leo = { id: 'u2', name: 'Leo' };
    const nina = { id: 'u3', name: 'Nina' };
    
    dispatchScenario({ type: 'ADD_USER', payload: { user: mina } });
    dispatchScenario({ type: 'ADD_USER', payload: { user: leo } });
    dispatchScenario({ type: 'ADD_USER', payload: { user: nina } });
    
    dispatchScenario({ type: 'SET_CURRENT_USER', payload: { userId: mina.id } });

    const group = { id: 'g1', name: 'Dinner', memberIds: [mina.id, leo.id, nina.id] };
    dispatchScenario({ type: 'CREATE_GROUP', payload: { group } });

    const expense = { id: 'e1', groupId: 'g1', description: 'Dinner', amount: 120, paidByUserId: mina.id, date: new Date().toISOString() };
    
    const splitMina = { id: 's1', expenseId: 'e1', userId: mina.id, amount: 40, status: 'confirmed' as const };
    const splitLeo = { id: 's2', expenseId: 'e1', userId: leo.id, amount: 40, status: 'open' as const };
    const splitNina = { id: 's3', expenseId: 'e1', userId: nina.id, amount: 40, status: 'open' as const };
    
    dispatchScenario({ type: 'ADD_EXPENSE', payload: { expense, splits: [splitMina, splitLeo, splitNina] } });

    dispatchScenario({ type: 'SEND_REQUEST', payload: { splitId: 's2' } });
    dispatchScenario({ type: 'MARK_PAID', payload: { splitId: 's2', userId: leo.id } });
    dispatchScenario({ type: 'CONFIRM_RECEIVED', payload: { splitId: 's2', currentUserId: mina.id } });
    dispatchScenario({ type: 'SAVE_RECORD', payload: { recordId: 'r1', groupId: 'g1' } });

    const leoStatus = finalState.splits['s2'].status;
    const ninaStatus = finalState.splits['s3'].status;
    const minaNet = getNetPosition(finalState, mina.id);
    const savedRecord = finalState.savedRecords['r1'];

    setScenarioResult({
      leoStatus,
      ninaStatus,
      minaNetPosition: minaNet,
      savedRecordOpenAmount: savedRecord?.openAmount
    });
  };

  const splitsList = Object.values(state.splits) as { status: string; amount: number }[];
  const openAmount = splitsList
    .filter(s => s.status !== 'confirmed')
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="p-6 space-y-6 flex-1 flex flex-col">
        {onBack && (
          <button onClick={onBack} className="self-start text-sm text-gray-500 hover:text-gray-800 font-medium mb-2 flex items-center">
            &larr; Back to App
          </button>
        )}
        <h1 className="text-xl font-bold mb-4 tracking-tight text-gray-900">State Proof</h1>
        
        <div className="bg-gray-100 p-4 rounded-lg space-y-2 text-sm font-mono text-gray-700">
          <p>Mode: <span className="font-bold text-gray-900">{state.mode}</span></p>
          <p>Users Count: {Object.keys(state.users).length}</p>
          <p>Groups Count: {Object.keys(state.groups).length}</p>
          <p>Expenses Count: {Object.keys(state.expenses).length}</p>
          <p>Global Open Amount: ${openAmount.toFixed(2)}</p>
        </div>

        <button 
          onClick={runScenario}
          className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Run State Scenario
        </button>

        {scenarioResult && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4 space-y-3 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-2 border-b pb-2">Scenario Result</h2>
            <div className="text-sm font-mono flex flex-col space-y-2">
              <p>Leo status: <span className={scenarioResult.leoStatus === 'confirmed' ? 'text-green-600 font-bold' : 'text-gray-900'}>{scenarioResult.leoStatus}</span></p>
              <p>Nina status: <span className={scenarioResult.ninaStatus === 'open' ? 'text-orange-500 font-bold' : 'text-gray-900'}>{scenarioResult.ninaStatus}</span></p>
              <p>Mina net position: <span className={scenarioResult.minaNetPosition === 40 ? 'text-green-600 font-bold' : 'text-gray-900'}>{scenarioResult.minaNetPosition > 0 ? '+' : ''}${scenarioResult.minaNetPosition}</span></p>
              <p>Saved record still open: <span className={scenarioResult.savedRecordOpenAmount === 40 ? 'text-orange-500 font-bold' : 'text-gray-900'}>${scenarioResult.savedRecordOpenAmount}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
