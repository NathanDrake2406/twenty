import { objectMetadataItemFamilySelector } from '@/object-metadata/states/objectMetadataItemFamilySelector';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';

export const useObjectNameSingularFromPlural = ({
  objectNamePlural,
}: {
  objectNamePlural: string;
}): { objectNameSingular: string | undefined } => {
  const objectMetadataItem = useAtomFamilySelectorValue(
    objectMetadataItemFamilySelector,
    {
      objectName: objectNamePlural,
      objectNameType: 'plural',
    },
  );

  return { objectNameSingular: objectMetadataItem?.nameSingular };
};
