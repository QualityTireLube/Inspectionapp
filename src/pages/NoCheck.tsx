import React from 'react';
import InspectionPage from './InspectionPage';
import { INSPECTION_SCHEMAS } from '../config/inspectionSchemas';

const NoCheck: React.FC = () => {
  return <InspectionPage schema={INSPECTION_SCHEMAS.no_check} />;
};

export default NoCheck;
export { NoCheck };


