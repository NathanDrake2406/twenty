import { NavigationDrawerOpenedSection } from '@/navigation-menu-item/display/sections/components/NavigationDrawerOpenedSection';
import { FavoritesSectionDispatcher } from '@/navigation-menu-item/display/sections/favorites/components/FavoritesSectionDispatcher';
import { WorkspaceSectionDispatcher } from '@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionDispatcher';

import { NavigationDrawerOtherSection } from '@/navigation/components/NavigationDrawerOtherSection';
import { styled } from '@linaria/react';

import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledScrollableItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const MainNavigationDrawerScrollableItems = () => {
  return (
    <StyledScrollableItemsContainer>
      <NavigationDrawerOpenedSection />
      <FavoritesSectionDispatcher />
      <WorkspaceSectionDispatcher />
      <NavigationDrawerOtherSection />
    </StyledScrollableItemsContainer>
  );
};
