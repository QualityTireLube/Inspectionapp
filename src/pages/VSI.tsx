import React from 'react';
import InspectionPage from './InspectionPage';
import { INSPECTION_SCHEMAS } from '../config/inspectionSchemas';

const VSI: React.FC = () => {
  return <InspectionPage schema={INSPECTION_SCHEMAS.vsi} />;
};

export default VSI;
