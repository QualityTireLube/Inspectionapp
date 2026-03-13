import type { QuickCheckForm } from './quickCheck';

export type NoCheckForm = Omit<QuickCheckForm, 'inspection_type'> & { inspection_type: 'no_check' };

export default NoCheckForm;

