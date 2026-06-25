import type { GroupMoneyScenario, PersonaId, ScenarioStep } from './types';

type ChatMessage = {
  id: string;
  persona: PersonaId | 'system' | 'bot';
  text: string;
  time: string;
};

const beatLabels = {
  catch: 'Catch — mess in',
  show: 'Show — where we stand',
  move: 'Move — unstick',
  end: 'End — chapter done',
} as const;

type MockGroupChatProps = {
  scenario: GroupMoneyScenario;
  stepIndex: number;
};

function stepToMessages(
  steps: ScenarioStep[],
  throughIndex: number,
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  steps.slice(0, throughIndex + 1).forEach((step, idx) => {
    if (step.systemNote) {
      messages.push({
        id: `${step.id}-sys`,
        persona: 'system',
        text: step.systemNote,
        time: `Step ${idx + 1}`,
      });
    }
    if (step.botReply) {
      messages.push({
        id: `${step.id}-bot`,
        persona: 'bot',
        text: step.botReply,
        time: `Step ${idx + 1}`,
      });
    }
    if (step.persona && step.message) {
      messages.push({
        id: step.id,
        persona: step.persona,
        text: step.message,
        time: `Step ${idx + 1}`,
      });
    }
  });
  return messages;
}

export function MockGroupChat({ scenario, stepIndex }: MockGroupChatProps) {
  const messages = stepToMessages(scenario.steps, stepIndex);
  const skin = scenario.skin;

  return (
    <div
      className="flex h-full flex-col rounded-xl border border-white/10 overflow-hidden"
      style={{
        background:
          skin === 'whatsapp'
            ? 'linear-gradient(180deg, #075e54 0%, #128c7e 100%)'
            : 'linear-gradient(180deg, #2AABEE 0%, #229ED9 100%)',
      }}
    >
      <div className="px-4 py-3 bg-black/20 text-white">
        <p className="text-sm font-medium">{scenario.chapter}</p>
        <p className="text-xs opacity-80">
          {skin === 'whatsapp' ? 'WhatsApp' : 'Telegram'} · mock
        </p>
      </div>
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{
          backgroundImage:
            skin === 'whatsapp'
              ? 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              : undefined,
          backgroundColor: skin === 'telegram' ? '#0e1621' : '#e5ddd5',
        }}
      >
        {messages.map((msg) => {
          if (msg.persona === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="rounded-lg bg-[#fff3cd] px-3 py-1 text-[11px] text-[#54656f] max-w-[90%] text-center">
                  {msg.text}
                </span>
              </div>
            );
          }
          if (msg.persona === 'bot') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 shadow-sm bg-[#182533] border border-[#2AABEE]/30">
                  <p className="text-[10px] font-semibold text-[#2AABEE] mb-0.5">ChopDot</p>
                  <p className="text-sm text-white/90 whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-[10px] text-white/40 text-right mt-1">{msg.time}</p>
                </div>
              </div>
            );
          }
          const persona = scenario.personas[msg.persona];
          const isOrganizer = msg.persona === 'alex';
          return (
            <div
              key={msg.id}
              className={`flex ${isOrganizer ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                  isOrganizer ? 'bg-[#d9fdd3]' : 'bg-white'
                }`}
              >
                {!isOrganizer && (
                  <p className="text-[10px] font-semibold text-[#25D366] mb-0.5">
                    {persona.name}
                  </p>
                )}
                <p className="text-sm text-[#111b21] whitespace-pre-wrap">{msg.text}</p>
                <p className="text-[10px] text-[#667781] text-right mt-1">{msg.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoopBeatBadge({ beat }: { beat: ScenarioStep['beat'] }) {
  const colors = {
    catch: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    show: 'bg-sky-500/20 text-sky-200 border-sky-500/40',
    move: 'bg-violet-500/20 text-violet-200 border-violet-500/40',
    end: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${colors[beat]}`}>
      {beatLabels[beat]}
    </span>
  );
}
