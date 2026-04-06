import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';

export const composeEmailThreadIdComponentState = createAtomComponentState<
  string | null
>({
  key: 'side-panel/compose-email-thread-id',
  defaultValue: null,
  componentInstanceContext: SidePanelPageComponentInstanceContext,
});
