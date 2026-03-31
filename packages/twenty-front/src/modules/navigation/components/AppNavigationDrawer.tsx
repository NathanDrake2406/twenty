import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { MainNavigationDrawerContent } from '@/navigation/components/MainNavigationDrawerContent';
import { SettingsNavigationDrawerContent } from '@/navigation/components/SettingsNavigationDrawerContent';
import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { NavigationDrawer } from '@/ui/navigation/navigation-drawer/components/NavigationDrawer';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';

export type AppNavigationDrawerProps = {
  className?: string;
};

export const AppNavigationDrawer = ({
  className,
}: AppNavigationDrawerProps) => {
  const isSettingsDrawer = useIsSettingsDrawer();
  const { t } = useLingui();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  return (
    <NavigationDrawer
      className={className}
      title={
        isSettingsDrawer
          ? t`Exit Settings`
          : (currentWorkspace?.displayName ?? '')
      }
    >
      {isSettingsDrawer ? (
        <SettingsNavigationDrawerContent />
      ) : (
        <MainNavigationDrawerContent />
      )}
    </NavigationDrawer>
  );
};
