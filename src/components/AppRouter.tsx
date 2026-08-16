export type { AppRouterProps } from '../routing/screen-props/types';
import type { AppRouterProps } from '../routing/screen-props/types';

import { renderActivityHome, renderPotsHome, renderPeopleHome, renderYouTab } from '../routing/screen-props/tab-screens';
import { renderPotHome, renderAddExpense, renderEditExpense, renderExpenseDetail } from '../routing/screen-props/pot-screens';
import { renderSettleSelection, renderSettleHome, renderSettlementHistory, renderSettlementConfirmation } from '../routing/screen-props/settle-screens';
import { renderSettings, renderMemberDetail, renderCreatePot } from '../routing/screen-props/misc-screens';

const screenRenderers: Record<string, (ctx: AppRouterProps) => React.ReactElement | null> = {
    "activity-home": renderActivityHome,
    "pots-home": renderPotsHome,
    "people-home": renderPeopleHome,
    "settlements-home": renderPeopleHome,
    "you-tab": renderYouTab,
    "pot-home": renderPotHome,
    "add-expense": renderAddExpense,
    "edit-expense": renderEditExpense,
    "expense-detail": renderExpenseDetail,
    "settle-selection": renderSettleSelection,
    "settle-home": renderSettleHome,
    "settlement-history": renderSettlementHistory,
    "settlement-confirmation": renderSettlementConfirmation,
    "settings": renderSettings,
    "member-detail": renderMemberDetail,
    "create-pot": renderCreatePot,
};

export const AppRouter = (props: AppRouterProps) => {
    if (!props.screen) return null;
    const renderer = screenRenderers[props.screen.type];
    return renderer ? renderer(props) : null;
};
