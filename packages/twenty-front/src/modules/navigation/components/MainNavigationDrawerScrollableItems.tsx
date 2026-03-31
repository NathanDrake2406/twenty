import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { NavigationDrawerOpenedSection } from '@/navigation-menu-item/display/sections/components/NavigationDrawerOpenedSection';
import { FavoritesSectionDispatcher } from '@/navigation-menu-item/display/sections/favorites/components/FavoritesSectionDispatcher';
import { WorkspaceSectionDispatcher } from '@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionDispatcher';
import { NavigationDrawerOtherSection } from '@/navigation/components/NavigationDrawerOtherSection';
import { NavigationDrawerWorkspaceSectionSkeletonLoader } from '@/object-metadata/components/NavigationDrawerWorkspaceSectionSkeletonLoader';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { styled } from '@linaria/react';

import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledScrollableItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const MainNavigationDrawerScrollableItems = () => {
  const metadataStore = useAtomFamilyStateValue(
    metadataStoreState,
    'navigationMenuItems',
  );

  const isNavigationMenuItemsLoading = metadataStore.status === 'empty';

  return (
    <StyledScrollableItemsContainer>
      <NavigationDrawerOpenedSection />
      {isNavigationMenuItemsLoading ? (
        <NavigationDrawerWorkspaceSectionSkeletonLoader />
      ) : (
        <>
          <FavoritesSectionDispatcher />
          <WorkspaceSectionDispatcher />
        </>
      )}
      <NavigationDrawerOtherSection />
    </StyledScrollableItemsContainer>
  );
};
