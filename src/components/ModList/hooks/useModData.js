import { useContext } from 'react';
import { ModDataContext } from '../../../context/ModDataContext';

export function useModData() {
  const context = useContext(ModDataContext);
  return context || {};
}
