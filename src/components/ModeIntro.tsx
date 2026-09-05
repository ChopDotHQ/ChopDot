import {ArrowRight, Check, LockKeyhole} from 'lucide-react';
import type {GroupMode} from '../types';
import {PRODUCT_MODES} from './productModes';
import {BottomAction, Button, Screen, ScreenContent, ScreenHeader} from './primitives';

export function ModeIntro({mode, onBack, onStart}: {mode: GroupMode; onBack: () => void; onStart: () => void}) {
  const copy = PRODUCT_MODES[mode];
  return (
    <Screen>
      <ScreenHeader title={copy.label} onBack={onBack} />
      <ScreenContent className="bg-[#f7f6f4] px-6 py-7 dark:bg-gray-950">
        <p className="text-sm font-semibold text-[#e6007a]">{copy.eyebrow}</p>
        <h1 className="mt-2 max-w-[19rem] text-[2.3rem] font-bold leading-[1.03] tracking-[-0.055em] text-gray-950 dark:text-white">{copy.nextAction}</h1>
        <p className="mt-3 max-w-[19rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">{copy.description}</p>

        <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          <div className="flex gap-3 py-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#e6007a]" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-950 dark:text-white">One shared flow</p>
              <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">Add, ask, mark paid, confirm received, then save a readable record.</p>
            </div>
          </div>
          <div className="flex gap-3 py-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#e6007a]" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-950 dark:text-white">People keep control</p>
              <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">Marking paid is not the same as the receiver confirming it arrived.</p>
            </div>
          </div>
        </div>

        {copy.privacyNote && <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm font-medium leading-5 text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200">{copy.privacyNote}</p>}
      </ScreenContent>
      <BottomAction>
        <Button fullWidth onClick={onStart}>
          {copy.createAction}
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
        </Button>
      </BottomAction>
    </Screen>
  );
}
