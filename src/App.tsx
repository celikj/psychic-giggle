import { useState } from 'react';
import { useStore } from './hooks/useStore';
import TasksView from './components/TasksView';
import HabitsView from './components/HabitsView';
import BlockerView from './components/BlockerView';
import BottomNav from './components/BottomNav';

type Tab = 'tasks' | 'habits' | 'blocker';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const store = useStore();

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="overflow-y-auto" style={{ minHeight: '100vh' }}>
        {activeTab === 'tasks'   && <TasksView store={store} />}
        {activeTab === 'habits'  && <HabitsView store={store} />}
        {activeTab === 'blocker' && <BlockerView store={store} />}
      </div>
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allLockingDone={store.allLockingDone}
        lockingLeft={store.lockingLeft}
      />
    </div>
  );
}
